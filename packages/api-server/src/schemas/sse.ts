import { z } from "../docs/openapi.js";
import { ErrorResponseSchema } from "./common.js";

// ============================================================================
// GET /api/sse/stats
// ============================================================================

export const SSEStatsResponseSchema = z
	.object({
		timestamp: z
			.string()
			.datetime()
			.openapi({ description: "Current timestamp" }),
		totalConnections: z
			.number()
			.openapi({ description: "Total active SSE connections" }),
		connectionsByOrg: z
			.record(z.string(), z.number())
			.optional()
			.openapi({ description: "Connections grouped by organization" }),
		connectionsByUser: z
			.record(z.string(), z.number())
			.optional()
			.openapi({ description: "Connections grouped by user" }),
	})
	.openapi("SSEStatsResponse");

// Re-export for convenience
export { ErrorResponseSchema };
