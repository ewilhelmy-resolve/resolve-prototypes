import { z } from "../docs/openapi.js";
import { ErrorResponseSchema } from "./common.js";

// ============================================================================
// POST /api/iframe/validate-instantiation
// ============================================================================

export const IframeValidateRequestSchema = z
	.object({
		sessionKey: z.string().openapi({ description: "Valkey session key" }),
		intentEid: z
			.string()
			.optional()
			.openapi({ description: "Optional intent EID for tracking" }),
		existingConversationId: z
			.string()
			.uuid()
			.optional()
			.openapi({ description: "Existing conversation ID to resume" }),
	})
	.openapi("IframeValidateRequest");

export const IframeValidateResponseSchema = z
	.object({
		valid: z.boolean().openapi({ description: "Whether validation succeeded" }),
		conversationId: z
			.string()
			.uuid()
			.optional()
			.openapi({ description: "Conversation ID" }),
		webhookConfigLoaded: z
			.boolean()
			.optional()
			.openapi({ description: "Whether webhook config loaded" }),
		webhookTenantId: z
			.string()
			.optional()
			.openapi({ description: "Tenant ID from webhook config" }),
		titleText: z
			.string()
			.optional()
			.openapi({ description: "Custom title text from Valkey" }),
		welcomeText: z
			.string()
			.optional()
			.openapi({ description: "Custom welcome text from Valkey" }),
		placeholderText: z
			.string()
			.optional()
			.openapi({ description: "Custom placeholder text from Valkey" }),
		valkeyPayload: z
			.record(z.string(), z.unknown())
			.optional()
			.openapi({ description: "Full Valkey payload (dev tools)" }),
		error: z
			.string()
			.optional()
			.openapi({ description: "Error message if validation failed" }),
	})
	.openapi("IframeValidateResponse");

// ============================================================================
// GET /api/iframe/debug
// ============================================================================

export const IframeDebugResponseSchema = z
	.object({
		timestamp: z
			.string()
			.datetime()
			.openapi({ description: "Current timestamp" }),
		valkey: z
			.object({
				connected: z
					.boolean()
					.openapi({ description: "Valkey connection status" }),
				url: z
					.string()
					.optional()
					.openapi({ description: "Valkey URL (masked)" }),
			})
			.openapi({ description: "Valkey status" }),
		environment: z
			.record(z.string(), z.string())
			.openapi({ description: "Environment variable status (set/not set)" }),
	})
	.openapi("IframeDebugResponse");

// ============================================================================
// POST /api/iframe/execute
// ============================================================================

export const IframeExecuteRequestSchema = z
	.object({
		hashkey: z
			.string()
			.optional()
			.openapi({ description: "Valkey hashkey for workflow" }),
		sessionKey: z
			.string()
			.optional()
			.openapi({ description: "Alternative to hashkey (portal uses this)" }),
	})
	.openapi("IframeExecuteRequest");

export const IframeExecuteResponseSchema = z
	.object({
		success: z.boolean().openapi({ description: "Whether execution started" }),
		eventId: z
			.string()
			.optional()
			.openapi({ description: "Event ID for tracking" }),
		error: z
			.string()
			.optional()
			.openapi({ description: "Error message if failed" }),
		debug: z
			.object({
				valkeyStatus: z.unknown().optional(),
				totalDurationMs: z.number().optional(),
				errorCode: z.string().optional(),
				errorDetails: z.string().optional(),
			})
			.optional()
			.openapi({ description: "Debug information" }),
	})
	.openapi("IframeExecuteResponse");

// ============================================================================
// DELETE /api/iframe/conversation/:conversationId
// ============================================================================

export const IframeDeleteConversationResponseSchema = z
	.object({
		success: z.boolean().openapi({ description: "Whether deletion succeeded" }),
		error: z
			.string()
			.optional()
			.openapi({ description: "Error message if failed" }),
	})
	.openapi("IframeDeleteConversationResponse");

// Re-export for convenience
export { ErrorResponseSchema };
