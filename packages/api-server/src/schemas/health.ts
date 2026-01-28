import { registry, z } from "../docs/openapi.js";

// ============================================================================
// Health Check Schemas
// ============================================================================

export const RabbitMQHealthSchema = z
	.object({
		status: z.enum(["connected", "disconnected", "connecting"]).openapi({
			description: "RabbitMQ connection status",
			example: "connected",
		}),
		lastConnectedAt: z.string().datetime().nullable().openapi({
			description: "Last successful connection timestamp",
		}),
		reconnectAttempts: z.number().openapi({
			description: "Number of reconnection attempts",
			example: 0,
		}),
		consecutiveFailures: z.number().openapi({
			description: "Number of consecutive failures",
			example: 0,
		}),
		message: z.string().optional().openapi({
			description: "Additional status message",
		}),
	})
	.openapi("RabbitMQHealth");

export const HealthResponseSchema = z
	.object({
		status: z.enum(["ok", "degraded"]).openapi({
			description: "Overall health status",
			example: "ok",
		}),
		timestamp: z.string().datetime().openapi({
			description: "Health check timestamp",
			example: "2024-01-15T10:30:00.000Z",
		}),
		services: z.object({
			api: z.literal("ok").openapi({
				description: "API service status",
			}),
			rabbitmq: RabbitMQHealthSchema,
		}),
	})
	.openapi("HealthResponse");

// ============================================================================
// OpenAPI Documentation Registration
// ============================================================================

registry.registerPath({
	method: "get",
	path: "/health",
	tags: ["Health"],
	summary: "Health check",
	description: "Check API server health and service status",
	security: [], // No auth required
	responses: {
		200: {
			description: "Server is healthy",
			content: { "application/json": { schema: HealthResponseSchema } },
		},
		503: {
			description: "Server is degraded",
			content: { "application/json": { schema: HealthResponseSchema } },
		},
	},
});
