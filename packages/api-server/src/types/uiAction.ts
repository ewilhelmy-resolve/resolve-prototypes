/**
 * UI Action Types - Type-safe action handler system
 *
 * Actions originate from SchemaRenderer components (Button, Form) via on.press.action
 * and are sent to Platform via webhook following the formSubmit pattern.
 */

// ============================================================================
// Action Category Enums
// ============================================================================

/**
 * Category 1: Submit/Save actions - form data submission
 * Webhook: YES | Data Required: YES (form data)
 */
export enum SubmitActionType {
	SUBMIT = "submit",
	SAVE = "save",
	CREATE = "create",
	UPDATE = "update",
	APPLY = "apply",
	SAVE_PROFILE = "save_profile",
	CREATE_ACCOUNT = "create_account",
	SAVE_CONFIG = "save_config",
	SAVE_CREDENTIALS = "save_credentials",
	SAVE_AUTH = "save_auth",
	UI_FORM_RESPONSE = "ui_form_response",
	UI_FORM_RESPONSE_APPROVED = "ui_form_response_approved",
	UI_FORM_RESPONSE_REJECTED = "ui_form_response_rejected",
}

/**
 * Category 2: Workflow Management actions - workflow control operations
 * Webhook: YES | Data Required: OPTIONAL (entity ID, workflow ID)
 */
export enum WorkflowActionType {
	ENABLE_WORKFLOW = "enable_workflow",
	DISABLE_WORKFLOW = "disable_workflow",
	PAUSE_WORKFLOW = "pause_workflow",
	RESUME_WORKFLOW = "resume_workflow",
}

/**
 * Category 3: Approval/Review actions - workflow approval and status updates
 * Webhook: YES | Data Required: OPTIONAL (comments, reason)
 */
export enum ApprovalActionType {
	APPROVE = "approve",
	REJECT = "reject",
	REVIEW = "review",
	ACKNOWLEDGE = "acknowledge",
	REQUEST_CHANGES = "request_changes",
}

/**
 * Category 4: Delete actions - destructive entity operations
 * Webhook: YES | Data Required: YES (entity ID)
 */
export enum DeleteActionType {
	DELETE = "delete",
	REMOVE = "remove",
	DELETE_ACCOUNT = "delete_account",
	DELETE_WORKFLOW = "delete_workflow",
}

/**
 * All action types union
 * Note: Navigation and Cancel/Dismiss actions are client-side only
 * and handled directly in the frontend without server involvement
 */
export type UIActionType =
	| SubmitActionType
	| WorkflowActionType
	| ApprovalActionType
	| DeleteActionType
	| string; // Allow custom actions

// ============================================================================
// Action Payloads
// ============================================================================

/**
 * Base action payload received from frontend
 * Sent from SchemaRenderer via onAction callback
 */
export interface BaseUIActionPayload {
	action: string;
	data?: Record<string, unknown>;
	messageId: string;
	conversationId: string;
	timestamp: string;
}

/**
 * Webhook payload sent to Platform Actions API
 * Follows same pattern as sendUIFormResponse
 */
export interface UIActionWebhookPayload {
	source: "rita-chat-iframe";
	action: string; // The original action type

	// Routing
	tenant_id: string;
	user_id: string;

	// Correlation (from message metadata - optional)
	request_id?: string;
	workflow_id?: string;
	activity_id?: string;

	// Action data
	action_data: Record<string, unknown>;

	// Metadata
	message_id: string;
	conversation_id: string;
	timestamp: string;
}

// ============================================================================
// Message Metadata
// ============================================================================

/**
 * Message metadata for action tracking
 * Stored in messages.metadata for correlation
 */
export interface UIActionMessageMetadata {
	type: "ui_action";
	action: string;
	request_id?: string;
	workflow_id?: string;
	activity_id?: string;
	status: "pending" | "completed" | "failed";
	action_data?: Record<string, unknown>;
	processed_at?: string;
	error?: string;
}

// ============================================================================
// Handler Context & Results
// ============================================================================

/**
 * Webhook configuration (imported type reference)
 * Fields are optional because webhook may not be configured for all sessions
 */
export interface WebhookConfig {
	actionsApiBaseUrl?: string;
	clientId?: string;
	clientKey?: string;
	tenantId: string;
	userGuid: string;
}

/**
 * Context passed to action handlers
 */
export interface ActionHandlerContext {
	payload: BaseUIActionPayload;
	message: {
		id: string;
		conversation_id: string;
		organization_id: string;
		user_id: string;
		metadata: Record<string, unknown>;
	};
	webhookConfig: WebhookConfig | null;
}

/**
 * Handler result
 */
export interface ActionHandlerResult {
	success: boolean;
	webhookSent: boolean;
	error?: string;
}

/**
 * Base action handler interface
 * All handlers follow the 5-step webhook pattern
 */
export interface UIActionHandler {
	/**
	 * Check if this handler can process the action
	 */
	canHandle(action: string): boolean;

	/**
	 * Handle the action following 5-step pattern:
	 * 1. Lookup message by messageId
	 * 2. Update message metadata (store action_data, status=completed)
	 * 3. Retrieve webhook config from session
	 * 4. Build webhook payload with correlation IDs
	 * 5. Send Basic-auth POST to Actions API
	 */
	handle(context: ActionHandlerContext): Promise<ActionHandlerResult>;
}
