// WebhookService types for Rita project
// Maps organization_id to tenant_id for webhook platform compatibility

export interface BaseWebhookPayload {
  source: string;
  action: string;
  user_email?: string;
  user_id?: string;
  tenant_id?: string; // Webhook platform expects tenant_id (maps to organization_id). Optional for public/unauthenticated flows like password reset.
  timestamp?: string;
}

export interface MessageWebhookPayload extends BaseWebhookPayload {
  source: 'rita-chat';
  action: 'message_created';
  conversation_id: string;
  customer_message: string;
  message_id: string;
  document_ids?: string[];
  transcript_ids?: {
    transcripts: Array<{ role: string; content: string }>;
  };
}

export interface DocumentProcessingPayload extends BaseWebhookPayload {
  source: 'rita-documents';
  action: 'document_uploaded';
  blob_metadata_id: string; // blob_metadata.id
  blob_id: string; // blobs.blob_id
  document_url: string;
  file_type: string;
  file_size: number;
  original_filename: string;
}

export interface DocumentDeletePayload extends BaseWebhookPayload {
  source: 'rita-documents';
  action: 'document_deleted';
  blob_metadata_id: string; // blob_metadata.id
  blob_id: string; // blobs.blob_id
  article_id: string; // Temporary field for Barista compatibility (maps to blob_id)
}

/**
 * Password Reset Request Webhook Payload
 * Triggered when user requests password reset
 */
export interface PasswordResetRequestPayload extends BaseWebhookPayload {
  source: 'rita-auth';
  action: 'password_reset_request';
  reset_url: string;
  expires_at: string; // ISO timestamp
}

/**
 * Password Reset Complete Webhook Payload
 * Triggered when user submits new password
 */
export interface PasswordResetCompletePayload extends BaseWebhookPayload {
  source: 'rita-auth';
  action: 'password_reset_complete';
  password: string; // Base64 encoded
}

export interface WebhookResponse {
  success: boolean;
  data?: any;
  status: number;
  error?: string;
}

export interface WebhookConfig {
  url: string;
  authHeader: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface WebhookError extends Error {
  status?: number;
  response?: any;
  isRetryable: boolean;
}

// Union type for all webhook payloads
export type WebhookPayload =
  | MessageWebhookPayload
  | DocumentProcessingPayload
  | DocumentDeletePayload
  | PasswordResetRequestPayload
  | PasswordResetCompletePayload
  | (BaseWebhookPayload & Record<string, any>);