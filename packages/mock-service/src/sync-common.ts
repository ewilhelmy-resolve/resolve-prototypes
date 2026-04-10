import type pg from "pg";
import pino from "pino";
import { withTransaction } from "./database.js";

const KB_STATUSES = ["PENDING", "FOUND", "GAP"] as const;

// Delay before transitioning from in_progress to complete (ms)
const TRAINING_COMPLETE_DELAY = 15000;

export type TrainingScenario = "null" | "failed" | "progress" | "complete";

export interface SyncResult {
	modelId: string | null;
	clustersCreated: number;
	ticketsCreated: number;
}

export interface ProviderConfig {
	name: string;
	loggerName: string;
	modelName: string;
	externalModelIdPrefix: string;
	externalIdPrefix: string;
	externalStatus: string;
	ticketNumStart: number;
	clusterNames: string[];
	subjectTemplates: Record<string, string[]>;
	descriptionPrefixes: string[];
	descriptionSuffixes: string[];
	requesters: string[];
	agents: string[];
	priorities: string[];
	priorityWeights: number[];
	kbStatusWeights: number[];
	/** Cumulative thresholds for date buckets, e.g. [0.25, 0.55, 0.8, 1.0] */
	dateDistribution: number[];
	/** Day ranges for each bucket, e.g. [[0,14], [14,60], [60,120], [120,240]] */
	dateRanges: [number, number][];
	generateMetadata: (
		ticketNum: number,
		subject: string,
		requester: string,
		agent: string,
		priority: string,
	) => object;
	/** Extract the scenario key from settings (e.g. domain for Freshservice, username for ServiceNow) */
	getScenarioKey: (settings?: Record<string, unknown>) => string | undefined;
	/** Map the scenario key to a TrainingScenario */
	matchScenario: (key: string) => TrainingScenario;
}

// --- Shared utility functions ---

export function getWeightedRandom(values: string[], weights: number[]): string {
	const rand = Math.random();
	let cumulative = 0;
	for (let i = 0; i < values.length; i++) {
		cumulative += weights[i];
		if (rand < cumulative) return values[i];
	}
	return values[0];
}

export function getRandomFrom<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

export function generateDescription(
	subject: string,
	prefixes: string[],
	suffixes: string[],
): string {
	const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
	const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
	return `${prefix}${subject}${suffix}`;
}

function getRandomSubject(
	clusterName: string,
	templates: Record<string, string[]>,
	fallbackPrefix: string,
): string {
	const entries = templates[clusterName];
	if (entries && entries.length > 0) {
		return entries[Math.floor(Math.random() * entries.length)];
	}
	return `${fallbackPrefix}${clusterName}`;
}

// --- Training scenario logic ---

export function getTrainingScenarioFromConfig(
	config: ProviderConfig,
	settings?: Record<string, unknown>,
): TrainingScenario {
	const key = config.getScenarioKey(settings);
	if (!key) return "complete";
	return config.matchScenario(key);
}

async function updateModelTrainingState(
	logger: pino.Logger,
	organizationId: string,
	modelId: string,
	state: string,
): Promise<void> {
	const { query } = await import("./database.js");
	const metadata = JSON.stringify({ training_state: state });

	await query(
		`UPDATE ml_models SET metadata = $1::jsonb, updated_at = NOW() WHERE id = $2 AND organization_id = $3`,
		[metadata, modelId, organizationId],
	);

	logger.info(
		{ modelId, organizationId, state },
		"Updated ML model training state",
	);
}

// --- Main orchestration ---

