/**
 * WorkflowExecutionService - Handle iframe workflow execution
 *
 * Flow:
 * 1. Fetch payload from Valkey using hashkey
 * 2. Call Actions API postEvent webhook with JWT and params
 * 3. Response flows through queue -> message storage -> SSE
 */

import axios from 'axios';
import { getValkeyClient } from '../config/valkey.js';
import { logger } from '../config/logger.js';

const ACTIONS_API_URL = process.env.ACTIONS_API_URL || 'https://actions-api-staging.resolve.io';

export interface WorkflowPayload {
  jwt: string;
  tenantId: string;
  workflowGuid?: string;
  chatInput?: string;
  chatSessionId?: string;
  tabInstanceId?: string;
  context?: 'Workflow' | 'ActivityDesigner';
  // Allow additional fields from Valkey
  [key: string]: unknown;
}

export interface ExecuteWorkflowResult {
  success: boolean;
  eventId?: string;
  error?: string;
}

export class WorkflowExecutionService {
  /**
   * Fetch workflow payload from Valkey by hashkey
   */
  async getPayloadFromValkey(hashkey: string): Promise<WorkflowPayload | null> {
    try {
      const client = getValkeyClient();
      const data = await client.get(hashkey);

      if (!data) {
        logger.warn({ hashkey }, 'Valkey payload not found');
        return null;
      }

      const payload = JSON.parse(data) as WorkflowPayload;

      // Validate required fields
      if (!payload.jwt || !payload.tenantId) {
        logger.error({ hashkey }, 'Invalid payload: missing jwt or tenantId');
        return null;
      }

      logger.info({ hashkey, tenantId: payload.tenantId }, 'Valkey payload retrieved');
      return payload;
    } catch (error) {
      logger.error({ error, hashkey }, 'Failed to fetch Valkey payload');
      return null;
    }
  }

  /**
   * Execute workflow via Actions API postEvent webhook
   */
  async executeWorkflow(payload: WorkflowPayload): Promise<ExecuteWorkflowResult> {
    const { jwt, tenantId, ...params } = payload;

    try {
      logger.info({ tenantId, workflowGuid: params.workflowGuid }, 'Executing workflow via postEvent');

      const response = await axios.post(
        `${ACTIONS_API_URL}/api/Webhooks/postEvent/${tenantId}`,
        params,
        {
          headers: {
            Authorization: jwt.startsWith('Bearer ') ? jwt : `Bearer ${jwt}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      logger.info({ tenantId, status: response.status }, 'Workflow execution initiated');

      return {
        success: true,
        eventId: response.data?.eventId || response.data,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      const status = error.response?.status;

      logger.error({ tenantId, error: errorMessage, status }, 'Workflow execution failed');

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
