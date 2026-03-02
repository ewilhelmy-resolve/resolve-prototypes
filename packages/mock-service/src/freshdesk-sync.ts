import type pg from "pg";
import pino from "pino";
import { withTransaction } from "./database.js";

const logger = pino({
	name: "freshdesk-sync",
	level: process.env.LOG_LEVEL || "info",
});

// Realistic IT cluster names for Freshdesk tickets
const CLUSTER_NAMES = [
	"Account Access Issues",
	"Billing and Payment Inquiries",
	"Software Installation Requests",
	"Email Configuration Problems",
	"Password Reset Requests",
	"VPN Connection Issues",
	"Hardware Replacement Requests",
	"Network Connectivity Issues",
	"Application Performance Issues",
	"Data Recovery Requests",
	"Security Incident Reports",
	"New Employee Onboarding",
	"Printer and Scanner Issues",
	"Mobile Device Support",
	"Cloud Storage Issues",
	"Meeting Room Technology",
	"Software License Requests",
	"Browser Compatibility Issues",
	"Backup and Restore Issues",
	"IT Policy Questions",
	"Remote Desktop Issues",
	"File Sharing Problems",
	"System Update Requests",
	"Peripheral Device Issues",
	"Database Access Requests",
	"API Integration Issues",
	"Monitoring Alert Triage",
];

const SUBJECT_TEMPLATES: Record<string, string[]> = {
	"Account Access Issues": [
		"Unable to log in to my account",
		"Account locked after multiple attempts",
		"Need access to a new application",
		"Two-factor authentication not working",
		"SSO login fails intermittently",
	],
	"Billing and Payment Inquiries": [
		"Invoice discrepancy for last month",
		"Need updated billing information",
		"Duplicate charge on subscription",
		"Request for payment plan change",
		"Missing receipt for recent purchase",
	],
	"Software Installation Requests": [
		"Need Adobe Creative Suite installed",
		"Request to install development tools",
		"Python environment setup needed",
		"Docker Desktop installation request",
		"VS Code extensions not installing",
	],
	"Email Configuration Problems": [
		"Email not syncing on mobile device",
		"Outlook keeps asking for password",
		"Cannot send emails with attachments",
		"Email signature not displaying correctly",
		"Auto-reply not working as expected",
	],
	"Password Reset Requests": [
		"Forgot my password",
		"Password expired need reset",
		"Cannot change password in portal",
		"Need temporary password for new hire",
		"Password policy clarification needed",
	],
	"VPN Connection Issues": [
		"VPN disconnects every few minutes",
		"Cannot connect to VPN from home",
		"VPN extremely slow",
		"Need VPN access for contractor",
		"VPN client not starting",
	],
	"Network Connectivity Issues": [
		"Wi-Fi keeps dropping in building B",
		"Cannot access internal sites",
		"Slow internet speeds at desk",
		"DNS resolution failures",
		"Network drive not accessible",
	],
	"Application Performance Issues": [
		"Salesforce loading very slowly",
		"JIRA dashboard takes minutes to load",
		"Slack messages delayed significantly",
		"ERP system timing out",
		"Web application throwing 504 errors",
	],
	"Security Incident Reports": [
		"Received suspicious phishing email",
		"Unauthorized access attempt detected",
		"USB drive found in parking lot",
		"Possible malware on workstation",
		"Sensitive data exposed in shared folder",
	],
	"Printer and Scanner Issues": [
		"Printer showing offline status",
		"Scan to email not working",
		"Print jobs stuck in queue",
		"Need new printer driver",
		"Paper jam keeps recurring",
	],
	"Hardware Replacement Requests": [
		"Laptop keyboard key broken",
		"Monitor flickering needs replacement",
		"Mouse scroll wheel not working",
		"Laptop battery not holding charge",
		"Headset microphone stopped working",
	],
};

function getRandomSubject(clusterName: string): string {
	const templates = SUBJECT_TEMPLATES[clusterName];
	if (templates && templates.length > 0) {
		return templates[Math.floor(Math.random() * templates.length)];
	}
	return `Support request: ${clusterName}`;
}

