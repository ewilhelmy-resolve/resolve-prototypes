/**
 * Conversation Routes
 *
 * Webhook sources:
 * - rita-chat: Regular session (Keycloak auth)
 * - rita-chat-iframe: Iframe session (Valkey IDs, isIframeSession=true)
 *
 * Source is determined by session.isIframeSession flag.
 * See types/webhook.ts for ChatWebhookSource type definition.
 */
import express from "express";
import { z } from "zod";
import { withOrgContext } from "../config/database.js";
import { registry } from "../docs/openapi.js";
import { authenticateUser } from "../middleware/auth.js";
import {
	ErrorResponseSchema,
	ValidationErrorSchema,
} from "../schemas/common.js";
import {
	ConversationResponseSchema,
	ConversationsListResponseSchema,
	CreateConversationSchema,
	CreateMessageSchema,
	DeleteConversationResponseSchema,
	GetMessagesQuerySchema,
	ListConversationsQuerySchema,
	MessageCreatedResponseSchema,
	MessagesResponseSchema,
	UpdateConversationSchema,
} from "../schemas/conversation.js";
import { getSessionStore } from "../services/sessionStore.js";
import { WebhookService } from "../services/WebhookService.js";
import type { AuthenticatedRequest } from "../types/express.js";
import type { WebhookResponse } from "../types/webhook.js";

const router = express.Router();
const webhookService = new WebhookService();

// ============================================================================
// OpenAPI Documentation Registration
// ============================================================================

