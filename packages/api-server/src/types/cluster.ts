/**
 * Cluster Types
 * Type definitions for autopilot clusters and tickets
 */

/**
 * KB status values for clusters
 */
export type KBStatus = "PENDING" | "FOUND" | "GAP";

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
 * Cluster entity from database
 */
export interface Cluster {
	id: string;
	organization_id: string;
	model_id: string;
	name: string;
	subcluster_name: string | null;
	config: ClusterConfig;
	kb_status: KBStatus;
	created_at: Date;
	updated_at: Date;
}

/**
 * Cluster details response with counts
 */
export interface ClusterDetails extends Cluster {
	kb_articles_count: number;
	ticket_count: number;
	open_count: number;
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
	created_at: Date;
	updated_at: Date;
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
 * Query options for listing clusters
 */
export interface ClusterListQueryOptions {
	sort?: ClusterSortOption;
	period?: PeriodFilter;
	includeInactive?: boolean;
	limit?: number;
	cursor?: string;
	kbStatus?: KBStatus;
	search?: string;
}

/**
 * Ticket entity from database
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
	source_metadata: Record<string, any>;
	created_at: Date;
	updated_at: Date;
}

/**
 * Pagination cursor info
 */
export interface PaginationInfo {
	next_cursor: string | null;
	has_more: boolean;
}

/**
 * Totals for cluster list response
 */
export interface ClusterTotals {
	total_clusters: number;
	total_tickets: number;
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
 * Query options for cluster tickets
 */
export interface ClusterTicketsQueryOptions {
	tab?: "needs_response" | "completed";
	cursor?: string;
	limit?: number;
	search?: string;
	sort?: TicketSortOption;
	sort_dir?: SortDirection;
	source?: string;
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
 * KB article from blob_metadata
 */
export interface KbArticle {
	id: string;
	filename: string;
	file_size: number;
	mime_type: string;
	status: string;
	created_at: Date;
	updated_at: Date;
}

/**
 * Response for GET /api/clusters/:id/kb-articles
 */
export interface ClusterKbArticlesResponse {
	data: KbArticle[];
}
