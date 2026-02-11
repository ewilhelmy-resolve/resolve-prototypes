import { z } from "../docs/openapi.js";

// ============================================================================
// Ticket Schemas
// ============================================================================

export const RitaStatusSchema = z
	.enum(["NEEDS_RESPONSE", "COMPLETED"])
	.openapi({ description: "Rita automation status" });

export const TicketCustomFieldsSchema = z
	.object({
		is_usable: z.boolean().optional().openapi({
			description: "Whether ticket is eligible for cluster assignment",
		}),
	})
	.passthrough()
	.openapi("TicketCustomFields");

export const TicketSchema = z
	.object({
		id: z.string().uuid().openapi({ description: "Ticket ID" }),
		organization_id: z
			.string()
			.uuid()
			.openapi({ description: "Organization ID" }),
		cluster_id: z
			.string()
			.uuid()
			.nullable()
			.openapi({ description: "Associated cluster ID" }),
		data_source_connection_id: z.string().uuid().nullable().openapi({
			description: "Data source connection ID",
		}),
		external_id: z.string().openapi({
			description: "External ticket ID from ITSM",
			example: "INC0012345",
		}),
		subject: z.string().openapi({
			description: "Ticket subject/title",
			example: "Password reset request",
		}),
		description: z.string().nullable().openapi({
			description: "Human-readable ticket description",
		}),
		external_status: z.string().openapi({
			description: "Status from ITSM system",
			example: "Open",
		}),
		cluster_text: z.string().nullable().openapi({
			description: "Text used for clustering",
		}),
		rita_status: RitaStatusSchema,
		source_metadata: z.record(z.string(), z.any()).openapi({
			description: "Additional metadata from source system",
		}),
		custom_fields: TicketCustomFieldsSchema.nullable().openapi({
			description: "Flexible field for ingestion data (e.g., is_usable)",
		}),
		created_at: z.string().datetime().openapi({
			description: "Creation timestamp",
			example: "2024-01-15T10:30:00.000Z",
		}),
		updated_at: z.string().datetime().openapi({
			description: "Last update timestamp",
			example: "2024-01-15T10:30:00.000Z",
		}),
	})
	.openapi("Ticket");

// ============================================================================
// Response Schemas
// ============================================================================

export const TicketResponseSchema = z
	.object({
		data: TicketSchema,
	})
	.openapi("TicketResponse");
