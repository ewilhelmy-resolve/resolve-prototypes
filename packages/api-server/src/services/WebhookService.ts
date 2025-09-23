import axios, { AxiosResponse } from 'axios';
import {
  WebhookPayload,
  WebhookResponse,
  WebhookConfig,
  WebhookError,
  MessageWebhookPayload,
  DocumentProcessingPayload,
  BaseWebhookPayload
} from '../types/webhook.js';

export class WebhookService {
  private config: WebhookConfig;

  constructor(config?: Partial<WebhookConfig>) {
    this.config = {
      url: config?.url || process.env.AUTOMATION_WEBHOOK_URL ||
        'http://localhost:3001/webhook',
      authHeader: config?.authHeader || process.env.AUTOMATION_AUTH ||
        'Basic RTE0NzMwRkEtRDFCNS00MDM3LUFDRTMtQ0Y5N0ZCQzY3NkMyOlZaSkQqSSYyWEAkXkQ5Sjk4Rk5PJShGUVpaQ0dRNkEj',
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
    documentId: string;
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
      document_id: params.documentId,
      document_url: params.documentUrl,
      file_type: params.fileType,
      file_size: params.fileSize,
      original_filename: params.originalFilename,
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