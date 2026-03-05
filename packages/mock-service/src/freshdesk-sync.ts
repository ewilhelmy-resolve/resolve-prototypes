import {
	generateDescription,
	getTrainingScenarioFromConfig,
	type ProviderConfig,
	syncProviderData,
	type TrainingScenario,
} from "./sync-common.js";

export type { SyncResult } from "./sync-common.js";

export interface FreshdeskSyncSettings {
	domain?: string;
	time_range_days?: number;
	[key: string]: unknown;
}

// --- Freshdesk-specific data ---

const CLUSTER_NAMES = [
	"Subscription & Billing Disputes",
	"Account Lockout & Recovery",
	"Onboarding & Setup Assistance",
	"Refund & Cancellation Requests",
	"Product Feature Requests",
	"SLA Breach Escalations",
	"Integration & API Failures",
	"Mobile App Crashes",
	"Payment Gateway Errors",
	"Data Export & Migration",
	"User Permission Conflicts",
	"Notification Delivery Failures",
	"Single Sign-On Problems",
	"Performance Degradation Reports",
	"Compliance & Audit Requests",
	"Multi-Tenant Configuration",
	"Webhook Delivery Failures",
	"Report Generation Errors",
	"Bulk Import Failures",
	"Custom Field Validation",
	"Workflow Automation Bugs",
	"Dashboard Loading Timeouts",
	"Email Template Rendering",
	"Third-Party Plugin Conflicts",
	"Sandbox Environment Issues",
	"Rate Limiting Complaints",
	"Localization & Translation Bugs",
];

const SUBJECT_TEMPLATES: Record<string, string[]> = {
	"Subscription & Billing Disputes": [
		"Charged twice for annual plan",
		"Pro features missing after upgrade",
		"Invoice shows wrong tax amount",
		"Cannot downgrade to free tier",
		"Coupon code not applying at checkout",
	],
	"Account Lockout & Recovery": [
		"Locked out after password reset email expired",
		"Recovery email goes to old address",
		"MFA device lost, need backup codes",
		"Account suspended without explanation",
		"Cannot verify identity for recovery",
	],
	"Onboarding & Setup Assistance": [
		"Need help importing data from competitor",
		"Wizard stuck on team invitation step",
		"Custom domain setup failing SSL check",
		"Initial data sync taking over 24 hours",
		"Welcome email never arrived",
	],
	"Refund & Cancellation Requests": [
		"Cancel subscription effective immediately",
		"Partial refund for unused months",
		"Trial auto-renewed without warning",
		"Need prorated refund after downgrade",
		"Cancellation confirmed but still being charged",
	],
	"Product Feature Requests": [
		"Need bulk action support in list view",
		"Custom role permissions for team leads",
		"Dark mode for web dashboard",
		"Scheduled report delivery via email",
		"Keyboard shortcuts for common actions",
	],
	"SLA Breach Escalations": [
		"Response time exceeded 4-hour SLA",
		"Critical ticket unresolved for 48 hours",
		"Escalation rules not triggering correctly",
		"SLA clock not pausing on customer reply",
		"Priority override not reflecting in queue",
	],
	"Integration & API Failures": [
		"Slack integration stopped posting updates",
		"REST API returning 503 intermittently",
		"Zapier trigger not firing on new tickets",
		"Salesforce sync duplicating contacts",
		"GitHub issue linking broken after update",
	],
	"Mobile App Crashes": [
		"App crashes on launch after iOS update",
		"Push notifications not arriving on Android",
		"Offline mode loses draft replies",
		"Camera attachment upload hangs indefinitely",
		"Biometric login fails after app update",
	],
	"Payment Gateway Errors": [
		"Stripe webhook returning 422 errors",
		"PayPal recurring payment declined",
		"Credit card update form not loading",
		"3D Secure verification loop",
		"Currency conversion showing stale rates",
	],
	"Data Export & Migration": [
		"CSV export truncating description field",
		"JSON export missing custom field values",
		"Migration from Zendesk lost ticket tags",
		"Attachment URLs broken after export",
		"Export job stuck at 99% for hours",
	],
	"User Permission Conflicts": [
		"Agent can see tickets from other department",
		"Admin role missing billing section access",
		"Custom role lost permissions after update",
		"Group restriction not filtering dashboard",
		"Shared inbox visibility leaking to wrong team",
	],
};

