/**
 * Data Source Types
 * Type definitions for data source connections and webhooks
 */

import type { DataSourceType } from '../constants/dataSources.js';

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
  status: 'idle' | 'verifying' | 'syncing';
  last_sync_status: 'completed' | 'failed' | null;
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
  source: 'rita-chat';
  action: 'verify_credentials';
  tenant_id: string;
  user_id: string;
  user_email: string;
  connection_id: string;
  connection_type: DataSourceType;
  credentials: Record<string, any>;
  settings: Record<string, any>;
  timestamp: string;
}

/**
 * Sync trigger webhook payload
 * Sent to external service to trigger sync job
 */
export interface SyncTriggerWebhookPayload {
  source: 'rita-chat';
  action: 'trigger_sync';
  tenant_id: string;
  user_id: string;
  user_email: string;
  connection_id: string;
  connection_type: DataSourceType;
  settings: Record<string, any>;
  timestamp: string;
}

/**
 * RabbitMQ message for sync status updates
 * Consumed by Rita to update data source status
 */
export interface SyncStatusMessage {
  type: 'sync';  // Discriminator field
  connection_id: string;
  tenant_id: string;
  status: 'sync_started' | 'sync_completed' | 'sync_failed';
  error_message?: string;
  documents_processed?: number;
  timestamp: string;
}

/**
 * RabbitMQ message for verification status updates
 * Consumed by Rita to update verification results
 */
export interface VerificationStatusMessage {
  type: 'verification';  // Discriminator field
  connection_id: string;
  tenant_id: string;
  status: 'success' | 'failed';
  options: Record<string, any> | null;
  error: string | null;
}

/**
 * Union type for all data source status messages
 * Discriminated by the 'type' field
 */
export type DataSourceStatusMessage = SyncStatusMessage | VerificationStatusMessage;