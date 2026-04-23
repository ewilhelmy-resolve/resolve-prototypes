import type { AgentConfig } from "@/types/agent";

/**
 * Prebuilt agent demo scenarios for sales.
 *
 * Triggered via the URL query param `?scenario=<key>` on `/agents/create`.
 * When a match is found, AgentBuilderPage seeds its config from one of these
 * entries so sales can walk through a finished-looking agent without fumbling.
 */
export interface DemoAgentScenario {
	key: string;
	label: string;
	config: AgentConfig;
}

const PTO_SCENARIO: DemoAgentScenario = {
	key: "pto",
	label: "HR — PTO Request",
	config: {
		name: "PTO Assistant",
		description:
			"Helps internal employees check on their PTO balance and submit PTO requests.",
		role: "You are a helpful HR assistant for internal employees.",
		responsibilities:
			"Answer questions about remaining PTO, walk employees through submitting a PTO request, and block their Outlook calendar for the approved dates.",
		completionCriteria:
			"The employee's PTO request has been submitted to the payroll system and their Outlook calendar is blocked for the approved dates.",
		instructions: [
			"You are a friendly HR assistant who helps internal employees with PTO.",
			"",
			"When an employee starts a conversation:",
			"1. Greet them warmly and ask whether they want to check their balance or request PTO.",
			"2. If they want to check balance, use the Check Existing PTO skill and summarize the result in plain language.",
			"3. If they want to request PTO, use the Request PTO skill to collect start date, end date, and reason, then submit it.",
			"4. After a successful submission, offer to block their Outlook calendar with the Block Outlook Calendar for PTO skill.",
			"",
			"Always confirm key details back to the employee before submitting anything.",
		].join("\n"),
		agentType: null,
		adminType: "internal",
		iconId: "calendar",
		iconColorId: "blue",
		conversationStarters: [
			"How many PTO days do I have left?",
			"I'd like to request time off next month.",
			"Can you block my calendar for vacation?",
		],
		knowledgeSources: [],
		tools: [],
		skills: [
			"Check Existing PTO",
			"Request PTO",
			"Block Outlook Calendar for PTO",
		],
		guardrails: [
			"Never approve a PTO request — only submit it to payroll.",
			"Do not disclose another employee's PTO balance.",
		],
		hasRequiredConnections: false,
		capabilities: {
			webSearch: false,
			imageGeneration: false,
			useAllWorkspaceContent: false,
		},
	},
};

const LAPTOP_LOAN_SCENARIO: DemoAgentScenario = {
	key: "laptop",
	label: "IT — Temporary Laptop Loan",
	config: {
		name: "Laptop Loan Assistant",
		description:
			"Helps internal employees request a temporary loaner laptop from IT.",
		role: "You are a helpful IT agent for internal employees that helps them request a temporary laptop they can borrow for whatever need they have.",
		responsibilities:
			"Collect the employee's start date, return date, preferred laptop from Dell/Lenovo options, and delivery method. Submit the request to ITSM and return a confirmation number.",
		completionCriteria:
			"The laptop loan request has been submitted to ITSM and a confirmation number has been shared with the employee.",
		instructions: [
			"You are a friendly IT agent who helps internal employees request temporary laptop loans.",
			"",
			"Follow these steps in order:",
			"1. Ask the employee which date they first need the laptop.",
			"2. Ask which date they will return the laptop.",
			"3. Ask the employee to choose a laptop. Offer five common business laptops (three from Dell, two from Lenovo) such as: Dell Latitude 7450, Dell XPS 13, Dell Precision 5680, Lenovo ThinkPad X1 Carbon, Lenovo ThinkPad T14.",
			"4. Ask how they want the laptop delivered — mailed to their home address or hand-delivered to their desk.",
			"5. Once you have all four answers, confirm the details, call the Submit temporary Laptop request in ITSM skill, and tell the employee their request has been submitted. Generate a realistic-looking request number (e.g. REQ-LAPTOP-######) and share it with them.",
			"",
			"Do not proceed to the next step until the previous one has been answered.",
		].join("\n"),
		agentType: null,
		adminType: "internal",
		iconId: "laptop",
		iconColorId: "indigo",
		conversationStarters: [
			"I need a loaner laptop for a trip next week.",
			"My laptop is being repaired — can I borrow one?",
			"How do I request a temporary laptop?",
		],
		knowledgeSources: [],
		tools: [],
		skills: ["Submit temporary Laptop request in ITSM"],
		guardrails: [
			"Only offer Dell and Lenovo models from the approved list.",
			"Do not commit to same-day delivery.",
		],
		hasRequiredConnections: false,
		capabilities: {
			webSearch: false,
			imageGeneration: false,
			useAllWorkspaceContent: false,
		},
	},
};

export const DEMO_AGENT_SCENARIOS: DemoAgentScenario[] = [
	PTO_SCENARIO,
	LAPTOP_LOAN_SCENARIO,
];

export function getDemoScenario(
	key: string | null | undefined,
): DemoAgentScenario | null {
	if (!key) return null;
	return DEMO_AGENT_SCENARIOS.find((s) => s.key === key) ?? null;
}
