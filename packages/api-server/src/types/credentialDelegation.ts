/**
 * Credential Delegation Types
 * Type definitions for delegated ITSM credential setup
 */

/**
 * Supported ITSM system types for credential delegation
 * Note: 'servicenow_itsm' (not 'servicenow') - KB uses separate connection
 */
export type ItsmSystemType = "servicenow_itsm" | "jira_itsm";

/**
 * Delegation token status
 * - pending: waiting for credentials or verification in progress (check credentials_received_at)
 * - verified: credentials verified successfully
 * - failed: verification failed (can retry)
 * - expired: token expired
 * - cancelled: owner cancelled
 */
export type DelegationStatus =
	| "pending"
	| "verified"
	| "failed"
	| "expired"
	| "cancelled";

/**
 * Create delegation request body
 */
export interface CreateDelegationRequest {
	admin_email: string;
	itsm_system_type: ItsmSystemType;
}

/**
 * Create delegation response
 */
export interface CreateDelegationResponse {
	delegation_id: string;
	delegation_url: string;
	expires_at: string;
	status: DelegationStatus;
}

/**
 * Verify token response
 */
export interface VerifyDelegationResponse {
	valid: boolean;
	org_name?: string;
	system_type?: ItsmSystemType;
	delegated_by?: string;
	expires_at?: string;
	reason?: "expired" | "not_found" | "invalid";
}

/**
 * List delegations query params
 */
export interface ListDelegationsQuery {
	status?: DelegationStatus;
	system_type?: ItsmSystemType;
	limit?: number;
	offset?: number;
}

/**
 * Delegation list item (for GET /credential-delegations)
 */
export interface DelegationListItem {
	id: string;
	admin_email: string;
	system_type: ItsmSystemType;
	status: DelegationStatus;
	created_at: string;
	expires_at: string;
	verified_at: string | null;
}

/**
 * ITSM credentials by system type
 */
export interface ServiceNowCredentials {
	instance_url: string;
	username: string;
	password: string;
}

export interface JiraCredentials {
	instance_url: string;
	email: string;
	api_token: string;
}

export type ItsmCredentials = ServiceNowCredentials | JiraCredentials;

/**
 * Submit credentials request body (public endpoint)
 */
export interface SubmitCredentialsRequest {
	token: string;
	credentials: ItsmCredentials;
}

/**
 * Submit credentials response
 */
export interface SubmitCredentialsResponse {
	success: boolean;
	message: string;
	delegation_id: string;
	status: DelegationStatus;
}

/**
 * Delegation status response (for polling)
 */
export interface DelegationStatusResponse {
	delegation_id: string;
	status: DelegationStatus;
	itsm_system_type: ItsmSystemType;
	organization_name: string;
	submitted_at: string | null;
	verified_at: string | null;
	error: string | null;
}
