/**
 * AgentConfig ↔ AgentMetadataApiData mapping utilities
 *
 * Extracted from routes/agents.ts for reuse by strategy implementations.
 */

import { z } from "zod";
import { logger } from "../../config/logger.js";
import type { AgentTaskApiData } from "../AgenticService.js";

const VALID_STATES = new Set(["DRAFT", "PUBLISHED", "RETIRED", "TESTING"]);

/**
 * Canary schema for LLM Service AgentMetadataApiData responses. Mirrors the
 * interface in AgenticService.ts. All fields are optional/nullable because the
 * LLM Service occasionally adds new ones or omits null-valued fields entirely.
 *
 * We don't strictly parse — instead we `safeParse` in the mapper and log a
 * warning when drift is detected. The mapper continues with its existing
 * defensive destructuring so production stays up; the warning gives us an
 * early signal when LLM Service shape changes.
 */
const AgentMetadataApiDataShape = z.looseObject({
	id: z.union([z.number(), z.null()]).optional(),
	eid: z.union([z.string(), z.null()]).optional(),
	name: z.union([z.string(), z.null()]).optional(),
	description: z.union([z.string(), z.null()]).optional(),
	state: z.union([z.string(), z.null()]).optional(),
	admin_type: z.union([z.string(), z.null()]).optional(),
	markdown_text: z.union([z.string(), z.null()]).optional(),
	configs: z.union([z.record(z.string(), z.unknown()), z.null()]).optional(),
	ui_configs: z.union([z.record(z.string(), z.unknown()), z.null()]).optional(),
	conversation_starters: z.union([z.array(z.string()), z.null()]).optional(),
	guardrails: z.union([z.array(z.string()), z.null()]).optional(),
	sys_date_created: z.union([z.string(), z.null()]).optional(),
	sys_date_updated: z.union([z.string(), z.null()]).optional(),
});

function validateAgentMetadataShape(agent: Record<string, unknown>): void {
	const result = AgentMetadataApiDataShape.safeParse(agent);
	if (!result.success) {
		logger.warn(
			{
				eid: agent.eid,
				id: agent.id,
				issues: result.error.issues.map((i) => ({
					path: i.path.join("."),
					code: i.code,
					message: i.message,
				})),
			},
			"LLM Service AgentMetadata shape drift detected — mapper will use defensive defaults",
		);
	}
}

/**
 * Default LLM execution config written on agent CREATE. The LLM Service
 * reads `configs.llm_parameters` at execution time and rejects agents
 * missing it with `ValueError: Missing llm_parameters` — so every newly
 * created agent must ship with these defaults.
 */
export const DEFAULT_AGENT_CONFIGS = {
	llm_parameters: { model: "claude-opus-4-5-20251101" },
	verbose: false,
} as const;

/**
 * Map frontend AgentConfig body to LLM Service AgentMetadataApiData.
 * Icon fields are stored under the top-level `ui_configs` JSON column.
 * Translates camelCase frontend keys (`conversationStarters`) to the
 * snake_case LLM Service columns (`conversation_starters`).
 */
export function agentConfigToApiData(
	body: Record<string, unknown>,
): Record<string, unknown> {
	const {
		name,
		state,
		iconId,
		iconColorId,
		adminType,
		conversationStarters,
		...rest
	} = body;

	const apiData: Record<string, unknown> = { ...rest };
	if (name !== undefined) apiData.name = name;
	if (typeof state === "string" && VALID_STATES.has(state)) {
		apiData.state = state;
	}
	apiData.admin_type =
		typeof adminType === "string" && adminType ? adminType : "user";

	if (conversationStarters !== undefined) {
		apiData.conversation_starters = conversationStarters;
	}

	const uiConfigs: Record<string, unknown> = {};
	if (iconId !== undefined) uiConfigs.icon = iconId;
	if (iconColorId !== undefined) uiConfigs.icon_color = iconColorId;
	if (Object.keys(uiConfigs).length > 0) apiData.ui_configs = uiConfigs;

	return apiData;
}

/**
 * Serialize a single agent task into a fenced, parseable block for the
 * form's `instructions` textarea. Stable format so Phase 1's meta-agent can
 * recognize the blocks and map them back to task operations during update.
 *
 * Headers are fixed and order is fixed. Missing fields render as empty values
 * (the line is still emitted) so the block shape is invariant across tasks.
 */
