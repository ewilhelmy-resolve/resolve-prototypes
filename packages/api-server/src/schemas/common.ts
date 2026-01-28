import { z } from "../docs/openapi.js";

// ============================================================================
// Error Response Schemas
// ============================================================================

export const ErrorResponseSchema = z
	.object({
		error: z
			.string()
			.openapi({ description: "Error message", example: "Resource not found" }),
		code: z
			.string()
			.optional()
			.openapi({ description: "Error code", example: "NOT_FOUND" }),
		details: z
			.any()
			.optional()
			.openapi({ description: "Additional error details" }),
	})
	.openapi("ErrorResponse");

export const ValidationErrorSchema = z
	.object({
		error: z.literal("Validation error"),
		details: z.array(
			z.object({
				code: z.string(),
				path: z.array(z.union([z.string(), z.number()])),
				message: z.string(),
			}),
		),
	})
	.openapi("ValidationError");

// ============================================================================
// Pagination Schemas
// ============================================================================

export const PaginationInfoSchema = z
	.object({
		next_cursor: z.string().nullable().openapi({
			description: "Cursor for next page, null if no more pages",
			example: "2024-01-15T10:30:00.000Z",
		}),
		has_more: z.boolean().openapi({
			description: "Whether there are more results",
			example: true,
		}),
	})
	.openapi("PaginationInfo");

export const CursorPaginationQuerySchema = z.object({
	cursor: z.string().datetime().optional().openapi({
		description: "Cursor for pagination (ISO timestamp)",
		example: "2024-01-15T10:30:00.000Z",
	}),
	limit: z.coerce.number().int().min(1).max(100).optional().openapi({
		description: "Number of results per page",
		default: 20,
		example: 20,
	}),
});

// ============================================================================
// Common Response Wrappers
// ============================================================================

export function createDataResponse<T extends z.ZodTypeAny>(
	schema: T,
	name: string,
) {
	return z
		.object({
			data: schema,
		})
		.openapi(`${name}Response`);
}

export function createPaginatedResponse<T extends z.ZodTypeAny>(
	schema: T,
	name: string,
) {
	return z
		.object({
			data: z.array(schema),
			pagination: PaginationInfoSchema,
		})
		.openapi(`${name}ListResponse`);
}
