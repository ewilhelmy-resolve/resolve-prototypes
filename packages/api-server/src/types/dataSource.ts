/**
 * Data Source Types
 * Type definitions for data source connections and webhooks
 */

import type { DataSourceType } from "../constants/dataSources.js";

/**
 * Data source connection entity
 */
export interface DataSourceConnection {
	id: string;
	organization_id: string;
	type: DataSourceType;
	name: string;
	description: string | null;
	settings: Record<string, any>;

	// Status
	status: "idle" | "verifying" | "syncing" | "cancelled";
	last_sync_status: "completed" | "failed" | null;
	last_sync_at: Date | null;
	last_sync_error: string | null;

	// Verification
	last_verification_at: Date | null;
	last_verification_error: string | null;
	latest_options: Record<string, any> | null;

	// Control
	enabled: boolean;

	// Audit
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
}

/**
 * Create data source request body
 */
export interface CreateDataSourceRequest {
	type: DataSourceType;
	name: string;
	description?: string;
	settings?: Record<string, any>;
}

/**
 * Update data source request body
 */
export interface UpdateDataSourceRequest {
	name?: string;
	description?: string;
	settings?: Record<string, any>;
	enabled?: boolean;
}

/**
 * Verify webhook payload
 * Sent to external service to verify credentials
 */
export interface VerifyWebhookPayload {
	source: "rita-chat";
	action: "verify_credentials";
	tenant_id: string;
	user_id: string;
	user_email: string;
	connection_id: string;
	connection_type: DataSourceType;
	credentials: Record<string, any>;
	settings: Record<string, any>;
	timestamp: string;
	is_delegation_setup?: boolean;
}

/**
 * Sync trigger webhook payload
 * Sent to external service to trigger sync job
 */
export interface SyncTriggerWebhookPayload {
	source: "rita-chat";
	action: "trigger_sync";
	tenant_id: string;
	user_id: string;
	user_email: string;
	connection_id: string;
	connection_type: DataSourceType;
	settings: Record<string, any>;
	timestamp: string;
}

/**
 * Sync tickets webhook payload (ITSM Autopilot)
 * Sent to external service to trigger ITSM ticket sync for clustering
 */
export interface SyncTicketsWebhookPayload {
	source: "rita-chat";
	action: "sync_tickets";
	tenant_id: string;
	user_id: string;
	user_email: string;
	connection_id: string;
	connection_type: DataSourceType;
	ingestion_run_id: string;
	settings: Record<string, any>;
	timestamp: string;
}

/**
 * RabbitMQ message for sync status updates
 * Consumed by Rita to update data source status
 */
export interface SyncStatusMessage {
	type: "sync"; // Discriminator field
	connection_id: string;
	tenant_id: string;
	status: "sync_started" | "sync_completed" | "sync_failed" | "sync_cancelled";
	error_message?: string;
	documents_processed?: number;
	timestamp: string;
}

/**
 * RabbitMQ message for verification status updates
 * Consumed by Rita to update verification results
 */
export interface VerificationStatusMessage {
	type: "verification"; // Discriminator field
	connection_id: string;
	tenant_id: string;
	status: "success" | "failed";
	options: Record<string, any> | null;
	error: string | null;
}

/**
 * RabbitMQ message for ticket ingestion status updates (ITSM Autopilot)
 * Consumed by Rita to update ingestion_runs table and send SSE events
 */
export interface IngestionStatusMessage {
	type: "ticket_ingestion"; // Discriminator field
	tenant_id: string;
	user_id: string;
	ingestion_run_id: string;
	connection_id: string;
	status: "running" | "completed" | "failed";
	records_processed?: number;
	records_failed?: number;
	total_estimated?: number;
	error_message?: string;
	timestamp: string;
}

/**
 * RabbitMQ message for credential delegation verification status
 * Consumed by Rita to update delegation token status and send success email
 */
export interface DelegationVerificationMessage {
	type: "credential_delegation_verification"; // Discriminator field
	delegation_id: string;
	tenant_id: string;
	status: "verified" | "failed";
	error: string | null;
	timestamp?: string;
}

/**
 * Union type for all data source status messages
 * Discriminated by the 'type' field
 */
export type DataSourceStatusMessage =
	| SyncStatusMessage
	| VerificationStatusMessage
	| IngestionStatusMessage
	| DelegationVerificationMessage;

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
	metadata: Record<string, any>;
	error_message: string | null;
	completed_at: string | null;
	created_at: string;
	updated_at: string;
}
