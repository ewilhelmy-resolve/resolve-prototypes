import axios, { type AxiosResponse } from 'axios';
import type {
  VerifyWebhookPayload,
  SyncTriggerWebhookPayload
} from '../types/dataSource.js';
import type { WebhookConfig, WebhookResponse } from '../types/webhook.js';

export class DataSourceWebhookService {
  private config: WebhookConfig;

  constructor(config?: Partial<WebhookConfig>) {
    this.config = {
      url: config?.url || process.env.DATA_SOURCE_WEBHOOK_URL ||
        'http://localhost:3001/webhook',
      authHeader: config?.authHeader || process.env.AUTOMATION_AUTH ||
        'Basic RTE0NzMwRkEtRDFCNS00MDM3LUFDRTMtQ0Y5N0ZCQzY3NkMyOlZaSkQqSSYyWEAkXkQ5Sjk4Rk5PJShGUVpaQ0dRNkEj',
      timeout: config?.timeout || 10000,
      retryAttempts: config?.retryAttempts || 3,
      retryDelay: config?.retryDelay || 1000
    };
  }

  /**
   * Send verify credentials webhook event
   */
  async sendVerifyEvent(params: {
    organizationId: string;
    userId: string;
    userEmail: string;
    connectionId: string;
    connectionType: string;
    credentials: Record<string, any>;
    settings: Record<string, any>;
  }): Promise<WebhookResponse> {
    const payload: VerifyWebhookPayload = {
      source: 'rita-chat',
      action: 'verify_credentials',
      tenant_id: params.organizationId,
      user_id: params.userId,
      user_email: params.userEmail,
      connection_id: params.connectionId,
      connection_type: params.connectionType as any,
      credentials: params.credentials,
      settings: params.settings,
      timestamp: new Date().toISOString()
    };

    return this.sendEvent(payload);
  }

  /**
   * Send sync trigger webhook event
   */
  async sendSyncTriggerEvent(params: {
    organizationId: string;
    userId: string;
    userEmail: string;
    connectionId: string;
    connectionType: string;
    settings: Record<string, any>;
  }): Promise<WebhookResponse> {
    const payload: SyncTriggerWebhookPayload = {
      source: 'rita-chat',
      action: 'trigger_sync',
      tenant_id: params.organizationId,
      user_id: params.userId,
      user_email: params.userEmail,
      connection_id: params.connectionId,
      connection_type: params.connectionType as any,
      settings: params.settings,
      timestamp: new Date().toISOString()
    };

    return this.sendEvent(payload);
  }

  /**
   * Core event sending method with retry logic
   */
  private async sendEvent(payload: VerifyWebhookPayload | SyncTriggerWebhookPayload): Promise<WebhookResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        console.log(`[DataSourceWebhook] Sending event (attempt ${attempt}/${this.config.retryAttempts}):`, {
          source: payload.source,
          action: payload.action,
          tenant_id: payload.tenant_id,
          connection_id: payload.connection_id
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

        console.log(`[DataSourceWebhook] Success: ${response.status}`);

        return {
          success: true,
          data: response.data,
          status: response.status
        };

      } catch (error: any) {
        lastError = error;

        console.error(`[DataSourceWebhook] Attempt ${attempt} failed:`, {
          status: error.response?.status,
          message: error.message
        });

        // Determine if error is retryable
        const isRetryable = error.response?.status >= 500 ||
                           error.response?.status === 429 ||
                           error.response?.status === 408 ||
                           error.code === 'ECONNABORTED' ||
                           error.code === 'ENOTFOUND';

        // Don't retry if it's not a retryable error or if this is the last attempt
        if (!isRetryable || attempt === this.config.retryAttempts) {
          break;
        }

        // Wait before retrying
        await this.delay(this.config.retryDelay * attempt);
      }
    }

    console.error(`[DataSourceWebhook] All attempts failed for ${payload.action}`);

    return {
      success: false,
      status: (lastError as any)?.response?.status || 0,
      error: lastError?.message || 'Unknown error'
    };
  }

  /**
   * Simple delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}