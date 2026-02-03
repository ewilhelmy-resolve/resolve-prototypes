import type pg from "pg";
import pino from "pino";
import { withTransaction } from "./database.js";

const logger = pino({
	name: "servicenow-sync",
	level: process.env.LOG_LEVEL || "info",
});

// Realistic IT cluster names from ServiceNow
const CLUSTER_NAMES = [
	"Testing",
	"Network and Connectivity Issues",
	"Office IT Support",
	"IT Support Issues",
	"IT Security Requests",
	"IT System Issues",
	"Software Issues",
	"Video Conferencing Issues",
	"Internal IT Issues",
	"Wi-Fi Access Requests",
	"Chrome Browser Issues",
	"Office Equipment Requests",
	"Tableau Issues",
	"IT Service Requests",
	"Computer Hardware Issues",
	"Printer Issues",
	"File Access Issues",
	"Device Compatibility Issues",
	"Network Connectivity Issues",
	"Salesforce Issues",
	"IT Support Requests",
	"User Access Issues",
	"Team Collaboration Issues",
	"Email Encryption Issues",
	"Corporate Mobile Support",
	"Data Backup Requests",
	"Laptop Screen Issues",
];

// Subject templates by cluster type
const SUBJECT_TEMPLATES: Record<string, string[]> = {
	"Network and Connectivity Issues": [
		"Cannot connect to corporate network",
		"Network connection keeps dropping",
		"Slow network speeds in building 3",
		"Unable to access shared drives",
		"Network timeout errors",
	],
	"Office IT Support": [
		"Need help setting up new monitor",
		"Desk phone not working",
		"Request for standing desk setup",
		"Conference room display not connecting",
		"New employee workstation setup",
	],
	"IT Support Issues": [
		"General IT assistance needed",
		"Cannot log into system after password change",
		"Need help with software installation",
		"Computer running slow",
		"Blue screen error on startup",
	],
	"IT Security Requests": [
		"Request for VPN access",
		"Need security clearance for new project",
		"Suspicious email received",
		"Request to whitelist application",
		"Security badge not working",
	],
	"IT System Issues": [
		"System keeps crashing",
		"Application not responding",
		"Database connection error",
		"Server timeout issues",
		"Batch job failed overnight",
	],
	"Software Issues": [
		"Software license expired",
		"Application update failed",
		"Need newer version of software",
		"Plugin compatibility issue",
		"Software crashes on launch",
	],
	"Video Conferencing Issues": [
		"Zoom meeting audio not working",
		"Teams video freezing during calls",
		"Cannot share screen in WebEx",
		"Meeting room camera offline",
		"Echo in conference calls",
	],
	"Wi-Fi Access Requests": [
		"Guest Wi-Fi access needed",
		"Cannot connect to corporate Wi-Fi",
		"Wi-Fi signal weak in office area",
		"Need Wi-Fi credentials reset",
		"Wi-Fi keeps disconnecting",
	],
	"Chrome Browser Issues": [
		"Chrome not loading pages",
		"Browser extension not working",
		"Chrome crashes frequently",
		"Bookmarks disappeared",
		"Cannot download files in Chrome",
	],
	"Office Equipment Requests": [
		"Request for new keyboard",
		"Need ergonomic mouse",
		"Monitor arm installation request",
		"Headset replacement needed",
		"Request for laptop stand",
	],
	"Computer Hardware Issues": [
		"Laptop screen flickering",
		"Keyboard keys not working",
		"USB ports not recognizing devices",
		"Laptop battery draining fast",
		"Computer making strange noise",
	],
	"Printer Issues": [
		"Printer not printing",
		"Print jobs stuck in queue",
		"Paper jam in printer",
		"Need printer driver installed",
		"Color printing not working",
	],
	"File Access Issues": [
		"Cannot access shared folder",
		"Permission denied on network drive",
		"Files missing from folder",
		"Cannot save to network location",
		"File locked by another user",
	],
	"Salesforce Issues": [
		"Salesforce not loading",
		"Report not generating correctly",
		"Dashboard showing wrong data",
		"Cannot create new opportunity",
		"Salesforce sync error",
	],
	"User Access Issues": [
		"Account locked out",
		"Need access to new system",
		"Permission change request",
		"Cannot reset password",
		"MFA not working",
	],
	"Email Encryption Issues": [
		"Cannot send encrypted email",
		"Encrypted email not decrypting",
		"Need encryption certificate",
		"Email marked as spam incorrectly",
		"Secure email portal access issue",
	],
	"Laptop Screen Issues": [
		"Screen is cracked",
		"Display colors look wrong",
		"Screen goes black randomly",
		"External monitor not detected",
		"Screen brightness stuck",
	],
};

