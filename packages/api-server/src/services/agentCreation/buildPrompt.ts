import type { AgentGenerateParams } from "./types.js";

/**
 * Compile the prompt for AgentRitaDeveloper.
 *
 * RITA owns all deterministic/"cheap" metadata (name, description, icons,
 * starters, guardrails, admin_type, tenant, audit). Those are written
 * directly by the route via POST/PUT `/agents/metadata` before this prompt
 * is built, so we deliberately OMIT them here — the meta-agent has no
 * business knowing or touching them.
 *
 * The meta-agent's sole job is the "expensive" step: take the user's
 * instructions prose and turn it into structured sub-tasks via
 * `ai_create_new_agent_task` against the target EID. Mode discriminates
 * shell-first create (target is a fresh shell) from user-initiated update
 * (target is an existing agent whose tasks need to be regenerated/updated).
 *
 * @see docs/features/agents/agent-developer-workflow-integration.md section 1
 */
export function buildAgentPrompt(params: AgentGenerateParams): string {
	if (!params.targetAgentEid) {
		throw new Error("buildAgentPrompt: targetAgentEid is required");
	}

	const sections: string[] = [];

	if (params.shellAlreadyCreated) {
		sections.push(
			`Mode: UPDATE shell (target_agent_eid=${params.targetAgentEid}).`,
			"Shell was just created by RITA with all metadata fields (name, description, conversation_starters, guardrails, icons, admin_type, tenant, audit) already persisted. DO NOT patch agent_metadata. Your ONLY job: generate sub-tasks from the Instructions below and call ai_create_new_agent_task for each, scoped to target_agent_eid.",
		);
	} else {
		sections.push(
			`Mode: UPDATE existing agent (target_agent_eid=${params.targetAgentEid}).`,
			"RITA has already applied any metadata changes (name, description, conversation_starters, guardrails, icons, admin_type). DO NOT patch agent_metadata. Your ONLY job: update sub-tasks to reflect the Instructions and/or User change request below, using ai_create_new_agent_task / ai_update_agent_task as appropriate, scoped to target_agent_eid.",
		);
	}

	if (params.instructions?.trim()) {
		sections.push("", "Instructions:", params.instructions.trim());
	}

	if (params.updatePrompt?.trim()) {
		sections.push("", "User change request:", params.updatePrompt.trim());
	}

	sections.push(
		"",
		"IMPORTANT — Runtime Parameter Requirements:",
		"Each sub-task definition MUST reference these runtime parameters so user messages are processed at runtime:",
		"- {%utterance} — the user's current message (REQUIRED in every task — without this, the agent cannot read user input)",
		"- {%transcript} — conversation history as a JSON array of {role, content} objects",
		"- {%additional_information} — any additional context provided at execution time",
		"Each task MUST process {%utterance} as the primary user input and respond to it directly.",
	);

	return sections.join("\n");
}
