/**
 * Jarvis Session Types
 *
 * Type definitions and Zod validation for Jarvis iframe session params.
 * These define the payload stored in Valkey and passed to RITA.
 *
 * Required fields marked with `required: true` in JSDoc comments.
 * Based on Confluence documentation: Jarvis Architecture Overview
 */

import { z } from "zod";

// ============================================================================
// Context Schemas (Activity vs Workflow Designer)
// ============================================================================

/**
 * Activity Designer context - passed when user is in Activity Designer
 * @required designer - Must be "activity"
 * @required activityId - ID of the activity being edited
 */
export const ActivityContextSchema = z.object({
	/** @required Must be "activity" */
	designer: z.literal("activity"),
	/** @required Activity ID */
	activityId: z.number(),
	/** Activity display name */
	activityName: z.string().optional(),
	/** Activity source code (C# or Python) */
	activitySource: z.string().optional(),
	/** Language code (1 = C#, 2 = VB.NET, 3 = Python) */
	language: z.number().optional(),
	/** Language display name */
	languageName: z.string().optional(),
	/** Activity settings JSON */
	settings: z.string().optional(),
	/** Activity visibility flag */
	enabled: z.boolean().optional(),
	/** Cloud/local execution flag */
	cloud: z.boolean().optional(),
});

/**
 * Workflow Designer context - passed when user is in Workflow Designer
 * @required designer - Must be "workflow"
 */
export const WorkflowContextSchema = z.object({
	/** @required Must be "workflow" */
	designer: z.literal("workflow"),
	/** Workflow ID */
	workflowId: z.number().optional(),
	/** Workflow display name */
	workflowName: z.string().optional(),
	/** Workflow description */
	workflowDescription: z.string().optional(),
});

/**
 * Generic context schema - allows either Activity or Workflow context
 */
export const JarvisContextSchema = z.discriminatedUnion("designer", [
	ActivityContextSchema,
	WorkflowContextSchema,
]);

// ============================================================================
// Valkey Session Payload Schema
// ============================================================================

/**
 * Valkey session payload schema
 *
 * Platform stores this in Valkey, RITA fetches via sessionKey.
 *
 * REQUIRED (Core Identity):
 * - tenantId: Tenant GUID
 * - userGuid: User's Keycloak GUID
 *
 * REQUIRED (Webhook Execution):
 * - actionsApiBaseUrl: Webhook endpoint base URL
 * - clientId: Webhook authentication
 * - clientKey: Webhook authentication
 *
 * PASS-THROUGH (Forwarded to Actions API):
 * - accessToken, refreshToken, tabInstanceId, chatSessionId, tokenExpiry
 *
 * OPTIONAL (Activity Mapping):
 * - context.activityId: Links conversation to specific activity
 */
export const ValkeySessionPayloadSchema = z.object({
	// ==========================================================================
	// REQUIRED - Core Identity (RITA needs these)
	// ==========================================================================

	/** @required Tenant GUID - identifies the organization */
	tenantId: z.string().uuid("tenantId must be a valid UUID"),

	/** @required User's Keycloak GUID - identifies the user */
	userGuid: z.string().uuid("userGuid must be a valid UUID"),

	// ==========================================================================
	// REQUIRED - Webhook Execution (needed for Actions API calls)
	// ==========================================================================

	/** @required Actions API base URL for webhook calls */
	actionsApiBaseUrl: z.string().url("actionsApiBaseUrl must be a valid URL"),

	/** @required Webhook authentication - client ID */
	clientId: z.string().uuid("clientId must be a valid UUID"),

	/** @required Webhook authentication - client secret */
	clientKey: z.string().min(1, "clientKey is required"),

	// ==========================================================================
	// PASS-THROUGH - Forwarded to Actions API (not used by RITA directly)
	// ==========================================================================

	/** Keycloak JWT - forwarded to Actions API */
	accessToken: z.string().optional(),

	/** Keycloak refresh token - forwarded to Actions API */
	refreshToken: z.string().optional(),

	/** Browser tab tracking for SignalR - forwarded to Actions API */
	tabInstanceId: z.string().optional(),

	/** Chat session ID per designer tab - forwarded to Actions API */
	chatSessionId: z.string().optional(),

	/** JWT expiration timestamp - forwarded to Actions API */
	tokenExpiry: z.number().optional(),

	// ==========================================================================
	// OPTIONAL - Metadata & Activity Mapping
	// ==========================================================================

	/** Tenant display name */
	tenantName: z.string().optional(),

	/** Activity/Workflow context - activityId used for conversation persistence */
	context: JarvisContextSchema.optional(),

	// ==========================================================================
	// OPTIONAL - UI Customization (can be in uiConfig object or flat)
	// ==========================================================================

	/** Custom title text (e.g., "Ask Workflow Designer") */
	titleText: z.string().optional(),

	/** Custom welcome message */
	welcomeText: z.string().optional(),

	/** Custom input placeholder text */
	placeholderText: z.string().optional(),

	/** UI config object (alternative to flat fields) */
	uiConfig: z
		.object({
			titleText: z.string().optional(),
			welcomeText: z.string().optional(),
			placeholderText: z.string().optional(),
		})
		.optional(),
});