function getRandomSubject(clusterName: string): string {
	const templates = SUBJECT_TEMPLATES[clusterName];
	if (templates && templates.length > 0) {
		return templates[Math.floor(Math.random() * templates.length)];
	}
	return `General support request for ${clusterName}`;
}

function generateSourceMetadata(ticketNum: number, subject: string): object {
	const now = new Date().toISOString();
	const sysId = crypto.randomUUID();

	return {
		rfc: { value: "", display_value: "" },
		cause: { value: "", display_value: "" },
		order: { value: "", display_value: "" },
		state: { value: "1", display_value: "New" },
		active: { value: "true", display_value: "true" },
		impact: { value: "3", display_value: "3 - Low" },
		notify: { value: "1", display_value: "Do Not Notify" },
		number: { value: `INC00${ticketNum}`, display_value: `INC00${ticketNum}` },
		parent: { value: "", display_value: "" },
		skills: { value: "", display_value: "" },
		sys_id: { value: sysId, display_value: sysId },
		cmdb_ci: { value: "", display_value: "" },
		company: {
			link: "https://dev280992.service-now.com/api/now/table/core_company/227cdfb03710200044e0bfc8bcbe5d6b",
			value: "227cdfb03710200044e0bfc8bcbe5d6b",
			display_value: "ACME South America",
		},
		sla_due: { value: "", display_value: "UNKNOWN" },
		urgency: { value: "3", display_value: "3 - Low" },
		approval: { value: "not requested", display_value: "Not Yet Requested" },
		category: { value: "inquiry", display_value: "Inquiry / Help" },
		comments: { value: "", display_value: "" },
		contract: { value: "", display_value: "" },
		due_date: { value: "", display_value: "" },
		location: { value: "", display_value: "" },
		made_sla: { value: "true", display_value: "true" },
		priority: { value: "5", display_value: "5 - Planning" },
		severity: { value: "3", display_value: "3 - Low" },
		sys_tags: { value: "", display_value: "" },
		work_end: { value: "", display_value: "" },
		caller_id: {
			link: "https://dev280992.service-now.com/api/now/table/sys_user/62826bf03710200044e0bfc8bcbe5df1",
			value: "62826bf03710200044e0bfc8bcbe5df1",
			display_value: "Abel A Tuter",
		},
		caused_by: { value: "", display_value: "" },
		closed_at: { value: "", display_value: "" },
		closed_by: { value: "", display_value: "" },
		follow_up: { value: "", display_value: "" },
		knowledge: { value: "false", display_value: "false" },
		opened_at: { value: now, display_value: now },
		opened_by: {
			link: "https://dev280992.service-now.com/api/now/table/sys_user/80e3d992c31812109cfabdac0501319b",
			value: "80e3d992c31812109cfabdac0501319b",
			display_value: "ankit mishra",
		},
		origin_id: { value: "", display_value: "" },
		close_code: { value: "", display_value: null },
		escalation: { value: "0", display_value: "Normal" },
		group_list: { value: "", display_value: "" },
		problem_id: { value: "", display_value: "" },
		sys_domain: {
			link: "https://dev280992.service-now.com/api/now/table/sys_user_group/global",
			value: "global",
			display_value: "global",
		},
		user_input: { value: "", display_value: "" },
		watch_list: { value: "", display_value: "" },
		work_notes: { value: "", display_value: "" },
		work_start: { value: "", display_value: "" },
		assigned_to: { value: "", display_value: "" },
		close_notes: { value: "", display_value: "" },
		description: { value: subject, display_value: subject },
		hold_reason: { value: "", display_value: "" },
		reopened_by: { value: "", display_value: "" },
		resolved_at: { value: "", display_value: "" },
		resolved_by: { value: "", display_value: "" },
		subcategory: { value: "", display_value: null },
		time_worked: { value: "", display_value: "" },
		upon_reject: { value: "cancel", display_value: "Cancel all future Tasks" },
		activity_due: { value: "", display_value: "UNKNOWN" },
		approval_set: { value: "", display_value: "" },
		business_stc: { value: "", display_value: "" },
		calendar_stc: { value: "", display_value: "" },
		contact_type: { value: "", display_value: null },
		origin_table: { value: "", display_value: "" },
		reopen_count: { value: "0", display_value: "0" },
		route_reason: { value: "", display_value: "" },
		reopened_time: { value: "", display_value: "" },
		sys_mod_count: { value: "0", display_value: "0" },
		upon_approval: { value: "proceed", display_value: "Proceed to Next Task" },
		correlation_id: { value: "", display_value: "" },
		expected_start: { value: "", display_value: "" },
		incident_state: { value: "1", display_value: "New" },
		sys_class_name: { value: "incident", display_value: "Incident" },
		sys_created_by: { value: "mock-service", display_value: "mock-service" },
		sys_created_on: { value: now, display_value: now },
		sys_updated_by: { value: "mock-service", display_value: "mock-service" },
		sys_updated_on: { value: now, display_value: now },
		business_impact: { value: "", display_value: "" },
		child_incidents: { value: "0", display_value: "0" },
		parent_incident: { value: "", display_value: "" },
		sys_domain_path: { value: "/", display_value: "/" },
		work_notes_list: { value: "", display_value: "" },
		approval_history: { value: "", display_value: "" },
		assignment_group: { value: "", display_value: "" },
		business_service: { value: "", display_value: "" },
		service_offering: { value: "", display_value: "" },
		short_description: { value: subject, display_value: subject },
		business_duration: { value: "", display_value: "" },
		calendar_duration: { value: "", display_value: "" },
		universal_request: { value: "", display_value: "" },
		reassignment_count: { value: "0", display_value: "0" },
		correlation_display: { value: "", display_value: "" },
		task_effective_number: {
			value: `INC00${ticketNum}`,
			display_value: `INC00${ticketNum}`,
		},
		comments_and_work_notes: { value: "", display_value: "" },
		additional_assignee_list: { value: "", display_value: "" },
		u_vendor_assignment_group: { value: "", display_value: null },
	};
}

