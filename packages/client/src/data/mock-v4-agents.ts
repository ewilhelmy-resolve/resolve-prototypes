import {
	type LucideIcon,
	MessageSquare,
	Search,
	Stethoscope,
	Wrench,
} from "lucide-react";

export interface MockSkill {
	id: string;
	name: string;
	description: string;
	/** What the skill simulates doing during a dry-run */
	dryRunSummary: string;
	/** Mock fields this skill would collect or populate */
	dataPoints?: string[];
}

export interface MockAgent {
	id: string;
	name: string;
	description: string;
	archetype: "diagnosis" | "data-collection" | "resolution" | "triage";
	icon: LucideIcon;
	iconBg: string;
	skills: MockSkill[];
}

export const MOCK_V4_AGENTS: MockAgent[] = [
	{
		id: "agent-diagnosis",
		name: "Diagnosis Agent",
		description:
			"Investigates symptoms, cross-references similar resolved tickets, and proposes a likely root cause.",
		archetype: "diagnosis",
		icon: Stethoscope,
		iconBg: "bg-blue-100",
		skills: [
			{
				id: "skill-symptom-parse",
				name: "Parse symptoms",
				description: "Extract structured symptom list from ticket body",
				dryRunSummary:
					"Extracts 3 symptoms from the ticket: connection timeout, slow boot, intermittent wifi",
				dataPoints: ["symptoms[]", "affected_app", "first_seen"],
			},
			{
				id: "skill-similar-search",
				name: "Find similar resolved tickets",
				description: "Semantic search across past resolved tickets",
				dryRunSummary:
					"Found 4 similar tickets resolved in last 30 days with 82% symptom overlap",
				dataPoints: ["similar_ticket_ids[]", "common_resolution"],
			},
			{
				id: "skill-root-cause",
				name: "Propose root cause",
				description: "Summarize most likely root cause from evidence",
				dryRunSummary:
					"Proposes: 'DNS misconfiguration after recent VPN client update'",
				dataPoints: ["root_cause_hypothesis", "confidence"],
			},
		],
	},
	{
		id: "agent-data-collection",
		name: "Data Collection Agent",
		description:
			"Gathers missing context from the user and connected systems when tickets lack detail.",
		archetype: "data-collection",
		icon: Search,
		iconBg: "bg-amber-100",
		skills: [
			{
				id: "skill-context-gap",
				name: "Detect context gaps",
				description: "Identify missing fields needed to diagnose",
				dryRunSummary:
					"Detects 2 missing fields: device model, last working time",
				dataPoints: ["missing_fields[]"],
			},
			{
				id: "skill-ask-user",
				name: "Ask user follow-ups",
				description: "Draft and send targeted follow-up questions to requester",
				dryRunSummary:
					"Would send: 'Can you share your device model and when this last worked?'",
				dataPoints: ["followup_message", "followup_channel"],
			},
			{
				id: "skill-system-lookup",
				name: "System lookups",
				description: "Query asset and config DBs for device context",
				dryRunSummary:
					"Would fetch from AssetDB: device_model, os_version, last_patch_date",
				dataPoints: ["device_model", "os_version", "last_patch_date"],
			},
		],
	},
	{
		id: "agent-resolution",
		name: "Resolution Agent",
		description:
			"Applies a known fix from the knowledge base when confidence is high.",
		archetype: "resolution",
		icon: Wrench,
		iconBg: "bg-emerald-100",
		skills: [
			{
				id: "skill-kb-match",
				name: "Match to KB article",
				description: "Find the best-matching KB article for the ticket",
				dryRunSummary: "Matches KB-284 'VPN DNS reset' with 91% confidence",
				dataPoints: ["kb_article_id", "match_score"],
			},
			{
				id: "skill-apply-fix",
				name: "Apply fix steps",
				description: "Execute resolution steps against target system",
				dryRunSummary:
					"Would run 3 commands against user's endpoint; requires approval",
				dataPoints: ["commands[]", "target_endpoint"],
			},
			{
				id: "skill-verify",
				name: "Verify resolution",
				description: "Check if the issue is actually fixed post-action",
				dryRunSummary: "Would ping user 10 min after and check telemetry",
				dataPoints: ["verify_method", "recheck_at"],
			},
		],
	},
	{
		id: "agent-triage",
		name: "Triage Agent",
		description:
			"Classifies, prioritizes, and routes tickets to the right queue or agent.",
		archetype: "triage",
		icon: MessageSquare,
		iconBg: "bg-purple-100",
		skills: [
			{
				id: "skill-classify",
				name: "Classify ticket",
				description: "Assign category, subcategory, and urgency",
				dryRunSummary: "Classifies as Network > VPN, urgency=High (SLA 4h)",
				dataPoints: ["category", "subcategory", "urgency"],
			},
			{
				id: "skill-route",
				name: "Route to queue",
				description: "Pick the correct assignment group",
				dryRunSummary: "Routes to 'Network-L2' queue based on category + site",
				dataPoints: ["assignment_group"],
			},
		],
	},
];

export function getMockAgentById(
	id: string | null | undefined,
): MockAgent | null {
	if (!id) return null;
	return MOCK_V4_AGENTS.find((a) => a.id === id) ?? null;
}
