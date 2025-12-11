import axios, { type AxiosResponse } from 'axios';
import { pool } from '../config/database.js';
import type {
  BaseWebhookPayload,
  DocumentDeletePayload,
  DocumentProcessingPayload,
  MessageWebhookPayload,
  WebhookConfig,
  WebhookError,
  WebhookPayload,
  WebhookResponse
} from '../types/webhook.js';

export class WebhookService {
  private config: WebhookConfig;

  constructor(config?: Partial<WebhookConfig>) {
    this.config = {
      url: config?.url || process.env.AUTOMATION_WEBHOOK_URL ||
        'http://localhost:3001/webhook',
      authHeader: config?.authHeader || process.env.AUTOMATION_AUTH ||
        '',
      timeout: config?.timeout || 10000,
      retryAttempts: config?.retryAttempts || 3,
      retryDelay: config?.retryDelay || 1000
    };
  }

  /**
   * Send message created webhook event
   */
  async sendMessageEvent(params: {
    organizationId: string;
    userId: string;
    userEmail: string;
    conversationId: string;
    messageId: string;
    customerMessage: string;
    documentIds?: string[];
    createdAt?: Date;
    transcript?: Array<{ role: string; content: string }>;
  }): Promise<WebhookResponse> {
    const payload: MessageWebhookPayload = {
      source: 'rita-chat',
      action: 'message_created',
      user_email: params.userEmail,
      user_id: params.userId,
      tenant_id: params.organizationId, // Map organization_id to tenant_id
      conversation_id: params.conversationId,
      customer_message: params.customerMessage,
      message_id: params.messageId,
      document_ids: params.documentIds || [],
      transcript_ids: params.transcript ? {
        transcripts: params.transcript
      } : undefined,
      timestamp: (params.createdAt || new Date()).toISOString()
    };

    return this.sendEvent(payload);
  }

  /**
   * Send document processing webhook event
   */
  async sendDocumentEvent(params: {
    organizationId: string;
    userId: string;
    userEmail: string;
    blobMetadataId: string;
    blobId: string;
    documentUrl: string;
    fileType: string;
    fileSize: number;
    originalFilename: string;
  }): Promise<WebhookResponse> {
    const payload: DocumentProcessingPayload = {
      source: 'rita-documents',
      action: 'document_uploaded',
      user_email: params.userEmail,
      user_id: params.userId,
      tenant_id: params.organizationId, // Map organization_id to tenant_id
      blob_metadata_id: params.blobMetadataId,
      blob_id: params.blobId,
      document_url: params.documentUrl,
      file_type: params.fileType,
      file_size: params.fileSize,
      original_filename: params.originalFilename,
      timestamp: new Date().toISOString()
    };

    return this.sendEvent(payload);
  }

  /**
   * Send document deletion webhook event
   */
  async sendDocumentDeleteEvent(params: {
    organizationId: string;
    userId: string;
    userEmail: string;
    blobMetadataId: string;
    blobId: string;
  }): Promise<WebhookResponse> {
    const payload: DocumentDeletePayload = {
      source: 'rita-documents',
      action: 'document_deleted',
      user_email: params.userEmail,
      user_id: params.userId,
      tenant_id: params.organizationId, // Map organization_id to tenant_id
      blob_metadata_id: params.blobMetadataId,
      blob_id: params.blobId,
      article_id: params.blobId, // Temporary compatibility field for Barista (maps to blob_id)
      timestamp: new Date().toISOString()
    };

    return this.sendEvent(payload);
  }

  /**
   * Send Keycloak user deletion webhook event
   * Used for Phase 2 hard delete to synchronize user deletion with external identity provider
   */
  async deleteKeycloakUser(params: {
    userId: string;
    email: string;
    organizationId: string; // Always required - used by external service for file cleanup
    reason?: string;
    deleteOrganization?: boolean; // Signal external system to delete entire organization data
    additionalEmails?: string[]; // Additional user emails to delete from Keycloak (for org deletion)
  }): Promise<WebhookResponse> {
    const payload: BaseWebhookPayload & Record<string, any> = {
      source: 'rita-member-management',
      action: 'delete_keycloak_user',
      user_email: params.email,
      user_id: params.userId,
      tenant_id: params.organizationId, // Map organization_id to tenant_id
      delete_tenant: params.deleteOrganization || false, // Map to delete_tenant for external service
      additional_emails: params.additionalEmails || [], // Additional emails for batch Keycloak deletion
      reason: params.reason || 'Member deleted by administrator',
      timestamp: new Date().toISOString()
    };

    return this.sendEvent(payload);
  }

