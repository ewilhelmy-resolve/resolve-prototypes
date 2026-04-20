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
	ToolListQuerySchema,
	ToolListResponseSchema,
} from "../schemas/agent.js";
import { ErrorResponseSchema } from "../schemas/common.js";
import { AgenticService } from "../services/AgenticService.js";
import { getAgentCreationStrategy } from "../services/agentCreation/index.js";
import {
	agentConfigToApiData,
	apiDataToAgentConfig,
	DEFAULT_AGENT_CONFIGS,
} from "../services/agentCreation/mappers.js";
import { getMetaAgentStrategy } from "../services/metaAgentExecution/index.js";
import {
	parseConversationStarterContent,
	parseInstructionsImproverContent,
} from "../services/metaAgentExecution/parsers.js";
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
	path: "/api/agents/tools",
	tags: ["Agents"],
	summary: "List available tools",
	description: "List tools from the LLM Service with optional search filter.",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		query: ToolListQuerySchema,
	},
	responses: {
		200: {
			description: "Tools list",
			content: { "application/json": { schema: ToolListResponseSchema } },
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		502: {
			description: "LLM Service unavailable",
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
	const authReq = req as AuthenticatedRequest;
	try {
		const { search, state, owner, limit, offset } = AgentListQuerySchema.parse(
			req.query,
		);

		// Always scope to caller's organization, and to builder-created
		// (`admin_type="user"`) agents so platform/system-owned agents don't
		// leak into the builder list.
		// The filter syntax has no parentheses — AND binds tighter than OR,
		// so we distribute AND conditions across each OR term:
		//   (A|B)&C  →  A&C|B&C
		const orgId = authReq.user.activeOrganizationId;
		const callerEmail = authReq.user.email.replace(/"/g, '\\"');
		const scopeParts = [`tenant__exact="${orgId}"`, `admin_type__exact="user"`];
		if (owner === "me") {
			scopeParts.push(`sys_created_by__exact="${callerEmail}"`);
		} else if (owner === "others") {
			scopeParts.push(`^sys_created_by__exact="${callerEmail}"`);
		}
		const scopeFilter = scopeParts.join("&");
		const stateFilter = state ? `&state__exact="${state}"` : "";

		let query: string;
		if (search) {
			const escaped = search.replace(/"/g, '\\"');
			// Distribute scope (and state) across each OR branch
			query = `name__icontains="${escaped}"&${scopeFilter}${stateFilter}|description__icontains="${escaped}"&${scopeFilter}${stateFilter}`;
		} else {
			query = `${scopeFilter}${stateFilter}`;
		}

		const agents = await agenticService.filterAgents(query, {
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

		const rows = agents.map((agent) => {
			const rawState = agent.state;
			const state =
				rawState === "DRAFT" ||
				rawState === "PUBLISHED" ||
				rawState === "RETIRED" ||
				rawState === "TESTING"
					? rawState
					: "DRAFT";
			return {
				id: agent.eid || String(agent.id),
				name: agent.name || "",
				description: agent.description || "",
				state,
				skills: agent.eid
					? [...new Set(tasksByAgent.get(agent.eid) || [])]
					: [],
				updatedBy: agent.sys_updated_by || null,
				owner: agent.sys_created_by || null,
				lastUpdated: formatDate(agent.sys_date_updated),
			};
		});

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
	const authReq = req as AuthenticatedRequest;
	try {
		const { name } = AgentCheckNameQuerySchema.parse(req.query);
		const orgId = authReq.user.activeOrganizationId;
		const escaped = name.replace(/"/g, '\\"');
		const matches = await agenticService.filterAgents(
			`name__exact="${escaped}"&tenant__exact="${orgId}"`,
			{ limit: 1 },
		);
		res.json({ available: matches.length === 0 });
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
 * GET /api/agents/tools
 * List tools from LLM Service with optional search filter
 */
router.get("/tools", async (req, res) => {
	try {
		const { search, type, active, limit, offset } = ToolListQuerySchema.parse(
			req.query,
		);

		let tools: Awaited<ReturnType<typeof agenticService.listTools>>;

		if (search) {
			// Build OR filter: name OR description match (same pattern as agents)
			const escaped = search.replace(/"/g, '\\"');
			const searchFilter = `name__icontains="${escaped}"|description__icontains="${escaped}"`;
			const filters: string[] = [searchFilter];
			if (active !== undefined) filters.push(`active__exact=${active}`);
			if (type) filters.push(`type__exact=${type}`);
			const query =
				filters.length > 1
					? `(${filters[0]})&${filters.slice(1).join("&")}`
					: filters[0];

			tools = await agenticService.filterTools(query, {
				limit: Number(limit),
				offset: Number(offset),
			});
		} else {
			tools = await agenticService.listTools({
				active: active !== undefined ? active === "true" : undefined,
				type,
				limit: Number(limit),
				offset: Number(offset),
			});
		}

		const items = tools.map((t) => ({
			eid: t.eid,
			name: t.name,
			description: t.description || "",
			type: t.type,
			active: t.active,
		}));

		res.json({
			tools: items,
			limit: Number(limit),
			offset: Number(offset),
			hasMore: tools.length === Number(limit),
		});
	} catch (error: any) {
		if (error?.response) {
			logger.error(
				{ status: error.response.status, data: error.response.data },
				"LLM Service error listing tools",
			);
			return res.status(502).json({
				error: "LLM Service unavailable",
				code: "LLM_SERVICE_ERROR",
			});
		}
		logger.error({ error }, "Error listing tools");
		res
			.status(500)
			.json({ error: "Failed to list tools", code: "INTERNAL_ERROR" });
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
		const orgId = authReq.user.activeOrganizationId;

		// Name+tenant uniqueness gate (CREATE mode only).
		// Agent names are unique per-tenant, not globally. The debounced
		// client-side check is a UX hint; enforce the invariant server-side
		// here to close races and to guarantee the meta-agent never runs
		// against a name already taken in this tenant.
		if (!body.targetAgentEid) {
			const escaped = body.name.replace(/"/g, '\\"');
			const matches = await agenticService.filterAgents(
				`name__exact="${escaped}"&tenant__exact="${orgId}"`,
				{ limit: 1 },
			);
			if (matches.length > 0) {
				return res.status(409).json({
					error: "An agent with this name already exists in your organization",
					code: "NAME_TAKEN",
				});
			}
		}

		// Symmetric direct-write: RITA owns ALL deterministic/"cheap" fields
		// (name, description, icons, starters, guardrails, admin_type, audit,
		// tenant). The meta-agent owns only the "expensive" step — turning the
		// instructions prose into structured sub-tasks. This applies to both
		// flows:
		//   CREATE (no body.targetAgentEid): POST /agents/metadata writes the
		//     shell with cheap fields, meta-agent runs in UPDATE-shell mode.
		//   UPDATE (body.targetAgentEid present): PUT /agents/metadata/eid/{id}
		//     applies any cheap changes first, meta-agent runs in UPDATE mode.
		// Consequence: the meta-agent never needs to patch metadata fields, so
		// they can't be dropped/normalized by the LLM. Rollback of the shell on
		// meta-agent failure is handled inside DirectApiStrategy via
		// shellAlreadyCreated.
		const isShellCreate = !body.targetAgentEid;

		// RITA auto-generates the description when the user left it blank
		// (CREATE) or didn't edit it (UPDATE). Reuses the existing
		// `prompt_improve_agent_instructions` ruleset — it returns both
		// instructions and description; we discard the instructions half and
		// keep only the description. Best-effort: if the call fails we fall
		// back to whatever description the client sent so the whole flow
		// isn't blocked on a prompt failure.
		let effectiveDescription = body.description;
		if (body.generateDescription && body.instructions?.trim()) {
			try {
				const completion = await agenticService.executePromptCompletion({
					promptName: "prompt_improve_agent_instructions",
					promptParameters: {
						utterance: body.instructions,
						additional_information: JSON.stringify({
							name: body.name,
							description: body.description,
						}),
						transcript: "[]",
					},
				});
				const content = extractCompletionText(completion);
				const parsed = parseInstructionsImproverContent(content);
				if (parsed.description) {
					effectiveDescription = parsed.description;
					logger.info(
						{ targetEid: body.targetAgentEid, orgId },
						"Auto-generated description from instructions",
					);
				}
			} catch (err) {
				logger.warn(
					{ err, targetEid: body.targetAgentEid, orgId },
					"Failed to auto-generate description; falling back to submitted value",
				);
			}
		}

		// Shared "cheap fields" payload. Used for POST (shell create) and PUT
		// (pre-meta-agent re-apply on update). Tenant, state, active, and audit
		// fields are only set on create; updates don't re-send tenant (the LLM
		// Service's PUT returns 500 when body includes tenant).
		const cheapFields: Record<string, unknown> = {
			name: body.name,
			description: effectiveDescription || undefined,
			admin_type: body.adminType ?? "user",
			conversation_starters: body.conversationStarters ?? [],
			guardrails: body.guardrails ?? [],
			ui_configs: {
				icon: body.iconId,
				icon_color: body.iconColorId,
			},
		};

		let targetEid = body.targetAgentEid;
		if (isShellCreate) {
			const shell = await agenticService.createAgent({
				...cheapFields,
				tenant: orgId,
				state: "DRAFT",
				active: true,
				configs: { ...DEFAULT_AGENT_CONFIGS },
				sys_created_by: authReq.user.email,
				sys_updated_by: authReq.user.email,
			});
			if (!shell.eid) {
				logger.error(
					{ orgId },
					"Shell-first CREATE: POST /agents/metadata returned no eid",
				);
				return res.status(502).json({
					error: "LLM Service returned an agent without an eid",
					code: "LLM_SERVICE_ERROR",
				});
			}
			targetEid = shell.eid;
			logger.info(
				{ eid: targetEid, orgId },
				"Shell-first CREATE: wrote agent shell before meta-agent handoff",
			);
		} else if (targetEid) {
			// UPDATE: re-apply cheap fields directly so the meta-agent sees a
			// correct snapshot and never needs to touch them. Best-effort — if
			// the PUT fails we still invoke the meta-agent (instructions change
			// is the primary intent) and surface the PUT error in logs.
			try {
				await agenticService.updateAgent(targetEid, {
					...cheapFields,
					sys_updated_by: authReq.user.email,
				});
				logger.info(
					{ eid: targetEid, orgId },
					"UPDATE: applied cheap fields directly before meta-agent handoff",
				);
			} catch (err) {
				logger.warn(
					{ eid: targetEid, err },
					"UPDATE: failed to re-apply cheap fields; proceeding to meta-agent",
				);
			}
		}

		const strategy = getAgentCreationStrategy();

		const result = await strategy.createAgent({
			name: body.name,
			description: effectiveDescription,
			instructions: body.instructions,
			iconId: body.iconId,
			iconColorId: body.iconColorId,
			adminType: body.adminType,
			conversationStarters: body.conversationStarters,
			guardrails: body.guardrails,
			targetAgentEid: targetEid,
			updatePrompt: body.updatePrompt,
			shellAlreadyCreated: isShellCreate,
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
			targetAgentEid: body.targetAgentEid,
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
 * Extract the raw completion text from a /prompts/completion response.
 * The endpoint returns { data, usage, reference_id, ... } where `data` may
 * be a string or (if the ruleset has is_json_response) a parsed object.
 *
 * The LLM sometimes returns JSON-escaped content (literal `\n`, `\"`) — we
 * unescape those so downstream parsers and the UI see real newlines.
 */
function unescapeJsonLiterals(text: string): string {
	// LLM sometimes emits literal backslash-n sequences instead of real
	// newlines (because the source prompt said "output JSON-escaped text").
	// Always decode — a no-op when no escape sequences are present.
	if (!/\\[n"rt\\]/.test(text)) return text;
	const SENTINEL = "\uE000"; // private-use area, won't appear in real text
	return text
		.replace(/\\\\/g, SENTINEL) // protect literal backslashes first
		.replace(/\\n/g, "\n")
		.replace(/\\r/g, "\r")
		.replace(/\\t/g, "\t")
		.replace(/\\"/g, '"')
		.replace(new RegExp(SENTINEL, "g"), "\\");
}

function extractCompletionText(
	response: { data?: string | Record<string, unknown> | null } | null,
): string {
	const data = response?.data;
	if (typeof data === "string") return unescapeJsonLiterals(data);
	if (data && typeof data === "object") {
		// Common shapes: { content: "..." } or { text: "..." } or { message: "..." }
		for (const key of ["content", "text", "message", "output"]) {
			const v = (data as Record<string, unknown>)[key];
			if (typeof v === "string") return unescapeJsonLiterals(v);
		}
		return JSON.stringify(data);
	}
	throw new Error("Missing 'data' field in /prompts/completion response");
}

/**
 * POST /api/agents/improve-instructions
 * Invoke the AgentInstructionsImprover prompt ruleset and return the parsed
 * improved instructions synchronously.
 */
router.post("/improve-instructions", async (req, res) => {
	try {
		const body = ImproveInstructionsBodySchema.parse(req.body);
		const agenticService = new AgenticService();

		const completion = await agenticService.executePromptCompletion({
			promptName: "prompt_improve_agent_instructions",
			promptParameters: {
				utterance: body.instructions,
				additional_information: JSON.stringify(body.agentConfig),
				transcript: "[]",
			},
		});

		const content = extractCompletionText(completion);
		const parsed = parseInstructionsImproverContent(content);

		res.status(200).json(parsed);
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
		logger.error({ err: error }, "Error improving instructions");
		res.status(500).json({
			error: "Failed to improve instructions",
			code: "INTERNAL_ERROR",
		});
	}
});

/**
 * POST /api/agents/generate-conversation-starters
 * Invoke the ConversationStarterGeneratorAgent prompt ruleset and return
 * the parsed starters synchronously.
 */
router.post("/generate-conversation-starters", async (req, res) => {
	try {
		const body = GenerateConversationStartersBodySchema.parse(req.body);
		const agenticService = new AgenticService();

		const config = body.agentConfig;

		// Format additional_information as structured text matching the
		// prompt's few-shot examples (not raw JSON) so the LLM weighs
		// instructions and description over raw capability flags.
		// Only list actual tools/knowledge sources — not
		// platform capabilities (webSearch, imageGeneration) which are
		// background features and shouldn't drive conversation starters.
		const tools: string[] = [
			...(config.tools || []),
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

		const completion = await agenticService.executePromptCompletion({
			promptName: "prompt_generate_conversation_starters",
			promptParameters: {
				utterance: "Generate conversation starters for this agent.",
				additional_information: additionalInfoParts.join(""),
				transcript: "[]",
			},
		});

		const content = extractCompletionText(completion);
		const starters = parseConversationStarterContent(content);

		res.status(200).json({ starters });
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

		// Look up agent — verifies org ownership
		const agent = await agenticService.assertAgentOrg(
			eid,
			authReq.user.activeOrganizationId,
		);
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

		// Verify org ownership before deleting
		await agenticService.assertAgentOrg(eid, authReq.user.activeOrganizationId);

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
	const authReq = req as AuthenticatedRequest;
	try {
		const { eid } = req.params;
		const agent = await agenticService.assertAgentOrg(
			eid,
			authReq.user.activeOrganizationId,
		);

		// Fetch tasks so their goal/backstory/task/expected_output/tools can be
		// surfaced in the edit form instead of being dropped during load.
		let tasks: Awaited<ReturnType<typeof agenticService.listTasks>> = [];
		try {
			tasks = await agenticService.listTasks(eid);
		} catch {
			logger.warn({ eid }, "Failed to fetch tasks for agent detail");
		}

		res.json(
			apiDataToAgentConfig(agent as unknown as Record<string, unknown>, tasks),
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

		// Every newly created agent must ship with the default LLM execution
		// config — the LLM Service rejects agents missing `configs.llm_parameters`
		// at execution time with `ValueError: Missing llm_parameters`.
		apiData.configs ??= { ...DEFAULT_AGENT_CONFIGS };

		logger.info(
			{ name: body.name, userId: authReq.user?.id },
			"Creating agent",
		);

		const created = await agenticService.createAgent(apiData);

		// Draft status is now driven by the LLM Service's `state` column
		// (defaulting to "DRAFT" on create), not the legacy `active` boolean.
		// No post-create patch is needed here — the payload already carries
		// `state` when the caller asked for a non-default value.
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
router.put("/:eid", async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	try {
		const { eid } = req.params;

		// Verify org ownership before updating
		await agenticService.assertAgentOrg(eid, authReq.user.activeOrganizationId);

		const body = AgentUpdateBodySchema.parse(req.body);
		const apiData = agentConfigToApiData(
			body as unknown as Record<string, unknown>,
		);

		// Tenant must NOT be sent on PUT — the LLM Service returns 500 when the
		// body includes it. Only sys_updated_by is re-stamped here.
		if (authReq.user?.email) {
			apiData.sys_updated_by = authReq.user.email;
		}

		logger.info({ eid, userId: authReq.user?.id }, "Updating agent");

		const updated = await agenticService.updateAgent(eid, apiData);

		// Fetch tasks so their goal/backstory/task/expected_output/tools can be
		// surfaced in the edit form instead of being dropped during load.
		let tasks: Awaited<ReturnType<typeof agenticService.listTasks>> = [];
		try {
			tasks = await agenticService.listTasks(eid);
		} catch {
			logger.warn({ eid }, "Failed to fetch tasks for agent update response");
		}

		res.json(
			apiDataToAgentConfig(
				updated as unknown as Record<string, unknown>,
				tasks,
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
