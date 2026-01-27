import { registry, z } from "../openapi.js";
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

// ============================================================================
// POST /api/conversations - Create conversation
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
			content: {
				"application/json": {
					schema: CreateConversationSchema,
				},
			},
		},
	},
	responses: {
		201: {
			description: "Conversation created",
			content: {
				"application/json": {
					schema: ConversationResponseSchema,
				},
			},
		},
		400: {
			description: "Validation error",
			content: {
				"application/json": {
					schema: ValidationErrorSchema,
				},
			},
		},
		401: {
			description: "Unauthorized",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
		500: {
			description: "Server error",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
	},
});

// ============================================================================
// GET /api/conversations - List conversations
// ============================================================================

registry.registerPath({
	method: "get",
	path: "/api/conversations",
	tags: ["Conversations"],
	summary: "List conversations",
	description: "List user's chat conversations with pagination",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		query: ListConversationsQuerySchema,
	},
	responses: {
		200: {
			description: "List of conversations",
			content: {
				"application/json": {
					schema: ConversationsListResponseSchema,
				},
			},
		},
		401: {
			description: "Unauthorized",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
		500: {
			description: "Server error",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
	},
});

// ============================================================================
// GET /api/conversations/:conversationId/messages - Get messages
// ============================================================================

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
			content: {
				"application/json": {
					schema: MessagesResponseSchema,
				},
			},
		},
		401: {
			description: "Unauthorized",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
		404: {
			description: "Conversation not found",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
		500: {
			description: "Server error",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
	},
});

// ============================================================================
// POST /api/conversations/:conversationId/messages - Send message
// ============================================================================

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
		body: {
			content: {
				"application/json": {
					schema: CreateMessageSchema,
				},
			},
		},
	},
	responses: {
		201: {
			description: "Message sent",
			content: {
				"application/json": {
					schema: MessageCreatedResponseSchema,
				},
			},
		},
		400: {
			description: "Validation error",
			content: {
				"application/json": {
					schema: ValidationErrorSchema,
				},
			},
		},
		401: {
			description: "Unauthorized",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
		404: {
			description: "Conversation not found",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
		500: {
			description: "Server error",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
	},
});

// ============================================================================
// PATCH /api/conversations/:conversationId - Update conversation
// ============================================================================

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
			content: {
				"application/json": {
					schema: UpdateConversationSchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: "Conversation updated",
			content: {
				"application/json": {
					schema: ConversationResponseSchema,
				},
			},
		},
		400: {
			description: "Validation error",
			content: {
				"application/json": {
					schema: ValidationErrorSchema,
				},
			},
		},
		401: {
			description: "Unauthorized",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
		404: {
			description: "Conversation not found",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
		500: {
			description: "Server error",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
	},
});

// ============================================================================
// DELETE /api/conversations/:conversationId - Delete conversation
// ============================================================================

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
				"application/json": {
					schema: DeleteConversationResponseSchema,
				},
			},
		},
		401: {
			description: "Unauthorized",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
		404: {
			description: "Conversation not found",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
		500: {
			description: "Server error",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
	},
});
