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
	/** Full Valkey payload for dev tools (sensitive fields redacted: accessToken, refreshToken, clientKey) */
	valkeyPayload?: Record<string, unknown>;
}

export interface ExecuteWorkflowResponse {
	success: boolean;
	eventId?: string;
	error?: string;
}

export interface UIActionRequest {
	action: string;
	data?: Record<string, unknown>;
	messageId: string;
	conversationId: string;
	timestamp: string;
}

export interface UIActionResponse {
	success: boolean;
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

	/**
	 * Delete iframe conversation
	 * Used by "Clear Chat" feature to delete conversation and start fresh
	 */
	deleteConversation: async (
		conversationId: string,
	): Promise<{ success: boolean; error?: string }> => {
		const response = await fetch(
			`${API_BASE_URL}/api/iframe/conversation/${conversationId}`,
			{
				method: "DELETE",
				credentials: "include",
			},
		);

		return response.json();
	},

	/**
	 * Send UI action back to platform
	 * Used by SchemaRenderer when user interacts with dynamic UI components
	 */
	sendUIAction: async (request: UIActionRequest): Promise<UIActionResponse> => {
		const response = await fetch(`${API_BASE_URL}/api/iframe/ui-action`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify(request),
		});

		return response.json();
	},
};