registry.registerPath({
	method: "post",
	path: "/api/conversations",
	tags: ["Conversations"],
	summary: "Create conversation",
	description: "Create a new chat conversation",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		body: {
			content: { "application/json": { schema: CreateConversationSchema } },
		},
	},
	responses: {
		201: {
			description: "Conversation created",
			content: { "application/json": { schema: ConversationResponseSchema } },
		},
		400: {
			description: "Validation error",
			content: { "application/json": { schema: ValidationErrorSchema } },
		},
		401: {
			description: "Unauthorized",
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
	path: "/api/conversations",
	tags: ["Conversations"],
	summary: "List conversations",
	description: "List user's chat conversations with pagination",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: { query: ListConversationsQuerySchema },
	responses: {
		200: {
			description: "List of conversations",
			content: {
				"application/json": { schema: ConversationsListResponseSchema },
			},
		},
		401: {
			description: "Unauthorized",
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
	path: "/api/conversations/{conversationId}/messages",
	tags: ["Conversations"],
	summary: "Get conversation messages",
	description:
		"Get paginated messages for a conversation using cursor-based pagination",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		params: z.object({
			conversationId: z
				.string()
				.uuid()
				.openapi({ description: "Conversation ID" }),
		}),
		query: GetMessagesQuerySchema,
	},
	responses: {
		200: {
			description: "List of messages",
			content: { "application/json": { schema: MessagesResponseSchema } },
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		404: {
			description: "Conversation not found",
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
	path: "/api/conversations/{conversationId}/messages",
	tags: ["Conversations"],
	summary: "Send message",
	description:
		"Send a new message to a conversation. Triggers webhook for processing.",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		params: z.object({
			conversationId: z
				.string()
				.uuid()
				.openapi({ description: "Conversation ID" }),
		}),
		body: { content: { "application/json": { schema: CreateMessageSchema } } },
	},
	responses: {
		201: {
			description: "Message sent",
			content: { "application/json": { schema: MessageCreatedResponseSchema } },
		},
		400: {
			description: "Validation error",
			content: { "application/json": { schema: ValidationErrorSchema } },
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		404: {
			description: "Conversation not found",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

registry.registerPath({
	method: "patch",
	path: "/api/conversations/{conversationId}",
	tags: ["Conversations"],
	summary: "Update conversation",
	description: "Update conversation title",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		params: z.object({
			conversationId: z
				.string()
				.uuid()
				.openapi({ description: "Conversation ID" }),
		}),
		body: {
			content: { "application/json": { schema: UpdateConversationSchema } },
		},
	},
	responses: {
		200: {
			description: "Conversation updated",
			content: { "application/json": { schema: ConversationResponseSchema } },
		},
		400: {
			description: "Validation error",
			content: { "application/json": { schema: ValidationErrorSchema } },
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		404: {
			description: "Conversation not found",
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
	path: "/api/conversations/{conversationId}",
	tags: ["Conversations"],
	summary: "Delete conversation",
	description: "Delete a conversation and all its messages",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		params: z.object({
			conversationId: z
				.string()
				.uuid()
				.openapi({ description: "Conversation ID" }),
		}),
	},
	responses: {
		200: {
			description: "Conversation deleted",
			content: {
				"application/json": { schema: DeleteConversationResponseSchema },
			},
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		404: {
			description: "Conversation not found",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

// Configuration: Maximum conversations per user before automatic cleanup
const MAX_CONVERSATIONS_PER_USER = parseInt(
	process.env.MAX_CONVERSATIONS_PER_USER || "20",
	10,
);

// Create a new conversation
router.post("/", authenticateUser, async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	try {
		const { title } = CreateConversationSchema.parse(req.body);

		const result = await withOrgContext(
			authReq.user.id,
			authReq.user.activeOrganizationId,
			async (client) => {
				// Count user's existing conversations
				const countResult = await client.query(
					`
          SELECT COUNT(*) as count
          FROM conversations
          WHERE user_id = $1 AND organization_id = $2
        `,
					[authReq.user.id, authReq.user.activeOrganizationId],
				);

				const conversationCount = parseInt(countResult.rows[0].count, 10);

				// If at or above limit, delete oldest conversation
				if (conversationCount >= MAX_CONVERSATIONS_PER_USER) {
					await client.query(
						`
            DELETE FROM conversations
            WHERE id = (
              SELECT id FROM conversations
              WHERE user_id = $1 AND organization_id = $2
              ORDER BY created_at ASC
              LIMIT 1
            )
          `,
						[authReq.user.id, authReq.user.activeOrganizationId],
					);

					console.log(
						`🧹 Deleted oldest conversation for user ${authReq.user.id} (limit: ${MAX_CONVERSATIONS_PER_USER})`,
					);
				}

				// Insert new conversation
				const conversationResult = await client.query(
					`
          INSERT INTO conversations (organization_id, user_id, title, source)
          VALUES ($1, $2, $3, 'rita_go')
          RETURNING id, title, created_at, updated_at
        `,
					[authReq.user.activeOrganizationId, authReq.user.id, title.trim()],
				);

				return conversationResult.rows[0];
			},
		);

		res.status(201).json({ conversation: result });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res
				.status(400)
				.json({ error: "Validation error", details: error.issues });
		}
		console.error("Error creating conversation:", error);
		res.status(500).json({ error: "Failed to create conversation" });
	}
});

// Get all conversations for the current organization
router.get("/", authenticateUser, async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	try {
		const { limit = 20, offset = 0 } = ListConversationsQuerySchema.parse(
			req.query,
		);

		const result = await withOrgContext(
			authReq.user.id,
			authReq.user.activeOrganizationId,
			async (client) => {
				const conversationsResult = await client.query(
					`
          SELECT
            c.id,
            c.title,
            c.created_at,
            c.updated_at,
            up.email as user_email
          FROM conversations c
          LEFT JOIN user_profiles up ON c.user_id = up.user_id
          WHERE c.organization_id = $1 AND c.user_id = $2
          ORDER BY c.updated_at DESC
          LIMIT $3 OFFSET $4
        `,
					[authReq.user.activeOrganizationId, authReq.user.id, limit, offset],
				);

				const countResult = await client.query(
					"SELECT COUNT(*) as total FROM conversations WHERE organization_id = $1 AND user_id = $2",
					[authReq.user.activeOrganizationId, authReq.user.id],
				);

				return {
					conversations: conversationsResult.rows,
					total: parseInt(countResult.rows[0].total, 10),
					limit,
					offset,
				};
			},
		);

		res.json(result);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res
				.status(400)
				.json({ error: "Validation error", details: error.issues });
		}
		console.error("Error fetching conversations:", error);
		res.status(500).json({ error: "Failed to fetch conversations" });
	}
});

// Get all messages for a specific conversation with cursor-based pagination
router.get("/:conversationId/messages", authenticateUser, async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	try {
		const { conversationId } = req.params;
		const { limit = 100, before } = GetMessagesQuerySchema.parse(req.query);

		const result = await withOrgContext(
			authReq.user.id,
			authReq.user.activeOrganizationId,
			async (client) => {
				// First, verify the conversation belongs to the organization AND user
				const convCheck = await client.query(
					"SELECT id FROM conversations WHERE id = $1 AND organization_id = $2 AND user_id = $3",
					[conversationId, authReq.user.activeOrganizationId, authReq.user.id],
				);

				if (convCheck.rows.length === 0) {
					return null; // Will result in a 404
				}

				// Build query with cursor-based pagination
				// If 'before' cursor is provided, fetch older messages before that timestamp
				// Otherwise, fetch the most recent messages (initial load)
				let messagesQuery: string;
				let queryParams: any[];

				if (before) {
					// Pagination: fetch older messages before the cursor
					messagesQuery = `
            SELECT
              m.id,
              m.message,
              m.role,
              m.response_content,
              m.status,
              m.created_at,
              m.processed_at,
              m.error_message,
              m.metadata,
              m.response_group_id,
              up.email as user_email
            FROM messages m
            LEFT JOIN user_profiles up ON m.user_id = up.user_id
            WHERE m.conversation_id = $1
              AND m.organization_id = $2
              AND m.created_at < $3
            ORDER BY m.created_at DESC, m.id DESC
            LIMIT $4
          `;
					queryParams = [
						conversationId,
						authReq.user.activeOrganizationId,
						before,
						limit + 1,
					];
				} else {
					// Initial load: fetch most recent messages
					messagesQuery = `
            SELECT
              m.id,
              m.message,
              m.role,
              m.response_content,
              m.status,
              m.created_at,
              m.processed_at,
              m.error_message,
              m.metadata,
              m.response_group_id,
              up.email as user_email
            FROM messages m
            LEFT JOIN user_profiles up ON m.user_id = up.user_id
            WHERE m.conversation_id = $1 AND m.organization_id = $2
            ORDER BY m.created_at DESC, m.id DESC
            LIMIT $3
          `;
					queryParams = [
						conversationId,
						authReq.user.activeOrganizationId,
						limit + 1,
					];
				}

				const messagesResult = await client.query(messagesQuery, queryParams);

				// Check if there are more messages (hasMore flag)
				const hasMore = messagesResult.rows.length > limit;
				const messages = hasMore
					? messagesResult.rows.slice(0, limit)
					: messagesResult.rows;

				// Reverse to chronological order (oldest first) for client consumption
				messages.reverse();

				return {
					messages,
					hasMore,
					nextCursor: hasMore ? messages[0].created_at.toISOString() : null,
				};
			},
		);

		if (result === null) {
			return res.status(404).json({ error: "Conversation not found" });
		}

		res.json(result);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res
				.status(400)
				.json({ error: "Validation error", details: error.issues });
		}
		console.error("Error fetching messages for conversation:", error);
		res.status(500).json({ error: "Failed to fetch messages" });
	}
});

// Add a message to a specific conversation
router.post("/:conversationId/messages", authenticateUser, async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	try {
		const { conversationId } = req.params;
		const { content } = CreateMessageSchema.parse(req.body);

		const result = await withOrgContext(
			authReq.user.id,
			authReq.user.activeOrganizationId,
			async (client) => {
				// Verify the conversation exists and belongs to the organization AND user
				const convCheck = await client.query(
					"SELECT id FROM conversations WHERE id = $1 AND organization_id = $2 AND user_id = $3",
					[conversationId, authReq.user.activeOrganizationId, authReq.user.id],
				);

				if (convCheck.rows.length === 0) {
					throw new Error("Conversation not found or access denied");
				}

				// Fetch existing messages for transcript (before creating new message)
				const transcriptResult = await client.query(
					`
          SELECT role, message
          FROM messages
          WHERE conversation_id = $1 AND organization_id = $2
          ORDER BY created_at ASC, id ASC
        `,
					[conversationId, authReq.user.activeOrganizationId],
				);

				// Build transcript array from existing messages
				// Escape special characters to ensure valid JSON
				const transcript = transcriptResult.rows.map((row: any) => ({
					role: row.role,
					content: row.message
						.replace(/\\/g, "\\\\") // Escape backslashes first
						.replace(/\n/g, "\\n") // Escape newlines
						.replace(/\r/g, "\\r") // Escape carriage returns
						.replace(/\t/g, "\\t") // Escape tabs
						.replace(/"/g, '\\"'), // Escape quotes
				}));

				// Create message in database
				const messageResult = await client.query(
					`
          INSERT INTO messages (organization_id, conversation_id, user_id, message, role, status)
          VALUES ($1, $2, $3, $4, 'user', 'pending')
          RETURNING id, conversation_id, message, role, status, created_at
        `,
					[
						authReq.user.activeOrganizationId,
						conversationId,
						authReq.user.id,
						content.trim(),
					],
				);

				const message = messageResult.rows[0];

				return { message, transcript };
			},
		);

		// Truncate transcript to 10,000 characters
		let truncatedTranscript = result.transcript;
		const transcriptJson = JSON.stringify(result.transcript);
		if (transcriptJson.length > 10000) {
			// If transcript is too long, truncate and try to keep complete messages
			let charCount = 2; // Account for []
			truncatedTranscript = [];
			for (const entry of result.transcript) {
				const entryJson = JSON.stringify(entry);
				if (charCount + entryJson.length + 1 <= 10000) {
					// +1 for comma
					truncatedTranscript.push(entry);
					charCount += entryJson.length + 1;
				} else {
					break;
				}
			}
		}

		// Validate that transcript serializes to well-formed JSON
		try {
			const testJson = JSON.stringify({ transcript: truncatedTranscript });
			JSON.parse(testJson); // This will throw if JSON is malformed
		} catch (jsonError) {
			console.error("❌ Transcript JSON validation failed:", jsonError);
			console.error("Transcript data:", truncatedTranscript);
			throw new Error("Failed to serialize transcript to valid JSON");
		}

		// Check if this is an iframe session with tenant-specific webhook config
		const sessionStore = getSessionStore();
		const fullSession = await sessionStore.getSession(
			authReq.session.sessionId,
		);
		const iframeConfig = fullSession?.iframeWebhookConfig;

		// Validate userGuid exists for iframe sessions (required for message routing)
		if (iframeConfig && !iframeConfig.userGuid) {
			console.error(
				"❌ Iframe session missing userGuid - cannot route messages",
			);
			return res.status(400).json({
				error:
					"Iframe configuration missing userGuid - messages cannot be routed",
				code: "IFRAME_MISSING_USER_GUID",
			});
		}

		let webhookResponse: WebhookResponse;

		if (iframeConfig) {
			// Iframe embed - use tenant-specific webhook with full Valkey config
			console.log(
				`📤 Using tenant-specific webhook for iframe session (tenant: ${iframeConfig.tenantId})`,
			);
			webhookResponse = await webhookService.sendTenantMessageEvent({
				organizationId: authReq.user.activeOrganizationId,
				userId: authReq.user.id,
				conversationId: conversationId,
				messageId: result.message.id,
				customerMessage: result.message.message,
				createdAt: result.message.created_at,
				iframeConfig, // Pass entire Valkey config
			});
		} else {
			// Regular chat - use env var webhook
			// Use iframe source if this is an iframe session (even without full Valkey config)
			const source = fullSession?.isIframeSession
				? "rita-chat-iframe"
				: "rita-chat";
			webhookResponse = await webhookService.sendMessageEvent({
				organizationId: authReq.user.activeOrganizationId,
				userId: authReq.user.id,
				userEmail: authReq.user.email,
				conversationId: conversationId,
				messageId: result.message.id,
				customerMessage: result.message.message,
				documentIds: [], // No per-message document attachments - RAG uses all user documents
				createdAt: result.message.created_at,
				transcript: truncatedTranscript,
				source,
			});
		}

		// Update message status based on webhook response
		await withOrgContext(
			authReq.user.id,
			authReq.user.activeOrganizationId,
			async (client) => {
				if (webhookResponse.success) {
					await client.query(
						"UPDATE messages SET status = $1, sent_at = NOW() WHERE id = $2",
						["sent", result.message.id],
					);
					console.log(
						`📤 Webhook sent successfully for message ${result.message.id}`,
					);
				} else {
					await client.query(
						`
            UPDATE messages
            SET status = $1, error_message = $2
            WHERE id = $3
          `,
						[
							"failed",
							webhookResponse.error || "Webhook failed",
							result.message.id,
						],
					);
					console.error(
						`📤 Webhook failed for message ${result.message.id}:`,
						webhookResponse.error,
					);
				}
			},
		);

		res.status(201).json({
			message: result.message,
			// Include webhook debug info for iframe debugging
			webhook: {
				success: webhookResponse.success,
				error: webhookResponse.error,
				usedTenantConfig: !!iframeConfig,
				tenantId: iframeConfig?.tenantId,
			},
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res
				.status(400)
				.json({ error: "Validation error", details: error.issues });
		}
		console.error("Error creating message:", error);
		res.status(500).json({ error: "Failed to create message" });
	}
});

// Update conversation title
router.patch("/:conversationId", authenticateUser, async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	try {
		const { conversationId } = req.params;
		const { title } = UpdateConversationSchema.parse(req.body);

		const result = await withOrgContext(
			authReq.user.id,
			authReq.user.activeOrganizationId,
			async (client) => {
				// Verify the conversation exists and belongs to the organization AND user
				const convCheck = await client.query(
					"SELECT id FROM conversations WHERE id = $1 AND organization_id = $2 AND user_id = $3",
					[conversationId, authReq.user.activeOrganizationId, authReq.user.id],
				);

				if (convCheck.rows.length === 0) {
					return null; // Will result in a 404
				}

				// Update the conversation title
				const updateResult = await client.query(
					`
          UPDATE conversations
          SET title = $1, updated_at = NOW()
          WHERE id = $2 AND organization_id = $3 AND user_id = $4
          RETURNING id, title, created_at, updated_at
        `,
					[
						title.trim(),
						conversationId,
						authReq.user.activeOrganizationId,
						authReq.user.id,
					],
				);

				return updateResult.rows[0];
			},
		);

		if (result === null) {
			return res.status(404).json({ error: "Conversation not found" });
		}

		res.json({ conversation: result });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res
				.status(400)
				.json({ error: "Validation error", details: error.issues });
		}
		console.error("Error updating conversation:", error);
		res.status(500).json({ error: "Failed to update conversation" });
	}
});

// Delete conversation
router.delete("/:conversationId", authenticateUser, async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	try {
		const { conversationId } = req.params;

		const result = await withOrgContext(
			authReq.user.id,
			authReq.user.activeOrganizationId,
			async (client) => {
				// Verify the conversation exists and belongs to the organization AND user
				const convCheck = await client.query(
					"SELECT id FROM conversations WHERE id = $1 AND organization_id = $2 AND user_id = $3",
					[conversationId, authReq.user.activeOrganizationId, authReq.user.id],
				);

				if (convCheck.rows.length === 0) {
					return null; // Will result in a 404
				}

				// Delete the conversation (CASCADE will handle messages and document links)
				await client.query(
					"DELETE FROM conversations WHERE id = $1 AND organization_id = $2 AND user_id = $3",
					[conversationId, authReq.user.activeOrganizationId, authReq.user.id],
				);

				return { deleted: true };
			},
		);

		if (result === null) {
			return res.status(404).json({ error: "Conversation not found" });
		}

		res.json(result);
	} catch (error) {
		console.error("Error deleting conversation:", error);
		res.status(500).json({ error: "Failed to delete conversation" });
	}
});

export default router;
