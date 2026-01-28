import crypto from "crypto";
import type { Pool } from "pg";
import { logger } from "../config/logger.js";
import type {
	CreateDelegationResponse,
	DelegationListItem,
	DelegationStatus,
	DelegationStatusResponse,
	ItsmCredentials,
	ItsmSystemType,
	ListDelegationsQuery,
	SubmitCredentialsResponse,
	VerifyDelegationResponse,
} from "../types/credentialDelegation.js";
import type { DataSourceWebhookService } from "./DataSourceWebhookService.js";
import type { WebhookService } from "./WebhookService.js";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const TOKEN_EXPIRY_DAYS = 1;
const RATE_LIMIT_PER_ORG_PER_DAY = 10;

/**
 * Hash token using SHA-256 for secure storage
 * Tokens are high-entropy random values, so SHA-256 is sufficient (no need for bcrypt)
 */
function hashToken(token: string): string {
	return crypto.createHash("sha256").update(token).digest("hex");
}

export class CredentialDelegationService {
	constructor(
		private pool: Pool,
		private webhookService: WebhookService,
		private dataSourceWebhookService: DataSourceWebhookService,
	) {}

	/**
	 * Create a new credential delegation token and send email to IT admin
	 */
	async createDelegation(
		organizationId: string,
		createdByUserId: string,
		adminEmail: string,
		itsmSystemType: ItsmSystemType,
	): Promise<CreateDelegationResponse> {
		const normalizedEmail = adminEmail.trim().toLowerCase();

		// Validate email format
		if (!this.validateEmail(normalizedEmail)) {
			throw new Error("Invalid email format");
		}

		// Validate ITSM system type
		if (!["servicenow_itsm", "jira_itsm"].includes(itsmSystemType)) {
			throw new Error("Invalid ITSM system type");
		}

		// Check rate limit (10 delegations per org per day)
		const rateLimitCheck = await this.pool.query(
			`SELECT COUNT(*) as count FROM credential_delegation_tokens
       WHERE organization_id = $1
       AND created_at > NOW() - INTERVAL '24 hours'`,
			[organizationId],
		);

		if (
			Number.parseInt(rateLimitCheck.rows[0].count, 10) >=
			RATE_LIMIT_PER_ORG_PER_DAY
		) {
			throw new Error(
				"Rate limit exceeded. Maximum 10 delegations per organization per day.",
			);
		}

		// Check for existing pending delegation (same email + org + system type)
		const existingCheck = await this.pool.query(
			`SELECT id FROM credential_delegation_tokens
       WHERE admin_email = $1
       AND organization_id = $2
       AND itsm_system_type = $3
       AND status = 'pending'`,
			[normalizedEmail, organizationId, itsmSystemType],
		);

		if (existingCheck.rows.length > 0) {
			throw new Error(
				"A pending delegation already exists for this email and system type",
			);
		}

		// Get organization and user details for webhook
		const orgResult = await this.pool.query(
			`SELECT o.name as org_name, up.email as creator_email
       FROM organizations o
       JOIN user_profiles up ON up.user_id = $1
       WHERE o.id = $2`,
			[createdByUserId, organizationId],
		);

		if (orgResult.rows.length === 0) {
			throw new Error("Organization not found");
		}

		const { org_name, creator_email } = orgResult.rows[0];

		// Generate secure token (64-char hex = 32 bytes = 256 bits)
		const token = crypto.randomBytes(32).toString("hex");
		const tokenHash = hashToken(token);
		const expiresAt = new Date(
			Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
		);

		// Insert delegation token (store hash, not plaintext)
		const insertResult = await this.pool.query(
			`INSERT INTO credential_delegation_tokens (
         organization_id,
         created_by_user_id,
         admin_email,
         itsm_system_type,
         delegation_token,
         token_expires_at,
         status
       ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING id`,
			[
				organizationId,
				createdByUserId,
				normalizedEmail,
				itsmSystemType,
				tokenHash,
				expiresAt,
			],
		);

		const delegationId = insertResult.rows[0].id;
		const delegationUrl = `${CLIENT_URL}/credential-setup?token=${token}`;

		// Create audit log
		await this.pool.query(
			`INSERT INTO audit_logs (
         organization_id, user_id, action, resource_type, resource_id, metadata
       ) VALUES ($1, $2, $3, $4, $5, $6)`,
			[
				organizationId,
				createdByUserId,
				"create_credential_delegation",
				"credential_delegation",
				delegationId,
				JSON.stringify({
					admin_email: normalizedEmail,
					itsm_system_type: itsmSystemType,
				}),
			],
		);

		// Send webhook to trigger email
		const webhookResult = await this.webhookService.sendGenericEvent({
			organizationId,
			userId: createdByUserId,
			userEmail: creator_email,
			source: "rita-credential-delegation",
			action: "send_delegation_email",
			additionalData: {
				admin_email: normalizedEmail,
				delegation_url: delegationUrl,
				organization_name: org_name,
				itsm_system_type: itsmSystemType,
				delegation_token_id: delegationId,
				expires_at: expiresAt.toISOString(),
			},
		});

		if (!webhookResult.success) {
			logger.error(
				{
					delegationId,
					organizationId,
					adminEmail: normalizedEmail,
					webhookError: webhookResult.error,
				},
				"Delegation webhook failed - email may not be sent",
			);
			// Don't fail the request - delegation is created, webhook failure is logged
		}

		logger.info(
			{
				delegationId,
				organizationId,
				createdByUserId,
				adminEmail: normalizedEmail,
				itsmSystemType,
			},
			"Credential delegation created",
		);

		return {
			delegation_id: delegationId,
			delegation_url: delegationUrl,
			expires_at: expiresAt.toISOString(),
			status: "pending",
		};
	}

