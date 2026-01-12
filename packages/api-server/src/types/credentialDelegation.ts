/**
 * Credential Delegation Types
 * Type definitions for delegated ITSM credential setup
 */

/**
 * Supported ITSM system types for credential delegation
 */
export type ItsmSystemType = 'servicenow' | 'jira' | 'confluence';

/**
 * Delegation token status
 * - pending: waiting for credentials or verification in progress (check credentials_received_at)
 * - verified: credentials verified successfully
 * - failed: verification failed (can retry)
 * - expired: token expired
 * - cancelled: owner cancelled
 */
export type DelegationStatus = 'pending' | 'verified' | 'failed' | 'expired' | 'cancelled';

/**
 * Credential delegation token entity
 */
export interface CredentialDelegationToken {
  id: string;
  organization_id: string;
  created_by_user_id: string;
  admin_email: string;
  itsm_system_type: ItsmSystemType;
  delegation_token: string;
  token_expires_at: Date;
  status: DelegationStatus;
  credentials_received_at: Date | null;
  credentials_verified_at: Date | null;
  last_verification_error: string | null;
  connection_id: string | null;
  created_at: Date;
}

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
  reason?: 'expired' | 'not_found';
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

export interface ConfluenceCredentials {
  instance_url: string;
  email: string;
  api_token: string;
}

export type ItsmCredentials = ServiceNowCredentials | JiraCredentials | ConfluenceCredentials;

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

/**
 * Webhook payload for sending delegation email
 */
export interface DelegationEmailWebhookPayload {
  source: 'rita-credential-delegation';
  action: 'send_delegation_email';
  tenant_id: string;
  user_id: string;
  user_email: string;
  admin_email: string;
  delegation_url: string;
  organization_name: string;
  itsm_system_type: ItsmSystemType;
  delegation_token_id: string;
  expires_at: string;
  timestamp: string;
}