export interface SyncResult {
	modelId: string | null;
	clustersCreated: number;
	ticketsCreated: number;
}

export interface SyncSettings {
	username?: string;
	instanceUrl?: string;
	time_range_days?: number;
	[key: string]: unknown;
}

// Training state scenarios based on username convention
type TrainingScenario = "null" | "failed" | "progress" | "complete";

// Delay before transitioning from in_progress to complete (ms)
const TRAINING_COMPLETE_DELAY = 15000; // 15 seconds

/**
 * Determine training scenario from username
 * - mock-null: Don't create ml_model
 * - mock-failed: Create with training_state: "failed"
 * - mock-progress: Create with training_state: "in_progress" (stays there)
 * - (default): Create with in_progress, transition to complete after delay
 */
function getTrainingScenario(username: string | undefined): TrainingScenario {
	if (!username) return "complete";

	const lowerUsername = username.toLowerCase();
	if (lowerUsername === "mock-null") return "null";
	if (lowerUsername === "mock-failed") return "failed";
	if (lowerUsername === "mock-progress") return "progress";
	return "complete";
}

/**
 * Update ML model training state (used for delayed transitions)
 */
async function updateModelTrainingState(
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

/**
 * Simulate ServiceNow ITSM sync by inserting realistic test data
 *
 * Username convention for testing different training states:
 * - mock-null: Don't create ml_model (test "no model" state)
 * - mock-failed: Create model with training_state: "failed"
 * - mock-progress: Create with training_state: "in_progress" (stays)
 * - (any other): Create with in_progress → complete after 15s delay
 */
export async function syncServiceNowData(
	organizationId: string,
	connectionId: string,
	ingestionRunId: string,
	settings?: SyncSettings,
): Promise<SyncResult> {
	const username = settings?.username;
	const scenario = getTrainingScenario(username);

	logger.info(
		{
			organizationId,
			connectionId,
			ingestionRunId,
			username,
			scenario,
		},
		"Starting ServiceNow data sync",
	);

	// Handle mock-null scenario: clean up existing data but don't create model
	if (scenario === "null") {
		const { query } = await import("./database.js");

		// Clean up existing tickets, clusters, and models
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
		return {
			modelId: null,
			clustersCreated: 0,
			ticketsCreated: 0,
		};
	}

	// Determine initial training state
	const initialState =
		scenario === "failed"
			? "failed"
			: scenario === "progress"
				? "in_progress"
				: "in_progress"; // complete scenario starts as in_progress

	return withTransaction(async (client: pg.PoolClient) => {
		// 0. Clean up existing tickets and clusters for this organization
		// This ensures consistent behavior on repeated syncs
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

		// 1. Create/update ml_model with appropriate training state
		const externalModelId = `mock-model-${organizationId.substring(0, 8)}`;
		const modelMetadata = JSON.stringify({ training_state: initialState });
		const modelResult = await client.query<{ id: string }>(
			`INSERT INTO ml_models (organization_id, external_model_id, model_name, active, metadata)
       VALUES ($1, $2, 'ServiceNow ITSM Model', true, $3::jsonb)
       ON CONFLICT (organization_id, external_model_id)
       DO UPDATE SET active = true, metadata = $3::jsonb, updated_at = NOW()
       RETURNING id`,
			[organizationId, externalModelId, modelMetadata],
		);
		const modelId = modelResult.rows[0].id;
		logger.debug({ modelId, initialState }, "ML model created/updated");

		// 2. Create clusters
		const clusterMap = new Map<string, string>();
		for (const clusterName of CLUSTER_NAMES) {
			const clusterResult = await client.query<{ id: string }>(
				`INSERT INTO clusters (organization_id, model_id, name, subcluster_name, config, kb_status)
         VALUES ($1, $2, $3, NULL, '{}', 'PENDING')
         ON CONFLICT (organization_id, model_id, name, COALESCE(subcluster_name, ''))
         DO UPDATE SET updated_at = NOW()
         RETURNING id`,
				[organizationId, modelId, clusterName],
			);
			clusterMap.set(clusterName, clusterResult.rows[0].id);
		}
		logger.debug({ clusterCount: clusterMap.size }, "Clusters created/updated");

		// 3. Create tickets with weighted distribution (5-15 per cluster)
		// Spread tickets across different time periods for testing filters
		let ticketNum = 10001;
		let ticketsCreated = 0;

		// Date ranges for testing period filters
		const getRandomCreatedAt = (): Date => {
			const now = new Date();
			const rand = Math.random();
			if (rand < 0.3) {
				// 30% in last 30 days
				return new Date(
					now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000,
				);
			} else if (rand < 0.5) {
				// 20% in 30-90 days ago
				return new Date(
					now.getTime() - (30 + Math.random() * 60) * 24 * 60 * 60 * 1000,
				);
			} else if (rand < 0.75) {
				// 25% in 90 days - 6 months ago
				return new Date(
					now.getTime() - (90 + Math.random() * 90) * 24 * 60 * 60 * 1000,
				);
			} else {
				// 25% in 6 months - 1 year ago
				return new Date(
					now.getTime() - (180 + Math.random() * 185) * 24 * 60 * 60 * 1000,
				);
			}
		};

		for (const [clusterName, clusterId] of clusterMap) {
			const ticketsPerCluster = 5 + Math.floor(Math.random() * 11); // 5-15

			for (let i = 0; i < ticketsPerCluster; i++) {
				const subject = getRandomSubject(clusterName);
				const externalId = `INC00${ticketNum}`;
				const sourceMetadata = generateSourceMetadata(ticketNum, subject);
				const createdAt = getRandomCreatedAt();

				const insertResult = await client.query(
					`INSERT INTO tickets (
            organization_id, cluster_id, data_source_connection_id,
            external_id, subject, external_status, rita_status, source_metadata, created_at
          ) VALUES ($1, $2, $3, $4, $5, 'New', 'NEEDS_RESPONSE', $6, $7)
          ON CONFLICT (organization_id, external_id) DO NOTHING`,
					[
						organizationId,
						clusterId,
						connectionId,
						externalId,
						subject,
						JSON.stringify(sourceMetadata),
						createdAt,
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
			"ServiceNow data sync completed",
		);

		// Schedule delayed transition to complete for default scenario
		if (scenario === "complete") {
			setTimeout(async () => {
				try {
					await updateModelTrainingState(organizationId, modelId, "complete");
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
