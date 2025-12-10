/**
 * WorkflowExecutionService - Handle iframe workflow execution
 *
 * Flow:
 * 1. Fetch base64-encoded payload from Valkey using hashkey
 * 2. Decode and parse to get endpoint + payload
 * 3. Call the specified endpoint (no JWT - hashkey replaces auth)
 * 4. Response flows through queue -> message storage -> SSE
 */

import axios from 'axios';
import { getValkeyClient } from '../config/valkey.js';
import { logger } from '../config/logger.js';

const ACTIONS_API_URL = process.env.ACTIONS_API_URL || 'https://actions-api-staging.resolve.io';

/**
 * Valkey payload structure (after base64 decode)
 * No JWT - hashkey mechanism replaces need for auth tokens
 */
export interface ValkeyPayload {
  endpoint: string;      // Full endpoint path, e.g., "/api/Webhooks/postEvent/{tenantId}"
  payload: Record<string, unknown>; // Actual data to send to the endpoint
}

export interface ExecuteWorkflowResult {
  success: boolean;
  eventId?: string;
  data?: unknown;
  error?: string;
}

export class WorkflowExecutionService {
  /**
   * Fetch and decode base64 payload from Valkey by hashkey
   */
  async getPayloadFromValkey(hashkey: string): Promise<ValkeyPayload | null> {
    try {
      const client = getValkeyClient();
      const data = await client.get(hashkey);

      if (!data) {
        logger.warn({ hashkey }, 'Valkey payload not found');
        return null;
      }

      // Decode base64
      let decoded: string;
      try {
        decoded = Buffer.from(data, 'base64').toString('utf-8');
      } catch {
        // If not base64, assume it's plain JSON (for backwards compatibility)
        decoded = data;
      }

      const payload = JSON.parse(decoded) as ValkeyPayload;

      // Validate required fields
      if (!payload.endpoint) {
        logger.error({ hashkey }, 'Invalid payload: missing endpoint');
        return null;
      }

      logger.info({ hashkey, endpoint: payload.endpoint }, 'Valkey payload retrieved and decoded');
      return payload;
    } catch (error) {
      logger.error({ error, hashkey }, 'Failed to fetch/decode Valkey payload');
      return null;
    }
  }

  /**
   * Execute workflow by calling the specified endpoint
   * No JWT auth - hashkey mechanism provides security
   */
  async executeWorkflow(valkeyPayload: ValkeyPayload): Promise<ExecuteWorkflowResult> {
    const { endpoint, payload } = valkeyPayload;

    // Build full URL - endpoint can be absolute or relative to ACTIONS_API_URL
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${ACTIONS_API_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    try {
      logger.info({ url, payloadKeys: Object.keys(payload || {}) }, 'Executing workflow');

      const response = await axios.post(
        url,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      logger.info({ url, status: response.status }, 'Workflow execution initiated');

      return {
        success: true,
        eventId: response.data?.eventId,
        data: response.data,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      const status = error.response?.status;

      logger.error({ url, error: errorMessage, status }, 'Workflow execution failed');

      return {
        success: false,
        error: `Workflow execution failed: ${status || 'network'} - ${errorMessage}`,
      };
    }
  }

  /**
   * Combined: fetch from Valkey and execute workflow
   */
  async executeFromHashkey(hashkey: string): Promise<ExecuteWorkflowResult> {
    const payload = await this.getPayloadFromValkey(hashkey);

    if (!payload) {
      return {
        success: false,
        error: 'Payload not found or invalid',
      };
    }

    return this.executeWorkflow(payload);
  }
}

// Singleton instance
let workflowExecutionService: WorkflowExecutionService | null = null;

export function getWorkflowExecutionService(): WorkflowExecutionService {
  if (!workflowExecutionService) {
    workflowExecutionService = new WorkflowExecutionService();
  }
  return workflowExecutionService;
}