	/**
	 * Verify a delegation token (public endpoint)
	 */
	async verifyToken(token: string): Promise<VerifyDelegationResponse> {
		if (!token || token.length !== 64) {
			return { valid: false, reason: "not_found" };
		}

		const tokenHash = hashToken(token);
		const result = await this.pool.query(
			`SELECT cdt.id, cdt.status, cdt.token_expires_at, cdt.itsm_system_type,
              o.name as org_name, up.email as delegated_by
       FROM credential_delegation_tokens cdt
       JOIN organizations o ON cdt.organization_id = o.id
       JOIN user_profiles up ON cdt.created_by_user_id = up.user_id
       WHERE cdt.delegation_token = $1`,
			[tokenHash],
		);

		if (result.rows.length === 0) {
			return { valid: false, reason: "not_found" };
		}

		const delegation = result.rows[0];

		// Check if expired
		if (new Date(delegation.token_expires_at) < new Date()) {
			// Update status to expired
			await this.pool.query(
				`UPDATE credential_delegation_tokens SET status = 'expired' WHERE id = $1`,
				[delegation.id],
			);
			return { valid: false, reason: "expired" };
		}

		// Check if already verified - return not_found (shows "Invalid Link")
		if (["verified", "cancelled"].includes(delegation.status)) {
			return { valid: false, reason: "invalid" };
		}

		return {
			valid: true,
			org_name: delegation.org_name,
			system_type: delegation.itsm_system_type,
			delegated_by: delegation.delegated_by,
			expires_at: delegation.token_expires_at.toISOString(),
		};
	}

	/**
	 * List delegations for an organization
	 */
	async listDelegations(
		organizationId: string,
		query?: ListDelegationsQuery,
	): Promise<DelegationListItem[]> {
		const limit = query?.limit || 50;
		const offset = query?.offset || 0;

		let sql = `
      SELECT id, admin_email, itsm_system_type as system_type, status,
             created_at, token_expires_at as expires_at, credentials_verified_at as verified_at
      FROM credential_delegation_tokens
      WHERE organization_id = $1
    `;
		const params: (string | number)[] = [organizationId];

		if (query?.status) {
			params.push(query.status);
			sql += ` AND status = $${params.length}`;
		}

		if (query?.system_type) {
			params.push(query.system_type);
			sql += ` AND itsm_system_type = $${params.length}`;
		}

		sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
		params.push(limit, offset);

		const result = await this.pool.query(sql, params);

		return result.rows.map((row) => ({
			id: row.id,
			admin_email: row.admin_email,
			system_type: row.system_type,
			status: row.status as DelegationStatus,
			created_at: row.created_at.toISOString(),
			expires_at: row.expires_at.toISOString(),
			verified_at: row.verified_at?.toISOString() || null,
		}));
	}

