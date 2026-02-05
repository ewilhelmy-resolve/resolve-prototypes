/**
 * Invitation System Type Definitions
 *
 * Based on backend API specification in /docs/user-invitation-system.md
 * Supports single-email verification flow with webhook-based async processing
 */

/**
 * Invitation Status
 * Tracks the lifecycle of an invitation from pending to accepted/expired
 */
export enum InvitationStatus {
	/** Invitation sent but not yet accepted */
	PENDING = "pending",
	/** Invitation successfully accepted and user created */
	ACCEPTED = "accepted",
	/** Invitation expired past expiration_date */
	EXPIRED = "expired",
	/** Invitation manually cancelled by admin */
	CANCELLED = "cancelled",
}

/**
 * User Role Types
 * Defines permission levels for invited users
 */
export enum UserRole {
	/** Full administrative access */
	ADMIN = "admin",
	/** Standard user access */
	USER = "user",
}

/**
 * Invitation API Error Codes
 * Standardized error codes from backend API
 */
export enum InvitationErrorCode {
	// Send Invitation Errors (POST /api/invitations/send)
	INVALID_EMAIL = "INVALID_EMAIL",
	DUPLICATE_PENDING = "DUPLICATE_PENDING",
	USER_ALREADY_EXISTS = "USER_ALREADY_EXISTS",
	BATCH_SIZE_EXCEEDED = "BATCH_SIZE_EXCEEDED",
	TENANT_LIMIT_EXCEEDED = "TENANT_LIMIT_EXCEEDED",

	// Verify Invitation Errors (GET /api/invitations/verify/:token)
	INVALID_TOKEN = "INVALID_TOKEN",
	INVITATION_EXPIRED = "INVITATION_EXPIRED",
	INVITATION_ALREADY_ACCEPTED = "INVITATION_ALREADY_ACCEPTED",
	INVITATION_CANCELLED = "INVITATION_CANCELLED",

	// Accept Invitation Errors (POST /api/invitations/accept/:token)
	PASSWORD_TOO_WEAK = "PASSWORD_TOO_WEAK",
	PASSWORD_REQUIRED = "PASSWORD_REQUIRED",
	FIRST_NAME_REQUIRED = "FIRST_NAME_REQUIRED",
	LAST_NAME_REQUIRED = "LAST_NAME_REQUIRED",

	// Generic Errors
	UNAUTHORIZED = "UNAUTHORIZED",
	FORBIDDEN = "FORBIDDEN",
	SERVER_ERROR = "SERVER_ERROR",
}

/**
 * Single Invitation Record
 * Represents an invitation in the database
 */
export interface Invitation {
	/** UUID for the invitation */
	id: string;
	/** UUID of the organization */
	organization_id: string;
	/** UUID of the inviter (admin user) */
	invited_by_user_id: string;
	/** Name of the inviter */
	invited_by_name?: string;
	/** Email address of the invitee */
	email: string;
	/** Unique invitation token (hashed) */
	invitation_token: string;
	/** ISO 8601 timestamp when invitation token expires */
	token_expires_at: string;
	/** Current status of the invitation */
	status: InvitationStatus;
	/** ISO 8601 timestamp when invitation was created */
	created_at: string;
	/** ISO 8601 timestamp when invitation was accepted (null if pending) */
	accepted_at: string | null;
	/** Assigned role for the invitee (may be in nested data) */
	role?: UserRole;
}

/**
 * Request Body for Sending Invitations
 * Supports batch invitations (1-50 emails)
 */
export interface SendInvitationsRequest {
	/** Array of email addresses to invite (1-50) */
	emails: string[];
	/** Role to assign to invited users */
	role: UserRole;
}

/**
 * Response for Send Invitations API
 * Returns array of created invitations with metadata
 */
export interface SendInvitationsResponse {
	/** Array of created invitation records */
	invitations: Invitation[];
	/** Total number of invitations successfully created */
	totalSent: number;
	/** Webhook job ID for tracking async processing */
	webhookJobId: string;
}