const DESCRIPTION_PREFIXES = [
	"Hi support, ",
	"We're experiencing an issue — ",
	"URGENT: ",
	"",
	"Our team has noticed that ",
	"Following up on this: ",
];

const DESCRIPTION_SUFFIXES = [
	" This is blocking our workflow.",
	" Multiple users affected.",
	" Thanks for looking into this.",
	"",
	" Please prioritize.",
	" Let me know if you need more details.",
];

const REQUESTERS = [
	"cto@startupco.io",
	"ops.lead@retailchain.com",
	"devops@fintech-corp.com",
	"support.mgr@healthsys.org",
	"admin@edtech-platform.com",
	"infra@logisticsapp.io",
	"product@saas-vendor.com",
	"eng.director@mediagroup.net",
	"it.manager@nonprofit.org",
	"ciso@insurancetech.com",
];

const AGENTS = [
	"Tier 1 Support",
	"Tier 2 Engineering",
	"Billing Team",
	"Customer Success",
	"DevOps On-Call",
	"",
	"",
	"",
];

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
		description_text: generateDescription(
			subject,
			DESCRIPTION_PREFIXES,
			DESCRIPTION_SUFFIXES,
		),
		type: "Incident",
		status: statusMap.open,
		priority: priorityMap[priority] || 2,
		source: 2,
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

function matchFreshdeskScenario(domain: string): TrainingScenario {
	const lower = domain.toLowerCase();
	if (lower.includes("mock-null")) return "null";
	if (lower.includes("mock-failed")) return "failed";
	if (lower.includes("mock-progress")) return "progress";
	return "complete";
}

const freshdeskConfig: ProviderConfig = {
	name: "freshservice_itsm",
	loggerName: "freshdesk-sync",
	modelName: "Freshdesk ITSM Model",
	externalModelIdPrefix: "mock-freshdesk-model-",
	externalIdPrefix: "FD-",
	externalStatus: "Open",
	ticketNumStart: 50001,
	clusterNames: CLUSTER_NAMES,
	subjectTemplates: SUBJECT_TEMPLATES,
	descriptionPrefixes: DESCRIPTION_PREFIXES,
	descriptionSuffixes: DESCRIPTION_SUFFIXES,
	requesters: REQUESTERS,
	agents: AGENTS,
	priorities: ["low", "medium", "high", "urgent"],
	priorityWeights: [0.15, 0.45, 0.25, 0.15],
	kbStatusWeights: [0.3, 0.4, 0.3],
	dateDistribution: [0.25, 0.55, 0.8, 1.0],
	dateRanges: [
		[0, 14],
		[14, 60],
		[60, 120],
		[120, 240],
	],
	generateMetadata: generateFreshdeskMetadata,
	getScenarioKey: (settings) => (settings?.domain as string) || undefined,
	matchScenario: matchFreshdeskScenario,
};

// --- Public API (backward-compatible signatures) ---

/**
 * Determine training scenario from domain
 * - mock-null.freshdesk.com: Don't create ml_model
 * - mock-failed.freshdesk.com: Create with training_state: "failed"
 * - mock-progress.freshdesk.com: Create with training_state: "in_progress" (stays)
 * - (default): Create with in_progress, transition to complete after delay
 */
export function getTrainingScenario(
	domain: string | undefined,
): TrainingScenario {
	return getTrainingScenarioFromConfig(freshdeskConfig, { domain });
}

/**
 * Simulate Freshdesk ITSM sync by inserting realistic test data
 */
export async function syncFreshdeskData(
	organizationId: string,
	connectionId: string,
	ingestionRunId: string,
	settings?: FreshdeskSyncSettings,
): Promise<import("./sync-common.js").SyncResult> {
	return syncProviderData(
		freshdeskConfig,
		organizationId,
		connectionId,
		ingestionRunId,
		settings,
	);
}
