import express from "express";
import { z } from "zod";
import { registry } from "../docs/openapi.js";
import { authenticateUser } from "../middleware/auth.js";
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
import { DataSourceService } from "../services/DataSourceService.js";
import type { AuthenticatedRequest } from "../types/express.js";
import dataSourceWebhookRoutes from "./dataSourceWebhooks.js";

const router = express.Router();
const dataSourceService = new DataSourceService();

// ============================================================================
// OpenAPI Documentation Registration
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
			content: { "application/json": { schema: DataSourceListResponseSchema } },
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
			content: { "application/json": { schema: DataSourceSeedResponseSchema } },
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
			content: { "application/json": { schema: DataSourceResponseSchema } },
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
				"application/json": { schema: CreateDataSourceRequestSchema },
			},
		},
	},
	responses: {
		201: {
			description: "Data source created",
			content: { "application/json": { schema: DataSourceResponseSchema } },
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
				"application/json": { schema: UpdateDataSourceRequestSchema },
			},
		},
	},
	responses: {
		200: {
			description: "Data source updated",
			content: { "application/json": { schema: DataSourceResponseSchema } },
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
				"application/json": { schema: DataSourceDeleteResponseSchema },
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

registry.registerPath({
	method: "post",
	path: "/api/data-sources/{id}/verify",
	tags: ["Data Sources"],
	summary: "Verify credentials",
	description:
		'Initiate credential verification for a data source. Returns immediately with status "verifying". Final result arrives via SSE event `data_source_update`.',
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
				"application/json": { schema: DataSourceVerifyResponseSchema },
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

registry.registerPath({
	method: "post",
	path: "/api/data-sources/{id}/sync",
	tags: ["Data Sources"],
	summary: "Trigger sync",
	description:
		'Initiate document sync from the data source. Returns immediately with status "syncing". Progress and completion arrive via SSE event `data_source_update`.',
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
			content: { "application/json": { schema: DataSourceSyncResponseSchema } },
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

registry.registerPath({
	method: "post",
	path: "/api/data-sources/{id}/sync-tickets",
	tags: ["Data Sources"],
	summary: "Sync ITSM tickets",
	description:
		"Initiate ITSM ticket ingestion for Autopilot clustering. Only valid for ITSM data sources (servicenow_itsm, jira_itsm). Returns HTTP 202 Accepted. Progress arrives via SSE event `ingestion_run_update`.",
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
				"application/json": { schema: DataSourceSyncTicketsResponseSchema },
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

/**
 * GET /api/data-sources
 * List all data sources for the authenticated user's organization
 */
router.get("/", authenticateUser, async (req, res) => {
	const authReq = req as AuthenticatedRequest;

	try {
		const dataSources = await dataSourceService.getDataSources(
			authReq.user.activeOrganizationId,
		);

		res.json({ data: dataSources });
	} catch (error) {
		console.error("[DataSources] Error fetching data sources:", error);
		res.status(500).json({ error: "Failed to fetch data sources" });
	}
});

/**
 * POST /api/data-sources/seed
 * Seed default data sources for the organization (idempotent)
 * IMPORTANT: Must be defined BEFORE /:id route to avoid matching "seed" as an ID
 */
router.post("/seed", authenticateUser, async (req, res) => {
	const authReq = req as AuthenticatedRequest;

	try {
		const result = await dataSourceService.seedDefaultDataSources(
			authReq.user.activeOrganizationId,
			authReq.user.id,
		);

		res.json({
			success: true,
			created: result.created.length,
			existing: result.existing.length,
			message: `Created ${result.created.length} new data sources, ${result.existing.length} already existed`,
		});
	} catch (error) {
		console.error("[DataSources] Error seeding data sources:", error);
		res.status(500).json({ error: "Failed to seed data sources" });
	}
});

/**
 * GET /api/data-sources/:id
 * Get a single data source by ID
 */
router.get("/:id", authenticateUser, async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	const { id } = req.params;

	try {
		const dataSource = await dataSourceService.getDataSource(
			id,
			authReq.user.activeOrganizationId,
		);

		if (!dataSource) {
			return res.status(404).json({ error: "Data source not found" });
		}

		res.json({ data: dataSource });
	} catch (error) {
		console.error("[DataSources] Error fetching data source:", error);
		res.status(500).json({ error: "Failed to fetch data source" });
	}
});

/**
 * POST /api/data-sources
 * Create a new data source
 */
router.post("/", authenticateUser, async (req, res) => {
	const authReq = req as AuthenticatedRequest;

	try {
		// Validate request body
		const validated = CreateDataSourceRequestSchema.parse(req.body);

		const dataSource = await dataSourceService.createDataSource(
			authReq.user.activeOrganizationId,
			authReq.user.id,
			validated,
		);

		res.status(201).json({ data: dataSource });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({
				error: "Validation error",
				details: error.issues,
			});
		}

		console.error("[DataSources] Error creating data source:", error);
		res.status(500).json({ error: "Failed to create data source" });
	}
});

/**
 * PUT /api/data-sources/:id
 * Update an existing data source
 */
router.put("/:id", authenticateUser, async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	const { id } = req.params;

	try {
		// Validate request body
		const validated = UpdateDataSourceRequestSchema.parse(req.body);

		const dataSource = await dataSourceService.updateDataSource(
			id,
			authReq.user.activeOrganizationId,
			authReq.user.id,
			validated,
		);

		if (!dataSource) {
			return res.status(404).json({ error: "Data source not found" });
		}

		res.json({ data: dataSource });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({
				error: "Validation error",
				details: error.issues,
			});
		}

		console.error("[DataSources] Error updating data source:", error);
		res.status(500).json({ error: "Failed to update data source" });
	}
});

/**
 * DELETE /api/data-sources/:id
 * Delete a data source
 */
router.delete("/:id", authenticateUser, async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	const { id } = req.params;

	try {
		const deleted = await dataSourceService.deleteDataSource(
			id,
			authReq.user.activeOrganizationId,
		);

		if (!deleted) {
			return res.status(404).json({ error: "Data source not found" });
		}

		res.json({ success: true, message: "Data source deleted" });
	} catch (error) {
		console.error("[DataSources] Error deleting data source:", error);
		res.status(500).json({ error: "Failed to delete data source" });
	}
});

// Mount webhook routes (verify, sync)
router.use("/", dataSourceWebhookRoutes);

export default router;