const DESCRIPTION_PREFIXES = [
	"Hi team, ",
	"Hello, I need assistance. ",
	"Urgent: ",
	"",
	"Good morning, ",
	"I'm having trouble with: ",
];

const DESCRIPTION_SUFFIXES = [
	" Please help.",
	" This is affecting my work.",
	" Thank you.",
	"",
	" Can someone assist?",
	" Appreciate the help.",
];

function generateDescription(subject: string): string {
	const prefix =
		DESCRIPTION_PREFIXES[
			Math.floor(Math.random() * DESCRIPTION_PREFIXES.length)
		];
	const suffix =
		DESCRIPTION_SUFFIXES[
			Math.floor(Math.random() * DESCRIPTION_SUFFIXES.length)
		];
	return `${prefix}${subject}${suffix}`;
}

const REQUESTERS = [
	"john.doe@acme.com",
	"jane.smith@acme.com",
	"carlos.garcia@acme.com",
	"wei.zhang@acme.com",
	"sarah.wilson@acme.com",
	"mike.johnson@acme.com",
	"anna.lee@acme.com",
	"peter.brown@acme.com",
	"maria.martinez@acme.com",
	"tom.davis@acme.com",
];

const AGENTS = [
	"Support Team",
	"Help Desk Agent",
	"IT Support",
	"Network Admin",
	"Security Team",
	"",
	"",
	"",
];

const PRIORITIES = ["low", "medium", "high", "urgent"];
const PRIORITY_WEIGHTS = [0.2, 0.5, 0.2, 0.1];

const KB_STATUSES = ["PENDING", "FOUND", "GAP"] as const;
const KB_STATUS_WEIGHTS = [0.2, 0.5, 0.3];

function getRandomFrom<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

function getWeightedRandom(values: string[], weights: number[]): string {
	const rand = Math.random();
	let cumulative = 0;
	for (let i = 0; i < values.length; i++) {
		cumulative += weights[i];
		if (rand < cumulative) return values[i];
	}
	return values[0];
}

function generateFreshdeskMetadata(
	ticketId: number,
	subject: string,
	requester: string,
	agent: string,
	priority: string,
): object {
	const now = new Date().toISOString();
	const priorityMap: Record<string, number> = {
		low: 1,
		medium: 2,
		high: 3,
		urgent: 4,
	};
	const statusMap = { open: 2, pending: 3, resolved: 4, closed: 5 };

	return {
		id: ticketId,
		subject,
		description_text: generateDescription(subject),
		type: "Incident",
		status: statusMap.open,
		priority: priorityMap[priority] || 2,
		source: 2, // Portal
		requester_id: Math.floor(Math.random() * 100000) + 1000,
		responder_id: agent ? Math.floor(Math.random() * 100) + 1 : null,
		group_id: Math.floor(Math.random() * 10) + 1,
		company_id: 1,
		created_at: now,
		updated_at: now,
		due_by: null,
		fr_due_by: null,
		is_escalated: false,
		tags: [],
		cc_emails: [],
		fwd_emails: [],
		reply_cc_emails: [],
		spam: false,
		requester: {
			email: requester,
			name: requester.split("@")[0].replace(".", " "),
		},
		stats: {
			agent_responded_at: null,
			requester_responded_at: null,
			first_responded_at: null,
			status_updated_at: now,
			reopened_at: null,
			resolved_at: null,
			closed_at: null,
		},
	};
}

export interface SyncResult {
	modelId: string | null;
	clustersCreated: number;
	ticketsCreated: number;
}

export interface FreshdeskSyncSettings {
	domain?: string;
	time_range_days?: number;
	[key: string]: unknown;
}

/**
 * Simulate Freshdesk ITSM sync by inserting realistic test data
 * Reuses the same DB schema (clusters + tickets + ml_model) as ServiceNow
 */
