import { z } from "../docs/openapi.js";

// ============================================================================
// ML Model Schemas
// ============================================================================

export const TrainingStateSchema = z
	.enum(["not_started", "in_progress", "failed", "complete"])
	.openapi({ description: "Model training state" });

export const MlModelMetadataSchema = z
	.object({
		training_state: TrainingStateSchema.optional(),
	})
	.passthrough()
	.openapi("MlModelMetadata");

export const MlModelSchema = z
	.object({
		id: z.string().uuid().openapi({ description: "Model ID" }),
		organization_id: z
			.string()
			.uuid()
			.openapi({ description: "Organization ID" }),
		model_name: z.string().openapi({
			description: "Model name",
			example: "ticket-classifier-v1",
		}),
		external_model_id: z.string().openapi({
			description: "External model reference ID",
			example: "model_abc123",
		}),
		active: z.boolean().openapi({
			description: "Whether this model is currently active",
			example: true,
		}),
		metadata: MlModelMetadataSchema.nullable().openapi({
			description: "Model metadata including training state",
		}),
		training_start_date: z.string().datetime().nullable().openapi({
			description: "When training started",
			example: "2024-01-15T10:30:00.000Z",
		}),
		training_end_date: z.string().datetime().nullable().openapi({
			description: "When training completed",
			example: "2024-01-15T12:30:00.000Z",
		}),
		created_at: z.string().datetime().nullable().openapi({
			description: "Creation timestamp",
			example: "2024-01-15T10:30:00.000Z",
		}),
		updated_at: z.string().datetime().nullable().openapi({
			description: "Last update timestamp",
			example: "2024-01-15T10:30:00.000Z",
		}),
	})
	.openapi("MlModel");

// ============================================================================
// Response Schemas
// ============================================================================

export const ActiveModelResponseSchema = z
	.object({
		data: MlModelSchema.nullable().openapi({
			description: "Active ML model or null if none active",
		}),
	})
	.openapi("ActiveModelResponse");
