import express from "express";
import { logger } from "../config/logger.js";
import { registry, z } from "../docs/openapi.js";
import { authenticateUser } from "../middleware/auth.js";
import {
	AgentDeleteResponseSchema,
	AgentListQuerySchema,
	AgentListResponseSchema,
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
			updatedBy: null,
			owner: null,
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

export default router;