export async function syncProviderData(
	config: ProviderConfig,
	organizationId: string,
	connectionId: string,
	ingestionRunId: string,
	settings?: Record<string, unknown>,
): Promise<SyncResult> {
	const logger = pino({
		name: config.loggerName,
		level: process.env.LOG_LEVEL || "info",
	});

	const scenario = getTrainingScenarioFromConfig(config, settings);

	logger.info(
		{ organizationId, connectionId, ingestionRunId, scenario },
		`Starting ${config.name} data sync`,
	);

	// Handle mock-null scenario: clean up existing data but don't create model
	if (scenario === "null") {
		const { query } = await import("./database.js");

		await query(`DELETE FROM tickets WHERE organization_id = $1`, [
			organizationId,
		]);
		await query(`DELETE FROM clusters WHERE organization_id = $1`, [
			organizationId,
		]);
		await query(`DELETE FROM ml_models WHERE organization_id = $1`, [
			organizationId,
		]);

		logger.info(
			{ scenario, organizationId },
			"Mock-null scenario: cleaned up data, skipping model creation",
		);
		return { modelId: null, clustersCreated: 0, ticketsCreated: 0 };
	}

	// Determine initial training state
	const initialState = scenario === "failed" ? "failed" : "in_progress";

	return withTransaction(async (client: pg.PoolClient) => {
		// Clean up existing tickets and clusters
		await client.query(`DELETE FROM tickets WHERE organization_id = $1`, [
			organizationId,
		]);
		await client.query(`DELETE FROM clusters WHERE organization_id = $1`, [
			organizationId,
		]);
		logger.debug(
			{ organizationId },
			"Cleaned up existing tickets and clusters",
		);

		// Create/update ml_model
		const externalModelId = `${config.externalModelIdPrefix}${organizationId.substring(0, 8)}`;
		const modelMetadata = JSON.stringify({ training_state: initialState });
		const modelResult = await client.query<{ id: string }>(
			`INSERT INTO ml_models (organization_id, external_model_id, model_name, active, metadata)
       VALUES ($1, $2, $3, true, $4::jsonb)
       ON CONFLICT (organization_id, external_model_id)
       DO UPDATE SET active = true, metadata = $4::jsonb, updated_at = NOW()
       RETURNING id`,
			[organizationId, externalModelId, config.modelName, modelMetadata],
		);
		const modelId = modelResult.rows[0].id;
		logger.debug({ modelId, initialState }, "ML model created/updated");

		// Create clusters
		const clusterMap = new Map<string, string>();
		for (const clusterName of config.clusterNames) {
			const kbStatus = getWeightedRandom(
				[...KB_STATUSES],
				[...config.kbStatusWeights],
			);
			const clusterResult = await client.query<{ id: string }>(
				`INSERT INTO clusters (organization_id, model_id, name, subcluster_name, config, kb_status)
         VALUES ($1, $2, $3, NULL, '{}', $4)
         ON CONFLICT (organization_id, model_id, name, COALESCE(subcluster_name, ''))
         DO UPDATE SET kb_status = $4, updated_at = NOW()
         RETURNING id`,
				[organizationId, modelId, clusterName, kbStatus],
			);
			clusterMap.set(clusterName, clusterResult.rows[0].id);
		}
		logger.debug({ clusterCount: clusterMap.size }, "Clusters created/updated");

		// Create tickets (5-15 per cluster)
		let ticketNum = config.ticketNumStart;
		let ticketsCreated = 0;

		const getRandomCreatedAt = (): Date => {
			const now = new Date();
			const rand = Math.random();
			for (let i = 0; i < config.dateDistribution.length; i++) {
				if (rand < config.dateDistribution[i]) {
					const [minDays, maxDays] = config.dateRanges[i];
					return new Date(
						now.getTime() -
							(minDays + Math.random() * (maxDays - minDays)) *
								24 *
								60 *
								60 *
								1000,
					);
				}
			}
			const [minDays, maxDays] =
				config.dateRanges[config.dateRanges.length - 1];
			return new Date(
				now.getTime() -
					(minDays + Math.random() * (maxDays - minDays)) * 24 * 60 * 60 * 1000,
			);
		};

		const fallbackPrefix =
			config.name === "freshservice_itsm"
				? "Customer request: "
				: "General support request for ";

		// Resolution templates for closed tickets (~40% of tickets)
		const resolutionTemplates: Record<string, string[]> = {};
		for (const clusterName of config.clusterNames) {
			resolutionTemplates[clusterName] = [
				`Resolved by applying standard fix for ${clusterName}. Verified with the user that the issue is no longer occurring.`,
				`Issue resolved. Root cause was identified and corrected. User confirmed ${clusterName.toLowerCase()} is working as expected.`,
				`Completed troubleshooting for ${clusterName}. Applied configuration change and tested successfully.`,
				`Followed KB article steps to resolve. User verified the fix and confirmed the issue is resolved.`,
				`Escalated to L2, root cause identified. Applied fix and monitored for 24 hours. No recurrence.`,
			];
		}

		for (const [clusterName, clusterId] of clusterMap) {
			const ticketsPerCluster = 5 + Math.floor(Math.random() * 11);

			for (let i = 0; i < ticketsPerCluster; i++) {
				const subject = getRandomSubject(
					clusterName,
					config.subjectTemplates,
					fallbackPrefix,
				);
				const externalId = `${config.externalIdPrefix}${ticketNum}`;
				const requester = getRandomFrom(config.requesters);
				const agent = getRandomFrom(config.agents);
				const priority = getWeightedRandom(
					config.priorities,
					config.priorityWeights,
				);
				const sourceMetadata = config.generateMetadata(
					ticketNum,
					subject,
					requester,
					agent,
					priority,
				);
				const createdAt = getRandomCreatedAt();
				const description = generateDescription(
					subject,
					config.descriptionPrefixes,
					config.descriptionSuffixes,
				);

				// ~40% of tickets are closed with resolution (historical)
				const isClosed = Math.random() < 0.4;
				const resolutions = resolutionTemplates[clusterName] || [
					"Issue resolved. Verified with user.",
				];
				const resolution = isClosed
					? resolutions[Math.floor(Math.random() * resolutions.length)]
					: null;
				const externalStatus = isClosed ? "Closed" : config.externalStatus;
				const ritaStatus = isClosed ? "COMPLETED" : "NEEDS_RESPONSE";

				const insertResult = await client.query(
					`INSERT INTO tickets (
            organization_id, cluster_id, data_source_connection_id,
            external_id, subject, description, external_status, rita_status, source_metadata, created_at,
            requester, assigned_to, priority, resolution
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (organization_id, external_id) DO NOTHING`,
					[
						organizationId,
						clusterId,
						connectionId,
						externalId,
						subject,
						description,
						externalStatus,
						ritaStatus,
						JSON.stringify(sourceMetadata),
						createdAt,
						requester,
						agent || null,
						priority,
						resolution,
					],
				);

				if (insertResult.rowCount && insertResult.rowCount > 0) {
					ticketsCreated++;
				}
				ticketNum++;
			}
		}

		logger.info(
			{
				modelId,
				clustersCreated: clusterMap.size,
				ticketsCreated,
				initialState,
				scenario,
			},
			`${config.name} data sync completed`,
		);

		// Schedule delayed transition to complete for default scenario
		if (scenario === "complete") {
			setTimeout(async () => {
				try {
					await updateModelTrainingState(
						logger,
						organizationId,
						modelId,
						"complete",
					);
					logger.info(
						{ modelId, delay: TRAINING_COMPLETE_DELAY },
						"Training state transitioned to complete after delay",
					);
				} catch (error) {
					logger.error(
						{ error, modelId },
						"Failed to transition training state to complete",
					);
				}
			}, TRAINING_COMPLETE_DELAY);
		}

		return {
			modelId,
			clustersCreated: clusterMap.size,
			ticketsCreated,
		};
	});
}
