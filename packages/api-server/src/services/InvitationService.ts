import crypto from 'crypto';
import type { Pool } from 'pg';
import type { WebhookService } from './WebhookService.js';
import { logger } from '../config/logger.js';
import type {
  PendingInvitation,
  SendInvitationsResponse,
  VerifyInvitationResponse
} from '../types/invitation.js';

export class InvitationService {
  constructor(
    private pool: Pool,
    private webhookService: WebhookService
  ) {}

  /**
   * Send invitations to multiple emails (batch processing)
   */
  async sendInvitations(
    organizationId: string,
    invitedByUserId: string,
    emails: string[]
  ): Promise<SendInvitationsResponse> {
    const validEmails: string[] = [];
    const skippedEmails: Array<{ email: string; status: string; reason: string; code: string }> = [];

    // Get organization and inviter details
    const orgResult = await this.pool.query(
      `SELECT o.name as org_name, up.email as inviter_email
       FROM organizations o
       JOIN user_profiles up ON up.user_id = $1
       WHERE o.id = $2`,
      [invitedByUserId, organizationId]
    );

    if (orgResult.rows.length === 0) {
      throw new Error('Organization not found');
    }

    const { org_name, inviter_email } = orgResult.rows[0];
    const inviterName = inviter_email; // Use email as inviter name

    // Validate and filter emails
    for (const email of emails) {
      const trimmedEmail = email.trim().toLowerCase();

      // Validate email format
      if (!this.validateEmail(trimmedEmail)) {
        skippedEmails.push({
          email: trimmedEmail,
          status: 'skipped',
          reason: 'Invalid email format',
          code: 'INV007'
        });
        continue;
      }

      // Check if already a member
      const memberCheck = await this.pool.query(
        `SELECT 1 FROM organization_members om
         JOIN user_profiles up ON om.user_id = up.user_id
         WHERE up.email = $1 AND om.organization_id = $2`,
        [trimmedEmail, organizationId]
      );

      if (memberCheck.rows.length > 0) {
        skippedEmails.push({
          email: trimmedEmail,
          status: 'skipped',
          reason: 'User is already a member of this organization',
          code: 'INV006'
        });
        continue;
      }

      // Check if user already has an organization (single-org constraint)
      const userWithOrgCheck = await this.pool.query(
        `SELECT up.user_id FROM user_profiles up
         JOIN organization_members om ON up.user_id = om.user_id
         WHERE up.email = $1 LIMIT 1`,
        [trimmedEmail]
      );

      if (userWithOrgCheck.rows.length > 0) {
        skippedEmails.push({
          email: trimmedEmail,
          status: 'skipped',
          reason: 'User already has an organization',
          code: 'INV012'
        });
        continue;
      }

      // Check for existing invitation
      const existingInvitation = await this.pool.query(
        `SELECT id, status FROM pending_invitations
         WHERE email = $1 AND organization_id = $2`,
        [trimmedEmail, organizationId]
      );

      if (existingInvitation.rows.length > 0) {
        const invitation = existingInvitation.rows[0];

        // Allow resend for pending or expired
        if (invitation.status === 'pending' || invitation.status === 'expired') {
          // Will update below
          validEmails.push(trimmedEmail);
          continue;
        }

        // Handle accepted invitations with orphan detection (Layer 2: Self-Healing)
        if (invitation.status === 'accepted') {
          // Check if user still exists (detect orphaned record)
          const userExists = await this.pool.query(
            `SELECT 1 FROM user_profiles WHERE email = $1`,
            [trimmedEmail]
          );

          if (userExists.rows.length === 0) {
            // ORPHANED RECORD DETECTED: User was deleted but invitation remains
            // Clean up the orphaned invitation and allow re-invitation
            await this.pool.query(
              `DELETE FROM pending_invitations WHERE id = $1`,
              [invitation.id]
            );

            logger.info({
              organizationId,
              email: trimmedEmail,
              invitationId: invitation.id
            }, 'Cleaned up orphaned accepted invitation (self-healing)');

            // Allow re-invitation
            validEmails.push(trimmedEmail);
            continue;
          }

          // User exists and already accepted - skip as before
          skippedEmails.push({
            email: trimmedEmail,
            status: 'skipped',
            reason: 'User already accepted invitation',
            code: 'INV003'
          });
          continue;
        }
      }

      validEmails.push(trimmedEmail);
    }

    if (validEmails.length === 0) {
      return {
        success: true,
        invitations: skippedEmails.map(s => ({ email: s.email, status: s.status as any, reason: s.reason, code: s.code })),
        successCount: 0,
        failureCount: skippedEmails.length
      };
    }

    // Create or update invitation records
    const invitations: Array<{ id: string; email: string; token: string; expiresAt: Date }> = [];

    for (const email of validEmails) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Check if need to update existing or create new
      const existingCheck = await this.pool.query(
        `SELECT id FROM pending_invitations
         WHERE email = $1 AND organization_id = $2 AND status IN ('pending', 'expired')`,
        [email, organizationId]
      );

      let invitationId: string;

      if (existingCheck.rows.length > 0) {
        // Update existing
        const updateResult = await this.pool.query(
          `UPDATE pending_invitations
           SET invitation_token = $1, token_expires_at = $2, status = 'pending', created_at = NOW()
           WHERE id = $3
           RETURNING id`,
          [token, expiresAt, existingCheck.rows[0].id]
        );
        invitationId = updateResult.rows[0].id;
      } else {
        // Create new
        const insertResult = await this.pool.query(
          `INSERT INTO pending_invitations (
             organization_id, invited_by_user_id, email,
             invitation_token, token_expires_at, status
           ) VALUES ($1, $2, $3, $4, $5, 'pending')
           RETURNING id`,
          [organizationId, invitedByUserId, email, token, expiresAt]
        );
        invitationId = insertResult.rows[0].id;
      }

      invitations.push({
        id: invitationId,
        email,
        token,
        expiresAt
      });
    }

