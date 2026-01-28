import { z } from "../docs/openapi.js";
import { ErrorResponseSchema } from "./common.js";

// ============================================================================
// GET /api/feature-flags/:flagName
// ============================================================================

export const FlagCheckResponseSchema = z
	.object({
		flagName: z.string().openapi({ description: "Feature flag name" }),
		isEnabled: z
			.boolean()
			.openapi({ description: "Whether flag is enabled for tenant" }),
	})
	.openapi("FlagCheckResponse");

// ============================================================================
// POST /api/feature-flags/batch
// ============================================================================

export const BatchFlagsRequestSchema = z
	.object({
		flagNames: z
			.array(z.string())
			.min(1)
			.openapi({ description: "Array of flag names to check" }),
	})
	.openapi("BatchFlagsRequest");

export const BatchFlagsResponseSchema = z
	.object({
		flags: z
			.record(z.string(), z.boolean())
			.openapi({ description: "Map of flag names to enabled status" }),
	})
	.openapi("BatchFlagsResponse");

// ============================================================================
// POST /api/feature-flags/:flagName/rules
// ============================================================================

export const UpdateFlagRuleRequestSchema = z
	.object({
		isEnabled: z
			.boolean()
			.openapi({ description: "New enabled status for flag" }),
	})
	.openapi("UpdateFlagRuleRequest");

export const UpdateFlagRuleResponseSchema = z
	.object({
		success: z.literal(true),
		flagName: z.string().openapi({ description: "Feature flag name" }),
		isEnabled: z.boolean().openapi({ description: "New enabled status" }),
	})
	.openapi("UpdateFlagRuleResponse");

// Re-export for convenience
export { ErrorResponseSchema };
