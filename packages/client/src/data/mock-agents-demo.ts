/**
 * Mock data powering the agent builder demo experience when the real
 * LLM / tools APIs are unavailable. Used by the client-side hook mocks
 * in src/hooks/api/useAgents.ts and useTools.ts.
 */

import type { ToolItem } from "@/services/api";
import type { AgentConfig, AgentTableRow } from "@/types/agent";
import { DEMO_AGENT_SCENARIOS } from "./demo-agents";

export const MOCK_TOOLS: ToolItem[] = [
	// HR / payroll
	{
		eid: "tool-check-pto",
		name: "Check Existing PTO",
		description: "Looks up an employee's PTO balance in the payroll system.",
		type: "workflow",
		active: true,
	},
	{
		eid: "tool-request-pto",
		name: "Request PTO",
		description:
			"Helps the user select PTO dates and submit the request to payroll.",
		type: "workflow",
		active: true,
	},
	{
		eid: "tool-block-outlook",
		name: "Block Outlook Calendar for PTO",
		description:
			"Creates a calendar event marking the employee as unavailable for approved PTO dates.",
		type: "workflow",
		active: true,
	},
	// IT / laptop
	{
		eid: "tool-submit-laptop",
		name: "Submit temporary Laptop request in ITSM",
		description:
			"Creates a temporary laptop loan request in the ITSM system and returns a confirmation number.",
		type: "workflow",
		active: true,
	},
	// Generic IT helpers
	{
		eid: "tool-reset-password",
		name: "Reset Password",
		description: "Resets an employee's password via the IdP.",
		type: "workflow",
		active: true,
	},
	{
		eid: "tool-unlock-account",
		name: "Unlock Account",
		description: "Unlocks a locked user account.",
		type: "workflow",
		active: true,
	},
	{
		eid: "tool-request-access",
		name: "Request Access",
		description: "Submits an access request to the owner of a system.",
		type: "workflow",
		active: true,
	},
	{
		eid: "tool-submit-expense",
		name: "Submit Expense Report",
		description: "Starts a new expense report for the employee.",
		type: "workflow",
		active: true,
	},
	// Knowledge
	{
		eid: "tool-search-kb",
		name: "Search Knowledge Base",
		description:
			"Performs a semantic search across knowledge articles and policies.",
		type: "knowledge",
		active: true,
	},
];

export interface MockAgentsListResponse {
	agents: AgentTableRow[];
	limit: number;
	offset: number;
	hasMore: boolean;
}

const now = () => new Date().toISOString();

function scenarioToRow(
	key: string,
	config: AgentConfig,
	state: AgentTableRow["state"],
): AgentTableRow {
	return {
		id: `demo-${key}`,
		name: config.name,
		description: config.description,
		state,
		skills: config.skills,
		updatedBy: "Demo User",
		owner: "Demo User",
		lastUpdated: now(),
	};
}

/** Full list of demo agents shown on /agents. */
export const MOCK_AGENTS_LIST: AgentTableRow[] = [
	...DEMO_AGENT_SCENARIOS.map((s, i) =>
		scenarioToRow(s.key, s.config, i === 0 ? "PUBLISHED" : "DRAFT"),
	),
	{
		id: "demo-helpdesk",
		name: "HelpDesk Advisor",
		description:
			"Answers helpdesk questions from the knowledge base and unlocks accounts.",
		state: "PUBLISHED",
		skills: ["Unlock Account", "Reset Password", "Search Knowledge Base"],
		updatedBy: "Demo User",
		owner: "Demo User",
		lastUpdated: now(),
	},
	{
		id: "demo-compliance",
		name: "Compliance Checker",
		description:
			"Walks employees through annual compliance training attestations.",
		state: "DRAFT",
		skills: ["Search Knowledge Base"],
		updatedBy: "Demo User",
		owner: "Demo User",
		lastUpdated: now(),
	},
];

/** Config map keyed by demo agent id for useAgent(eid) lookup. */
export const MOCK_AGENT_CONFIGS: Record<string, AgentConfig> =
	Object.fromEntries(
		DEMO_AGENT_SCENARIOS.map((s) => [
			`demo-${s.key}`,
			{ ...s.config, id: `demo-${s.key}`, state: "DRAFT" as const },
		]),
	);

/** Fake "improved" instructions used by useImproveInstructionsMutation. */
export function fakeImproveInstructions(current: string): {
	instructions: string;
	description: string;
} {
	const trimmed = current.trim();
	const bullet =
		"\n\nAlways confirm key details back to the user before taking a destructive action.";
	return {
		instructions: trimmed.endsWith(bullet) ? trimmed : `${trimmed}${bullet}`,
		description: "",
	};
}

/** Fake generated starters used by useGenerateConversationStartersMutation. */
export function fakeConversationStarters(name: string): string[] {
	const lower = name.toLowerCase();
	if (lower.includes("pto") || lower.includes("time off")) {
		return [
			"How many PTO days do I have left?",
			"I'd like to request time off next month.",
			"Can you block my calendar for vacation?",
		];
	}
	if (lower.includes("laptop")) {
		return [
			"I need a loaner laptop for a trip next week.",
			"My laptop is being repaired — can I borrow one?",
			"How do I request a temporary laptop?",
		];
	}
	return [
		"How can you help me?",
		"What actions can you take on my behalf?",
		"Show me what you're good at.",
	];
}

const DEMO_DELAY_MS = 600;
export function demoDelay<T>(value: T): Promise<T> {
	return new Promise((resolve) =>
		setTimeout(() => resolve(value), DEMO_DELAY_MS),
	);
}
