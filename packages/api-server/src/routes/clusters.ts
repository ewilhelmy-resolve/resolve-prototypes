import express from "express";
import { z } from "zod";
import { registry } from "../docs/openapi.js";
import {
	AddKbArticleRequestSchema,
	ClusterDetailsResponseSchema,
	ClusterKbArticlesResponseSchema,
	ClusterListQuerySchema,
	ClusterListResponseSchema,
	ClusterTicketsQuerySchema,
	ClusterTicketsResponseSchema,
	GenerateKnowledgeRequestSchema,
	GenerateKnowledgeResponseSchema,
	KbArticleSchema,
} from "../schemas/cluster.js";
import {
	ErrorResponseSchema,
	ValidationErrorSchema,
} from "../schemas/common.js";
import { ClusterService } from "../services/ClusterService.js";
import type { AuthenticatedRequest } from "../types/express.js";

const router = express.Router();
const clusterService = new ClusterService();

// ============================================================================
// OpenAPI Documentation Registration
// ============================================================================

registry.registerPath({
	method: "get",
	path: "/api/clusters",
	tags: ["Clusters"],
	summary: "List clusters",
	description:
		"List all ticket clusters for the organization with ticket counts",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: { query: ClusterListQuerySchema },
	responses: {
		200: {
			description: "List of clusters",
			content: { "application/json": { schema: ClusterListResponseSchema } },
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
	method: "get",
	path: "/api/clusters/{id}/details",
	tags: ["Clusters"],
	summary: "Get cluster details",
	description:
		"Get cluster metadata including KB articles count and ticket counts",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		params: z.object({
			id: z.string().uuid().openapi({ description: "Cluster ID" }),
		}),
	},
	responses: {
		200: {
			description: "Cluster details",
			content: { "application/json": { schema: ClusterDetailsResponseSchema } },
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		404: {
			description: "Cluster not found",
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
	path: "/api/clusters/{id}/tickets",
	tags: ["Clusters"],
	summary: "Get cluster tickets",
	description:
		"Get paginated list of tickets in a cluster with filtering and sorting",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		params: z.object({
			id: z.string().uuid().openapi({ description: "Cluster ID" }),
		}),
		query: ClusterTicketsQuerySchema,
	},
	responses: {
		200: {
			description: "Paginated list of tickets",
			content: { "application/json": { schema: ClusterTicketsResponseSchema } },
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
			description: "Cluster not found",
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
	path: "/api/clusters/{id}/kb-articles",
	tags: ["Clusters"],
	summary: "Get cluster KB articles",
	description: "Get knowledge base articles linked to a cluster",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		params: z.object({
			id: z.string().uuid().openapi({ description: "Cluster ID" }),
		}),
	},
	responses: {
		200: {
			description: "List of KB articles",
			content: {
				"application/json": { schema: ClusterKbArticlesResponseSchema },
			},
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		404: {
			description: "Cluster not found",
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
	path: "/api/clusters/{id}/generate-knowledge",
	tags: ["Clusters"],
	summary: "Generate knowledge article",
	description:
		"Trigger AI knowledge article generation for a cluster via external platform webhook",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		params: z.object({
			id: z.string().uuid().openapi({ description: "Cluster ID" }),
		}),
		body: {
			content: {
				"application/json": { schema: GenerateKnowledgeRequestSchema },
			},
		},
	},
	responses: {
		200: {
			description: "Generation triggered",
			content: {
				"application/json": { schema: GenerateKnowledgeResponseSchema },
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
			description: "Cluster not found",
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
	path: "/api/clusters/{id}/kb-articles",
	tags: ["Clusters"],
	summary: "Add knowledge article to cluster",
	description:
		"Persist an AI-generated knowledge article, link it to the cluster, and trigger RAG indexing",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		params: z.object({
			id: z.string().uuid().openapi({ description: "Cluster ID" }),
		}),
		body: {
			content: {
				"application/json": { schema: AddKbArticleRequestSchema },
			},
		},
	},
	responses: {
		200: {
			description: "Article added",
			content: {
				"application/json": {
					schema: z.object({ data: KbArticleSchema }),
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
			description: "Cluster not found",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

/**
 * GET /api/clusters
 * List all clusters for the organization with ticket counts
 * Query params:
 *   - sort: volume | automation | recent (default: recent)
 *   - limit: number of results (default 25, max 100)
 *   - offset: pagination offset (default 0)
 *   - kb_status: filter by KB status
 *   - search: search in name and subcluster_name
 */
router.get("/", async (req, res) => {
	const authReq = req as AuthenticatedRequest;

	try {
		const query = ClusterListQuerySchema.parse(req.query);

		const result = await clusterService.getClusters(
			authReq.user.activeOrganizationId,
			{
				sort: query.sort,
				period: query.period,
				limit: query.limit,
				offset: query.offset,
				kbStatus: query.kb_status,
				search: query.search,
			},
		);

		res.json({
			data: result.clusters,
			pagination: result.pagination,
			totals: result.totals,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({
				error: "Validation error",
				details: error.issues,
			});
		}

		console.error("[Clusters] Error fetching clusters:", error);
		res.status(500).json({ error: "Failed to fetch clusters" });
	}
});

/**
 * GET /api/clusters/:id/details
 * Get cluster metadata with KB articles count
 */
router.get("/:id/details", async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	const { id } = req.params;

	try {
		const cluster = await clusterService.getClusterDetails(
			id,
			authReq.user.activeOrganizationId,
		);

		if (!cluster) {
			return res.status(404).json({ error: "Cluster not found" });
		}

		res.json({ data: cluster });
	} catch (error) {
		console.error("[Clusters] Error fetching cluster details:", error);
		res.status(500).json({ error: "Failed to fetch cluster details" });
	}
});

/**
 * GET /api/clusters/:id/tickets
 * Get paginated tickets for a cluster
 * Query params:
 *   - tab: needs_response | completed (filters by rita_status)
 *   - offset: pagination offset (default 0)
 *   - limit: number of results (default 20, max 100)
 */
router.get("/:id/tickets", async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	const { id } = req.params;

	try {
		// Validate query params
		const query = ClusterTicketsQuerySchema.parse(req.query);

		// Check cluster exists
		const exists = await clusterService.clusterExists(
			id,
			authReq.user.activeOrganizationId,
		);

		if (!exists) {
			return res.status(404).json({ error: "Cluster not found" });
		}

		const result = await clusterService.getClusterTickets(
			id,
			authReq.user.activeOrganizationId,
			{
				tab: query.tab,
				offset: query.offset,
				limit: query.limit,
				search: query.search,
				sort: query.sort,
				sort_dir: query.sort_dir,
				source: query.source,
				priority: query.priority,
				external_status: query.external_status,
			},
		);

		res.json({
			data: result.tickets,
			pagination: result.pagination,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({
				error: "Validation error",
				details: error.issues,
			});
		}

		console.error("[Clusters] Error fetching cluster tickets:", error);
		res.status(500).json({ error: "Failed to fetch cluster tickets" });
	}
});

/**
 * GET /api/clusters/:id/kb-articles
 * Get KB articles linked to a cluster
 */
router.get("/:id/kb-articles", async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	const { id } = req.params;

	try {
		const exists = await clusterService.clusterExists(
			id,
			authReq.user.activeOrganizationId,
		);

		if (!exists) {
			return res.status(404).json({ error: "Cluster not found" });
		}

		const articles = await clusterService.getClusterKbArticles(
			id,
			authReq.user.activeOrganizationId,
		);

		res.json({ data: articles });
	} catch (error) {
		console.error("[Clusters] Error fetching cluster KB articles:", error);
		res.status(500).json({ error: "Failed to fetch cluster KB articles" });
	}
});

/**
 * POST /api/clusters/:id/generate-knowledge
 * Trigger AI knowledge article generation for a cluster
 */
router.post("/:id/generate-knowledge", async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	const { id } = req.params;

	try {
		const body = GenerateKnowledgeRequestSchema.parse(req.body);

		const result = await clusterService.generateKnowledge({
			clusterId: id,
			organizationId: authReq.user.activeOrganizationId,
			userId: authReq.user.id,
			userEmail: authReq.user.email,
			sources: body.sources,
		});

		res.json(result);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({
				error: "Validation error",
				details: error.issues,
			});
		}

		if (error instanceof Error && error.message === "Cluster not found") {
			return res.status(404).json({ error: "Cluster not found" });
		}

		console.error("[Clusters] Error triggering knowledge generation:", error);
		res.status(500).json({ error: "Failed to trigger knowledge generation" });
	}
});

/**
 * POST /api/clusters/:id/kb-articles
 * Persist a knowledge article and link it to a cluster
 */
router.post("/:id/kb-articles", async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	const { id } = req.params;

	try {
		const body = AddKbArticleRequestSchema.parse(req.body);

		const article = await clusterService.addKbArticle({
			clusterId: id,
			organizationId: authReq.user.activeOrganizationId,
			userId: authReq.user.id,
			userEmail: authReq.user.email,
			content: body.content,
			filename: body.filename,
		});

		res.json({ data: article });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({
				error: "Validation error",
				details: error.issues,
			});
		}

		if (error instanceof Error && error.message === "Cluster not found") {
			return res.status(404).json({ error: "Cluster not found" });
		}

		console.error("[Clusters] Error adding KB article:", error);
		res.status(500).json({ error: "Failed to add knowledge article" });
	}
});

export default router;