// ============================================================================
// SSE Event Schema (Platform → RabbitMQ → RITA)
// ============================================================================

/**
 * SSE new_message event schema
 *
 * Sent from Platform via RabbitMQ → API Server → SSE → Jarvis client.
 * This is what "flies through" from Platform to Jarvis when assistant responds.
 *
 * REQUIRED FIELDS:
 * - type: Event type ("new_message")
 * - messageId: Message UUID
 * - conversationId: Chat thread UUID
 * - role: Message sender ("user" | "assistant")
 * - message: Message text content
 * - userId: User UUID
 * - createdAt: ISO 8601 timestamp
 *
 * OPTIONAL FIELDS:
 * - metadata.ui_schema: Dynamic UI rendering schema
 * - metadata.turn_complete: Indicates response is complete
 * - response_group_id: Groups related messages
 */
export const SSENewMessageEventSchema = z.object({
	/** @required Event type - must be "new_message" */
	type: z.literal("new_message"),

	/** @required Message UUID */
	messageId: z.string().uuid("messageId must be a valid UUID"),

	/** @required Chat thread UUID */
	conversationId: z.string().uuid("conversationId must be a valid UUID"),

	/** @required Message sender */
	role: z.enum(["user", "assistant"]),

	/** @required Message text content (can be empty if ui_schema provided) */
	message: z.string(),

	/** @required User UUID */
	userId: z.string().uuid("userId must be a valid UUID"),

	/** @required ISO 8601 timestamp */
	createdAt: z.string().datetime("createdAt must be ISO 8601 format"),

	/** Optional metadata with ui_schema for dynamic rendering */
	metadata: z
		.object({
			/** Dynamic UI rendering schema (JSON-driven UI) */
			ui_schema: z.any().optional(),
			/** Indicates response is complete */
			turn_complete: z.boolean().optional(),
			/** Source references */
			sources: z.array(z.any()).optional(),
			/** Reasoning steps */
			reasoning: z.any().optional(),
		})
		.optional(),

	/** Groups related messages */
	response_group_id: z.string().optional(),
});

/**
 * SSE message_update event schema
 *
 * Sent when message processing status changes.
 */
export const SSEMessageUpdateEventSchema = z.object({
	/** @required Event type - must be "message_update" */
	type: z.literal("message_update"),

	/** @required Message UUID */
	messageId: z.string().uuid("messageId must be a valid UUID"),

	/** @required Processing status */
	status: z.enum(["pending", "processing", "completed", "failed"]),

	/** Response content (when completed) */
	responseContent: z.string().optional(),

	/** Error message (when failed) */
	errorMessage: z.string().optional(),

	/** Processing completion timestamp */
	processedAt: z.string().optional(),
});

// ============================================================================
// Webhook Event Schema (RITA → Actions API)
// ============================================================================

/**
 * Webhook event schema
 *
 * Sent from RITA to Actions API when user sends a message.
 *
 * REQUIRED FIELDS:
 * - action: Event type (message_created, workflow_trigger)
 * - conversation_id: Chat thread UUID
 * - message_id: Message UUID
 * - customer_message: User's message text
 * - source: Must be "rita-chat-iframe"
 * - timestamp: ISO 8601 timestamp
 * - tenant_id: Tenant GUID
 * - user_id: User GUID
 * - All fields from ValkeySessionPayloadSchema
 */
export const WebhookEventSchema = z.object({
	// ==========================================================================
	// REQUIRED FIELDS
	// ==========================================================================

	/** @required Event type: message_created or workflow_trigger */
	action: z.enum(["message_created", "workflow_trigger"]),

	/** @required Chat thread UUID (created by RITA) */
	conversation_id: z.string().uuid("conversation_id must be a valid UUID"),

	/** @required Message UUID */
	message_id: z.string().uuid("message_id must be a valid UUID"),

	/** @required User's message text */
	customer_message: z.string().min(1, "customer_message is required"),

	/** @required Source identifier - must be "rita-chat-iframe" */
	source: z.literal("rita-chat-iframe"),

	/** @required ISO 8601 timestamp */
	timestamp: z.string().datetime("timestamp must be ISO 8601 format"),

	/** @required Tenant GUID (snake_case variant) */
	tenant_id: z.string().uuid("tenant_id must be a valid UUID"),

	/** @required User GUID (snake_case variant) */
	user_id: z.string().uuid("user_id must be a valid UUID"),

	// Session fields (forwarded from Valkey)
	accessToken: z.string().min(1),
	refreshToken: z.string().optional(),
	tabInstanceId: z.string().uuid(),
	chatSessionId: z.string().uuid(),
	tokenExpiry: z.number().positive(),
	actionsApiBaseUrl: z.string().url(),
	clientId: z.string().uuid(),
	clientKey: z.string().min(1),
	tenantName: z.string().optional(),
	context: JarvisContextSchema.optional(),

	// Duplicate fields (kept for backwards compatibility, prefer snake_case versions)
	/** @deprecated Use tenant_id instead - this is a duplicate */
	tenantId: z.string().uuid().optional(),
	/** @deprecated Use user_id instead - this is a duplicate */
	userGuid: z.string().uuid().optional(),

	// User info (currently fake but required by RITA)
	user_email: z.string().email().optional(),
});

