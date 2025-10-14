// Database types
export interface PendingInvitation {
  id: string;
  organization_id: string;
  invited_by_user_id: string;
  email: string;
  invitation_token: string;
  token_expires_at: Date;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled' | 'failed';
  created_at: Date;
  accepted_at: Date | null;
}

// API request/response types
export interface SendInvitationsRequest {
  emails: string[];
}

export interface SendInvitationsResponse {
  success: boolean;
  invitations: Array<{
    email: string;
    status: 'sent' | 'already_member' | 'already_invited' | 'failed' | 'skipped';
    reason?: string;
    code?: string;
  }>;
  successCount: number;
  failureCount: number;
}

export interface VerifyInvitationResponse {
  valid: boolean;
  invitation: {
    email: string;
    organizationName: string;
    inviterName: string;
    expiresAt: string;
  } | null;
  error?: string;
}

export interface AcceptInvitationRequest {
  token: string;
  firstName: string;
  lastName: string;
  password: string;
}

// Webhook payload types
export interface SendInvitationWebhookPayload {
  tenant_id: string;
  source: 'rita-invitations';
  action: 'send_invitation';
  organization_name: string;
  invited_by_email: string;
  invited_by_name: string;
  invitations: Array<{
    invitee_email: string;
    invitation_token: string;
    invitation_url: string;
    invitation_id: string;
    expires_at: string;
  }>;
  timestamp: string;
}

export interface AcceptInvitationWebhookPayload {
  tenant_id: string;
  user_email: string;
  source: 'rita-invitations';
  action: 'accept_invitation';
  invitation_id: string;
  first_name: string;
  last_name: string;
  password: string; // Base64 encoded
  email_verified: true;
  timestamp: string;
}
