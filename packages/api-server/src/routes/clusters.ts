import express from "express";
import { z } from "zod";
import { ClusterService } from "../services/ClusterService.js";
import type { AuthenticatedRequest } from "../types/express.js";

const router = express.Router();
const clusterService = new ClusterService();

// Validation schemas
const listQuerySchema = z.object({
	sort: z.enum(["volume", "automation", "recent"]).optional(),
	period: z.enum(["last30", "last90", "last6months", "lastyear"]).optional(),
});

const ticketsQuerySchema = z.object({
	tab: z.enum(["needs_response", "completed"]).optional(),
	cursor: z.string().datetime().optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
	search: z.string().optional(),
	sort: z.enum(["created_at", "external_id", "subject"]).optional(),
	sort_dir: z.enum(["asc", "desc"]).optional(),
	source: z.string().optional(),
});

/**
 * GET /api/clusters
 * List all clusters for the organization with ticket counts
 * Query params:
 *   - sort: volume | automation | recent (default: recent)
 */
router.get("/", async (req, res) => {
	const authReq = req as AuthenticatedRequest;

	try {
		const query = listQuerySchema.parse(req.query);

		const clusters = await clusterService.getClusters(
			authReq.user.activeOrganizationId,
			{ sort: query.sort, period: query.period },
		);

		res.json({ data: clusters });
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
 *   - cursor: ISO timestamp for pagination
 *   - limit: number of results (default 20, max 100)
 */
router.get("/:id/tickets", async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	const { id } = req.params;

	try {
		// Validate query params
		const query = ticketsQuerySchema.parse(req.query);

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
				cursor: query.cursor,
				limit: query.limit,
				search: query.search,
				sort: query.sort,
				sort_dir: query.sort_dir,
				source: query.source,
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

export default router;
