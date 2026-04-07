import express from "express";
import { logger } from "../config/logger.js";
import { registry, z } from "../docs/openapi.js";
import { authenticateUser } from "../middleware/auth.js";
import {
	AgentCheckNameQuerySchema,
	AgentCheckNameResponseSchema,
	AgentCreateBodySchema,
	AgentDeleteResponseSchema,
	AgentDetailResponseSchema,
	AgentListQuerySchema,
	AgentListResponseSchema,
	AgentUpdateBodySchema,
} from "../schemas/agent.js";
import { ErrorResponseSchema } from "../schemas/common.js";
import { AgenticService } from "../services/AgenticService.js";
import type { AuthenticatedRequest } from "../types/express.js";

// ============================================================================
// OpenAPI Documentation Registration
// ============================================================================

registry.registerPath({
	method: "get",
	path: "/api/agents",
	tags: ["Agents"],
	summary: "List agents",
	description:
		"List agents from the LLM Service with optional filters. Enriches with task tools (skills).",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		query: AgentListQuerySchema,
	},
	responses: {
		200: {
			description: "Agent list",
			content: { "application/json": { schema: AgentListResponseSchema } },
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		502: {
			description: "LLM Service unavailable",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

registry.registerPath({
	method: "delete",
	path: "/api/agents/{eid}",
	tags: ["Agents"],
	summary: "Delete an agent",
	description: "Delete an agent from the LLM Service by EID.",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		params: z.object({
			eid: z.string().uuid().openapi({ description: "Agent EID to delete" }),
		}),
	},
	responses: {
		200: {
			description: "Agent deleted",
			content: {
				"application/json": { schema: AgentDeleteResponseSchema },
			},
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		404: {
			description: "Agent not found",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		502: {
			description: "LLM Service unavailable",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

registry.registerPath({
	method: "get",
	path: "/api/agents/check-name",
	tags: ["Agents"],
	summary: "Check agent name availability",
	description: "Check if an agent name is already taken.",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		query: AgentCheckNameQuerySchema,
	},
	responses: {
		200: {
			description: "Name availability result",
			content: {
				"application/json": { schema: AgentCheckNameResponseSchema },
			},
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		502: {
			description: "LLM Service unavailable",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

registry.registerPath({
	method: "get",
	path: "/api/agents/{eid}",
	tags: ["Agents"],
	summary: "Get agent detail",
	description:
		"Get a single agent by EID from the LLM Service, enriched with skills.",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		params: z.object({
			eid: z.string().uuid().openapi({ description: "Agent EID" }),
		}),
	},
	responses: {
		200: {
			description: "Agent detail",
			content: {
				"application/json": { schema: AgentDetailResponseSchema },
			},
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		404: {
			description: "Agent not found",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		502: {
			description: "LLM Service unavailable",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

registry.registerPath({
	method: "post",
	path: "/api/agents",
	tags: ["Agents"],
	summary: "Create an agent",
	description: "Create a new agent in the LLM Service.",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		body: {
			content: {
				"application/json": { schema: AgentCreateBodySchema },
			},
		},
	},
	responses: {
		201: {
			description: "Agent created",
			content: {
				"application/json": { schema: AgentDetailResponseSchema },
			},
		},
		400: {
			description: "Invalid request body",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		502: {
			description: "LLM Service unavailable",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

registry.registerPath({
	method: "put",
	path: "/api/agents/{eid}",
	tags: ["Agents"],
	summary: "Update an agent",
	description: "Update an existing agent in the LLM Service by EID.",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		params: z.object({
			eid: z.string().uuid().openapi({ description: "Agent EID to update" }),
		}),
		body: {
			content: {
				"application/json": { schema: AgentUpdateBodySchema },
			},
		},
	},
	responses: {
		200: {
			description: "Agent updated",
			content: {
				"application/json": { schema: AgentDetailResponseSchema },
			},
		},
		400: {
			description: "Invalid request body",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		404: {
			description: "Agent not found",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		502: {
			description: "LLM Service unavailable",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

// ============================================================================
// Router
// ============================================================================

const router = express.Router();
const agenticService = new AgenticService();

function formatDate(isoDate: string | null): string {
	if (!isoDate) return "";
	const d = new Date(isoDate);
	return d.toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

// ============================================================================
// AgentConfig ↔ AgentMetadataApiData mapping
// ============================================================================

/**
 * Map frontend AgentConfig body to LLM Service AgentMetadataApiData.
 * Rita-specific UI fields are stored in the `configs` JSON field.
 */
function agentConfigToApiData(
	body: Record<string, unknown>,
): Record<string, unknown> {
	const {
		name,
		description,
		instructions,
		status,
		// UI-specific fields → packed into configs
		role,
		agentType,
		iconId,
		iconColorId,
		conversationStarters,
		knowledgeSources,
		workflows,
		guardrails,
		responsibilities,
		completionCriteria,
		capabilities,
		...rest
	} = body;

	const apiData: Record<string, unknown> = { ...rest };
	if (name !== undefined) apiData.name = name;
	if (description !== undefined) apiData.description = description;
	if (instructions !== undefined) apiData.markdown_text = instructions;
	if (status !== undefined) apiData.active = status === "published";

	// Pack UI-specific fields into configs
	const configs: Record<string, unknown> = {};
	if (role !== undefined) configs.role = role;
	if (agentType !== undefined) configs.agentType = agentType;
	if (iconId !== undefined) configs.iconId = iconId;
	if (iconColorId !== undefined) configs.iconColorId = iconColorId;
	if (conversationStarters !== undefined)
		configs.conversationStarters = conversationStarters;
	if (knowledgeSources !== undefined)
		configs.knowledgeSources = knowledgeSources;
	if (workflows !== undefined) configs.workflows = workflows;
	if (guardrails !== undefined) configs.guardrails = guardrails;
	if (responsibilities !== undefined)
		configs.responsibilities = responsibilities;
	if (completionCriteria !== undefined)
		configs.completionCriteria = completionCriteria;
	if (capabilities !== undefined) configs.capabilities = capabilities;

	if (Object.keys(configs).length > 0) apiData.configs = configs;

	return apiData;
}

/**
 * Map LLM Service AgentMetadataApiData to frontend AgentConfig shape.
 * Unpacks `configs` JSON field and maps system fields.
 */
function apiDataToAgentConfig(
	agent: Record<string, unknown>,
	skills: string[] = [],
): Record<string, unknown> {
	const configs = (agent.configs as Record<string, unknown>) || {};

	return {
		id: agent.eid || String(agent.id || ""),
		name: agent.name || "",
		description: agent.description || "",
		instructions: agent.markdown_text || "",
		status: agent.active ? "published" : "draft",
		role: configs.role ?? "",
		agentType: configs.agentType ?? null,
		iconId: configs.iconId ?? "bot",
		iconColorId: configs.iconColorId ?? "slate",
		conversationStarters: configs.conversationStarters ?? [],
		knowledgeSources: configs.knowledgeSources ?? [],
		workflows: configs.workflows ?? [],
		skills,
		guardrails: configs.guardrails ?? [],
		responsibilities: configs.responsibilities,
		completionCriteria: configs.completionCriteria,
		capabilities: configs.capabilities ?? {
			webSearch: true,
			imageGeneration: false,
			useAllWorkspaceContent: false,
		},
		createdAt: agent.sys_date_created || undefined,
		updatedAt: agent.sys_date_updated || undefined,
	};
}

/**
 * GET /api/agents
 * List agents from LLM Service, enriched with skills from tasks
 */
router.get("/", authenticateUser, async (req, res) => {
	try {
		const { name, active, limit, offset } = AgentListQuerySchema.parse(
			req.query,
		);

		// Fetch agents from LLM Service
		const agents = await agenticService.listAgents({
			name,
			active: active !== undefined ? active === "true" : undefined,
			limit: Number(limit),
			offset: Number(offset),
		});

		// Batch-fetch all tasks to avoid N+1
		let allTasks: Awaited<ReturnType<typeof agenticService.listTasks>> = [];
		try {
			allTasks = await agenticService.listTasks();
		} catch {
			logger.warn("Failed to fetch agent tasks for skills enrichment");
		}

		// Group tasks by agent_metadata_id
		const tasksByAgent = new Map<string, string[]>();
		for (const task of allTasks) {
			if (!task.agent_metadata_id || !task.tools?.length) continue;
			const existing = tasksByAgent.get(task.agent_metadata_id) || [];
			existing.push(...task.tools);
			tasksByAgent.set(task.agent_metadata_id, existing);
		}

		// Map to AgentTableRow
		const rows = agents.map((agent) => ({
			id: agent.eid || String(agent.id),
			name: agent.name || "",
			description: agent.description || "",
			status: (agent.active ? "published" : "draft") as "published" | "draft",
			skills: agent.eid ? [...new Set(tasksByAgent.get(agent.eid) || [])] : [],
			updatedBy: agent.sys_updated_by || null,
			owner: agent.sys_created_by || null,
			lastUpdated: formatDate(agent.sys_date_updated),
			ownerEmail: agent.sys_created_by || null,
		}));

		res.json({
			agents: rows,
			limit: Number(limit),
			offset: Number(offset),
			hasMore: agents.length === Number(limit),
		});
	} catch (error: any) {
		if (error?.response) {
			logger.error(
				{ status: error.response.status, data: error.response.data },
				"LLM Service error listing agents",
			);
			return res.status(502).json({
				error: "LLM Service unavailable",
				code: "LLM_SERVICE_ERROR",
			});
		}
		logger.error({ error }, "Error listing agents");
		res
			.status(500)
			.json({ error: "Failed to list agents", code: "INTERNAL_ERROR" });
	}
});

/**
 * GET /api/agents/check-name
 * Check if an agent name is available
 */
router.get("/check-name", authenticateUser, async (req, res) => {
	try {
		const { name } = AgentCheckNameQuerySchema.parse(req.query);
		const existing = await agenticService.getAgentByName(name);
		res.json({ available: existing === null });
	} catch (error: any) {
		if (error?.response) {
			logger.error(
				{ status: error.response.status, data: error.response.data },
				"LLM Service error checking agent name",
			);
			return res.status(502).json({
				error: "LLM Service unavailable",
				code: "LLM_SERVICE_ERROR",
			});
		}
		logger.error({ error }, "Error checking agent name");
		res.status(500).json({
			error: "Failed to check agent name",
			code: "INTERNAL_ERROR",
		});
	}
});

/**
 * DELETE /api/agents/:eid
 * Delete an agent from LLM Service
 */
router.delete("/:eid", authenticateUser, async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	try {
		const { eid } = req.params;
		logger.info({ eid, userId: authReq.user?.id }, "Deleting agent");

		const result = await agenticService.deleteAgent(eid);
		res.json(result);
	} catch (error: any) {
		if (error?.response?.status === 404) {
			return res
				.status(404)
				.json({ error: "Agent not found", code: "NOT_FOUND" });
		}
		if (error?.response) {
			logger.error(
				{ status: error.response.status, data: error.response.data },
				"LLM Service error deleting agent",
			);
			return res.status(502).json({
				error: "LLM Service unavailable",
				code: "LLM_SERVICE_ERROR",
			});
		}
		logger.error({ error }, "Error deleting agent");
		res.status(500).json({
			error: "Failed to delete agent",
			code: "INTERNAL_ERROR",
		});
	}
});

/**
 * GET /api/agents/:eid
 * Get a single agent by EID, enriched with skills
 */
router.get("/:eid", authenticateUser, async (req, res) => {
	try {
		const { eid } = req.params;
		const agent = await agenticService.getAgent(eid);

		// Fetch tasks for skills enrichment
		let skills: string[] = [];
		try {
			const tasks = await agenticService.listTasks(eid);
			skills = [
				...new Set(tasks.flatMap((t) => t.tools || []).filter(Boolean)),
			];
		} catch {
			logger.warn({ eid }, "Failed to fetch tasks for agent detail");
		}

		res.json(
			apiDataToAgentConfig(agent as unknown as Record<string, unknown>, skills),
		);
	} catch (error: any) {
		if (error?.response?.status === 404) {
			return res
				.status(404)
				.json({ error: "Agent not found", code: "NOT_FOUND" });
		}
		if (error?.response) {
			logger.error(
				{ status: error.response.status, data: error.response.data },
				"LLM Service error getting agent",
			);
			return res.status(502).json({
				error: "LLM Service unavailable",
				code: "LLM_SERVICE_ERROR",
			});
		}
		logger.error({ error }, "Error getting agent");
		res.status(500).json({
			error: "Failed to get agent",
			code: "INTERNAL_ERROR",
		});
	}
});

/**
 * POST /api/agents
 * Create a new agent in LLM Service
 */
router.post("/", authenticateUser, async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	try {
		const body = AgentCreateBodySchema.parse(req.body);
		const apiData = agentConfigToApiData(
			body as unknown as Record<string, unknown>,
		);

		// Set audit fields to the authenticated user's email
		if (authReq.user?.email) {
			apiData.sys_created_by = authReq.user.email;
			apiData.sys_updated_by = authReq.user.email;
		}

		logger.info(
			{ name: body.name, userId: authReq.user?.id },
			"Creating agent",
		);

		const created = await agenticService.createAgent(apiData);

		// LLM Service may not respect active:false on create — force update if needed
		const requestedActive = apiData.active;
		if (requestedActive === false && (created as any).active === true) {
			const updated = await agenticService.updateAgent((created as any).eid, {
				active: false,
				sys_updated_by: authReq.user?.email,
			});
			Object.assign(created, updated);
		}

		res
			.status(201)
			.json(
				apiDataToAgentConfig(created as unknown as Record<string, unknown>),
			);
	} catch (error: any) {
		if (error?.response) {
			logger.error(
				{ status: error.response.status, data: error.response.data },
				"LLM Service error creating agent",
			);
			return res.status(502).json({
				error: "LLM Service unavailable",
				code: "LLM_SERVICE_ERROR",
			});
		}
		logger.error({ error }, "Error creating agent");
		res.status(500).json({
			error: "Failed to create agent",
			code: "INTERNAL_ERROR",
		});
	}
});

/**
 * PUT /api/agents/:eid
 * Update an existing agent in LLM Service
 */
router.put("/:eid", authenticateUser, async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	try {
		const { eid } = req.params;
		const body = AgentUpdateBodySchema.parse(req.body);
		const apiData = agentConfigToApiData(
			body as unknown as Record<string, unknown>,
		);

		// Set sys_updated_by to the authenticated user's email
		if (authReq.user?.email) {
			apiData.sys_updated_by = authReq.user.email;
		}

		logger.info({ eid, userId: authReq.user?.id }, "Updating agent");

		const updated = await agenticService.updateAgent(eid, apiData);

		// Fetch tasks for skills enrichment
		let skills: string[] = [];
		try {
			const tasks = await agenticService.listTasks(eid);
			skills = [
				...new Set(tasks.flatMap((t) => t.tools || []).filter(Boolean)),
			];
		} catch {
			logger.warn({ eid }, "Failed to fetch tasks for agent update response");
		}

		res.json(
			apiDataToAgentConfig(
				updated as unknown as Record<string, unknown>,
				skills,
			),
		);
	} catch (error: any) {
		if (error?.response?.status === 404) {
			return res
				.status(404)
				.json({ error: "Agent not found", code: "NOT_FOUND" });
		}
		if (error?.response) {
			logger.error(
				{ status: error.response.status, data: error.response.data },
				"LLM Service error updating agent",
			);
			return res.status(502).json({
				error: "LLM Service unavailable",
				code: "LLM_SERVICE_ERROR",
			});
		}
		logger.error({ error }, "Error updating agent");
		res.status(500).json({
			error: "Failed to update agent",
			code: "INTERNAL_ERROR",
		});
	}
});

export default router;
