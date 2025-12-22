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
import { getValkeyClient, getValkeyStatus } from '../config/valkey.js';
import { logger } from '../config/logger.js';

// ACTIONS_API_URL must be set in environment
const ACTIONS_API_URL = process.env.ACTIONS_API_URL;
if (!ACTIONS_API_URL) {
  logger.warn('ACTIONS_API_URL not set - workflow execution will fail for relative endpoints');
}

// Valkey key prefix - keys stored as rita:session:{guid}
const VALKEY_KEY_PREFIX = 'rita:session:';

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
  debug?: {
    valkeyStatus: { configured: boolean; url: string; connected: boolean };
    hashkey?: string;
    fullKey?: string; // Actual Valkey key: rita:session:{guid}
    errorCode?: string;
    errorDetails?: string;
    durationMs?: number;
  };
}

export class WorkflowExecutionService {
  /**
   * Fetch and decode base64 payload from Valkey by hashkey
   */
  async getPayloadFromValkey(hashkey: string): Promise<{ payload: ValkeyPayload | null; debug: ExecuteWorkflowResult['debug'] }> {
    const startTime = Date.now();
    const valkeyStatus = getValkeyStatus();
    // Build full key with prefix: rita:session:{guid}
    const fullKey = `${VALKEY_KEY_PREFIX}${hashkey}`;
    const debug: ExecuteWorkflowResult['debug'] = {
      valkeyStatus,
      hashkey: hashkey.substring(0, 8) + '...',
      fullKey, // Show actual key being looked up
    };

    logger.info({ hashkey: debug.hashkey, fullKey, valkeyStatus }, 'Fetching payload from Valkey');

    try {
      const client = getValkeyClient();
      logger.debug({ fullKey, clientStatus: client.status }, 'Valkey client obtained');

      // Data is stored as hash type: HGET rita:session:{guid} data
      const data = await client.hget(fullKey, 'data');
      debug.durationMs = Date.now() - startTime;

      if (!data) {
        logger.warn({ hashkey: debug.hashkey, durationMs: debug.durationMs }, 'Valkey payload not found - key does not exist');
        debug.errorCode = 'KEY_NOT_FOUND';
        debug.errorDetails = 'The hashkey does not exist in Valkey or has expired';
        return { payload: null, debug };
      }

      logger.info({ hashkey: debug.hashkey, durationMs: debug.durationMs, dataLength: data.length }, 'Valkey data retrieved');

      // Decode base64
      let decoded: string;
      try {
        decoded = Buffer.from(data, 'base64').toString('utf-8');
        logger.debug({ hashkey: debug.hashkey, decodedLength: decoded.length }, 'Base64 decoded');
      } catch {
        // If not base64, assume it's plain JSON (for backwards compatibility)
        decoded = data;
        logger.debug({ hashkey: debug.hashkey }, 'Data is plain JSON (not base64)');
      }

      let payload: ValkeyPayload;
      try {
        payload = JSON.parse(decoded) as ValkeyPayload;
      } catch (parseError) {
        logger.error({ hashkey: debug.hashkey, error: (parseError as Error).message }, 'Failed to parse JSON payload');
        debug.errorCode = 'JSON_PARSE_ERROR';
        debug.errorDetails = `Failed to parse payload as JSON: ${(parseError as Error).message}`;
        return { payload: null, debug };
      }

      // Validate required fields
      if (!payload.endpoint) {
        logger.error({ hashkey: debug.hashkey, payloadKeys: Object.keys(payload) }, 'Invalid payload: missing endpoint');
        debug.errorCode = 'MISSING_ENDPOINT';
        debug.errorDetails = `Payload missing 'endpoint' field. Found keys: ${Object.keys(payload).join(', ')}`;
        return { payload: null, debug };
      }

      logger.info({ hashkey: debug.hashkey, endpoint: payload.endpoint, durationMs: debug.durationMs }, 'Valkey payload retrieved and validated');
      return { payload, debug };
    } catch (error) {
      debug.durationMs = Date.now() - startTime;
      const err = error as Error & { code?: string };
      debug.errorCode = err.code || err.name || 'UNKNOWN';
      debug.errorDetails = err.message;

      logger.error({
        hashkey: debug.hashkey,
        error: err.message,
        errorCode: debug.errorCode,
        durationMs: debug.durationMs,
        valkeyStatus,
        stack: err.stack?.split('\n').slice(0, 3).join(' | '),
      }, 'Failed to fetch/decode Valkey payload');

      return { payload: null, debug };
    }
  }

  /**
   * Execute workflow by calling the specified endpoint
   * No JWT auth - hashkey mechanism provides security
   */
  async executeWorkflow(valkeyPayload: ValkeyPayload, debug?: ExecuteWorkflowResult['debug']): Promise<ExecuteWorkflowResult> {
    const { endpoint, payload } = valkeyPayload;

    // Build full URL - endpoint can be absolute or relative to ACTIONS_API_URL
    let url: string;
    if (endpoint.startsWith('http')) {
      url = endpoint;
    } else if (ACTIONS_API_URL) {
      url = `${ACTIONS_API_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    } else {
      return {
        success: false,
        error: 'ACTIONS_API_URL not configured and endpoint is not absolute',
        debug,
      };
    }

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
        debug,
      };
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string }; status?: number }; message?: string };
      const errorMessage = axiosError.response?.data?.message || axiosError.message || 'Unknown error';
      const status = axiosError.response?.status;

      logger.error({ url, error: errorMessage, status }, 'Workflow execution failed');

      return {
        success: false,
        error: `Workflow execution failed: ${status || 'network'} - ${errorMessage}`,
        debug,
      };
    }
  }

  /**
   * Combined: fetch from Valkey and execute workflow
   */
  async executeFromHashkey(hashkey: string): Promise<ExecuteWorkflowResult> {
    const { payload, debug } = await this.getPayloadFromValkey(hashkey);

    if (!payload) {
      return {
        success: false,
        error: `Payload not found or invalid: ${debug?.errorCode || 'unknown'}`,
        debug,
      };
    }

    return this.executeWorkflow(payload, debug);
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
