import { registry, z } from "../openapi.js";
import {
	ClusterDetailsResponseSchema,
	ClusterKbArticlesResponseSchema,
	ClusterListQuerySchema,
	ClusterListResponseSchema,
	ClusterTicketsQuerySchema,
	ClusterTicketsResponseSchema,
} from "../schemas/cluster.js";
import {
	ErrorResponseSchema,
	ValidationErrorSchema,
} from "../schemas/common.js";

// ============================================================================
// GET /api/clusters - List clusters
// ============================================================================

registry.registerPath({
	method: "get",
	path: "/api/clusters",
	tags: ["Clusters"],
	summary: "List clusters",
	description:
		"List all ticket clusters for the organization with ticket counts",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		query: ClusterListQuerySchema,
	},
	responses: {
		200: {
			description: "List of clusters",
			content: {
				"application/json": {
					schema: ClusterListResponseSchema,
				},
			},
		},
		400: {
			description: "Validation error",
			content: {
				"application/json": {
					schema: ValidationErrorSchema,
				},
			},
		},
		401: {
			description: "Unauthorized",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
		500: {
			description: "Server error",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
	},
});

// ============================================================================
// GET /api/clusters/:id/details - Get cluster details
// ============================================================================

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
			content: {
				"application/json": {
					schema: ClusterDetailsResponseSchema,
				},
			},
		},
		401: {
			description: "Unauthorized",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
		404: {
			description: "Cluster not found",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
		500: {
			description: "Server error",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
	},
});

// ============================================================================
// GET /api/clusters/:id/tickets - Get cluster tickets
// ============================================================================

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
			content: {
				"application/json": {
					schema: ClusterTicketsResponseSchema,
				},
			},
		},
		400: {
			description: "Validation error",
			content: {
				"application/json": {
					schema: ValidationErrorSchema,
				},
			},
		},
		401: {
			description: "Unauthorized",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
		404: {
			description: "Cluster not found",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
		500: {
			description: "Server error",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
	},
});

// ============================================================================
// GET /api/clusters/:id/kb-articles - Get cluster KB articles
// ============================================================================

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
				"application/json": {
					schema: ClusterKbArticlesResponseSchema,
				},
			},
		},
		401: {
			description: "Unauthorized",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
		404: {
			description: "Cluster not found",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
		500: {
			description: "Server error",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
	},
});
