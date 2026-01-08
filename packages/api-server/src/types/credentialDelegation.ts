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
 */
export type DelegationStatus = 'pending' | 'used' | 'verified' | 'expired' | 'cancelled';

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
  reason?: 'expired' | 'used' | 'not_found';
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
