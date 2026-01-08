import crypto from 'crypto';
import type { Pool } from 'pg';
import type { WebhookService } from './WebhookService.js';
import { logger } from '../config/logger.js';
import type {
  CreateDelegationResponse,
  DelegationListItem,
  DelegationStatus,
  ItsmSystemType,
  ListDelegationsQuery,
  VerifyDelegationResponse,
} from '../types/credentialDelegation.js';

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const TOKEN_EXPIRY_DAYS = 7;
const RATE_LIMIT_PER_ORG_PER_DAY = 10;

export class CredentialDelegationService {
  constructor(
    private pool: Pool,
    private webhookService: WebhookService
  ) {}

  /**
   * Create a new credential delegation token and send email to IT admin
   */
  async createDelegation(
    organizationId: string,
    createdByUserId: string,
    adminEmail: string,
    itsmSystemType: ItsmSystemType
  ): Promise<CreateDelegationResponse> {
    const normalizedEmail = adminEmail.trim().toLowerCase();

    // Validate email format
    if (!this.validateEmail(normalizedEmail)) {
      throw new Error('Invalid email format');
    }

    // Validate ITSM system type
    if (!['servicenow', 'jira', 'confluence'].includes(itsmSystemType)) {
      throw new Error('Invalid ITSM system type');
    }

    // Check rate limit (10 delegations per org per day)
    const rateLimitCheck = await this.pool.query(
      `SELECT COUNT(*) as count FROM credential_delegation_tokens
       WHERE organization_id = $1
       AND created_at > NOW() - INTERVAL '24 hours'`,
      [organizationId]
    );

    if (Number.parseInt(rateLimitCheck.rows[0].count, 10) >= RATE_LIMIT_PER_ORG_PER_DAY) {
      throw new Error('Rate limit exceeded. Maximum 10 delegations per organization per day.');
    }

    // Check for existing pending delegation (same email + org + system type)
    const existingCheck = await this.pool.query(
      `SELECT id FROM credential_delegation_tokens
       WHERE admin_email = $1
       AND organization_id = $2
       AND itsm_system_type = $3
       AND status = 'pending'`,
      [normalizedEmail, organizationId, itsmSystemType]
    );

    if (existingCheck.rows.length > 0) {
      throw new Error('A pending delegation already exists for this email and system type');
    }

    // Get organization and user details for webhook
    const orgResult = await this.pool.query(
      `SELECT o.name as org_name, up.email as creator_email
       FROM organizations o
       JOIN user_profiles up ON up.user_id = $1
       WHERE o.id = $2`,
      [createdByUserId, organizationId]
    );

    if (orgResult.rows.length === 0) {
      throw new Error('Organization not found');
    }

    const { org_name, creator_email } = orgResult.rows[0];

    // Generate secure token (64-char hex = 32 bytes = 256 bits)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    // Insert delegation token
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
      [organizationId, createdByUserId, normalizedEmail, itsmSystemType, token, expiresAt]
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
        'create_credential_delegation',
        'credential_delegation',
        delegationId,
        JSON.stringify({
          admin_email: normalizedEmail,
          itsm_system_type: itsmSystemType,
        }),
      ]
    );

    // Send webhook to trigger email
    const webhookResult = await this.webhookService.sendGenericEvent({
      organizationId,
      userId: createdByUserId,
      userEmail: creator_email,
      source: 'rita-credential-delegation',
      action: 'send_delegation_email',
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
        'Delegation webhook failed - email may not be sent'
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
      'Credential delegation created'
    );

    return {
      delegation_id: delegationId,
      delegation_url: delegationUrl,
      expires_at: expiresAt.toISOString(),
      status: 'pending',
    };
  }

  /**
   * Verify a delegation token (public endpoint)
   */
  async verifyToken(token: string): Promise<VerifyDelegationResponse> {
    if (!token || token.length !== 64) {
      return { valid: false, reason: 'not_found' };
    }

    const result = await this.pool.query(
      `SELECT cdt.id, cdt.status, cdt.token_expires_at, cdt.itsm_system_type,
              o.name as org_name, up.email as delegated_by
       FROM credential_delegation_tokens cdt
       JOIN organizations o ON cdt.organization_id = o.id
       JOIN user_profiles up ON cdt.created_by_user_id = up.user_id
       WHERE cdt.delegation_token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return { valid: false, reason: 'not_found' };
    }

    const delegation = result.rows[0];

    // Check if expired
    if (new Date(delegation.token_expires_at) < new Date()) {
      // Update status to expired
      await this.pool.query(
        `UPDATE credential_delegation_tokens SET status = 'expired' WHERE id = $1`,
        [delegation.id]
      );
      return { valid: false, reason: 'expired' };
    }

    // Check if already used/verified
    if (delegation.status !== 'pending') {
      return { valid: false, reason: 'used' };
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
    query?: ListDelegationsQuery
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
    userId: string
  ): Promise<{ success: boolean }> {
    const result = await this.pool.query(
      `UPDATE credential_delegation_tokens
       SET status = 'cancelled'
       WHERE id = $1 AND organization_id = $2 AND status = 'pending'
       RETURNING id`,
      [delegationId, organizationId]
    );

    if (result.rows.length === 0) {
      throw new Error('Delegation not found or cannot be cancelled');
    }

    // Audit log
    await this.pool.query(
      `INSERT INTO audit_logs (
         organization_id, user_id, action, resource_type, resource_id
       ) VALUES ($1, $2, $3, $4, $5)`,
      [organizationId, userId, 'cancel_credential_delegation', 'credential_delegation', delegationId]
    );

    logger.info({ delegationId, organizationId, userId }, 'Credential delegation cancelled');

    return { success: true };
  }

  /**
   * Validate email format
   */
  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
