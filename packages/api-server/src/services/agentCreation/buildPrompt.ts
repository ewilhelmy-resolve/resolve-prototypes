import type { AgentGenerateParams } from "./types.js";

/**
 * Compile structured form data into the prompt format for the agent-builder.
 * Used by both DirectApiStrategy and WorkflowStrategy.
 *
 * @see docs/features/agents/agent-creation-workflow-integration.md section 1.1
 */
export function buildAgentPrompt(params: AgentGenerateParams): string {
	const sections: string[] = [
		"Create an AI agent with the following specification:",
		"",
		`Name: ${params.name}`,
	];

	if (params.instructions) {
		sections.push("", "Instructions:", params.instructions);
	}

	if (params.description) {
		sections.push("", "Description:", params.description);
	}

	if (params.conversationStarters?.length) {
		sections.push("", "Conversation Starters:");
		for (const starter of params.conversationStarters) {
			sections.push(`- ${starter}`);
		}
	}

	if (params.guardrails?.length) {
		sections.push(
			"",
			"Guardrails (topics/requests the agent should NOT handle):",
		);
		for (const guardrail of params.guardrails) {
			sections.push(`- ${guardrail}`);
		}
	}

	sections.push(
		"",
		"IMPORTANT — Runtime Parameter Requirements:",
		"The created agent's task definition MUST reference these runtime parameters so user messages are processed at runtime:",
		"- {%utterance} — the user's current message (REQUIRED in every task — without this, the agent cannot read user input)",
		"- {%transcript} — conversation history as a JSON array of {role, content} objects",
		"- {%additional_information} — any additional context provided at execution time",
		"The task MUST process {%utterance} as the primary user input and respond to it directly.",
	);

	return sections.join("\n");
}
