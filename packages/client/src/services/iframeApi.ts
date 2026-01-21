/**
 * Iframe API service
 *
 * Fetch-based API for iframe instantiation and workflow execution.
 * Uses Valkey-provided IDs from host app (Jarvis) - not Rita's user system.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export interface ValidateInstantiationRequest {
	sessionKey: string; // Key to Valkey payload (userId, tenantId, credentials)
	existingConversationId?: string; // Skip conversation creation if provided
}

export interface ValidateInstantiationResponse {
	valid: boolean;
	conversationId?: string;
	error?: string;
	webhookConfigLoaded?: boolean;
	/** Custom title text from Valkey (e.g., "Ask Workflow Designer") */
	titleText?: string;
	/** Custom welcome text from Valkey (e.g., "I can help you build workflow automations.") */
	welcomeText?: string;
	/** Custom placeholder text from Valkey (e.g., "Describe your workflow...") */
	placeholderText?: string;
	/** Session data for dev tools export (JAR-69) */
	chatSessionId?: string;
	tabInstanceId?: string;
	tenantName?: string;
	webhookTenantId?: string;
}

export interface ExecuteWorkflowResponse {
	success: boolean;
	eventId?: string;
	error?: string;
}

export const iframeApi = {
	/**
	 * Validate iframe instantiation and create session
	 * Creates session cookie using Valkey-provided IDs from host app
	 */
	validateInstantiation: async (
		request: ValidateInstantiationRequest,
	): Promise<ValidateInstantiationResponse> => {
		const response = await fetch(
			`${API_BASE_URL}/api/iframe/validate-instantiation`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include", // Important: allows cookie to be set
				body: JSON.stringify(request),
			},
		);

		return response.json();
	},

	/**
	 * Execute workflow from Valkey hashkey
	 * Backend fetches payload from Valkey and calls Actions API postEvent webhook
	 */
	executeWorkflow: async (
		hashkey: string,
	): Promise<ExecuteWorkflowResponse> => {
		const response = await fetch(`${API_BASE_URL}/api/iframe/execute`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({ hashkey }),
		});

		return response.json();
	},
};
