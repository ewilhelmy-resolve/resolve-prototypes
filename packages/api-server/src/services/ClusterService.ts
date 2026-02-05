import { sql } from "kysely";
import { db } from "../config/kysely.js";
import type {
	ClusterDetails,
	ClusterListItem,
	ClusterListQueryOptions,
	ClusterTicketsQueryOptions,
	ClusterTotals,
	KBStatus,
	KbArticle,
	PaginationInfo,
	RitaStatus,
	Ticket,
} from "../types/cluster.js";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export class ClusterService {
	/**
	 * Get cluster details by ID with KB articles count
	 */
	async getClusterDetails(
		clusterId: string,
		organizationId: string,
	): Promise<ClusterDetails | null> {
		const result = await db
			.selectFrom("clusters as c")
			.leftJoin("cluster_kb_links as kb", "kb.cluster_id", "c.id")
			.leftJoin("tickets as t", "t.cluster_id", "c.id")
			.select([
				"c.id",
				"c.organization_id",
				"c.model_id",
				"c.name",
				"c.subcluster_name",
				"c.config",
				"c.kb_status",
				"c.created_at",
				"c.updated_at",
			])
			.select((eb) => [
				eb.fn.count(sql`DISTINCT kb.id`).as("kb_articles_count"),
				eb.fn.count(sql`DISTINCT t.id`).as("ticket_count"),
				sql<number>`COALESCE(COUNT(DISTINCT t.id) FILTER (WHERE t.external_status = 'Open'), 0)`.as(
					"open_count",
				),
			])
			.where("c.id", "=", clusterId)
			.where("c.organization_id", "=", organizationId)
			.groupBy("c.id")
			.executeTakeFirst();

		if (!result) {
			return null;
		}

		return {
			id: result.id,
			organization_id: result.organization_id,
			model_id: result.model_id,
			name: result.name,
			subcluster_name: result.subcluster_name,
			config: result.config as ClusterDetails["config"],
			kb_status: result.kb_status as KBStatus,
			kb_articles_count: Number(result.kb_articles_count),
			ticket_count: Number(result.ticket_count),
			open_count: Number(result.open_count),
			created_at: result.created_at as Date,
			updated_at: result.updated_at as Date,
		};
	}

	/**
	 * List clusters for an organization with ticket counts
	 * Supports cursor-based pagination, search, and kb_status filter
	 */
	async getClusters(
		organizationId: string,
		options: ClusterListQueryOptions = {},
	): Promise<{
		clusters: ClusterListItem[];
		pagination: PaginationInfo;
		totals: ClusterTotals;
	}> {
		const sort = options.sort || "recent";
		const period = options.period;
		const includeInactive = options.includeInactive || false;
		const limit = Math.min(options.limit || DEFAULT_LIMIT, MAX_LIMIT);
		const fetchLimit = limit + 1;

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

		// Build subquery for ticket counts with optional date filter
		let ticketCountQuery = db
			.selectFrom("tickets as t")
			.select((eb) => [
				"t.cluster_id",
				eb.fn.count<number>("t.id").as("ticket_count"),
				sql<number>`COUNT(*) FILTER (WHERE t.rita_status = 'NEEDS_RESPONSE')`.as(
					"needs_response_count",
				),
			]);

		if (dateCutoff) {
			ticketCountQuery = ticketCountQuery.where(
				"t.created_at",
				">=",
				dateCutoff,
			);
		}

		const ticketCountSubquery = ticketCountQuery
			.groupBy("t.cluster_id")
			.as("tc");

		// Build main query
		let query = db
			.selectFrom("clusters as c")
			.innerJoin("ml_models as m", "m.id", "c.model_id")
			.leftJoin(ticketCountSubquery, "tc.cluster_id", "c.id")
			.select([
				"c.id",
				"c.name",
				"c.subcluster_name",
				"c.kb_status",
				"c.config",
				"c.created_at",
				"c.updated_at",
			])
			.select((eb) => [
				eb.fn.coalesce("tc.ticket_count", sql`0`).as("ticket_count"),
				eb.fn
					.coalesce("tc.needs_response_count", sql`0`)
					.as("needs_response_count"),
			])
			.where("c.organization_id", "=", organizationId);

		// Active model filter
		if (!includeInactive) {
			query = query.where("m.active", "=", true);
		}

		// kb_status filter (server-side)
		if (options.kbStatus) {
			query = query.where("c.kb_status", "=", options.kbStatus);
		}

		// Search filter (name OR subcluster_name ILIKE %search%)
		if (options.search) {
			const searchPattern = `%${options.search}%`;
			query = query.where((eb) =>
				eb.or([
					eb("c.name", "ilike", searchPattern),
					eb("c.subcluster_name", "ilike", searchPattern),
				]),
			);
		}

		// Cursor-based pagination with composite key (created_at + id)
		// Format: "2024-01-15T10:00:00.000Z_uuid"
		// Note: We truncate DB timestamp to milliseconds because JS Date loses microsecond precision
		if (options.cursor) {
			const separatorIndex = options.cursor.lastIndexOf("_");
			if (separatorIndex > 0) {
				const cursorTimestamp = options.cursor.substring(0, separatorIndex);
				const cursorId = options.cursor.substring(separatorIndex + 1);
				query = query.where((eb) =>
					eb.or([
						// Truncate both sides to milliseconds for accurate comparison
						eb(
							sql`date_trunc('milliseconds', c.created_at)`,
							"<",
							sql`${new Date(cursorTimestamp)}::timestamptz`,
						),
						eb.and([
							eb(
								sql`date_trunc('milliseconds', c.created_at)`,
								"=",
								sql`${new Date(cursorTimestamp)}::timestamptz`,
							),
							eb("c.id", "<", cursorId),
						]),
					]),
				);
			} else {
				// Fallback for old cursor format (timestamp only)
				query = query.where(
					sql`date_trunc('milliseconds', c.created_at)`,
					"<",
					sql`${new Date(options.cursor)}::timestamptz`,
				);
			}
		}

		// Sorting - always include id as tiebreaker for stable pagination
		switch (sort) {
			case "volume":
				query = query
					.orderBy(sql`tc.ticket_count`, "desc")
					.orderBy("c.created_at", "desc")
					.orderBy("c.id", "desc");
				break;
			case "automation":
				query = query
					.orderBy(sql`(c.config->>'auto_respond')::boolean desc nulls last`)
					.orderBy(sql`tc.ticket_count`, "desc")
					.orderBy("c.id", "desc");
				break;
			case "recent":
			default:
				query = query.orderBy("c.created_at", "desc").orderBy("c.id", "desc");
		}

		const rows = await query.limit(fetchLimit).execute();

		// Determine pagination
		const hasMore = rows.length > limit;
		if (hasMore) {
			rows.pop();
		}

		// Composite cursor: timestamp_id for unique pagination
		// Note: Use the raw timestamp string from DB to preserve microsecond precision
		// (JS Date.toISOString() truncates to milliseconds which breaks equality comparison)
		const lastRow = rows[rows.length - 1];
		const nextCursor =
			hasMore && rows.length > 0
				? `${lastRow.created_at instanceof Date ? lastRow.created_at.toISOString() : String(lastRow.created_at)}_${lastRow.id}`
				: null;

		const clusters: ClusterListItem[] = rows.map((row) => ({
			id: row.id,
			name: row.name,
			subcluster_name: row.subcluster_name,
			kb_status: row.kb_status as KBStatus,
			config: row.config as ClusterListItem["config"],
			ticket_count: Number(row.ticket_count),
			needs_response_count: Number(row.needs_response_count),
			created_at: row.created_at as Date,
			updated_at: row.updated_at as Date,
		}));

		// Build totals query (same filters, no pagination)
		let totalsTicketSubquery = db
			.selectFrom("tickets as t")
			.select(["t.cluster_id", sql<number>`COUNT(*)`.as("cnt")]);

		if (dateCutoff) {
			totalsTicketSubquery = totalsTicketSubquery.where(
				"t.created_at",
				">=",
				dateCutoff,
			);
		}

		const totalsTicketCounts = totalsTicketSubquery
			.groupBy("t.cluster_id")
			.as("ttc");

		let totalsQuery = db
			.selectFrom("clusters as c")
			.innerJoin("ml_models as m", "m.id", "c.model_id")
			.leftJoin(totalsTicketCounts, "ttc.cluster_id", "c.id")
			.select([
				sql<number>`COUNT(DISTINCT c.id)`.as("total_clusters"),
				sql<number>`COALESCE(SUM(ttc.cnt), 0)`.as("total_tickets"),
			])
			.where("c.organization_id", "=", organizationId);

		if (!includeInactive) {
			totalsQuery = totalsQuery.where("m.active", "=", true);
		}

		if (options.kbStatus) {
			totalsQuery = totalsQuery.where("c.kb_status", "=", options.kbStatus);
		}

		if (options.search) {
			const searchPattern = `%${options.search}%`;
			totalsQuery = totalsQuery.where((eb) =>
				eb.or([
					eb("c.name", "ilike", searchPattern),
					eb("c.subcluster_name", "ilike", searchPattern),
				]),
			);
		}

		const totalsResult = await totalsQuery.executeTakeFirst();

		return {
			clusters,
			pagination: {
				next_cursor: nextCursor,
				has_more: hasMore,
			},
			totals: {
				total_clusters: Number(totalsResult?.total_clusters ?? 0),
				total_tickets: Number(totalsResult?.total_tickets ?? 0),
			},
		};
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
		const limit = Math.min(options.limit || 20, MAX_LIMIT);
		const fetchLimit = limit + 1;

		// Map tab to rita_status
		let ritaStatusFilter: RitaStatus | null = null;
		if (options.tab === "needs_response") {
			ritaStatusFilter = "NEEDS_RESPONSE";
		} else if (options.tab === "completed") {
			ritaStatusFilter = "COMPLETED";
		}

		// Build query
		let query = db
			.selectFrom("tickets")
			.selectAll()
			.where("cluster_id", "=", clusterId)
			.where("organization_id", "=", organizationId);

		// Rita status filter
		if (ritaStatusFilter) {
			query = query.where("rita_status", "=", ritaStatusFilter);
		}

		// Search filter (searches subject and external_id)
		if (options.search) {
			const searchPattern = `%${options.search}%`;
			query = query.where((eb) =>
				eb.or([
					eb("subject", "ilike", searchPattern),
					eb("external_id", "ilike", searchPattern),
				]),
			);
		}

		// Source filter (from source_metadata JSONB)
		if (options.source) {
			query = query.where(sql`source_metadata->>'source'`, "=", options.source);
		}

		// Cursor pagination
		if (options.cursor) {
			query = query.where("created_at", "<", new Date(options.cursor));
		}

		// Sorting
		const sortField = options.sort || "created_at";
		const sortDir = options.sort_dir || "desc";
		query = query.orderBy(sortField, sortDir);

		const rows = await query.limit(fetchLimit).execute();

		// Determine pagination
		const hasMore = rows.length > limit;
		if (hasMore) {
			rows.pop();
		}

		const nextCursor =
			hasMore && rows.length > 0
				? (rows[rows.length - 1].created_at as Date).toISOString()
				: null;

		const tickets: Ticket[] = rows.map((row) => ({
			id: row.id,
			organization_id: row.organization_id,
			cluster_id: row.cluster_id,
			data_source_connection_id: row.data_source_connection_id,
			external_id: row.external_id,
			subject: row.subject,
			external_status: row.external_status,
			cluster_text: row.cluster_text,
			rita_status: row.rita_status as RitaStatus,
			source_metadata: row.source_metadata as Record<string, any>,
			created_at: row.created_at as Date,
			updated_at: row.updated_at as Date,
		}));

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
		const result = await db
			.selectFrom("clusters")
			.select(sql`1`.as("exists"))
			.where("id", "=", clusterId)
			.where("organization_id", "=", organizationId)
			.executeTakeFirst();

		return result !== undefined;
	}

	/**
	 * Get KB articles linked to a cluster
	 */
	async getClusterKbArticles(
		clusterId: string,
		organizationId: string,
	): Promise<KbArticle[]> {
		const rows = await db
			.selectFrom("cluster_kb_links as kb")
			.innerJoin("blob_metadata as bm", "bm.id", "kb.blob_metadata_id")
			.select([
				"bm.id",
				"bm.filename",
				"bm.file_size",
				"bm.mime_type",
				"bm.status",
				"bm.created_at",
				"bm.updated_at",
			])
			.where("kb.cluster_id", "=", clusterId)
			.where("kb.organization_id", "=", organizationId)
			.orderBy("bm.created_at", "desc")
			.execute();

		return rows.map((row) => ({
			id: row.id,
			filename: row.filename,
			file_size: row.file_size,
			mime_type: row.mime_type,
			status: row.status,
			created_at: row.created_at as Date,
			updated_at: row.updated_at as Date,
		}));
	}

	/**
	 * Get a single ticket by ID
	 */
	async getTicketById(
		ticketId: string,
		organizationId: string,
	): Promise<Ticket | null> {
		const row = await db
			.selectFrom("tickets")
			.selectAll()
			.where("id", "=", ticketId)
			.where("organization_id", "=", organizationId)
			.executeTakeFirst();

		if (!row) {
			return null;
		}

		return {
			id: row.id,
			organization_id: row.organization_id,
			cluster_id: row.cluster_id,
			data_source_connection_id: row.data_source_connection_id,
			external_id: row.external_id,
			subject: row.subject,
			external_status: row.external_status,
			cluster_text: row.cluster_text,
			rita_status: row.rita_status as RitaStatus,
			source_metadata: row.source_metadata as Record<string, any>,
			created_at: row.created_at as Date,
			updated_at: row.updated_at as Date,
		};
	}
}
