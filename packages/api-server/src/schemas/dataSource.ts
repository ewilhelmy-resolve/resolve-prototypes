import { z } from "../docs/openapi.js";

// ============================================================================
// Enums
// ============================================================================

export const DataSourceTypeSchema = z
	.enum([
		"confluence",
		"servicenow",
		"servicenow_itsm",
		"sharepoint",
		"websearch",
		"jira_itsm",
		"freshdesk",
	])
	.openapi("DataSourceType", { description: "Type of data source connection" });

export const DataSourceStatusSchema = z
	.enum(["idle", "verifying", "syncing", "cancelled"])
	.openapi("DataSourceStatus", { description: "Current operation status" });

export const SyncStatusSchema = z
	.enum(["completed", "failed"])
	.nullable()
	.openapi("SyncStatus", { description: "Last sync result" });

// ============================================================================
// Request Schemas
// ============================================================================

export const CreateDataSourceRequestSchema = z
	.object({
		type: DataSourceTypeSchema,
		name: z
			.string()
			.min(1)
			.max(255)
			.openapi({ example: "My ServiceNow Instance" }),
		description: z
			.string()
			.max(1000)
			.optional()
			.openapi({ example: "Production ServiceNow KB" }),
		settings: z
			.record(z.string(), z.any())
			.optional()
			.openapi({ description: "Connection-specific settings" }),
	})
	.openapi("CreateDataSourceRequest");

export const UpdateDataSourceRequestSchema = z
	.object({
		name: z.string().min(1).max(255).optional(),
		description: z.string().max(1000).optional(),
		settings: z.record(z.string(), z.any()).optional(),
		enabled: z
			.boolean()
			.optional()
			.openapi({ description: "Enable/disable the connection" }),
	})
	.openapi("UpdateDataSourceRequest");

// ============================================================================
// Entity Schemas
// ============================================================================

export const DataSourceConnectionSchema = z
	.object({
		id: z.string().uuid(),
		organization_id: z.string().uuid(),
		type: DataSourceTypeSchema,
		name: z.string(),
		description: z.string().nullable(),
		settings: z.record(z.string(), z.any()),

		// Status
		status: DataSourceStatusSchema,
		last_sync_status: SyncStatusSchema,
		last_sync_at: z.string().datetime().nullable(),
		last_sync_error: z.string().nullable(),

		// Verification
		last_verification_at: z.string().datetime().nullable(),
		last_verification_error: z.string().nullable(),
		latest_options: z.record(z.string(), z.any()).nullable().openapi({
			description:
				"Options returned from verification (e.g., available spaces)",
		}),

		// Control
		enabled: z.boolean(),

		// Audit
		created_by: z.string().uuid(),
		updated_by: z.string().uuid(),
		created_at: z.string().datetime(),
		updated_at: z.string().datetime(),
	})
	.openapi("DataSourceConnection");

// ============================================================================
// Response Schemas
// ============================================================================

export const DataSourceListResponseSchema = z
	.object({
		data: z.array(DataSourceConnectionSchema),
	})
	.openapi("DataSourceListResponse");

export const DataSourceResponseSchema = z
	.object({
		data: DataSourceConnectionSchema,
	})
	.openapi("DataSourceResponse");

export const DataSourceSeedResponseSchema = z
	.object({
		success: z.boolean(),
		created: z
			.number()
			.int()
			.openapi({ description: "Number of data sources created" }),
		existing: z
			.number()
			.int()
			.openapi({ description: "Number already existing" }),
		message: z.string(),
	})
	.openapi("DataSourceSeedResponse");

export const DataSourceDeleteResponseSchema = z
	.object({
		success: z.boolean(),
		message: z.string(),
	})
	.openapi("DataSourceDeleteResponse");

// ============================================================================
// Webhook Operation Responses
// ============================================================================

export const DataSourceVerifyResponseSchema = z
	.object({
		success: z.boolean(),
		message: z.string().openapi({ example: "Verification initiated" }),
		connection_id: z.string().uuid(),
	})
	.openapi("DataSourceVerifyResponse");

export const DataSourceSyncResponseSchema = z
	.object({
		success: z.boolean(),
		message: z.string().openapi({ example: "Sync initiated" }),
		connection_id: z.string().uuid(),
	})
	.openapi("DataSourceSyncResponse");

export const DataSourceSyncTicketsResponseSchema = z
	.object({
		success: z.boolean(),
		message: z.string().openapi({ example: "Ticket sync initiated" }),
		connection_id: z.string().uuid(),
		ingestion_run_id: z.string().uuid(),
	})
	.openapi("DataSourceSyncTicketsResponse");
