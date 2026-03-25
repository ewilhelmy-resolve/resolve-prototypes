import crypto, { randomUUID } from "node:crypto";
import { sql } from "kysely";
import { db } from "../config/kysely.js";

function escapeLike(value: string): string {
	return value.replace(/[\\%_]/g, "\\$&");
}

import type {
	ClusterDetails,
	ClusterListItem,
	ClusterListQueryOptions,
	ClusterTicketsQueryOptions,
	ClusterTotals,
	GenerateKnowledgeResponse,
	KBStatus,
	KbArticle,
	OffsetPaginationInfo,
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
			.leftJoin("historical_tickets as ht", "ht.cluster_id", "c.id")
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
				eb.fn.count(sql`DISTINCT ht.id`).as("historical_ticket_count"),
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
			historical_ticket_count: Number(result.historical_ticket_count),
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
		pagination: OffsetPaginationInfo;
		totals: ClusterTotals;
	}> {
		const sort = options.sort || "recent";
		const period = options.period;
		const limit = Math.min(options.limit || DEFAULT_LIMIT, MAX_LIMIT);
		const offset = options.offset || 0;

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
				case "last6months": {
					const d = new Date(now);
					d.setMonth(d.getMonth() - 6);
					dateCutoff = d;
					break;
				}
				case "lastyear": {
					const d = new Date(now);
					d.setFullYear(d.getFullYear() - 1);
					dateCutoff = d;
					break;
				}
			}
		}

		// Build tickets-first subquery: aggregate ticket stats per cluster
		let ticketStatsQuery = db
			.selectFrom("tickets as t")
			.select((eb) => [
				"t.cluster_id",
				eb.fn.count<number>("t.id").as("ticket_count"),
				sql<number>`COUNT(*) FILTER (WHERE t.rita_status = 'NEEDS_RESPONSE')`.as(
					"needs_response_count",
				),
			])
			.where("t.organization_id", "=", organizationId)
			.where("t.cluster_id", "is not", null);

		if (dateCutoff) {
			ticketStatsQuery = ticketStatsQuery.where(
				"t.created_at",
				">=",
				dateCutoff,
			);
		}

		const ticketStats = ticketStatsQuery.groupBy("t.cluster_id").as("ts");

		// Build main query: start from ticket stats, join clusters for metadata
		let query = db
			.selectFrom(ticketStats)
			.innerJoin("clusters as c", "c.id", "ts.cluster_id")
			.select([
				"c.id",
				"c.name",
				"c.subcluster_name",
				"c.kb_status",
				"c.config",
				"c.created_at",
				"c.updated_at",
				"ts.ticket_count",
				"ts.needs_response_count",
			])
			.where("c.organization_id", "=", organizationId);

		// kb_status filter
		if (options.kbStatus) {
			query = query.where("c.kb_status", "=", options.kbStatus);
		}

		// Search filter (name OR subcluster_name ILIKE %search%)
		if (options.search) {
			const searchPattern = `%${escapeLike(options.search)}%`;
			query = query.where((eb) =>
				eb.or([
					eb("c.name", "ilike", searchPattern),
					eb("c.subcluster_name", "ilike", searchPattern),
				]),
			);
		}

		// Sorting - always include id as tiebreaker for stable pagination
		switch (sort) {
			case "volume":
				query = query
					.orderBy(sql`ts.ticket_count`, "desc")
					.orderBy("c.created_at", "desc")
					.orderBy("c.id", "desc");
				break;
			case "automation":
				query = query
					.orderBy(sql`(c.config->>'auto_respond')::boolean desc nulls last`)
					.orderBy(sql`ts.ticket_count`, "desc")
					.orderBy("c.id", "desc");
				break;
			case "recent":
			default:
				query = query.orderBy("c.created_at", "desc").orderBy("c.id", "desc");
		}

		const rows = await query.limit(limit).offset(offset).execute();

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
			.leftJoin("tickets_log as tl", (join) =>
				join
					.onRef("tl.ticket_id", "=", "t.id")
					.on("tl.event_type", "=", "agent_end"),
			)
			.select([
				"t.cluster_id",
				sql<number>`COUNT(DISTINCT t.id)`.as("cnt"),
				sql<number>`COUNT(DISTINCT tl.ticket_id)`.as("automated_cnt"),
			])
			.where("t.organization_id", "=", organizationId)
			.where("t.cluster_id", "is not", null);

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
			.selectFrom(totalsTicketCounts)
			.innerJoin("clusters as c", "c.id", "ttc.cluster_id")
			.select([
				sql<number>`COUNT(*)`.as("total_clusters"),
				sql<number>`COALESCE(SUM(ttc.cnt), 0)`.as("total_tickets"),
				sql<number>`COALESCE(SUM(ttc.automated_cnt), 0)`.as(
					"total_automated_tickets",
				),
			])
			.where("c.organization_id", "=", organizationId);

		if (options.kbStatus) {
			totalsQuery = totalsQuery.where("c.kb_status", "=", options.kbStatus);
		}

		if (options.search) {
			const searchPattern = `%${escapeLike(options.search)}%`;
			totalsQuery = totalsQuery.where((eb) =>
				eb.or([
					eb("c.name", "ilike", searchPattern),
					eb("c.subcluster_name", "ilike", searchPattern),
				]),
			);
		}

		const totalsResult = await totalsQuery.executeTakeFirst();
		const total = Number(totalsResult?.total_clusters ?? 0);

		return {
			clusters,
			pagination: {
				total,
				limit,
				offset,
				has_more: offset + limit < total,
			},
			totals: {
				total_clusters: total,
				total_tickets: Number(totalsResult?.total_tickets ?? 0),
				total_automated_tickets: Number(
					totalsResult?.total_automated_tickets ?? 0,
				),
			},
		};
	}

	/**
	 * Get paginated tickets for a cluster
	 * Uses offset-based pagination with case-insensitive sorting
	 */
	async getClusterTickets(
		clusterId: string,
		organizationId: string,
		options: ClusterTicketsQueryOptions = {},
	): Promise<{ tickets: Ticket[]; pagination: OffsetPaginationInfo }> {
		const limit = Math.min(options.limit || 20, MAX_LIMIT);
		const offset = options.offset || 0;

		// Map tab to rita_status
		let ritaStatusFilter: RitaStatus | null = null;
		if (options.tab === "needs_response") {
			ritaStatusFilter = "NEEDS_RESPONSE";
		} else if (options.tab === "completed") {
			ritaStatusFilter = "COMPLETED";
		}

		// Build base query with filters
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
			const searchPattern = `%${escapeLike(options.search)}%`;
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

		// Priority filter
		if (options.priority) {
			query = query.where("priority", "=", options.priority);
		}

		// External status filter
		if (options.external_status) {
			query = query.where("external_status", "=", options.external_status);
		}

		// Case-insensitive sorting with stable tiebreaker
		const sortFieldMap: Record<string, ReturnType<typeof sql>> = {
			created_at: sql`"created_at"`,
			external_id: sql`LOWER("external_id")`,
			subject: sql`LOWER("subject")`,
		};
		const sortDir = options.sort_dir || "desc";
		const sortExpr = sortFieldMap[options.sort || "created_at"];
		query = query.orderBy(sortExpr, sortDir).orderBy("id", "asc");

		// Execute paginated query and count query
		const [rows, countResult] = await Promise.all([
			query.limit(limit).offset(offset).execute(),
			db
				.selectFrom("tickets")
				.select(db.fn.count("id").as("total"))
				.where("cluster_id", "=", clusterId)
				.where("organization_id", "=", organizationId)
				.$if(ritaStatusFilter !== null, (qb) =>
					qb.where("rita_status", "=", ritaStatusFilter as RitaStatus),
				)
				.$if(!!options.search, (qb) => {
					const searchPattern = `%${escapeLike(options.search as string)}%`;
					return qb.where((eb) =>
						eb.or([
							eb("subject", "ilike", searchPattern),
							eb("external_id", "ilike", searchPattern),
						]),
					);
				})
				.$if(!!options.source, (qb) =>
					qb.where(
						sql`source_metadata->>'source'`,
						"=",
						options.source as string,
					),
				)
				.$if(!!options.priority, (qb) =>
					qb.where("priority", "=", options.priority as string),
				)
				.$if(!!options.external_status, (qb) =>
					qb.where("external_status", "=", options.external_status as string),
				)
				.executeTakeFirstOrThrow(),
		]);

		const total = Number(countResult.total);

		const tickets: Ticket[] = rows.map((row) => ({
			id: row.id,
			organization_id: row.organization_id,
			cluster_id: row.cluster_id,
			data_source_connection_id: row.data_source_connection_id,
			external_id: row.external_id,
			subject: row.subject,
			description: row.description,
			external_status: row.external_status,
			cluster_text: row.cluster_text,
			rita_status: row.rita_status as RitaStatus,
			source_metadata: row.source_metadata as Record<string, any>,
			requester: row.requester,
			assigned_to: row.assigned_to,
			priority: row.priority,
			created_at: row.created_at as Date,
			updated_at: row.updated_at as Date,
		}));

		return {
			tickets,
			pagination: {
				total,
				limit,
				offset,
				has_more: offset + limit < total,
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
			description: row.description,
			external_status: row.external_status,
			cluster_text: row.cluster_text,
			rita_status: row.rita_status as RitaStatus,
			source_metadata: row.source_metadata as Record<string, any>,
			requester: row.requester,
			assigned_to: row.assigned_to,
			priority: row.priority,
			created_at: row.created_at as Date,
			updated_at: row.updated_at as Date,
		};
	}

	/**
	 * Trigger knowledge article generation for a cluster.
	 * Sends webhook to external platform and returns correlation ID.
	 */
	async generateKnowledge(params: {
		clusterId: string;
		organizationId: string;
		userId: string;
		userEmail: string;
		sources: string[];
	}): Promise<GenerateKnowledgeResponse> {
		const cluster = await this.getClusterDetails(
			params.clusterId,
			params.organizationId,
		);

		if (!cluster) {
			throw new Error("Cluster not found");
		}

		const generationId = randomUUID();

		const { WebhookService } = await import("./WebhookService.js");
		const webhookService = new WebhookService();
		await webhookService.sendGenericEvent({
			organizationId: params.organizationId,
			userId: params.userId,
			userEmail: params.userEmail,
			source: "rita-chat",
			action: "create_knowledge",
			additionalData: {
				cluster_id: params.clusterId,
				cluster_name: cluster.name,
				generation_id: generationId,
				sources: params.sources,
			},
		});

		return { generation_id: generationId };
	}

	/**
	 * Add a knowledge article to a cluster.
	 * Creates blob + blob_metadata + cluster_kb_links in a single transaction,
	 * then triggers document_uploaded webhook for RAG indexing.
	 */
	async addKbArticle(params: {
		clusterId: string;
		organizationId: string;
		userId: string;
		userEmail: string;
		content: string;
		filename: string;
	}): Promise<KbArticle> {
		const exists = await this.clusterExists(
			params.clusterId,
			params.organizationId,
		);

		if (!exists) {
			throw new Error("Cluster not found");
		}

		const textBuffer = Buffer.from(params.content, "utf8");
		const digest = crypto.createHash("sha256").update(textBuffer).digest("hex");

		const { withOrgContext } = await import("../config/database.js");
		const result = await withOrgContext(
			params.userId,
			params.organizationId,
			async (client) => {
				await client.query("BEGIN");

				try {
					// 1. Create or reuse blob (deduplication)
					let blobId: string;
					const existingBlob = await client.query(
						"SELECT blob_id FROM blobs WHERE digest = $1",
						[digest],
					);

					if (existingBlob.rows.length > 0) {
						blobId = existingBlob.rows[0].blob_id;
					} else {
						const blobResult = await client.query(
							"INSERT INTO blobs (data, digest) VALUES ($1, $2) RETURNING blob_id",
							[textBuffer, digest],
						);
						blobId = blobResult.rows[0].blob_id;
					}

					// 2. Create blob_metadata
					const metadataResult = await client.query(
						`INSERT INTO blob_metadata (
							blob_id, organization_id, user_id, filename, file_size,
							mime_type, status, source, processed_markdown, metadata
						) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
						RETURNING id, blob_id, filename, file_size, mime_type, status, created_at, updated_at`,
						[
							blobId,
							params.organizationId,
							params.userId,
							params.filename,
							textBuffer.byteLength,
							"text/markdown",
							"processing",
							"ai-generated",
							params.content,
							JSON.stringify({
								source: "ai-generated",
								cluster_id: params.clusterId,
							}),
						],
					);

					const metadata = metadataResult.rows[0];

					// 3. Link to cluster
					await client.query(
						`INSERT INTO cluster_kb_links (organization_id, cluster_id, blob_metadata_id)
						VALUES ($1, $2, $3)
						ON CONFLICT (cluster_id, blob_metadata_id) DO NOTHING`,
						[params.organizationId, params.clusterId, metadata.id],
					);

					// 4. Update cluster kb_status to FOUND if currently GAP
					await client.query(
						`UPDATE clusters SET kb_status = 'FOUND', updated_at = NOW()
						WHERE id = $1 AND organization_id = $2 AND kb_status = 'GAP'`,
						[params.clusterId, params.organizationId],
					);

					await client.query("COMMIT");
					return metadata;
				} catch (error) {
					await client.query("ROLLBACK");
					throw error;
				}
			},
		);

		// Send document_uploaded webhook for RAG indexing (non-blocking)
		try {
			const { WebhookService } = await import("./WebhookService.js");
			const webhookService = new WebhookService();
			const baseUrl = process.env.BASE_URL || "http://localhost:3000";
			await webhookService.sendDocumentEvent({
				organizationId: params.organizationId,
				userId: params.userId,
				userEmail: params.userEmail,
				blobMetadataId: result.id,
				blobId: result.blob_id,
				documentUrl: `${baseUrl}/api/files/${result.id}/download`,
				fileType: "text/markdown",
				fileSize: textBuffer.byteLength,
				originalFilename: params.filename,
			});
		} catch (webhookError) {
			// Don't fail the request if webhook fails
			console.error(
				"[ClusterService] Failed to send document webhook:",
				webhookError,
			);
		}

		return {
			id: result.id,
			filename: result.filename,
			file_size: result.file_size,
			mime_type: result.mime_type,
			status: result.status,
			created_at: result.created_at,
			updated_at: result.updated_at,
		};
	}
}
