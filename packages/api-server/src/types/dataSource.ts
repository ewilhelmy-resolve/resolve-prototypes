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
  status: 'idle' | 'syncing';
  last_sync_status: 'completed' | 'failed' | null;
  last_sync_at: Date | null;

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
  source: 'rita-data-sources';
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
  source: 'rita-data-sources';
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
  connection_id: string;
  tenant_id: string;
  status: 'sync_started' | 'sync_completed' | 'sync_failed';
  error_message?: string;
  documents_processed?: number;
  timestamp: string;
}