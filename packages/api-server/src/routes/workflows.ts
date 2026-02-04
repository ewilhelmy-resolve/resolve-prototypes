/**
 * Workflow Routes (/jirita)
 *
 * Webhook source: rita-chat-workflows
 *
 * This is one of three chat applications in Rita:
 * - rita-chat: Main app (/chat)
 * - rita-chat-iframe: Iframe embed (/iframe/chat)
 * - rita-chat-workflows: Workflow builder (/jirita) <-- this file
 */
import express from "express";
import { withOrgContext } from "../config/database.js";
import { logger } from "../config/logger.js";
import { registry } from "../docs/openapi.js";
import { authenticateUser } from "../middleware/auth.js";
import { ErrorResponseSchema } from "../schemas/common.js";
import {
	WorkflowGenerateRequestSchema,
	WorkflowGenerateResponseSchema,
} from "../schemas/workflow.js";
import { WebhookService } from "../services/WebhookService.js";
import type { AuthenticatedRequest } from "../types/express.js";

// ============================================================================
// OpenAPI Documentation Registration
// ============================================================================

registry.registerPath({
	method: "post",
	path: "/api/workflows/generate",
	tags: ["Workflows"],
	summary: "Generate workflow",
	description:
		"Generate a dynamic workflow from a query. Creates conversation and message, then sends webhook.",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		body: {
			content: {
				"application/json": { schema: WorkflowGenerateRequestSchema },
			},
		},
	},
	responses: {
		200: {
			description: "Workflow generation started",
			content: {
				"application/json": { schema: WorkflowGenerateResponseSchema },
			},
		},
		400: {
			description: "Invalid input - query required",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Workflow generation failed",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

const router = express.Router();
const webhookService = new WebhookService();

/**
 * Generate a dynamic workflow
 * POST /api/workflows/generate
 *
 * Creates conversation + message, then sends webhook with IDs for response routing
 */
router.post("/generate", authenticateUser, async (req, res) => {
	const authReq = req as AuthenticatedRequest;

	try {
		const { query, index_name } = req.body;

		if (!query || query.trim().length === 0) {
			return res.status(400).json({ error: "Query is required" });
		}

		logger.info(
			{ query: query.trim() },
			"Creating workflow conversation and message",
		);

		// Create conversation and message in DB for response routing
		const result = await withOrgContext(
			authReq.user.id,
			authReq.user.activeOrganizationId,
			async (client) => {
				// Create workflow conversation
				const convResult = await client.query(
					`
          INSERT INTO conversations (organization_id, user_id, title, source)
          VALUES ($1, $2, $3, 'workflows')
          RETURNING id
        `,
					[
						authReq.user.activeOrganizationId,
						authReq.user.id,
						`Workflow: ${query.trim().substring(0, 50)}`,
					],
				);

				const conversationId = convResult.rows[0].id;

				// Create message with the query
				const msgResult = await client.query(
					`
          INSERT INTO messages (organization_id, conversation_id, user_id, message, role, status)
          VALUES ($1, $2, $3, $4, 'user', 'pending')
          RETURNING id, created_at
        `,
					[
						authReq.user.activeOrganizationId,
						conversationId,
						authReq.user.id,
						query.trim(),
					],
				);

				return {
					conversationId,
					messageId: msgResult.rows[0].id,
					createdAt: msgResult.rows[0].created_at,
				};
			},
		);

		logger.info(
			{ conversationId: result.conversationId, messageId: result.messageId },
			"Workflow conversation and message created",
		);

		// Response queue for workflow events
		const responseQueue =
			process.env.WORKFLOW_RESPONSE_QUEUE || "workflow.responses";

		// Send webhook with message routing IDs
		const response = await webhookService.sendGenericEvent({
			organizationId: authReq.user.activeOrganizationId,
			userId: authReq.user.id,
			userEmail: authReq.user.email,
			source: "rita-chat-workflows",
			action: "generate_dynamic_workflow",
			additionalData: {
				message_id: result.messageId,
				conversation_id: result.conversationId,
				query: query.trim(),
				index_name: index_name || "qasa_snippets3",
				response_queue: responseQueue,
			},
		});

		logger.info(
			{ responseQueue, messageId: result.messageId },
			"Workflow request sent with message routing IDs",
		);

		if (!response.success) {
			logger.error(
				{ error: response.error },
				"Workflow generation webhook failed",
			);
			return res
				.status(500)
				.json({ error: response.error || "Workflow generation failed" });
		}

		logger.info("Workflow generation request sent");
		res.json({
			success: true,
			conversationId: result.conversationId,
			messageId: result.messageId,
		});
	} catch (error: any) {
		logger.error({ error: error.message }, "Workflow generation failed");
		res.status(500).json({ error: "Workflow generation failed" });
	}
});

export default router;