    // Send webhook with all invitations
    const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

    try {
      const webhookResult = await this.webhookService.sendGenericEvent({
        organizationId,
        userId: invitedByUserId,
        userEmail: inviter_email,
        source: 'rita-chat',
        action: 'send_invitation',
        additionalData: {
          organization_name: org_name,
          invited_by_email: inviter_email,
          invited_by_name: inviterName,
          invitations: invitations.map(inv => ({
            invitee_email: inv.email,
            invitation_token: inv.token,
            invitation_url: `${CLIENT_URL}/invite?token=${inv.token}`,
            invitation_id: inv.id,
            expires_at: inv.expiresAt.toISOString()
          }))
        }
      });

      if (!webhookResult.success) {
        // Mark all as failed
        await this.pool.query(
          `UPDATE pending_invitations
           SET status = 'failed'
           WHERE id = ANY($1)`,
          [invitations.map(i => i.id)]
        );

        return {
          success: false,
          invitations: invitations.map(inv => ({
            email: inv.email,
            status: 'failed' as const,
            reason: 'Webhook failed to send invitation emails',
            code: 'INV009'
          })),
          successCount: 0,
          failureCount: invitations.length
        };
      }

      // Webhook succeeded
      return {
        success: true,
        invitations: [
          ...invitations.map(inv => ({
            email: inv.email,
            status: 'sent' as const
          })),
          ...skippedEmails.map(s => ({
            email: s.email,
            status: s.status as any,
            reason: s.reason,
            code: s.code
          }))
        ],
        successCount: invitations.length,
        failureCount: skippedEmails.length
      };

    } catch (error) {
      // Mark all as failed
      await this.pool.query(
        `UPDATE pending_invitations
         SET status = 'failed'
         WHERE id = ANY($1)`,
        [invitations.map(i => i.id)]
      );

      throw error;
    }
  }

  /**
   * Verify invitation token and return details
   */
  async verifyToken(token: string): Promise<VerifyInvitationResponse> {
    if (!token || token.length !== 64) {
      return {
        valid: false,
        invitation: null,
        error: 'Invalid token format'
      };
    }

    const result = await this.pool.query(
      `SELECT pi.email, pi.token_expires_at, pi.status,
              o.name as organization_name,
              up.email as inviter_name
       FROM pending_invitations pi
       JOIN organizations o ON pi.organization_id = o.id
       JOIN user_profiles up ON pi.invited_by_user_id = up.user_id
       WHERE pi.invitation_token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return {
        valid: false,
        invitation: null,
        error: 'Invitation not found'
      };
    }

    const invitation = result.rows[0];

    // Check if expired
    if (new Date(invitation.token_expires_at) < new Date()) {
      await this.pool.query(
        `UPDATE pending_invitations SET status = 'expired' WHERE invitation_token = $1`,
        [token]
      );
      return {
        valid: false,
        invitation: null,
        error: 'Invitation has expired'
      };
    }

    // Check if already accepted
    if (invitation.status === 'accepted') {
      return {
        valid: false,
        invitation: null,
        error: 'Invitation has already been accepted'
      };
    }

    // Check if cancelled
    if (invitation.status === 'cancelled') {
      return {
        valid: false,
        invitation: null,
        error: 'Invitation has been cancelled'
      };
    }

    return {
      valid: true,
      invitation: {
        email: invitation.email,
        organizationName: invitation.organization_name,
        inviterName: invitation.inviter_name,
        expiresAt: invitation.token_expires_at
      }
    };
  }

  /**
   * Accept invitation and create Keycloak account
   */
  async acceptInvitation(
    token: string,
    firstName: string,
    lastName: string,
    password: string
  ): Promise<{ success: boolean; email: string }> {
    // Verify token first
    const verification = await this.verifyToken(token);
    if (!verification.valid || !verification.invitation) {
      throw new Error(verification.error || 'Invalid invitation');
    }

    const email = verification.invitation.email;

    // Check if email already registered
    const existingUser = await this.pool.query(
      `SELECT user_id FROM user_profiles WHERE email = $1`,
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('An account with this email already exists');
    }

    // Get invitation details
    const invitationResult = await this.pool.query(
      `SELECT id, organization_id FROM pending_invitations
       WHERE invitation_token = $1 AND status = 'pending'`,
      [token]
    );

    if (invitationResult.rows.length === 0) {
      throw new Error('Invitation already accepted or invalid');
    }

    const { id: invitationId, organization_id: organizationId } = invitationResult.rows[0];

    // Mark invitation as accepted (atomic)
    const updateResult = await this.pool.query(
      `UPDATE pending_invitations
       SET status = 'accepted', accepted_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING id`,
      [invitationId]
    );

    if (updateResult.rows.length === 0) {
      throw new Error('Invitation already accepted');
    }

    // Auto-cancel all other pending invitations for this email (cross-org cleanup)
    // Rationale: User can only belong to one organization (single-org constraint)
    const cancelResult = await this.pool.query(
      `UPDATE pending_invitations
       SET status = 'cancelled'
       WHERE email = $1
       AND id != $2
       AND status = 'pending'
       RETURNING id, organization_id`,
      [email, invitationId]
    );

    if (cancelResult.rows.length > 0) {
      logger.info({
        email,
        acceptedInvitationId: invitationId,
        acceptedOrganizationId: organizationId,
        cancelledInvitations: cancelResult.rows.length,
        cancelledOrganizations: cancelResult.rows.map(r => r.organization_id)
      }, 'Auto-cancelled competing invitations from other organizations');
    }

    // Trigger webhook for Keycloak user creation (fire-and-forget)
    const encodedPassword = Buffer.from(password).toString('base64');

    await this.webhookService.sendGenericEvent({
      organizationId,
      userEmail: email,
      source: 'rita-chat',
      action: 'accept_invitation',
      additionalData: {
        invitation_id: invitationId,
        first_name: firstName,
        last_name: lastName,
        password: encodedPassword,
        email_verified: true
      }
    });

    return {
      success: true,
      email
    };
  }

  /**
   * Cancel pending invitation
   */
  async cancelInvitation(
    invitationId: string,
    organizationId: string
  ): Promise<{ success: boolean }> {
    const result = await this.pool.query(
      `UPDATE pending_invitations
       SET status = 'cancelled'
       WHERE id = $1 AND organization_id = $2 AND status = 'pending'
       RETURNING id`,
      [invitationId, organizationId]
    );

    if (result.rows.length === 0) {
      throw new Error('Invitation not found or cannot be cancelled');
    }

    return { success: true };
  }

  /**
   * List invitations for organization
   */
  async listInvitations(
    organizationId: string,
    filters?: { status?: string; limit?: number; offset?: number }
  ): Promise<PendingInvitation[]> {
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    let query = `
      SELECT pi.*, up.email as invited_by_name
      FROM pending_invitations pi
      JOIN user_profiles up ON pi.invited_by_user_id = up.user_id
      WHERE pi.organization_id = $1
    `;
    const params: any[] = [organizationId];

    if (filters?.status) {
      params.push(filters.status);
      query += ` AND pi.status = $${params.length}`;
    }

    query += ` ORDER BY pi.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Validate email format
   */
  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
