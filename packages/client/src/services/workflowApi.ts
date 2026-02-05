/**
 * Workflow API client
 *
 * Calls backend API to trigger workflow generation.
 * Response comes back via SSE 'dynamic_workflow' event with action='workflow_created'.
 */

import keycloak from './keycloak';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export interface GenerateWorkflowPayload {
	query: string;
	index_name?: string;
}

export const workflowApi = {
	/**
	 * Trigger workflow generation via backend
	 * Response will arrive via SSE 'dynamic_workflow' event
	 */
	generateWorkflow: async (payload: GenerateWorkflowPayload): Promise<void> => {
		// Refresh token if needed
		if (keycloak.authenticated && keycloak.token) {
			try {
				await keycloak.updateToken(5);
			} catch (error) {
				console.error('Failed to refresh Keycloak token', error);
				keycloak.logout();
				throw new Error('Authentication expired');
			}
		}

		const response = await fetch(`${API_BASE_URL}/api/workflows/generate`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(errorData.error || `Workflow generation failed: ${response.status}`);
		}
	},
};
