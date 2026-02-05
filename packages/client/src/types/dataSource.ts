// Data Source Connection Types
// Matches backend schema from packages/api-server/src/types/dataSource.ts

export type DataSourceType =
	| "confluence"
	| "servicenow"
	| "servicenow_itsm"
	| "sharepoint"
	| "websearch"
	| "jira_itsm"
	| "freshdesk";

export type DataSourceStatus = "idle" | "verifying" | "syncing" | "cancelled";

export type DataSourceLastSyncStatus = "completed" | "failed" | null;

export type Status =
	| "connected"
	| "not_connected"
	| "verifying"
	| "syncing"
	| "cancelled"
	| "error"
	| null;

// Backend status constants (match database values exactly)
export const BACKEND_STATUS = {
	IDLE: "idle" as Status,
	VERIFYING: "verifying" as Status,
	SYNCING: "syncing" as Status,
	CANCELLED: "cancelled" as Status,
	FAILED: "failed" as Status,
	COMPLETED: "completed" as Status,
} as const;

/**
 * Data Source Connection from backend
 * Represents a configured external data source (Confluence, ServiceNow, etc.)
 * NOTE: Backend returns snake_case field names to match database schema
 */
export interface DataSourceConnection {
	id: string; // UUID from backend
	organization_id: string;
	type: DataSourceType;
	name: string;
	description: string | null;

	// Configuration settings (NO credentials - stored in external service)
	settings: Record<string, any>; // JSON settings (spaces, tables, etc.)

	// Current status (what's happening NOW)
	status: DataSourceStatus;

	// Historical tracking (what happened LAST TIME)
	last_sync_status: DataSourceLastSyncStatus;

	// IMPORTANT: latest_options contains available options from verification
	// Format varies by connection type:
	//   Confluence: { "spaces": [{title, sys_id}, ...] }
	//   ServiceNow KB: { "knowledge_base": [{title, sys_id}, ...] }
	//   SharePoint: { "sites": [{title, sys_id}, ...] }
	latest_options: Record<string, any> | null;

	enabled: boolean;

	// Verification tracking
	last_verification_at: string | null; // ISO timestamp (null = never configured)
	last_verification_error: string | null;

	// Sync tracking
	last_sync_at: string | null; // ISO timestamp
	last_sync_error: string | null;

	// Audit fields
	created_by: string;
	updated_by: string;
	created_at: string; // ISO timestamp
	updated_at: string; // ISO timestamp
}

/**
 * API Response: List all data sources
 */
export interface ListDataSourcesResponse {
	data: DataSourceConnection[];
}

/**
 * API Response: Get single data source
 */
export interface GetDataSourceResponse {
	data: DataSourceConnection;
}

/**
 * API Response: Seed default data sources (idempotent)
 */
export interface SeedDataSourcesResponse {
	success: boolean;
	created: number;
	existing: number;
	message: string;
}

/**
 * API Request: Verify credentials
 * Sends credentials to external service for validation
 * Result comes back via SSE (updates latestOptions)
 */
export interface VerifyDataSourceRequest {
	settings?: Record<string, any>; // e.g., { url: "https://..." }
	credentials?: Record<string, any>; // e.g., { api_token: "...", email: "..." }
	apply_to_related?: boolean; // For ServiceNow: also apply credentials to KB/ITSM counterpart
}

/**
 * API Response: Verify credentials (immediate response)
 * Actual verification result comes via SSE
 */
export interface VerifyDataSourceResponse {
	status: "verifying";
	message: string;
}

/**
 * API Request: Update data source configuration
 */
export interface UpdateDataSourceRequest {
	name?: string;
	description?: string;
	settings?: Record<string, any>;
	enabled?: boolean;
}

/**
 * API Response: Update data source
 */
export interface UpdateDataSourceResponse {
	data: DataSourceConnection;
}

/**
 * API Response: Trigger sync
 */
export interface TriggerSyncResponse {
	data: {
		id: string;
		status: "syncing";
		triggeredAt: string;
	};
}

/**
 * API Response: Sync tickets (ITSM Autopilot)
 * Returns 202 Accepted with ingestion run ID
 */
export interface SyncTicketsResponse {
	ingestion_run_id: string;
	status: "SYNCING";
	message: string;
}

/**
 * SSE Event: Data source status update
 * Sent when verification or sync status changes
 * NOTE: Uses snake_case to match backend
 */
export interface DataSourceUpdateEvent {
	type: "data_source_update";
	data: {
		connectionId: string;
		status: DataSourceStatus;
		connectionType?: string;

		// Verification-specific fields
		last_verification_at?: string;
		last_verification_error?: string | null;
		latest_options?: Record<string, any> | null;

		// Sync-specific fields
		last_sync_status?: DataSourceLastSyncStatus;
		last_sync_at?: string;
		last_sync_error?: string | null;
		documentsProcessed?: number;

		timestamp: string;
	};
}

/**
 * SSE Event: Ingestion run status update (ITSM Autopilot)
 * Sent when ticket sync progresses, completes or fails
 */
export interface IngestionRunUpdateEvent {
	type: "ingestion_run_update";
	data: {
		ingestion_run_id: string;
		connection_id: string;
		status: "running" | "completed" | "failed";
		records_processed?: number;
		records_failed?: number;
		total_estimated?: number;
		error_message?: string;
		timestamp: string;
	};
}

/**
 * Ingestion run status for ITSM ticket sync
 */
export type IngestionRunStatus =
	| "pending"
	| "running"
	| "completed"
	| "failed"
	| "cancelled";

/**
 * Ingestion run entity (ITSM Autopilot)
 * Tracks ticket sync operations for a data source connection
 */
export interface IngestionRun {
	id: string;
	organization_id: string;
	data_source_connection_id: string | null;
	started_by: string;
	status: IngestionRunStatus;
	records_processed: number;
	records_failed: number;
	metadata: {
		progress?: {
			total_estimated: number;
		};
		[key: string]: unknown;
	};
	error_message: string | null;
	completed_at: string | null;
	created_at: string;
	updated_at: string;
}

/**
 * API Response: Get latest ingestion run
 */
export interface LatestIngestionRunResponse {
	data: IngestionRun | null;
}
