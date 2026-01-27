import { z } from "../docs/openapi.js";

// ============================================================================
// Enums
// ============================================================================

export const MessageRoleSchema = z
	.enum(["user", "assistant"])
	.openapi("MessageRole", { description: "Message sender role" });

export const MessageStatusSchema = z
	.enum(["pending", "sent", "failed"])
	.openapi("MessageStatus", { description: "Message delivery status" });

// ============================================================================
// Query Schemas
// ============================================================================

export const ListConversationsQuerySchema = z
	.object({
		limit: z.coerce
			.number()
			.int()
			.min(1)
			.max(100)
			.optional()
			.openapi({ description: "Results per page", default: 20 }),
		offset: z.coerce
			.number()
			.int()
			.min(0)
			.optional()
			.openapi({ description: "Number of results to skip", default: 0 }),
	})
	.openapi("ListConversationsQuery");

export const GetMessagesQuerySchema = z
	.object({
		limit: z.coerce
			.number()
			.int()
			.min(1)
			.max(100)
			.optional()
			.openapi({ description: "Results per page", default: 100 }),
		before: z
			.string()
			.datetime()
			.optional()
			.openapi({ description: "Cursor for pagination (ISO timestamp)" }),
	})
	.openapi("GetMessagesQuery");

// ============================================================================
// Request Schemas
// ============================================================================

export const CreateConversationSchema = z
	.object({
		title: z.string().min(1).max(255).openapi({
			description: "Conversation title",
			example: "Password Reset Help",
		}),
	})
	.openapi("CreateConversationRequest");

export const UpdateConversationSchema = z
	.object({
		title: z.string().min(1).max(255).openapi({
			description: "New conversation title",
			example: "Updated Title",
		}),
	})
	.openapi("UpdateConversationRequest");

export const CreateMessageSchema = z
	.object({
		content: z.string().min(1).openapi({
			description: "Message content",
			example: "How do I reset my password?",
		}),
	})
	.openapi("CreateMessageRequest");

// ============================================================================
// Entity Schemas
// ============================================================================

export const ConversationSchema = z
	.object({
		id: z
			.string()
			.uuid()
			.openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
		title: z.string().openapi({ example: "Password Reset Help" }),
		created_at: z
			.string()
			.datetime()
			.openapi({ example: "2024-01-15T10:30:00.000Z" }),
		updated_at: z
			.string()
			.datetime()
			.openapi({ example: "2024-01-15T10:30:00.000Z" }),
	})
	.openapi("Conversation");

export const MessageSchema = z
	.object({
		id: z
			.string()
			.uuid()
			.openapi({ example: "550e8400-e29b-41d4-a716-446655440001" }),
		message: z.string().openapi({ example: "How do I reset my password?" }),
		role: MessageRoleSchema,
		response_content: z
			.string()
			.nullable()
			.openapi({ description: "Assistant response content" }),
		status: MessageStatusSchema,
		created_at: z
			.string()
			.datetime()
			.openapi({ example: "2024-01-15T10:30:00.000Z" }),
		processed_at: z
			.string()
			.datetime()
			.nullable()
			.openapi({ description: "When message was processed" }),
		error_message: z
			.string()
			.nullable()
			.openapi({ description: "Error message if failed" }),
		metadata: z
			.record(z.string(), z.any())
			.nullable()
			.openapi({ description: "Additional metadata" }),
		response_group_id: z
			.string()
			.uuid()
			.nullable()
			.openapi({ description: "Group ID for related responses" }),
		user_email: z
			.string()
			.email()
			.nullable()
			.openapi({ description: "Email of message sender" }),
	})
	.openapi("Message");

// ============================================================================
// Response Schemas
// ============================================================================

export const ConversationResponseSchema = z
	.object({
		conversation: ConversationSchema,
	})
	.openapi("ConversationResponse");

export const ConversationsListResponseSchema = z
	.object({
		conversations: z.array(ConversationSchema),
		total: z
			.number()
			.int()
			.openapi({ description: "Total conversations", example: 42 }),
		limit: z.number().int().openapi({ example: 20 }),
		offset: z.number().int().openapi({ example: 0 }),
	})
	.openapi("ConversationsListResponse");

export const MessagesResponseSchema = z
	.object({
		messages: z.array(MessageSchema),
		hasMore: z
			.boolean()
			.openapi({ description: "Whether more messages exist" }),
		nextCursor: z
			.string()
			.datetime()
			.nullable()
			.openapi({ description: "Cursor for next page" }),
	})
	.openapi("MessagesResponse");

export const MessageCreatedResponseSchema = z
	.object({
		message: MessageSchema,
		webhook: z
			.object({
				success: z.boolean(),
				error: z.string().nullable(),
			})
			.openapi({ description: "Webhook delivery result" }),
	})
	.openapi("MessageCreatedResponse");

export const DeleteConversationResponseSchema = z
	.object({
		success: z.boolean(),
	})
	.openapi("DeleteConversationResponse");
