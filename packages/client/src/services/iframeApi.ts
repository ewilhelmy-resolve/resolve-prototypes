/**
 * Iframe API service
 *
 * Simple fetch-based API for iframe instantiation and workflow execution.
 * Does NOT use Keycloak - bypasses normal auth flow for public access.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export interface ValidateInstantiationRequest {
  token: string;
  hashkey?: string; // Key to Valkey payload (replaces intentEid)
  existingConversationId?: string; // Skip conversation creation if provided
}

export interface ValidateInstantiationResponse {
  valid: boolean;
  publicUserId?: string;
  conversationId?: string;
  error?: string;
}

export interface ExecuteWorkflowResponse {
  success: boolean;
  eventId?: string;
  error?: string;
}

export const iframeApi = {
  /**
   * Validate iframe instantiation and get a public session
   * Creates session cookie + conversation for public-guest-user
   */
  validateInstantiation: async (
    request: ValidateInstantiationRequest
  ): Promise<ValidateInstantiationResponse> => {
    const response = await fetch(
      `${API_BASE_URL}/api/iframe/validate-instantiation`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important: allows cookie to be set
        body: JSON.stringify(request),
      }
    );

    return response.json();
  },

  /**
   * Execute workflow from Valkey hashkey
   * Backend fetches payload from Valkey and calls Actions API postEvent webhook
   */
  executeWorkflow: async (hashkey: string): Promise<ExecuteWorkflowResponse> => {
    const response = await fetch(
      `${API_BASE_URL}/api/iframe/execute`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ hashkey }),
      }
    );

    return response.json();
  },
};
