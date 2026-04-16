import express from "express";
import { logger } from "../config/logger.js";
import { registry, z } from "../docs/openapi.js";
import {
	AgentCancelCreationBodySchema,
	AgentCheckNameQuerySchema,
	AgentCheckNameResponseSchema,
	AgentCreateBodySchema,
	AgentCreationInputBodySchema,
	AgentDeleteResponseSchema,
	AgentDetailResponseSchema,
	AgentExecuteBodySchema,
	AgentGenerateBodySchema,
	AgentListQuerySchema,
	AgentListResponseSchema,
	AgentUpdateBodySchema,
	CancelMetaAgentBodySchema,
	GenerateConversationStartersBodySchema,
	ImproveInstructionsBodySchema,
} from "../schemas/agent.js";
import { ErrorResponseSchema } from "../schemas/common.js";
import { AgenticService } from "../services/AgenticService.js";
import { getAgentCreationStrategy } from "../services/agentCreation/index.js";
import {
	agentConfigToApiData,
	apiDataToAgentConfig,
} from "../services/agentCreation/mappers.js";
import { getMetaAgentStrategy } from "../services/metaAgentExecution/index.js";
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

registry.registerPath({
	method: "post",
	path: "/api/agents/{eid}/execute",
	tags: ["Agents"],
	summary: "Execute an agent for testing",
	description:
		"Execute a created agent with a user message. Returns 202; results arrive via SSE meta_agent_* events.",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		params: z.object({
			eid: z.string().uuid().openapi({ description: "Agent EID to execute" }),
		}),
		body: {
			content: {
				"application/json": { schema: AgentExecuteBodySchema },
			},
		},
	},
	responses: {
		202: {
			description: "Execution started",
			content: {
				"application/json": {
					schema: z.object({
						executionRequestId: z.string().uuid(),
					}),
				},
			},
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

// AgentConfig ↔ AgentMetadataApiData mapping — see services/agentCreation/mappers.ts

/**
 * GET /api/agents
 * List agents from LLM Service, enriched with skills from tasks
 */
router.get("/", async (req, res) => {
	try {
		const { name, search, active, limit, offset } = AgentListQuerySchema.parse(
			req.query,
		);

		// Fetch agents from LLM Service
		let agents: Awaited<ReturnType<typeof agenticService.listAgents>>;

		if (search) {
			// Build OR filter: name OR description match
			const escaped = search.replace(/"/g, '\\"');
			const searchFilter = `name__icontains="${escaped}"|description__icontains="${escaped}"`;
			const activeFilter =
				active !== undefined ? `active__exact=${active}` : "";
			const query = activeFilter
				? `(${searchFilter})&${activeFilter}`
				: searchFilter;

			agents = await agenticService.filterAgents(query, {
				limit: Number(limit),
				offset: Number(offset),
			});
		} else {
			agents = await agenticService.listAgents({
				name,
				active: active !== undefined ? active === "true" : undefined,
				limit: Number(limit),
				offset: Number(offset),
			});
		}

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
router.get("/check-name", async (req, res) => {
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
 * POST /api/agents/generate
 * Create agent via AI — strategy pattern (direct API or workflow)
 */
router.post("/generate", async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	try {
		const body = AgentGenerateBodySchema.parse(req.body);
		const strategy = getAgentCreationStrategy();

		const result = await strategy.createAgent({
			name: body.name,
			description: body.description,
			instructions: body.instructions,
			iconId: body.iconId,
			iconColorId: body.iconColorId,
			conversationStarters: body.conversationStarters,
			guardrails: body.guardrails,
			userId: authReq.user.id,
			userEmail: authReq.user.email,
			organizationId: authReq.user.activeOrganizationId,
		});

		res.status(202).json({ mode: "async", creationId: result.creationId });
	} catch (error: any) {
		if (error?.response) {
			logger.error(
				{ status: error.response.status, data: error.response.data },
				"LLM Service error generating agent",
			);
			return res.status(502).json({
				error: "LLM Service unavailable",
				code: "LLM_SERVICE_ERROR",
			});
		}
		logger.error({ error }, "Error generating agent");
		res.status(500).json({
			error: "Failed to generate agent",
			code: "INTERNAL_ERROR",
		});
	}
});

/**
 * POST /api/agents/creation-input
 * Send user input during async agent creation workflow
 */
router.post("/creation-input", async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	try {
		const body = AgentCreationInputBodySchema.parse(req.body);
		const strategy = getAgentCreationStrategy();

		const result = await strategy.sendInput({
			creationId: body.creationId,
			prevExecutionId: body.prevExecutionId,
			prompt: body.prompt,
			userId: authReq.user.id,
			userEmail: authReq.user.email,
			organizationId: authReq.user.activeOrganizationId,
		});

		res.json(result);
	} catch (error: any) {
		if (error?.message?.includes("not supported")) {
			return res.status(400).json({
				error: error.message,
				code: "NOT_SUPPORTED",
			});
		}
		logger.error({ error }, "Error sending agent creation input");
		res.status(500).json({
			error: "Failed to send creation input",
			code: "INTERNAL_ERROR",
		});
	}
});

/**
 * POST /api/agents/cancel-creation
 * Cancel an in-progress agent creation
 */
router.post("/cancel-creation", async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	try {
		const body = AgentCancelCreationBodySchema.parse(req.body);
		const strategy = getAgentCreationStrategy();

		const result = await strategy.cancel({
			creationId: body.creationId,
			userId: authReq.user.id,
			userEmail: authReq.user.email,
			organizationId: authReq.user.activeOrganizationId,
		});

		res.json(result);
	} catch (error: any) {
		if (error?.message?.includes("not supported")) {
			return res.status(400).json({
				error: error.message,
				code: "NOT_SUPPORTED",
			});
		}
		logger.error({ error }, "Error cancelling agent creation");
		res.status(500).json({
			error: "Failed to cancel agent creation",
			code: "INTERNAL_ERROR",
		});
	}
});

/**
 * POST /api/agents/improve-instructions
 * Invoke AgentInstructionsImprover meta-agent to improve instructions.
 * Returns 202 with executionRequestId; results arrive via SSE.
 */
router.post("/improve-instructions", async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	try {
		const body = ImproveInstructionsBodySchema.parse(req.body);
		const strategy = getMetaAgentStrategy();

		const result = await strategy.execute({
			agentName: "AgentInstructionsImprover",
			utterance: body.instructions,
			additionalInformation: JSON.stringify(body.agentConfig),
			transcript: "[]",
			userId: authReq.user.id,
			userEmail: authReq.user.email,
			organizationId: authReq.user.activeOrganizationId,
		});

		res.status(202).json({
			executionRequestId: result.executionRequestId,
		});
	} catch (error: any) {
		if (error?.response) {
			logger.error(
				{ status: error.response.status, data: error.response.data },
				"LLM Service error improving instructions",
			);
			return res.status(502).json({
				error: "LLM Service unavailable",
				code: "LLM_SERVICE_ERROR",
			});
		}
		logger.error({ error }, "Error improving instructions");
		res.status(500).json({
			error: "Failed to improve instructions",
			code: "INTERNAL_ERROR",
		});
	}
});

/**
 * POST /api/agents/generate-conversation-starters
 * Invoke ConversationStarterGenerator meta-agent.
 * Returns 202 with executionRequestId; results arrive via SSE.
 */
router.post("/generate-conversation-starters", async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	try {
		const body = GenerateConversationStartersBodySchema.parse(req.body);
		const strategy = getMetaAgentStrategy();

		const config = body.agentConfig;

		// Format additional_information as structured text matching the
		// agent's few-shot examples (not raw JSON) so the LLM weighs
		// instructions and description over raw capability flags.
		// Only list actual workflows/knowledge sources as tools — not
		// platform capabilities (webSearch, imageGeneration) which are
		// background features and shouldn't drive conversation starters.
		const tools: string[] = [
			...(config.workflows || []),
			...(config.knowledgeSources || []),
		];

		const additionalInfoParts = [
			`Agent Name: ${config.name || "Unnamed Agent"}`,
			config.description ? `\nDescription: ${config.description}` : "",
			`\nTools/Skills: ${tools.length > 0 ? tools.join(", ") : "none"}`,
			config.instructions ? `\nInstructions:\n${config.instructions}` : "",
			config.guardrails?.length
				? `\nGuardrails:\n${config.guardrails.map((g) => `- ${g}`).join("\n")}`
				: "",
		];

		const result = await strategy.execute({
			agentName: "ConversationStarterGeneratorAgent",
			utterance: "Generate conversation starters for this agent.",
			additionalInformation: additionalInfoParts.join(""),
			transcript: "[]",
			userId: authReq.user.id,
			userEmail: authReq.user.email,
			organizationId: authReq.user.activeOrganizationId,
		});

		res.status(202).json({
			executionRequestId: result.executionRequestId,
		});
	} catch (error: any) {
		if (error?.response) {
			logger.error(
				{ status: error.response.status, data: error.response.data },
				"LLM Service error generating conversation starters",
			);
			return res.status(502).json({
				error: "LLM Service unavailable",
				code: "LLM_SERVICE_ERROR",
			});
		}
		logger.error({ error }, "Error generating conversation starters");
		res.status(500).json({
			error: "Failed to generate conversation starters",
			code: "INTERNAL_ERROR",
		});
	}
});

/**
 * POST /api/agents/cancel-meta-agent
 * Cancel an in-progress meta-agent execution
 */
router.post("/cancel-meta-agent", async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	try {
		const body = CancelMetaAgentBodySchema.parse(req.body);
		const strategy = getMetaAgentStrategy();

		const result = await strategy.cancel({
			executionRequestId: body.executionRequestId,
			userId: authReq.user.id,
			userEmail: authReq.user.email,
			organizationId: authReq.user.activeOrganizationId,
		});

		res.json(result);
	} catch (error: any) {
		logger.error({ error }, "Error cancelling meta-agent execution");
		res.status(500).json({
			error: "Failed to cancel meta-agent execution",
			code: "INTERNAL_ERROR",
		});
	}
});

/**
 * POST /api/agents/:eid/execute
 * Execute a created agent for testing. Returns 202; results arrive via SSE.
 */
router.post("/:eid/execute", async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	try {
		const { eid } = req.params;
		const body = AgentExecuteBodySchema.parse(req.body);

		// Look up agent name from EID
		const agent = await agenticService.getAgent(eid);
		if (!agent?.name) {
			return res
				.status(404)
				.json({ error: "Agent not found", code: "NOT_FOUND" });
		}

		const strategy = getMetaAgentStrategy();
		const result = await strategy.execute({
			agentName: agent.name,
			utterance: body.message,
			transcript: body.transcript || "[]",
			userId: authReq.user.id,
			userEmail: authReq.user.email,
			organizationId: authReq.user.activeOrganizationId,
		});

		res.status(202).json({ executionRequestId: result.executionRequestId });
	} catch (error: any) {
		if (error?.response?.status === 404) {
			return res
				.status(404)
				.json({ error: "Agent not found", code: "NOT_FOUND" });
		}
		if (error?.response) {
			logger.error(
				{ status: error.response.status, data: error.response.data },
				"LLM Service error executing agent",
			);
			return res.status(502).json({
				error: "LLM Service unavailable",
				code: "LLM_SERVICE_ERROR",
			});
		}
		logger.error({ error }, "Error executing agent");
		res.status(500).json({
			error: "Failed to execute agent",
			code: "INTERNAL_ERROR",
		});
	}
});

/**
 * DELETE /api/agents/:eid
 * Delete an agent from LLM Service
 */
router.delete("/:eid", async (req, res) => {
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
router.get("/:eid", async (req, res) => {
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
router.post("/", async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	try {
		const body = AgentCreateBodySchema.parse(req.body);
		const apiData = agentConfigToApiData(
			body as unknown as Record<string, unknown>,
		);

		// Set audit fields and tenant
		if (authReq.user?.email) {
			apiData.sys_created_by = authReq.user.email;
			apiData.sys_updated_by = authReq.user.email;
		}
		if (authReq.user?.activeOrganizationId) {
			apiData.tenant = authReq.user.activeOrganizationId;
		}

		logger.info(
			{ name: body.name, userId: authReq.user?.id },
			"Creating agent",
		);

		const created = await agenticService.createAgent(apiData);

		// LLM Service may not respect active:false on create — force update if needed
		const requestedActive = apiData.active;
		let finalAgent = created;
		if (requestedActive === false && (created as any).active === true) {
			finalAgent = await agenticService.updateAgent((created as any).eid, {
				active: false,
				sys_updated_by: authReq.user?.email,
			});
		}

		res
			.status(201)
			.json(
				apiDataToAgentConfig(finalAgent as unknown as Record<string, unknown>),
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
router.put("/:eid", async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	try {
		const { eid } = req.params;
		const body = AgentUpdateBodySchema.parse(req.body);
		const apiData = agentConfigToApiData(
			body as unknown as Record<string, unknown>,
		);

		// Set sys_updated_by and tenant
		if (authReq.user?.email) {
			apiData.sys_updated_by = authReq.user.email;
		}
		if (authReq.user?.activeOrganizationId) {
			apiData.tenant = authReq.user.activeOrganizationId;
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
