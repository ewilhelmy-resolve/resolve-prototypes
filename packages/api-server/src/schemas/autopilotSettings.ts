import { z } from "../docs/openapi.js";

// ============================================================================
// Response Schema
// ============================================================================

export const AutopilotSettingsSchema = z
	.object({
		id: z.string().uuid().openapi({ description: "Settings record ID" }),
		organization_id: z
			.string()
			.uuid()
			.openapi({ description: "Organization ID" }),
		cost_per_ticket: z
			.number()
			.positive()
			.openapi({ description: "Average cost per ticket in USD", example: 30 }),
		avg_time_per_ticket_minutes: z.number().int().positive().openapi({
			description: "Average time per ticket in minutes",
			example: 12,
		}),
		updated_by: z
			.string()
			.uuid()
			.nullable()
			.openapi({ description: "Last user who modified settings" }),
		created_at: z.string().openapi({ description: "Created timestamp" }),
		updated_at: z.string().openapi({ description: "Updated timestamp" }),
	})
	.openapi("AutopilotSettings");

export const AutopilotSettingsResponseSchema = z
	.object({
		data: AutopilotSettingsSchema,
	})
	.openapi("AutopilotSettingsResponse");

// ============================================================================
// Update Schema
// ============================================================================

export const UpdateAutopilotSettingsSchema = z
	.object({
		cost_per_ticket: z
			.number()
			.positive({ message: "Cost must be greater than zero" })
			.optional()
			.openapi({ description: "Average cost per ticket in USD" }),
		avg_time_per_ticket_minutes: z
			.number()
			.int()
			.positive({ message: "Time must be greater than zero" })
			.optional()
			.openapi({ description: "Average time per ticket in minutes" }),
	})
	.refine(
		(data) =>
			data.cost_per_ticket !== undefined ||
			data.avg_time_per_ticket_minutes !== undefined,
		{ message: "At least one field must be provided" },
	)
	.openapi("UpdateAutopilotSettings");
