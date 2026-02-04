import { z } from "../docs/openapi.js";
import { ErrorResponseSchema } from "./common.js";

// ============================================================================
// POST /api/workflows/generate
// ============================================================================

export const WorkflowGenerateRequestSchema = z
	.object({
		query: z.string().min(1).openapi({ description: "Workflow query/prompt" }),
		index_name: z.string().optional().openapi({
			description: "Index name for search",
			example: "qasa_snippets3",
		}),
	})
	.openapi("WorkflowGenerateRequest");

export const WorkflowGenerateResponseSchema = z
	.object({
		success: z.literal(true),
		conversationId: z
			.string()
			.uuid()
			.openapi({ description: "Created conversation ID" }),
		messageId: z.string().uuid().openapi({ description: "Created message ID" }),
	})
	.openapi("WorkflowGenerateResponse");

// Re-export for convenience
export { ErrorResponseSchema };
