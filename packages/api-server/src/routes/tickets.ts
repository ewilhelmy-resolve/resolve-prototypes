import express from "express";
import { registry, z } from "../docs/openapi.js";
import { ErrorResponseSchema } from "../schemas/common.js";
import { TicketResponseSchema } from "../schemas/ticket.js";
import { ClusterService } from "../services/ClusterService.js";
import type { AuthenticatedRequest } from "../types/express.js";

const router = express.Router();
const clusterService = new ClusterService();

// ============================================================================
// OpenAPI Documentation Registration
// ============================================================================

registry.registerPath({
	method: "get",
	path: "/api/tickets/{id}",
	tags: ["Tickets"],
	summary: "Get ticket by ID",
	description: "Retrieve a single ticket by its ID",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		params: z.object({
			id: z.string().uuid().openapi({ description: "Ticket ID" }),
		}),
	},
	responses: {
		200: {
			description: "Ticket details",
			content: { "application/json": { schema: TicketResponseSchema } },
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		404: {
			description: "Ticket not found",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

/**
 * GET /api/tickets/:id
 * Get a single ticket by ID
 */
router.get("/:id", async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	const { id } = req.params;

	try {
		const ticket = await clusterService.getTicketById(
			id,
			authReq.user.activeOrganizationId,
		);

		if (!ticket) {
			return res.status(404).json({ error: "Ticket not found" });
		}

		res.json({ data: ticket });
	} catch (error) {
		console.error("[Tickets] Error fetching ticket:", error);
		res.status(500).json({ error: "Failed to fetch ticket" });
	}
});

export default router;
