import { pool } from "../config/database.js";
import type {
	Cluster,
	ClusterDetails,
	ClusterListItem,
	ClusterListQueryOptions,
	ClusterTicketsQueryOptions,
	KbArticle,
	PaginationInfo,
	RitaStatus,
	Ticket,
} from "../types/cluster.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export class ClusterService {
	/**
	 * Get cluster details by ID with KB articles count
	 */
	async getClusterDetails(
		clusterId: string,
		organizationId: string,
	): Promise<ClusterDetails | null> {
		const result = await pool.query<
			Cluster & {
				kb_articles_count: string;
				ticket_count: string;
				open_count: string;
			}
		>(
			`SELECT
        c.*,
        COALESCE(COUNT(DISTINCT kb.id), 0)::text AS kb_articles_count,
        COALESCE(COUNT(DISTINCT t.id), 0)::text AS ticket_count,
        COALESCE(COUNT(DISTINCT t.id) FILTER (WHERE t.external_status = 'Open'), 0)::text AS open_count
      FROM clusters c
      LEFT JOIN cluster_kb_links kb ON kb.cluster_id = c.id
      LEFT JOIN tickets t ON t.cluster_id = c.id
      WHERE c.id = $1 AND c.organization_id = $2
      GROUP BY c.id`,
			[clusterId, organizationId],
		);

		if (result.rows.length === 0) {
			return null;
		}

		const row = result.rows[0];
		return {
			...row,
			kb_articles_count: parseInt(row.kb_articles_count, 10),
			ticket_count: parseInt(row.ticket_count, 10),
			open_count: parseInt(row.open_count, 10),
		};
	}

	/**
	 * List all clusters for an organization with ticket counts
	 * Uses LATERAL subquery for efficient ticket count calculation with period filtering
	 * By default, only returns clusters from active models
	 */
	async getClusters(
		organizationId: string,
		options: ClusterListQueryOptions = {},
	): Promise<ClusterListItem[]> {
		const sort = options.sort || "recent";
		const period = options.period;
		const includeInactive = options.includeInactive || false;

		// Calculate date cutoff for period filter
		let dateCutoff: Date | null = null;
		if (period) {
			const now = new Date();
			switch (period) {
				case "last30":
					dateCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
					break;
				case "last90":
					dateCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
					break;
				case "last6months":
					dateCutoff = new Date(now.setMonth(now.getMonth() - 6));
					break;
				case "lastyear":
					dateCutoff = new Date(now.setFullYear(now.getFullYear() - 1));
					break;
			}
		}

		// Determine ORDER BY clause
		let orderBy: string;
		switch (sort) {
			case "volume":
				orderBy = "ticket_counts.ticket_count DESC, c.created_at DESC";
				break;
			case "automation":
				orderBy =
					"(c.config->>'auto_respond')::boolean DESC NULLS LAST, ticket_counts.ticket_count DESC";
				break;
			case "recent":
			default:
				orderBy = "c.created_at DESC";
		}

		// Build query params - $1=orgId, $2=includeInactive, $3=dateCutoff (optional)
		const values: (string | boolean | Date)[] = [
			organizationId,
			includeInactive,
		];
		let ticketDateCondition = "";
		if (dateCutoff) {
			values.push(dateCutoff);
			ticketDateCondition = `AND t.created_at >= $${values.length}`;
		}

		const query = `
      SELECT
        c.id,
        c.name,
        c.subcluster_name,
        c.kb_status,
        c.config,
        c.created_at,
        c.updated_at,
        COALESCE(ticket_counts.ticket_count, 0) AS ticket_count,
        COALESCE(ticket_counts.needs_response_count, 0) AS needs_response_count
      FROM clusters c
      JOIN ml_models m ON c.model_id = m.id
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS ticket_count,
          COUNT(*) FILTER (WHERE t.rita_status = 'NEEDS_RESPONSE')::int AS needs_response_count
        FROM tickets t
        WHERE t.cluster_id = c.id ${ticketDateCondition}
      ) ticket_counts ON true
      WHERE c.organization_id = $1
        AND ($2 = true OR m.active = true)
      ORDER BY ${orderBy}
    `;

		const result = await pool.query<ClusterListItem>(query, values);
		return result.rows;
	}

	/**
	 * Get paginated tickets for a cluster
	 * Uses cursor-based pagination on created_at
	 */
	async getClusterTickets(
		clusterId: string,
		organizationId: string,
		options: ClusterTicketsQueryOptions = {},
	): Promise<{ tickets: Ticket[]; pagination: PaginationInfo }> {
		const limit = Math.min(options.limit || DEFAULT_LIMIT, MAX_LIMIT);
		const fetchLimit = limit + 1; // Fetch one extra to determine has_more

		// Map tab to rita_status
		let ritaStatusFilter: RitaStatus | null = null;
		if (options.tab === "needs_response") {
			ritaStatusFilter = "NEEDS_RESPONSE";
		} else if (options.tab === "completed") {
			ritaStatusFilter = "COMPLETED";
		}

		// Sorting
		const sortField = options.sort || "created_at";
		const sortDir = options.sort_dir || "desc";
		const orderBy = `${sortField} ${sortDir.toUpperCase()}`;

		// Build query
		const conditions: string[] = ["cluster_id = $1", "organization_id = $2"];
		const values: any[] = [clusterId, organizationId];
		let paramIndex = 3;

		if (ritaStatusFilter) {
			conditions.push(`rita_status = $${paramIndex++}`);
			values.push(ritaStatusFilter);
		}

		// Search filter (searches subject and external_id)
		if (options.search) {
			conditions.push(
				`(subject ILIKE $${paramIndex} OR external_id ILIKE $${paramIndex})`,
			);
			values.push(`%${options.search}%`);
			paramIndex++;
		}

		// Source filter (from source_metadata JSONB)
		if (options.source) {
			conditions.push(`source_metadata->>'source' = $${paramIndex++}`);
			values.push(options.source);
		}

		if (options.cursor) {
			conditions.push(`created_at < $${paramIndex++}`);
			values.push(new Date(options.cursor));
		}

		values.push(fetchLimit);

		const query = `
      SELECT * FROM tickets
      WHERE ${conditions.join(" AND ")}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex}
    `;

		const result = await pool.query<Ticket>(query, values);
		const tickets = result.rows;

		// Determine pagination
		const hasMore = tickets.length > limit;
		if (hasMore) {
			tickets.pop(); // Remove the extra row
		}

		const nextCursor =
			hasMore && tickets.length > 0
				? tickets[tickets.length - 1].created_at.toISOString()
				: null;

		return {
			tickets,
			pagination: {
				next_cursor: nextCursor,
				has_more: hasMore,
			},
		};
	}

	/**
	 * Check if cluster exists and belongs to organization
	 */
	async clusterExists(
		clusterId: string,
		organizationId: string,
	): Promise<boolean> {
		const result = await pool.query(
			"SELECT 1 FROM clusters WHERE id = $1 AND organization_id = $2",
			[clusterId, organizationId],
		);
		return result.rows.length > 0;
	}

	/**
	 * Get KB articles linked to a cluster
	 */
	async getClusterKbArticles(
		clusterId: string,
		organizationId: string,
	): Promise<KbArticle[]> {
		const result = await pool.query<KbArticle>(
			`SELECT
        bm.id,
        bm.filename,
        bm.file_size,
        bm.mime_type,
        bm.status,
        bm.created_at,
        bm.updated_at
      FROM cluster_kb_links kb
      JOIN blob_metadata bm ON bm.id = kb.blob_metadata_id
      WHERE kb.cluster_id = $1 AND kb.organization_id = $2
      ORDER BY bm.created_at DESC`,
			[clusterId, organizationId],
		);

		return result.rows;
	}

	/**
	 * Get a single ticket by ID
	 */
	async getTicketById(
		ticketId: string,
		organizationId: string,
	): Promise<Ticket | null> {
		const result = await pool.query<Ticket>(
			`SELECT * FROM tickets WHERE id = $1 AND organization_id = $2`,
			[ticketId, organizationId],
		);

		if (result.rows.length === 0) {
			return null;
		}

		return result.rows[0];
	}
}