// ============================================================================
// TypeScript Types (inferred from Zod schemas)
// ============================================================================

export type ActivityContext = z.infer<typeof ActivityContextSchema>;
export type WorkflowContext = z.infer<typeof WorkflowContextSchema>;
export type JarvisContext = z.infer<typeof JarvisContextSchema>;
export type ValkeySessionPayload = z.infer<typeof ValkeySessionPayloadSchema>;
export type WebhookEvent = z.infer<typeof WebhookEventSchema>;
export type SSENewMessageEvent = z.infer<typeof SSENewMessageEventSchema>;
export type SSEMessageUpdateEvent = z.infer<typeof SSEMessageUpdateEventSchema>;

// ============================================================================
// Validation Functions
// ============================================================================

export interface ValidationResult<T> {
	valid: boolean;
	data?: T;
	errors?: z.ZodError;
	/** Human-readable error messages */
	errorMessages?: string[];
}

/**
 * Validate a Valkey session payload
 * @param payload - Raw payload to validate
 * @returns Validation result with parsed data or errors
 */
export function validateValkeyPayload(
	payload: unknown,
): ValidationResult<ValkeySessionPayload> {
	const result = ValkeySessionPayloadSchema.safeParse(payload);
	if (result.success) {
		return { valid: true, data: result.data };
	}
	return {
		valid: false,
		errors: result.error,
		errorMessages: result.error.issues.map(
			(issue) => `${issue.path.join(".")}: ${issue.message}`,
		),
	};
}

/**
 * Validate a webhook event payload
 * @param event - Raw event to validate
 * @returns Validation result with parsed data or errors
 */
export function validateWebhookEvent(
	event: unknown,
): ValidationResult<WebhookEvent> {
	const result = WebhookEventSchema.safeParse(event);
	if (result.success) {
		return { valid: true, data: result.data };
	}
	return {
		valid: false,
		errors: result.error,
		errorMessages: result.error.issues.map(
			(issue) => `${issue.path.join(".")}: ${issue.message}`,
		),
	};
}

/**
 * Get list of required fields for documentation/display
 *
 * Data flows for Jarvis integration:
 * 1. routing: Fields required for correct SSE/tab/activity routing
 * 2. session: Platform → Valkey (what Platform stores for RITA to fetch)
 * 3. sseEvent: Platform → RabbitMQ → SSE → Jarvis (what flies through to Jarvis)
 * 4. webhook: Jarvis → RITA → Actions API (what RITA sends when user sends message)
 */
export function getRequiredFields(): {
	routing: { field: string; purpose: string }[];
	session: string[];
	sseEvent: string[];
	webhook: string[];
} {
	return {
		// ROUTING FIELDS - Required for correct SSE routing to tab/activity
		routing: [
			{ field: "tenantId", purpose: "→ organization_id (SSE routing)" },
			{ field: "userGuid", purpose: "→ user_id (SSE routing)" },
			{ field: "conversationId", purpose: "filters events on client" },
			{
				field: "context.activityId",
				purpose: "links conversation to activity",
			},
			{
				field: "tabInstanceId",
				purpose: "SignalR tab tracking (pass-through)",
			},
			{ field: "chatSessionId", purpose: "designer tab ID (pass-through)" },
		],
		// Valkey session payload (Platform stores, RITA fetches)
		session: [
			"tenantId",
			"userGuid",
			"actionsApiBaseUrl",
			"clientId",
			"clientKey",
		],
		// SSE event (Platform → RabbitMQ → SSE → Jarvis client)
		sseEvent: [
			"type",
			"messageId",
			"conversationId",
			"role",
			"message",
			"userId",
			"createdAt",
			"metadata.ui_schema",
		],
		// Webhook event (Jarvis → RITA → Actions API)
		webhook: [
			"action",
			"conversation_id",
			"message_id",
			"customer_message",
			"source",
			"timestamp",
			"tenant_id",
			"user_id",
		],
	};
}