export async function syncFreshdeskData(
	organizationId: string,
	connectionId: string,
	ingestionRunId: string,
	_settings?: FreshdeskSyncSettings,
): Promise<SyncResult> {
	logger.info(
		{ organizationId, connectionId, ingestionRunId },
		"Starting Freshdesk data sync",
	);

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
		const externalModelId = `mock-freshdesk-model-${organizationId.substring(0, 8)}`;
		const modelMetadata = JSON.stringify({ training_state: "in_progress" });
		const modelResult = await client.query<{ id: string }>(
			`INSERT INTO ml_models (organization_id, external_model_id, model_name, active, metadata)
       VALUES ($1, $2, 'Freshdesk ITSM Model', true, $3::jsonb)
       ON CONFLICT (organization_id, external_model_id)
       DO UPDATE SET active = true, metadata = $3::jsonb, updated_at = NOW()
       RETURNING id`,
			[organizationId, externalModelId, modelMetadata],
		);
		const modelId = modelResult.rows[0].id;
		logger.debug({ modelId }, "ML model created/updated");

		// Create clusters
		const clusterMap = new Map<string, string>();
		for (const clusterName of CLUSTER_NAMES) {
			const kbStatus = getWeightedRandom(
				[...KB_STATUSES],
				[...KB_STATUS_WEIGHTS],
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
		let ticketNum = 50001;
		let ticketsCreated = 0;

		const getRandomCreatedAt = (): Date => {
			const now = new Date();
			const rand = Math.random();
			if (rand < 0.3) {
				return new Date(
					now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000,
				);
			} else if (rand < 0.5) {
				return new Date(
					now.getTime() - (30 + Math.random() * 60) * 24 * 60 * 60 * 1000,
				);
			} else if (rand < 0.75) {
				return new Date(
					now.getTime() - (90 + Math.random() * 90) * 24 * 60 * 60 * 1000,
				);
			} else {
				return new Date(
					now.getTime() - (180 + Math.random() * 185) * 24 * 60 * 60 * 1000,
				);
			}
		};

		for (const [clusterName, clusterId] of clusterMap) {
			const ticketsPerCluster = 5 + Math.floor(Math.random() * 11);

			for (let i = 0; i < ticketsPerCluster; i++) {
				const subject = getRandomSubject(clusterName);
				const externalId = `FD-${ticketNum}`;
				const requester = getRandomFrom(REQUESTERS);
				const agent = getRandomFrom(AGENTS);
				const priority = getWeightedRandom(PRIORITIES, PRIORITY_WEIGHTS);
				const sourceMetadata = generateFreshdeskMetadata(
					ticketNum,
					subject,
					requester,
					agent,
					priority,
				);
				const createdAt = getRandomCreatedAt();
				const description = generateDescription(subject);

				const insertResult = await client.query(
					`INSERT INTO tickets (
            organization_id, cluster_id, data_source_connection_id,
            external_id, subject, description, external_status, rita_status, source_metadata, created_at,
            requester, assigned_to, priority
          ) VALUES ($1, $2, $3, $4, $5, $6, 'Open', 'NEEDS_RESPONSE', $7, $8, $9, $10, $11)
          ON CONFLICT (organization_id, external_id) DO NOTHING`,
					[
						organizationId,
						clusterId,
						connectionId,
						externalId,
						subject,
						description,
						JSON.stringify(sourceMetadata),
						createdAt,
						requester,
						agent || null,
						priority,
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
			},
			"Freshdesk data sync completed",
		);

		// Transition model to complete after delay
		setTimeout(async () => {
			try {
				const { query } = await import("./database.js");
				await query(
					`UPDATE ml_models SET metadata = '{"training_state": "complete"}'::jsonb, updated_at = NOW() WHERE id = $1 AND organization_id = $2`,
					[modelId, organizationId],
				);
				logger.info({ modelId }, "Training state transitioned to complete");
			} catch (error) {
				logger.error({ error, modelId }, "Failed to transition training state");
			}
		}, 15000);

		return {
			modelId,
			clustersCreated: clusterMap.size,
			ticketsCreated,
		};
	});
}
