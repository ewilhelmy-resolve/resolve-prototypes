// Cluster Types
// Matches backend schema from packages/api-server/src/types/cluster.ts

/**
 * KB status values for clusters
 */
export type KBStatus = "PENDING" | "FOUND" | "GAP";

/**
 * KB status constants for type-safe comparisons
 */
export const KB_STATUSES = {
	PENDING: "PENDING",
	FOUND: "FOUND",
	GAP: "GAP",
} as const satisfies Record<string, KBStatus>;

/**
 * KB filter "all" option for UI dropdowns
 */
export const KB_FILTER_ALL = "all" as const;

/**
 * Rita status values for tickets
 */
export type RitaStatus = "NEEDS_RESPONSE" | "COMPLETED";

/**
 * Cluster configuration
 */
export interface ClusterConfig {
	auto_respond?: boolean;
	auto_populate?: boolean;
}

/**
 * Cluster list item with ticket counts (for dashboard)
 */
export interface ClusterListItem {
	id: string;
	name: string;
	subcluster_name: string | null;
	kb_status: KBStatus;
	config: ClusterConfig;
	ticket_count: number;
	needs_response_count: number;
	created_at: string;
	updated_at: string;
}

/**
 * Cluster details with counts
 */
export interface ClusterDetails {
	id: string;
	organization_id: string;
	model_id: string;
	name: string;
	subcluster_name: string | null;
	config: ClusterConfig;
	kb_status: KBStatus;
	kb_articles_count: number;
	ticket_count: number;
	open_count: number;
	created_at: string;
	updated_at: string;
}

/**
 * Ticket entity
 */
export interface Ticket {
	id: string;
	organization_id: string;
	cluster_id: string | null;
	data_source_connection_id: string | null;
	external_id: string;
	subject: string;
	external_status: string;
	cluster_text: string | null;
	rita_status: RitaStatus;
	source_metadata: Record<string, unknown>;
	created_at: string;
	updated_at: string;
}

/**
 * KB article from blob_metadata
 */
export interface KbArticle {
	id: string;
	filename: string;
	file_size: number;
	mime_type: string;
	status: string;
	created_at: string;
	updated_at: string;
}

/**
 * Pagination cursor info
 */
export interface PaginationInfo {
	next_cursor: string | null;
	has_more: boolean;
}

/**
 * Sort options for cluster list
 */
export type ClusterSortOption = "volume" | "automation" | "recent";

/**
 * Period filter for ticket counts
 */
export type PeriodFilter = "last30" | "last90" | "last6months" | "lastyear";

/**
 * Query params for listing clusters
 */
export interface ClustersQueryParams {
	sort?: ClusterSortOption;
	period?: PeriodFilter;
	limit?: number;
	cursor?: string;
	kb_status?: KBStatus;
	search?: string;
}

/**
 * Sort options for cluster tickets
 */
export type TicketSortOption = "created_at" | "external_id" | "subject";

/**
 * Sort direction
 */
export type SortDirection = "asc" | "desc";

/**
 * Query params for cluster tickets
 */
export interface ClusterTicketsQueryParams {
	tab?: "needs_response" | "completed";
	cursor?: string;
	limit?: number;
	search?: string;
	sort?: TicketSortOption;
	sort_dir?: SortDirection;
	source?: string;
}

/**
 * Totals for cluster list response
 */
export interface ClusterTotals {
	total_clusters: number;
	total_tickets: number;
}

/**
 * Response for GET /api/clusters
 */
export interface ClustersResponse {
	data: ClusterListItem[];
	pagination: PaginationInfo;
	totals: ClusterTotals;
}

/**
 * Response for GET /api/clusters/:id/details
 */
export interface ClusterDetailsResponse {
	data: ClusterDetails;
}

/**
 * Response for GET /api/clusters/:id/tickets
 */
export interface ClusterTicketsResponse {
	data: Ticket[];
	pagination: PaginationInfo;
}

/**
 * Response for GET /api/clusters/:id/kb-articles
 */
export interface ClusterKbArticlesResponse {
	data: KbArticle[];
}

/**
 * Response for GET /api/tickets/:id
 */
export interface TicketResponse {
	data: Ticket;
}