  /**
   * Send generic webhook event with automatic tenant_id mapping
   */
  async sendGenericEvent(params: {
    organizationId: string;
    userId?: string;
    userEmail?: string;
    source: string;
    action: string;
    additionalData?: Record<string, any>;
  }): Promise<WebhookResponse> {
    const payload: BaseWebhookPayload & Record<string, any> = {
      source: params.source,
      action: params.action,
      user_email: params.userEmail,
      user_id: params.userId,
      tenant_id: params.organizationId, // Map organization_id to tenant_id
      timestamp: new Date().toISOString(),
      ...params.additionalData
    };

    return this.sendEvent(payload);
  }

  /**
   * Core event sending method with retry logic
   */
  private async sendEvent(payload: WebhookPayload): Promise<WebhookResponse> {
    let lastError: WebhookError | null = null;

    // Validate payload is JSON-serializable before sending
    try {
      const testJson = JSON.stringify(payload);
      JSON.parse(testJson); // Verify it's valid JSON
    } catch (validationError) {
      console.error('[WebhookService] Payload validation failed:', validationError);
      console.error('[WebhookService] Invalid payload:', payload);
      return {
        success: false,
        status: 0,
        error: `Invalid JSON payload: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`
      };
    }

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        console.log(`[WebhookService] Sending event (attempt ${attempt}/${this.config.retryAttempts}):`, {
          source: payload.source,
          action: payload.action,
          tenant_id: payload.tenant_id
        });

        const response: AxiosResponse = await axios.post(
          this.config.url,
          payload,
          {
            headers: {
              'Authorization': this.config.authHeader,
              'Content-Type': 'application/json'
            },
            timeout: this.config.timeout
          }
        );

        console.log(`[WebhookService] Success: ${response.status}`);

        return {
          success: true,
          data: response.data,
          status: response.status
        };

      } catch (error: any) {
        const webhookError = this.createWebhookError(error);
        lastError = webhookError;

        console.error(`[WebhookService] Attempt ${attempt} failed:`, {
          status: webhookError.status,
          message: webhookError.message,
          isRetryable: webhookError.isRetryable
        });

        // Don't retry if it's not a retryable error or if this is the last attempt
        if (!webhookError.isRetryable || attempt === this.config.retryAttempts) {
          // Store failure for non-retryable errors or after all retries exhausted
          await this.storeWebhookFailure(payload, webhookError, attempt);
          break;
        }

        // Wait before retrying
        await this.delay(this.config.retryDelay * attempt);
      }
    }

    console.error(`[WebhookService] All attempts failed for ${payload.action}`);

    return {
      success: false,
      status: lastError?.status || 0,
      error: lastError?.message || 'Unknown error'
    };
  }

  /**
   * Create a standardized webhook error
   */
  private createWebhookError(error: any): WebhookError {
    const webhookError = new Error(error.message || 'Webhook request failed') as WebhookError;

    if (error.response) {
      webhookError.status = error.response.status;
      webhookError.response = error.response.data;

      // Determine if error is retryable based on status code
      webhookError.isRetryable = error.response.status >= 500 ||
                                 error.response.status === 429 ||
                                 error.response.status === 408;
    } else if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND') {
      // Network/timeout errors are retryable
      webhookError.isRetryable = true;
    } else {
      webhookError.isRetryable = false;
    }

    return webhookError;
  }

  /**
   * Store webhook failure in database
   */
  private async storeWebhookFailure(
    payload: WebhookPayload,
    error: WebhookError | null,
    retryCount: number
  ): Promise<void> {
    try {
      const client = await pool.connect();
      try {
        await client.query(`
          INSERT INTO rag_webhook_failures (
            tenant_id, webhook_type, payload, retry_count, max_retries,
            last_error, status, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, [
          payload.tenant_id || null,
          payload.action,
          JSON.stringify(payload),
          retryCount,
          this.config.retryAttempts,
          error?.message || 'Unknown error',
          error?.isRetryable ? 'failed' : 'dead_letter'
        ]);

        console.log(`[WebhookService] Webhook failure stored in database`, {
          tenant_id: payload.tenant_id,
          webhook_type: payload.action,
          retry_count: retryCount,
          error_message: error?.message
        });

      } finally {
        client.release();
      }
    } catch (storeError) {
      console.error(`[WebhookService] Failed to store webhook failure in database:`, {
        error: storeError instanceof Error ? storeError.message : String(storeError),
        original_error: error?.message,
        webhook_action: payload.action
      });
    }
  }

  /**
   * Simple delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Track action for monitoring (simplified logging for now)
   */
  async trackAction(params: {
    action: string;
    source: string;
    userEmail?: string;
    organizationId: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    console.log(`[WebhookService] Tracking action: ${params.action} from ${params.source}`, {
      user_email: params.userEmail,
      organization_id: params.organizationId,
      metadata: params.metadata
    });

    // Future: Could send to separate analytics endpoint or store in metrics database
  }
}