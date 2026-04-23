/**
 * WebhookService Types
 *
 * Rita has three chat applications that send webhooks to the platform.
 * Each uses a distinct source to identify where messages originate.
 *
 * CHAT SOURCES (ChatWebhookSource):
 * ┌─────────────────────┬─────────────────────┬─────────────────────────────────┐
 * │ Source              │ Route               │ Description                     │
 * ├─────────────────────┼─────────────────────┼─────────────────────────────────┤
 * │ rita-chat           │ /chat               │ Main Rita app (Keycloak auth)   │
 * │ rita-chat-iframe    │ /iframe/chat        │ Iframe embed (Valkey IDs)       │
 * │ rita-chat-workflows │ /jirita             │ Workflow builder (Keycloak)     │
 * └─────────────────────┴─────────────────────┴─────────────────────────────────┘
 *
 * OTHER SOURCES:
 * - rita-auth: Password reset events
 * - rita-signup: User signup events (user_signup, resend_verification)
 * - rita-documents: Document upload/delete events
 * - rita-credential-delegation: Delegated ITSM credential setup events
 *
 * Note: Invitation events (send_invitation, accept_invitation) use rita-chat source.
 *
 * Note: organization_id maps to tenant_id for webhook platform compatibility.
 */

/**
 * Chat webhook sources - three chat apps with common `rita-chat-*` prefix
 *
 * @example
 * // Main app chat
 * source: 'rita-chat'
 *
 * // Iframe embed (Jarvis integration)
 * source: 'rita-chat-iframe'
 *
 * // Workflow builder (/jirita)
 * source: 'rita-chat-workflows'
 */
export type ChatWebhookSource =
	| "rita-chat"
	| "rita-chat-iframe"
	| "rita-chat-workflows";

/** All webhook sources including non-chat features */
export type WebhookSource =
	| ChatWebhookSource
	| "rita-auth"
	| "rita-signup"
	| "rita-documents"
	| "rita-credential-delegation";

export interface BaseWebhookPayload {
	source: WebhookSource | string; // WebhookSource for typed payloads, string for generic
	action: string;
	user_email?: string;
	user_id?: string;
	tenant_id?: string; // Webhook platform expects tenant_id (maps to organization_id). Optional for public/unauthenticated flows like password reset.
	timestamp?: string;
}

export interface MessageWebhookPayload extends BaseWebhookPayload {
	source: ChatWebhookSource;
	action: "message_created";
	conversation_id: string;
	customer_message: string;
	message_id: string;
	document_ids?: string[];
	transcript_ids?: {
		transcripts: Array<{ role: string; content: string }>;
	};
}

export interface DocumentProcessingPayload extends BaseWebhookPayload {
	source: "rita-documents";
	action: "document_uploaded";
	blob_metadata_id: string; // blob_metadata.id
	blob_id: string; // blobs.blob_id
	document_url: string;
	file_type: string;
	file_size: number;
	original_filename: string;
}

export interface DocumentDeletePayload extends BaseWebhookPayload {
	source: "rita-documents";
	action: "document_deleted";
	blob_metadata_id: string; // blob_metadata.id
	blob_id: string; // blobs.blob_id
	article_id: string; // Temporary field for Barista compatibility (maps to blob_id)
}

/**
 * Password Reset Request Webhook Payload
 * Triggered when user requests password reset
 */
export interface PasswordResetRequestPayload extends BaseWebhookPayload {
	source: "rita-auth";
	action: "password_reset_request";
	reset_url: string;
	expires_at: string; // ISO timestamp
}

/**
 * Password Reset Complete Webhook Payload
 * Triggered when user submits new password
 */
export interface PasswordResetCompletePayload extends BaseWebhookPayload {
	source: "rita-auth";
	action: "password_reset_complete";
	password: string; // Base64 encoded
}

export interface WebhookResponse {
	success: boolean;
	data?: any;
	status: number;
	error?: string;
}

export interface WebhookConfig {
	url: string;
	authHeader: string;
	timeout: number;
	retryAttempts: number;
	retryDelay: number;
}

export interface WebhookError extends Error {
	status?: number;
	response?: any;
	isRetryable: boolean;
}

/**
 * Create Knowledge Webhook Payload
 * Triggered when user requests AI-generated knowledge article for a cluster
 */
export interface CreateKnowledgeWebhookPayload extends BaseWebhookPayload {
	source: "rita-chat";
	action: "create_knowledge";
	cluster_id: string;
	cluster_name: string;
	generation_id: string; // Correlation ID — echoed back in RabbitMQ response
	sources: string[]; // Knowledge sources selected by user (e.g. "historical-tickets", "web-search")
}

/**
 * Create Agent Webhook Payload
 * Triggered when the user runs AgentRitaDeveloper from the agent builder
 * (workflow mode) — either to create a new agent or to update an existing
 * one. The `target_agent_eid` field discriminates the two modes:
 *   - absent  → create a new agent
 *   - present → update the referenced agent (merge-patch semantics owned by
 *               the meta-agent).
 *
 * @see docs/features/agents/agent-developer-workflow-integration.md section 1
 */
export interface CreateAgentWebhookPayload extends BaseWebhookPayload {
	source: "rita-chat";
	action: "create_agent";
	creation_id: string;
	prompt: string;
	icon_id: string;
	icon_color_id: string;
	admin_type?: string;
	conversation_starters?: string[];
	guardrails?: string[];
	target_agent_eid?: string;
}

/**
 * Agent Creation Input Webhook Payload
 * Triggered when user responds to an input request from AgentRitaDeveloper
 */
export interface AgentCreationInputWebhookPayload extends BaseWebhookPayload {
	source: "rita-chat";
	action: "agent_creation_input";
	creation_id: string;
	prev_execution_id: string;
	prompt: string;
}

/**
 * Cancel Agent Creation Webhook Payload
 * Triggered when user explicitly cancels agent creation
 */
export interface CancelAgentCreationWebhookPayload extends BaseWebhookPayload {
	source: "rita-chat";
	action: "cancel_agent_creation";
	creation_id: string;
}

// Union type for all webhook payloads
export type WebhookPayload =
	| MessageWebhookPayload
	| DocumentProcessingPayload
	| DocumentDeletePayload
	| PasswordResetRequestPayload
	| PasswordResetCompletePayload
	| CreateKnowledgeWebhookPayload
	| CreateAgentWebhookPayload
	| AgentCreationInputWebhookPayload
	| CancelAgentCreationWebhookPayload
	| (BaseWebhookPayload & Record<string, any>);