	/**
	 * Cancel a pending delegation
	 */
	async cancelDelegation(
		delegationId: string,
		organizationId: string,
		userId: string,
	): Promise<{ success: boolean }> {
		const result = await this.pool.query(
			`UPDATE credential_delegation_tokens
       SET status = 'cancelled'
       WHERE id = $1 AND organization_id = $2 AND status = 'pending'
       RETURNING id`,
			[delegationId, organizationId],
		);

		if (result.rows.length === 0) {
			throw new Error("Delegation not found or cannot be cancelled");
		}

		// Audit log
		await this.pool.query(
			`INSERT INTO audit_logs (
         organization_id, user_id, action, resource_type, resource_id
       ) VALUES ($1, $2, $3, $4, $5)`,
			[
				organizationId,
				userId,
				"cancel_credential_delegation",
				"credential_delegation",
				delegationId,
			],
		);

		logger.info(
			{ delegationId, organizationId, userId },
			"Credential delegation cancelled",
		);

		return { success: true };
	}

	/**
	 * Submit credentials for a delegation token (public endpoint)
	 * Called by IT admin via magic link
	 */
	async submitCredentials(
		token: string,
		credentials: ItsmCredentials,
	): Promise<SubmitCredentialsResponse> {
		// Validate token format
		if (!token || token.length !== 64) {
			throw new Error("Invalid token");
		}

		// Get delegation details (lookup by hash)
		const tokenHash = hashToken(token);
		const result = await this.pool.query(
			`SELECT cdt.id, cdt.organization_id, cdt.admin_email, cdt.itsm_system_type,
              cdt.status, cdt.token_expires_at, cdt.created_by_user_id,
              o.name as org_name, up.email as creator_email
       FROM credential_delegation_tokens cdt
       JOIN organizations o ON cdt.organization_id = o.id
       JOIN user_profiles up ON cdt.created_by_user_id = up.user_id
       WHERE cdt.delegation_token = $1`,
			[tokenHash],
		);

		if (result.rows.length === 0) {
			throw new Error("Invalid or expired token");
		}

		const delegation = result.rows[0];

		// Check if expired
		if (new Date(delegation.token_expires_at) < new Date()) {
			await this.pool.query(
				`UPDATE credential_delegation_tokens SET status = 'expired' WHERE id = $1`,
				[delegation.id],
			);
			throw new Error("Token has expired");
		}

		// Check if can submit (pending or failed allows retry)
		if (delegation.status !== "pending" && delegation.status !== "failed") {
			throw new Error(
				"Token cannot be used (already verified, expired, or cancelled)",
			);
		}

		// Validate credentials have required fields based on system type
		this.validateCredentials(delegation.itsm_system_type, credentials);

		// Get existing connection_id to build success URL for owner email
		const connectionResult = await this.pool.query(
			`SELECT id FROM data_source_connections
       WHERE organization_id = $1 AND type = $2`,
			[delegation.organization_id, delegation.itsm_system_type],
		);
		const connectionId = connectionResult.rows[0]?.id;
		const delegatedSuccessUrl = connectionId
			? `${CLIENT_URL}/settings/connections/itsm/${connectionId}`
			: `${CLIENT_URL}/settings/connections`;

		// Extract non-sensitive settings to store (URL, username/email - NOT passwords/tokens)
		const creds = credentials as unknown as Record<string, unknown>;
		const submittedSettings =
			delegation.itsm_system_type === "servicenow_itsm"
				? {
						instanceUrl: creds.instance_url,
						username: creds.username,
					}
				: {
						url: creds.instance_url,
						email: creds.email,
					};

		// Update timestamp, store settings, and reset to pending (clear previous error if retrying)
		await this.pool.query(
			`UPDATE credential_delegation_tokens
       SET status = 'pending',
           credentials_received_at = NOW(),
           last_verification_error = NULL,
           submitted_settings = $2
       WHERE id = $1`,
			[delegation.id, JSON.stringify(submittedSettings)],
		);

		// Send webhook to external service for credential verification
		const webhookResult = await this.dataSourceWebhookService.sendVerifyEvent({
			organizationId: delegation.organization_id,
			userId: delegation.created_by_user_id,
			userEmail: delegation.creator_email,
			connectionId: delegation.id,
			connectionType: delegation.itsm_system_type,
			credentials: credentials,
			settings: {
				delegation_id: delegation.id,
				admin_email: delegation.admin_email,
				organization_name: delegation.org_name,
				owner_email: delegation.creator_email,
				delegated_success_url: delegatedSuccessUrl,
			},
			isDelegationSetup: true,
		});

		if (!webhookResult.success) {
			logger.error(
				{
					delegationId: delegation.id,
					organizationId: delegation.organization_id,
					webhookError: webhookResult.error,
				},
				"Credential verification webhook failed",
			);
			// Don't fail - credentials are saved, verification will be retried
		}

		logger.info(
			{
				delegationId: delegation.id,
				organizationId: delegation.organization_id,
				adminEmail: delegation.admin_email,
				itsmSystemType: delegation.itsm_system_type,
			},
			"Credentials submitted for delegation",
		);

		return {
			success: true,
			message: "Credentials submitted successfully. Verification in progress.",
			delegation_id: delegation.id,
			status: "pending",
		};
	}

