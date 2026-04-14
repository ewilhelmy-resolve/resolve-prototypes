/**
 * AgentConfig ↔ AgentMetadataApiData mapping utilities
 *
 * Extracted from routes/agents.ts for reuse by strategy implementations.
 */

/**
 * Map frontend AgentConfig body to LLM Service AgentMetadataApiData.
 * Only persisted fields (name, status, icon) are sent. Icon fields are
 * stored under `configs.ui` with keys `icon` and `icon_color`.
 */
export function agentConfigToApiData(
	body: Record<string, unknown>,
): Record<string, unknown> {
	const { name, status, iconId, iconColorId, ...rest } = body;

	const apiData: Record<string, unknown> = { ...rest };
	if (name !== undefined) apiData.name = name;
	if (status !== undefined) apiData.active = status === "published";

	// Pack icon fields into configs.ui
	const ui: Record<string, unknown> = {};
	if (iconId !== undefined) ui.icon = iconId;
	if (iconColorId !== undefined) ui.icon_color = iconColorId;
	if (Object.keys(ui).length > 0) apiData.configs = { ui };

	return apiData;
}

/**
 * Map LLM Service AgentMetadataApiData to frontend AgentConfig shape.
 * Reads icon from `configs.ui`, falls back to legacy `configs.iconId` / `configs.iconColorId`.
 * Local-only fields return empty defaults.
 */
export function apiDataToAgentConfig(
	agent: Record<string, unknown>,
	skills: string[] = [],
): Record<string, unknown> {
	const configs = (agent.configs as Record<string, unknown>) || {};
	const ui = (configs.ui as Record<string, unknown>) || {};

	return {
		id: agent.eid || String(agent.id || ""),
		name: agent.name || "",
		description: agent.description || "",
		instructions: agent.markdown_text || "",
		status: agent.active ? "published" : "draft",
		role: "",
		agentType: null,
		iconId: ui.icon ?? configs.iconId ?? "bot",
		iconColorId: ui.icon_color ?? configs.iconColorId ?? "slate",
		conversationStarters: [],
		knowledgeSources: [],
		workflows: [],
		skills,
		guardrails: [],
		capabilities: {
			webSearch: true,
			imageGeneration: false,
			useAllWorkspaceContent: false,
		},
		createdAt: agent.sys_date_created || undefined,
		updatedAt: agent.sys_date_updated || undefined,
	};
}