/**
 * Invitation details returned during verification
 * Subset of full Invitation record with user-friendly field names
 */
export interface InvitationDetails {
	/** Email address of the invitee */
	email: string;
	/** Organization name the user is being invited to */
	organizationName: string;
	/** Name of the person who sent the invitation */
	inviterName: string;
	/** ISO 8601 timestamp when invitation expires */
	expiresAt: string;
	/** Role assigned to the invitee (optional, may not be in all responses) */
	role?: UserRole;
}

/**
 * Verify Invitation Response
 * Returns invitation details for the accept page
 */
export interface VerifyInvitationResponse {
	/** Whether the token is valid and invitation is pending */
	valid: boolean;
	/** Invitation details if valid, null if invalid */
	invitation: InvitationDetails | null;
}

/**
 * Request Body for Accepting Invitation
 * User provides token, password, and profile details
 */
export interface AcceptInvitationRequest {
	/** Invitation token from URL */
	token: string;
	/** User's chosen password (min 8 chars, must meet complexity requirements) */
	password: string;
	/** User's first name */
	firstName: string;
	/** User's last name */
	lastName: string;
}

/**
 * Response for Accept Invitation API
 * Returns created user details and Keycloak ID
 */
export interface AcceptInvitationResponse {
	/** Confirmation message */
	message: string;
	/** Created user details */
	user: {
		/** UUID of the created user */
		id: string;
		/** User's email address */
		email: string;
		/** User's first name */
		firstName: string;
		/** User's last name */
		lastName: string;
		/** Assigned role */
		role: UserRole;
		/** Keycloak user ID */
		keycloakId: string;
	};
	/** Webhook job ID for tracking user creation */
	webhookJobId: string;
}

/**
 * List Invitations Query Parameters
 * Supports filtering and pagination
 */
export interface ListInvitationsParams {
	/** Filter by invitation status */
	status?: InvitationStatus;
	/** Filter by assigned role */
	role?: UserRole;
	/** Number of results per page (default: 20, max: 100) */
	limit?: number;
	/** Offset for pagination (default: 0) */
	offset?: number;
}

/**
 * Response for List Invitations API
 * Returns paginated invitation records
 */
export interface ListInvitationsResponse {
	/** Array of invitation records */
	invitations: Invitation[];
	/** Total count of invitations matching filters */
	total: number;
	/** Current page limit */
	limit: number;
	/** Current page offset */
	offset: number;
}

/**
 * Cancel Invitation Request
 * Admin can cancel pending invitations
 */
export interface CancelInvitationRequest {
	/** UUID of the invitation to cancel */
	invitationId: string;
}

/**
 * Cancel Invitation Response
 * Confirms cancellation
 */
export interface CancelInvitationResponse {
	/** Confirmation message */
	message: string;
	/** Updated invitation record */
	invitation: Invitation;
}

/**
 * API Error Response
 * Standardized error structure from backend
 */
export interface InvitationAPIError {
	/** Error code from InvitationErrorCode enum */
	error: InvitationErrorCode;
	/** Human-readable error message */
	message: string;
	/** Optional field-specific validation errors */
	details?: Record<string, string[]>;
}

/**
 * Form Data for Invite Accept Page
 * Client-side form structure with validation
 * Note: Email is NOT submitted - it comes from the invitation token on the backend
 */
export interface InviteAcceptFormData {
	password: string;
	firstName: string;
	lastName: string;
}

/**
 * Invitation Statistics
 * Summary metrics for invitation management page
 */
export interface InvitationStats {
	/** Total pending invitations */
	pending: number;
	/** Total accepted invitations */
	accepted: number;
	/** Total expired invitations */
	expired: number;
	/** Total cancelled invitations */
	cancelled: number;
	/** Total invitations sent this month */
	sentThisMonth: number;
}