	/**
	 * Get delegation status by token (public endpoint for polling)
	 */
	async getStatus(token: string): Promise<DelegationStatusResponse> {
		if (!token || token.length !== 64) {
			throw new Error("Invalid token");
		}

		const tokenHash = hashToken(token);
		const result = await this.pool.query(
			`SELECT cdt.id, cdt.status, cdt.itsm_system_type,
              cdt.credentials_received_at, cdt.credentials_verified_at,
              cdt.last_verification_error, cdt.token_expires_at,
              o.name as org_name
       FROM credential_delegation_tokens cdt
       JOIN organizations o ON cdt.organization_id = o.id
       WHERE cdt.delegation_token = $1`,
			[tokenHash],
		);

		if (result.rows.length === 0) {
			throw new Error("Token not found");
		}

		const delegation = result.rows[0];

		// Check if expired and update status if needed
		if (
			delegation.status === "pending" &&
			new Date(delegation.token_expires_at) < new Date()
		) {
			await this.pool.query(
				`UPDATE credential_delegation_tokens SET status = 'expired' WHERE id = $1`,
				[delegation.id],
			);
			delegation.status = "expired";
		}

		return {
			delegation_id: delegation.id,
			status: delegation.status as DelegationStatus,
			itsm_system_type: delegation.itsm_system_type,
			organization_name: delegation.org_name,
			submitted_at: delegation.credentials_received_at?.toISOString() || null,
			verified_at: delegation.credentials_verified_at?.toISOString() || null,
			error: delegation.last_verification_error,
		};
	}

	/**
	 * Validate URL format
	 */
	private validateUrl(url: string): boolean {
		const urlRegex = /^https?:\/\/[\w.-]+\.[a-zA-Z]{2,}(:\d+)?(\/.*)?$/;
		return urlRegex.test(url);
	}

	/**
	 * Validate credentials based on ITSM system type
	 */
	private validateCredentials(
		systemType: ItsmSystemType,
		credentials: ItsmCredentials,
	): void {
		if (!credentials || typeof credentials !== "object") {
			throw new Error("Credentials are required");
		}

		const creds = credentials as unknown as Record<string, unknown>;

		if (!creds.instance_url || typeof creds.instance_url !== "string") {
			throw new Error("Instance URL is required");
		}

		if (!this.validateUrl(creds.instance_url)) {
			throw new Error(
				"Invalid URL format. URL must start with http:// or https:// and contain a valid domain",
			);
		}

		if (systemType === "servicenow_itsm") {
			if (!creds.username || typeof creds.username !== "string") {
				throw new Error("Username is required for ServiceNow");
			}
			if (!creds.password || typeof creds.password !== "string") {
				throw new Error("Password is required for ServiceNow");
			}
		} else if (systemType === "jira_itsm") {
			if (!creds.email || typeof creds.email !== "string") {
				throw new Error("Email is required for Jira");
			}
			if (!creds.api_token || typeof creds.api_token !== "string") {
				throw new Error("API token is required for Jira");
			}
		}
	}

	/**
	 * Validate email format
	 */
	private validateEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}
}
