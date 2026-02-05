/**
 * Actions API client for workflow execution
 *
 * Calls the Actions API (actions-api-staging) to execute system workflows.
 * JWT auth passed from host via postMessage.
 */

const ACTIONS_API_URL =
  import.meta.env.VITE_ACTIONS_API_URL ||
  'https://actions-api-staging.resolve.io';

export interface ExecutionParameter {
  key: string;
  value: string;
}

export interface ExecuteWorkflowRequest {
  systemWorkflowGuid: string;
  executionParameters: ExecutionParameter[];
}

export interface ExecuteWorkflowParams {
  jwt: string;
  workflowGuid: string;
  chatInput: string;
  chatSessionId: string;
  tabInstanceId: string;
  context: 'Workflow' | 'ActivityDesigner';
}

export const actionsApi = {
  /**
   * Execute a system workflow via Actions API
   * @param jwt - Bearer token from host
   * @param request - Workflow GUID and execution parameters
   * @returns EventId for tracking
   */
  executeSystemWorkflow: async (
    jwt: string,
    request: ExecuteWorkflowRequest
  ): Promise<string> => {
    const response = await fetch(
      `${ACTIONS_API_URL}/api/Workflows/executeSystemWorkflow`,
      {
        method: 'POST',
        headers: {
          Authorization: jwt,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Workflow execution failed: ${response.status} - ${errorText}`);
    }

    return response.text(); // Returns EventId
  },

  /**
   * Build execution parameters from workflow params
   */
  buildExecutionParameters: (params: ExecuteWorkflowParams): ExecutionParameter[] => [
    { key: 'chatInput', value: params.chatInput },
    { key: 'chatSessionId', value: params.chatSessionId },
    { key: 'tabInstanceId', value: params.tabInstanceId },
    { key: 'context', value: params.context },
  ],
};
