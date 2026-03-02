import {
	type ProviderConfig,
	syncProviderData,
	type TrainingScenario,
} from "./sync-common.js";

export type { SyncResult } from "./sync-common.js";

export interface SyncSettings {
	username?: string;
	instanceUrl?: string;
	time_range_days?: number;
	[key: string]: unknown;
}

// --- ServiceNow-specific data ---

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

const DESCRIPTION_PREFIXES = [
	"Hi, I need help with this issue: ",
	"This started happening today. ",
	"Urgent request - ",
	"",
	"Hello, ",
	"I'm experiencing an issue: ",
];

const DESCRIPTION_SUFFIXES = [
	" Please advise.",
	" This is blocking my work.",
	" Thanks in advance.",
	"",
	" Can someone help?",
	" Any help appreciated.",
];

const REQUESTERS = [
	"adams@acme.com",
	"jsmith@acme.com",
	"maria.garcia@acme.com",
	"chen.wei@acme.com",
	"bob.wilson@acme.com",
	"sarah.jones@acme.com",
	"alex.kim@acme.com",
	"lisa.brown@acme.com",
	"david.lee@acme.com",
	"emma.taylor@acme.com",
];

const ASSIGNED_TO_AGENTS = [
	"IT Help Desk",
	"John Support",
	"Network Team",
	"Desktop Support",
	"Security Team",
	"",
	"",
	"",
];

function generateSourceMetadata(
	ticketNum: number,
	subject: string,
	requester: string,
	assignedTo: string,
	priority: string,
): object {
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
		number: {
			value: `INC00${ticketNum}`,
			display_value: `INC00${ticketNum}`,
		},
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
		approval: {
			value: "not requested",
			display_value: "Not Yet Requested",
		},
		category: { value: "inquiry", display_value: "Inquiry / Help" },
		comments: { value: "", display_value: "" },
		contract: { value: "", display_value: "" },
		due_date: { value: "", display_value: "" },
		location: { value: "", display_value: "" },
		made_sla: { value: "true", display_value: "true" },
		priority: { value: priority, display_value: priority },
		severity: { value: "3", display_value: "3 - Low" },
		sys_tags: { value: "", display_value: "" },
		work_end: { value: "", display_value: "" },
		caller_id: {
			link: "https://dev280992.service-now.com/api/now/table/sys_user/62826bf03710200044e0bfc8bcbe5df1",
			value: "62826bf03710200044e0bfc8bcbe5df1",
			display_value: requester,
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
		assigned_to: {
			value: assignedTo || "",
			display_value: assignedTo || "",
		},
		close_notes: { value: "", display_value: "" },
		description: { value: subject, display_value: subject },
		hold_reason: { value: "", display_value: "" },
		reopened_by: { value: "", display_value: "" },
		resolved_at: { value: "", display_value: "" },
		resolved_by: { value: "", display_value: "" },
		subcategory: { value: "", display_value: null },
		time_worked: { value: "", display_value: "" },
		upon_reject: {
			value: "cancel",
			display_value: "Cancel all future Tasks",
		},
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
		upon_approval: {
			value: "proceed",
			display_value: "Proceed to Next Task",
		},
		correlation_id: { value: "", display_value: "" },
		expected_start: { value: "", display_value: "" },
		incident_state: { value: "1", display_value: "New" },
		sys_class_name: { value: "incident", display_value: "Incident" },
		sys_created_by: {
			value: "mock-service",
			display_value: "mock-service",
		},
		sys_created_on: { value: now, display_value: now },
		sys_updated_by: {
			value: "mock-service",
			display_value: "mock-service",
		},
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

function matchServiceNowScenario(username: string): TrainingScenario {
	const lower = username.toLowerCase();
	if (lower === "mock-null") return "null";
	if (lower === "mock-failed") return "failed";
	if (lower === "mock-progress") return "progress";
	return "complete";
}

export const servicenowConfig: ProviderConfig = {
	name: "servicenow",
	loggerName: "servicenow-sync",
	modelName: "ServiceNow ITSM Model",
	externalModelIdPrefix: "mock-model-",
	externalIdPrefix: "INC00",
	externalStatus: "New",
	ticketNumStart: 10001,
	clusterNames: CLUSTER_NAMES,
	subjectTemplates: SUBJECT_TEMPLATES,
	descriptionPrefixes: DESCRIPTION_PREFIXES,
	descriptionSuffixes: DESCRIPTION_SUFFIXES,
	requesters: REQUESTERS,
	agents: ASSIGNED_TO_AGENTS,
	priorities: ["low", "medium", "high", "critical"],
	priorityWeights: [0.2, 0.5, 0.2, 0.1],
	kbStatusWeights: [0.2, 0.5, 0.3],
	dateDistribution: [0.3, 0.5, 0.75, 1.0],
	dateRanges: [
		[0, 30],
		[30, 90],
		[90, 180],
		[180, 365],
	],
	generateMetadata: generateSourceMetadata,
	getScenarioKey: (settings) => (settings?.username as string) || undefined,
	matchScenario: matchServiceNowScenario,
};

// --- Public API (backward-compatible signatures) ---

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
): Promise<import("./sync-common.js").SyncResult> {
	return syncProviderData(
		servicenowConfig,
		organizationId,
		connectionId,
		ingestionRunId,
		settings,
	);
}
