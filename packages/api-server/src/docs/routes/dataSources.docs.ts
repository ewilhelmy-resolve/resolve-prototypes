import { registry, z } from "../openapi.js";
import {
	ErrorResponseSchema,
	ValidationErrorSchema,
} from "../schemas/common.js";
import {
	CreateDataSourceRequestSchema,
	DataSourceDeleteResponseSchema,
	DataSourceListResponseSchema,
	DataSourceResponseSchema,
	DataSourceSeedResponseSchema,
	DataSourceSyncResponseSchema,
	DataSourceSyncTicketsResponseSchema,
	DataSourceVerifyResponseSchema,
	UpdateDataSourceRequestSchema,
} from "../schemas/dataSource.js";

// ============================================================================
// GET /api/data-sources - List data sources
// ============================================================================

registry.registerPath({
	method: "get",
	path: "/api/data-sources",
	tags: ["Data Sources"],
	summary: "List data sources",
	description: "List all data source connections for the organization",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	responses: {
		200: {
			description: "List of data sources",
			content: {
				"application/json": {
					schema: DataSourceListResponseSchema,
				},
			},
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

// ============================================================================
// POST /api/data-sources/seed - Seed default data sources
// ============================================================================

registry.registerPath({
	method: "post",
	path: "/api/data-sources/seed",
	tags: ["Data Sources"],
	summary: "Seed default data sources",
	description:
		"Create default data source configurations for the organization (idempotent)",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	responses: {
		200: {
			description: "Seed results",
			content: {
				"application/json": {
					schema: DataSourceSeedResponseSchema,
				},
			},
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

// ============================================================================
// GET /api/data-sources/:id - Get single data source
// ============================================================================

registry.registerPath({
	method: "get",
	path: "/api/data-sources/{id}",
	tags: ["Data Sources"],
	summary: "Get data source",
	description: "Get a single data source connection by ID",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		params: z.object({
			id: z
				.string()
				.uuid()
				.openapi({ description: "Data source connection ID" }),
		}),
	},
	responses: {
		200: {
			description: "Data source details",
			content: {
				"application/json": {
					schema: DataSourceResponseSchema,
				},
			},
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		404: {
			description: "Data source not found",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

// ============================================================================
// POST /api/data-sources - Create data source
// ============================================================================

registry.registerPath({
	method: "post",
	path: "/api/data-sources",
	tags: ["Data Sources"],
	summary: "Create data source",
	description: "Create a new data source connection",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		body: {
			content: {
				"application/json": {
					schema: CreateDataSourceRequestSchema,
				},
			},
		},
	},
	responses: {
		201: {
			description: "Data source created",
			content: {
				"application/json": {
					schema: DataSourceResponseSchema,
				},
			},
		},
		400: {
			description: "Validation error",
			content: { "application/json": { schema: ValidationErrorSchema } },
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

// ============================================================================
// PUT /api/data-sources/:id - Update data source
// ============================================================================

registry.registerPath({
	method: "put",
	path: "/api/data-sources/{id}",
	tags: ["Data Sources"],
	summary: "Update data source",
	description: "Update an existing data source connection",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		params: z.object({
			id: z
				.string()
				.uuid()
				.openapi({ description: "Data source connection ID" }),
		}),
		body: {
			content: {
				"application/json": {
					schema: UpdateDataSourceRequestSchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: "Data source updated",
			content: {
				"application/json": {
					schema: DataSourceResponseSchema,
				},
			},
		},
		400: {
			description: "Validation error",
			content: { "application/json": { schema: ValidationErrorSchema } },
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		404: {
			description: "Data source not found",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

// ============================================================================
// DELETE /api/data-sources/:id - Delete data source
// ============================================================================

registry.registerPath({
	method: "delete",
	path: "/api/data-sources/{id}",
	tags: ["Data Sources"],
	summary: "Delete data source",
	description: "Delete a data source connection",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		params: z.object({
			id: z
				.string()
				.uuid()
				.openapi({ description: "Data source connection ID" }),
		}),
	},
	responses: {
		200: {
			description: "Data source deleted",
			content: {
				"application/json": {
					schema: DataSourceDeleteResponseSchema,
				},
			},
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		404: {
			description: "Data source not found",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

// ============================================================================
// POST /api/data-sources/:id/verify - Verify credentials
// ============================================================================

registry.registerPath({
	method: "post",
	path: "/api/data-sources/{id}/verify",
	tags: ["Data Sources"],
	summary: "Verify credentials",
	description: `
Initiate credential verification for a data source. Returns immediately with status "verifying".
Final result arrives via SSE event \`data_source_update\`.
	`.trim(),
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		params: z.object({
			id: z
				.string()
				.uuid()
				.openapi({ description: "Data source connection ID" }),
		}),
	},
	responses: {
		200: {
			description: "Verification initiated",
			content: {
				"application/json": {
					schema: DataSourceVerifyResponseSchema,
				},
			},
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		404: {
			description: "Data source not found",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

// ============================================================================
// POST /api/data-sources/:id/sync - Trigger sync
// ============================================================================

registry.registerPath({
	method: "post",
	path: "/api/data-sources/{id}/sync",
	tags: ["Data Sources"],
	summary: "Trigger sync",
	description: `
Initiate document sync from the data source. Returns immediately with status "syncing".
Progress and completion arrive via SSE event \`data_source_update\`.
	`.trim(),
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		params: z.object({
			id: z
				.string()
				.uuid()
				.openapi({ description: "Data source connection ID" }),
		}),
	},
	responses: {
		200: {
			description: "Sync initiated",
			content: {
				"application/json": {
					schema: DataSourceSyncResponseSchema,
				},
			},
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		404: {
			description: "Data source not found",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

// ============================================================================
// POST /api/data-sources/:id/sync-tickets - Sync ITSM tickets
// ============================================================================

registry.registerPath({
	method: "post",
	path: "/api/data-sources/{id}/sync-tickets",
	tags: ["Data Sources"],
	summary: "Sync ITSM tickets",
	description: `
Initiate ITSM ticket ingestion for Autopilot clustering. Only valid for ITSM data sources (servicenow_itsm, jira_itsm).
Returns HTTP 202 Accepted. Progress arrives via SSE event \`ingestion_run_update\`.
	`.trim(),
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		params: z.object({
			id: z
				.string()
				.uuid()
				.openapi({ description: "ITSM data source connection ID" }),
		}),
	},
	responses: {
		202: {
			description: "Ticket sync accepted",
			content: {
				"application/json": {
					schema: DataSourceSyncTicketsResponseSchema,
				},
			},
		},
		400: {
			description: "Invalid data source type (not ITSM)",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		404: {
			description: "Data source not found",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});