function serializeTaskBlock(task: AgentTaskApiData): string {
	const name = task.name || "";
	const role = task.role || "";
	const goal = task.goal || "";
	const backstory = task.backstory || "";
	const taskText = task.task || "";
	const expectedOutput = task.expected_output || "";
	const tools = (task.tools || []).filter(Boolean).join(", ");

	return [
		`## Task: ${name}`,
		`**Role:** ${role}`,
		``,
		`**Goal:** ${goal}`,
		``,
		`**Backstory:** ${backstory}`,
		``,
		`**Task:** ${taskText}`,
		``,
		`**Expected Output:** ${expectedOutput}`,
		``,
		`**Tools:** ${tools}`,
	].join("\n");
}

/**
 * Sort tasks by `order` ascending with nulls/undefined last. Stable on equal
 * keys so repeated loads render identically.
 */
function sortTasks(tasks: AgentTaskApiData[]): AgentTaskApiData[] {
	return tasks
		.map((task, index) => ({ task, index }))
		.sort((a, b) => {
			const aOrder = a.task.order ?? Number.POSITIVE_INFINITY;
			const bOrder = b.task.order ?? Number.POSITIVE_INFINITY;
			if (aOrder !== bOrder) return aOrder - bOrder;
			return a.index - b.index;
		})
		.map(({ task }) => task);
}

/**
 * Compose the form's `instructions` string from the agent's `markdown_text`
 * plus a serialized block per task. Task-level fields (goal, backstory, task,
 * expected_output, tools) only appear on agent_tasks — surfacing them here
 * means the edit form shows the agent's actual behavior, not just its header.
 */
function composeInstructions(
	markdownText: string,
	tasks: AgentTaskApiData[],
): string {
	const header = (markdownText || "").trimEnd();
	if (tasks.length === 0) return markdownText || "";

	const blocks = sortTasks(tasks).map(serializeTaskBlock).join("\n\n---\n\n");
	if (!header) return blocks;
	return `${header}\n\n---\n\n${blocks}`;
}

/**
 * Flatten and dedupe tool names across all tasks (order preserved from
 * first-seen). Used for both the `tools` and `skills` fields on the config —
 * kept as separate fields for backward-compat; both carry the same content.
 */
function collectTaskTools(tasks: AgentTaskApiData[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const task of tasks) {
		for (const tool of task.tools || []) {
			if (tool && !seen.has(tool)) {
				seen.add(tool);
				out.push(tool);
			}
		}
	}
	return out;
}

/**
 * Map LLM Service AgentMetadataApiData to frontend AgentConfig shape.
 * Reads icon from the top-level `ui_configs` first, falling back to legacy
 * `configs.ui` and ancient `configs.iconId` for pre-migration rows.
 * When tasks are provided, their fields are composed into `instructions` and
 * their tools are surfaced as both `tools` and `skills`.
 * Local-only fields return empty defaults.
 */
export function apiDataToAgentConfig(
	agent: Record<string, unknown>,
	tasks: AgentTaskApiData[] = [],
): Record<string, unknown> {
	validateAgentMetadataShape(agent);

	const configs = (agent.configs as Record<string, unknown>) || {};
	const legacyUi = (configs.ui as Record<string, unknown>) || {};
	const uiConfigs = (agent.ui_configs as Record<string, unknown>) || {};

	const toolNames = collectTaskTools(tasks);

	return {
		id: agent.eid || String(agent.id || ""),
		name: agent.name || "",
		description: agent.description || "",
		instructions: composeInstructions(
			(agent.markdown_text as string) || "",
			tasks,
		),
		state:
			typeof agent.state === "string" && VALID_STATES.has(agent.state)
				? agent.state
				: "DRAFT",
		role: "",
		agentType: null,
		adminType: (agent.admin_type as string) || "user",
		iconId: uiConfigs.icon ?? legacyUi.icon ?? configs.iconId ?? "bot",
		iconColorId:
			uiConfigs.icon_color ??
			legacyUi.icon_color ??
			configs.iconColorId ??
			"slate",
		conversationStarters: (agent.conversation_starters as string[]) || [],
		knowledgeSources: [],
		tools: toolNames,
		skills: toolNames,
		guardrails: (agent.guardrails as string[]) || [],
		capabilities: {
			webSearch: true,
			imageGeneration: false,
			useAllWorkspaceContent: false,
		},
		createdAt: agent.sys_date_created || undefined,
		updatedAt: agent.sys_date_updated || undefined,
	};
}
