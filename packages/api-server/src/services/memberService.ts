import type { Pool } from 'pg';
import { createChildLogger } from '../config/logger.js';
import { getSSEService } from './sse.js';
import { WebhookService } from './WebhookService.js';
import type {
  Member,
  MemberDetails,
  MemberListResult,
  ListMembersOptions,
  RemovedMember,
  OrganizationRole,
  MemberAction
} from '../types/member.js';

const logger = createChildLogger('member-service');

/**
 * MemberService - Business logic for organization member management
 *
 * Phase 1: Core member management (list, update role, status, soft remove)
 * Phase 2: Hard delete with webhook integration (future)
 */
export class MemberService {
  constructor(private pool: Pool) {}

  /**
   * List members of an organization with optional filtering and pagination
   *
   * @param organizationId - Organization ID
   * @param options - Filtering and pagination options
   * @returns List of members with total count
   */
  async listMembers(
    organizationId: string,
    options: ListMembersOptions = {}
  ): Promise<MemberListResult> {
    const {
      limit = 50,
      offset = 0,
      role,
      status,
      search,
      sortBy = 'joinedAt',
      sortOrder = 'desc'
    } = options;

    // Build query with optional filters and conversation counts
    // Use computed display_name for proper sorting (combines first_name + last_name, falls back to email)
    let query = `
      SELECT
        up.user_id as id,
        up.email,
        up.first_name,
        up.last_name,
        om.role,
        om.is_active,
        om.joined_at,
        COALESCE(conv_count.count, 0)::INTEGER as conversations_count,
        LOWER(COALESCE(NULLIF(TRIM(CONCAT(up.first_name, ' ', up.last_name)), ''), up.email)) as display_name
      FROM organization_members om
      INNER JOIN user_profiles up ON om.user_id = up.user_id
      LEFT JOIN (
        SELECT user_id, COUNT(*)::INTEGER as count
        FROM conversations
        WHERE organization_id = $1
        GROUP BY user_id
      ) conv_count ON up.user_id = conv_count.user_id
      WHERE om.organization_id = $1
    `;

    const params: any[] = [organizationId];

    // Add role filter if specified
    if (role) {
      params.push(role);
      query += ` AND om.role = $${params.length}`;
    }

    // Add status filter if specified
    if (status) {
      const isActive = status === 'active';
      params.push(isActive);
      query += ` AND om.is_active = $${params.length}`;
    }

    // Add search filter if specified (search by email, firstName, lastName)
    if (search?.trim()) {
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern);
      query += ` AND (up.email ILIKE $${params.length} OR up.first_name ILIKE $${params.length} OR up.last_name ILIKE $${params.length} OR CONCAT(up.first_name, ' ', up.last_name) ILIKE $${params.length})`;
    }

    // Add sorting - use computed display_name column for name sorting
    const sortColumn = sortBy === 'name' ? 'display_name' :
                       sortBy === 'role' ? 'om.role' :
                       sortBy === 'status' ? 'om.is_active' :
                       sortBy === 'conversationsCount' ? 'conversations_count' :
                       'om.joined_at';
    query += ` ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`;

    // Add pagination
    params.push(limit, offset);
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await this.pool.query(query, params);

    // Get total count (without pagination) - must include same filters
    let countQuery = `
      SELECT COUNT(*) as total
      FROM organization_members om
      INNER JOIN user_profiles up ON om.user_id = up.user_id
      WHERE om.organization_id = $1
    `;
    const countParams: any[] = [organizationId];

    if (role) {
      countParams.push(role);
      countQuery += ` AND om.role = $${countParams.length}`;
    }

    if (status) {
      const isActive = status === 'active';
      countParams.push(isActive);
      countQuery += ` AND om.is_active = $${countParams.length}`;
    }

    if (search?.trim()) {
      const searchPattern = `%${search.trim()}%`;
      countParams.push(searchPattern);
      countQuery += ` AND (up.email ILIKE $${countParams.length} OR up.first_name ILIKE $${countParams.length} OR up.last_name ILIKE $${countParams.length} OR CONCAT(up.first_name, ' ', up.last_name) ILIKE $${countParams.length})`;
    }

    const countResult = await this.pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Transform database rows to Member objects
    const members: Member[] = result.rows.map(row => ({
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      isActive: row.is_active,
      joinedAt: row.joined_at,
      conversationsCount: parseInt(row.conversations_count, 10)
    }));

    logger.debug({
      organizationId,
      memberCount: members.length,
      total,
      filters: options
    }, 'Listed members');

    return { members, total };
  }

  /**
   * Get detailed information about a specific member
   *
   * @param organizationId - Organization ID
   * @param userId - User ID
   * @returns Member details with inviter information
   */
  async getMemberDetails(
    organizationId: string,
    userId: string
  ): Promise<MemberDetails> {
    const result = await this.pool.query(
      `SELECT
        up.user_id as id,
        up.email,
        up.first_name,
        up.last_name,
        om.role,
        om.is_active,
        om.joined_at,
        COALESCE(conv_count.count, 0)::INTEGER as conversations_count
      FROM user_profiles up
      INNER JOIN organization_members om ON up.user_id = om.user_id
      LEFT JOIN (
        SELECT user_id, COUNT(*)::INTEGER as count
        FROM conversations
        WHERE organization_id = $1
        GROUP BY user_id
      ) conv_count ON up.user_id = conv_count.user_id
      WHERE om.organization_id = $1 AND up.user_id = $2`,
      [organizationId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Member not found');
    }

    const row = result.rows[0];

    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      isActive: row.is_active,
      joinedAt: row.joined_at,
      conversationsCount: parseInt(row.conversations_count, 10)
    };
  }

  /**
   * Update a member's role in the organization
   *
   * @param organizationId - Organization ID
   * @param userId - User ID to update
   * @param newRole - New role to assign
   * @param performedBy - User ID performing the action
   * @returns Updated member
   */
  async updateMemberRole(
    organizationId: string,
    userId: string,
    newRole: OrganizationRole,
    performedBy: string
  ): Promise<Member> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Cannot change own role
      if (userId === performedBy) {
        throw new Error('Cannot change your own role');
      }

      // Get current role
      const currentResult = await client.query(
        `SELECT role, is_active FROM organization_members
         WHERE organization_id = $1 AND user_id = $2`,
        [organizationId, userId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('Member not found');
      }

      const oldRole = currentResult.rows[0].role;

      // Check if demoting last active owner
      if (oldRole === 'owner' && newRole !== 'owner') {
        const isLast = await this.isLastActiveOwner(organizationId, userId);
        if (isLast) {
          throw new Error('Cannot demote the last active owner');
        }
      }

      // Update role
      await client.query(
        `UPDATE organization_members
         SET role = $1
         WHERE organization_id = $2 AND user_id = $3`,
        [newRole, organizationId, userId]
      );

      // Get updated member details
      const memberResult = await client.query(
        `SELECT up.email, up.first_name, up.last_name
         FROM user_profiles up
         WHERE up.user_id = $1`,
        [userId]
      );

      const member = memberResult.rows[0];

      // Create audit log
      await client.query(
        `INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          organizationId,
          performedBy,
          'update_member_role',
          'organization_member',
          userId,
          JSON.stringify({
            targetUserId: userId,
            targetEmail: member.email,
            oldRole,
            newRole
          })
        ]
      );

      await client.query('COMMIT');

      // Trigger SSE event
      const sseService = getSSEService();
      sseService.sendToOrganization(organizationId, {
        type: 'member_role_updated',
        data: {
          userId,
          userEmail: member.email,
          oldRole,
          newRole,
          updatedBy: performedBy,
          timestamp: new Date().toISOString()
        }
      });

      logger.info({
        organizationId,
        userId,
        oldRole,
        newRole,
        performedBy
      }, 'Member role updated');

      // Return updated member (fetch fresh data)
      return await this.getMemberDetails(organizationId, userId);

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({
        organizationId,
        userId,
        newRole,
        performedBy,
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to update member role');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update a member's active status (activate/deactivate)
   *
   * @param organizationId - Organization ID
   * @param userId - User ID to update
   * @param isActive - New active status
   * @param performedBy - User ID performing the action
   * @returns Updated member
   */
  async updateMemberStatus(
    organizationId: string,
    userId: string,
    isActive: boolean,
    performedBy: string
  ): Promise<Member> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Cannot change own status
      if (userId === performedBy) {
        throw new Error('Cannot change your own status');
      }

      // Check permission and get current status
      const canPerform = await this.canPerformAction(
        organizationId,
        performedBy,
        userId,
        'update_status'
      );

      if (!canPerform) {
        throw new Error('Permission denied: You cannot change this member\'s status');
      }

      // Get current role
      const currentResult = await client.query(
        `SELECT role, is_active FROM organization_members
         WHERE organization_id = $1 AND user_id = $2`,
        [organizationId, userId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('Member not found');
      }

      const role = currentResult.rows[0].role;
      const oldStatus = currentResult.rows[0].is_active;

      // Check if deactivating last active owner
      if (role === 'owner' && !isActive) {
        const isLast = await this.isLastActiveOwner(organizationId, userId);
        if (isLast) {
          throw new Error('Cannot deactivate the last active owner');
        }
      }

      // Update status
      await client.query(
        `UPDATE organization_members
         SET is_active = $1
         WHERE organization_id = $2 AND user_id = $3`,
        [isActive, organizationId, userId]
      );

      // Get member details
      const memberResult = await client.query(
        `SELECT up.email, up.first_name, up.last_name
         FROM user_profiles up
         WHERE up.user_id = $1`,
        [userId]
      );

      const member = memberResult.rows[0];

      // Create audit log
      await client.query(
        `INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          organizationId,
          performedBy,
          isActive ? 'activate_member' : 'deactivate_member',
          'organization_member',
          userId,
          JSON.stringify({
            targetUserId: userId,
            targetEmail: member.email,
            oldStatus,
            newStatus: isActive
          })
        ]
      );

      await client.query('COMMIT');

      // Trigger SSE event
      const sseService = getSSEService();
      sseService.sendToOrganization(organizationId, {
        type: 'member_status_updated',
        data: {
          userId,
          userEmail: member.email,
          isActive,
          updatedBy: performedBy,
          timestamp: new Date().toISOString()
        }
      });

      logger.info({
        organizationId,
        userId,
        isActive,
        performedBy
      }, 'Member status updated');

      // Return updated member (fetch fresh data)
      return await this.getMemberDetails(organizationId, userId);

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({
        organizationId,
        userId,
        isActive,
        performedBy,
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to update member status');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Remove a member from the organization (soft delete)
   * Removes membership but preserves user account
   *
   * Phase 1: Soft delete only
   *
   * @param organizationId - Organization ID
   * @param userId - User ID to remove
   * @param performedBy - User ID performing the action
   * @returns Removal confirmation
   */
  async removeMember(
    organizationId: string,
    userId: string,
    performedBy: string
  ): Promise<RemovedMember> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Cannot remove self
      if (userId === performedBy) {
        throw new Error('Cannot remove yourself from the organization');
      }

      // Check permission
      const canPerform = await this.canPerformAction(
        organizationId,
        performedBy,
        userId,
        'remove_member'
      );

      if (!canPerform) {
        throw new Error('Permission denied: You cannot remove this member');
      }

      // Get member details before removal
      const memberResult = await client.query(
        `SELECT up.email, om.role, om.is_active
         FROM user_profiles up
         INNER JOIN organization_members om ON up.user_id = om.user_id
         WHERE om.organization_id = $1 AND up.user_id = $2`,
        [organizationId, userId]
      );

      if (memberResult.rows.length === 0) {
        throw new Error('Member not found');
      }

      const member = memberResult.rows[0];

      // Check if removing last active owner
      if (member.role === 'owner' && member.is_active) {
        const isLast = await this.isLastActiveOwner(organizationId, userId);
        if (isLast) {
          throw new Error('Cannot remove the last active owner');
        }
      }

      // Create audit log before removal
      await client.query(
        `INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          organizationId,
          performedBy,
          'remove_member',
          'organization_member',
          userId,
          JSON.stringify({
            targetUserId: userId,
            targetEmail: member.email,
            targetRole: member.role,
            removalType: 'soft'
          })
        ]
      );

      // Remove from organization (soft delete - preserves user record)
      await client.query(
        `DELETE FROM organization_members
         WHERE organization_id = $1 AND user_id = $2`,
        [organizationId, userId]
      );

      // Clear active organization reference in user_profiles table
      // This ensures removed users don't retain a reference to the organization
      await client.query(
        `UPDATE user_profiles
         SET active_organization_id = NULL
         WHERE user_id = $1 AND active_organization_id = $2`,
        [userId, organizationId]
      );

      await client.query('COMMIT');

      // Trigger SSE event
      const sseService = getSSEService();
      sseService.sendToOrganization(organizationId, {
        type: 'member_removed',
        data: {
          userId,
          userEmail: member.email,
          removedBy: performedBy,
          timestamp: new Date().toISOString()
        }
      });

      logger.info({
        organizationId,
        userId,
        userEmail: member.email,
        performedBy
      }, 'Member removed from organization (soft delete)');

      return {
        success: true,
        message: 'Member removed from organization successfully',
        removedMember: {
          id: userId,
          email: member.email,
          role: member.role
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({
        organizationId,
        userId,
        performedBy,
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to remove member');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if a user is the last active owner in the organization
   *
   * @param organizationId - Organization ID
   * @param userId - User ID to check
   * @returns True if user is the only active owner
   */
  async isLastActiveOwner(organizationId: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT COUNT(*)::INTEGER as owner_count
       FROM organization_members
       WHERE organization_id = $1
         AND role = 'owner'
         AND is_active = true
         AND user_id != $2`,
      [organizationId, userId]
    );

    const otherActiveOwners = parseInt(result.rows[0].owner_count, 10);
    return otherActiveOwners === 0;
  }

  /**
   * Check if a user can perform an action on a target member
   *
   * @param organizationId - Organization ID
   * @param performerId - User ID performing the action
   * @param targetId - User ID being acted upon
   * @param action - Action to perform
   * @returns True if action is allowed
   */
  async canPerformAction(
    organizationId: string,
    performerId: string,
    targetId: string,
    action: MemberAction
  ): Promise<boolean> {
    // Get both user roles
    const result = await this.pool.query(
      `SELECT
        (SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2) as performer_role,
        (SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $3) as target_role`,
      [organizationId, performerId, targetId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    const { performer_role: performerRole, target_role: targetRole } = result.rows[0];

    if (!performerRole) {
      return false; // Performer not a member
    }

    // Owners can do anything (except to themselves)
    if (performerRole === 'owner' && performerId !== targetId) {
      return true;
    }

    // Admins can only act on regular users
    if (performerRole === 'admin') {
      if (action === 'update_role') {
        return false; // Admins cannot change roles
      }
      if (action === 'update_status' || action === 'remove_member') {
        return targetRole === 'user'; // Admins can only deactivate/remove users
      }
    }

    // Regular users cannot perform management actions
    return false;
  }

  // ============================================================================
  // Phase 2 Placeholder Methods (Not Implemented in Phase 1)
  // ============================================================================

  /**
   * Permanently delete a member from the system
   * Phase 2: Hard delete with webhook integration
   *
   * This method:
   * 1. Validates permissions (only owners can hard delete)
   * 2. Calls Keycloak deletion webhook (BLOCKING - transaction waits for success)
   * 3. Hard deletes user_profiles record (CASCADE handles related data via FK constraints)
   * 4. Creates audit log
   * 5. Sends SSE event
   *
   * If webhook fails, the entire transaction is rolled back (no partial deletes).
   *
   * @param organizationId - Organization ID
   * @param userId - User ID to delete
   * @param performedBy - User ID performing the deletion
   * @param reason - Optional reason for deletion
   * @returns Deleted member details
   * @throws Error if permission denied, user not found, or webhook fails
   */
  async deleteMemberPermanent(
    organizationId: string,
    userId: string,
    performedBy: string,
    reason?: string
  ): Promise<RemovedMember> {
    const client = await this.pool.connect();
    const webhookService = new WebhookService();

    try {
      await client.query('BEGIN');

      // Cannot delete self
      if (userId === performedBy) {
        throw new Error('Cannot delete yourself from the organization');
      }

      // Check permission - only owners can permanently delete
      const canPerform = await this.canPerformAction(
        organizationId,
        performedBy,
        userId,
        'remove_member' // Reuse remove_member permission (owners only)
      );

      if (!canPerform) {
        throw new Error('Permission denied: Only owners can permanently delete members');
      }

      // Get member details before deletion
      const memberResult = await client.query(
        `SELECT up.user_id, up.email, up.first_name, up.last_name, om.role, om.is_active, om.joined_at
         FROM user_profiles up
         INNER JOIN organization_members om ON up.user_id = om.user_id
         WHERE om.organization_id = $1 AND up.user_id = $2`,
        [organizationId, userId]
      );

      if (memberResult.rows.length === 0) {
        throw new Error('Member not found');
      }

      const member = memberResult.rows[0];

      // Check if deleting last active owner
      if (member.role === 'owner' && member.is_active) {
        const isLast = await this.isLastActiveOwner(organizationId, userId);
        if (isLast) {
          throw new Error('Cannot delete the last active owner');
        }
      }

      // BLOCKING WEBHOOK CALL: Delete user from Keycloak BEFORE database deletion
      // If webhook fails, transaction will rollback and no data is deleted
      logger.info({
        organizationId,
        userId,
        email: member.email
      }, 'Calling Keycloak deletion webhook (BLOCKING)');

      const webhookResponse = await webhookService.deleteKeycloakUser({
        userId: member.user_id,
        email: member.email,
        organizationId,
        reason: reason || 'Member deleted by administrator'
      });

      if (!webhookResponse.success) {
        throw new Error(`Keycloak deletion failed: ${webhookResponse.error || 'Unknown error'}`);
      }

      logger.info({
        organizationId,
        userId,
        email: member.email,
        webhookStatus: webhookResponse.status
      }, 'Keycloak deletion webhook succeeded');

      // Clean up ALL invitation records before deleting user (any status)
      // Rationale: If user is being deleted, no point keeping any invitations
      const invitationCleanupResult = await client.query(
        `DELETE FROM pending_invitations
         WHERE email = $1
         RETURNING id, status`,
        [member.email]
      );

      const deletedInvitationCount = invitationCleanupResult.rows.length;

      logger.info({
        organizationId,
        userId,
        email: member.email,
        deletedInvitations: deletedInvitationCount,
        statuses: invitationCleanupResult.rows.map(r => r.status)
      }, 'Cleaned up all invitations before user deletion');

      // Create audit log BEFORE deletion (user_id will be SET NULL after deletion)
      await client.query(
        `INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          organizationId,
          performedBy,
          'delete_member_permanent',
          'user_profile',
          userId,
          JSON.stringify({
            targetUserId: userId,
            targetEmail: member.email,
            targetRole: member.role,
            firstName: member.first_name,
            lastName: member.last_name,
            removalType: 'hard',
            reason: reason || 'No reason provided',
            keycloakDeleted: true,
            deletedInvitations: deletedInvitationCount
          })
        ]
      );

      // Cleanup: Delete any orphaned pending_users records (edge case safety net)
      await client.query(
        'DELETE FROM pending_users WHERE email = $1',
        [member.email]
      );

      // HARD DELETE: Delete user_profiles record
      // FK constraints with CASCADE will automatically delete:
      // - messages (user_id → CASCADE)
      // - conversations (user_id → CASCADE)
      // - blob_metadata (user_id → CASCADE)
      // - organization_members (user_id → CASCADE via user_profiles FK)
      // - audit_logs (user_id → SET NULL)
      await client.query(
        `DELETE FROM user_profiles WHERE user_id = $1`,
        [userId]
      );

      await client.query('COMMIT');

      // Trigger SSE event after successful deletion
      const sseService = getSSEService();
      sseService.sendToOrganization(organizationId, {
        type: 'member_deleted_permanent',
        data: {
          userId,
          userEmail: member.email,
          deletedBy: performedBy,
          reason: reason || 'No reason provided',
          timestamp: new Date().toISOString()
        }
      });

      logger.info({
        organizationId,
        userId,
        email: member.email,
        performedBy,
        reason
      }, 'Member permanently deleted successfully');

      return {
        success: true,
        message: 'Member permanently deleted',
        removedMember: {
          id: userId,
          email: member.email,
          role: member.role
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');

      logger.error({
        organizationId,
        userId,
        performedBy,
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to permanently delete member - transaction rolled back');

      throw error;

    } finally {
      client.release();
    }
  }

  /**
   * Delete own account (self-service deletion)
   * Phase 2: Hard delete with webhook integration
   *
   * This method:
   * 1. Finds user's organization
   * 2. Validates user is not the last owner (if owner)
   * 3. Calls Keycloak deletion webhook (BLOCKING - transaction waits for success)
   * 4. Hard deletes user_profiles record (CASCADE handles related data via FK constraints)
   * 5. Creates audit log
   * 6. Sends SSE event
   *
   * If webhook fails, the entire transaction is rolled back (no partial deletes).
   *
   * @param userId - User ID deleting their own account
   * @param reason - Optional reason for deletion
   * @returns Deleted member details
   * @throws Error if user not found, last owner, or webhook fails
   */
  async deleteOwnAccount(userId: string, reason?: string): Promise<RemovedMember> {
    const client = await this.pool.connect();
    const webhookService = new WebhookService();

    try {
      await client.query('BEGIN');

      // Get user's organization and details
      const userResult = await client.query(
        `SELECT up.user_id, up.email, up.first_name, up.last_name, om.organization_id, om.role, om.is_active
         FROM user_profiles up
         LEFT JOIN organization_members om ON up.user_id = om.user_id
         WHERE up.user_id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Get all organization members if user belongs to an organization
      let allOrgMembers: Array<{user_id: string; email: string; role: string}> = [];
      let deleteEntireOrganization = false;

      if (user.organization_id) {
        // Get all members of the organization
        const membersResult = await client.query(
          `SELECT up.user_id, up.email, om.role
           FROM organization_members om
           INNER JOIN user_profiles up ON om.user_id = up.user_id
           WHERE om.organization_id = $1`,
          [user.organization_id]
        );
        allOrgMembers = membersResult.rows;

        // If user is the LAST owner, they can delete the entire organization
        // This will delete ALL members and organization data
        if (user.role === 'owner') {
          // Check if this is the last active owner
          const isLastOwner = await this.isLastActiveOwner(user.organization_id, userId);

          if (isLastOwner) {
            deleteEntireOrganization = true;
            logger.info({
              userId,
              organizationId: user.organization_id,
              memberCount: allOrgMembers.length
            }, 'Last owner deleting account - will delete entire organization and all members');
          } else {
            // Other owners exist, so just delete this owner's account
            deleteEntireOrganization = false;
            logger.info({
              userId,
              organizationId: user.organization_id,
              memberCount: allOrgMembers.length
            }, 'Owner deleting account - other owners exist, only deleting this owner');
          }
        } else {
          // Non-owners can only delete their own account (not the whole org)
          deleteEntireOrganization = false;
        }
      }

      // BLOCKING WEBHOOK CALL: Delete users from Keycloak BEFORE database deletion
      // If webhook fails, transaction will rollback and no data is deleted
      // If owner is deleting account, delete ALL organization members from Keycloak
      const additionalEmails = deleteEntireOrganization
        ? allOrgMembers.filter(m => m.user_id !== userId).map(m => m.email)
        : [];

      logger.info({
        userId,
        email: user.email,
        organizationId: user.organization_id,
        deleteEntireOrganization,
        totalMembersToDelete: deleteEntireOrganization ? allOrgMembers.length : 1,
        additionalEmails
      }, 'Calling Keycloak deletion webhook for own account (BLOCKING)');

      const webhookResponse = await webhookService.deleteKeycloakUser({
        userId: user.user_id,
        email: user.email,
        organizationId: user.organization_id || 'no-organization',
        reason: reason || (deleteEntireOrganization ? 'Owner deleted account - organization deleted' : 'User deleted own account'),
        deleteOrganization: deleteEntireOrganization, // Signal external system to delete entire organization data
        additionalEmails // Additional member emails to delete from Keycloak
      });

      if (!webhookResponse.success) {
        throw new Error(`Keycloak deletion failed: ${webhookResponse.error || 'Unknown error'}`);
      }

      logger.info({
        userId,
        email: user.email,
        webhookStatus: webhookResponse.status
      }, 'Keycloak deletion webhook succeeded for own account');

      // Clean up ALL invitation records before user deletion
      if (deleteEntireOrganization && user.organization_id) {
        // Delete ALL invitations for the entire organization (most efficient)
        // Rationale: When org is deleted, all pending invitations become meaningless
        const invitationCleanupResult = await client.query(
          `DELETE FROM pending_invitations
           WHERE organization_id = $1
           RETURNING id, email, status`,
          [user.organization_id]
        );

        logger.info({
          organizationId: user.organization_id,
          userId,
          deletedInvitations: invitationCleanupResult.rows.length,
          emails: invitationCleanupResult.rows.map(r => r.email),
          statuses: invitationCleanupResult.rows.map(r => r.status)
        }, 'Cleaned up ALL invitations for entire organization deletion');

      } else {
        // Delete ALL invitations for this user's email (any status)
        const invitationCleanupResult = await client.query(
          `DELETE FROM pending_invitations
           WHERE email = $1
           RETURNING id, status`,
          [user.email]
        );

        logger.info({
          userId,
          email: user.email,
          deletedInvitations: invitationCleanupResult.rows.length,
          statuses: invitationCleanupResult.rows.map(r => r.status)
        }, 'Cleaned up all invitations before self-deletion');
      }

      // Create audit log BEFORE deletion (user_id will be SET NULL after deletion)
      await client.query(
        `INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          user.organization_id, // May be null if user has no organization
          userId,
          'delete_own_account',
          'user_profile',
          userId,
          JSON.stringify({
            email: user.email,
            role: user.role,
            firstName: user.first_name,
            lastName: user.last_name,
            removalType: 'hard',
            reason: reason || 'User deleted own account',
            keycloakDeleted: true,
            deleteEntireOrganization,
            organizationWillBeDeleted: deleteEntireOrganization, // Flag to indicate org deletion
            totalMembersDeleted: deleteEntireOrganization ? allOrgMembers.length : 1,
            memberEmails: deleteEntireOrganization ? allOrgMembers.map(m => m.email) : [user.email]
          })
        ]
      );

      // HARD DELETE: Delete all organization members if owner is deleting account
      // Otherwise, just delete the user's own account
      if (deleteEntireOrganization && user.organization_id) {
        // Delete ALL user_profiles for all organization members
        // This will CASCADE delete all their data (messages, conversations, blob_metadata, etc.)
        const memberIds = allOrgMembers.map(m => m.user_id);
        await client.query(
          `DELETE FROM user_profiles WHERE user_id = ANY($1::uuid[])`,
          [memberIds]
        );

        // Delete the organization itself
        // This triggers CASCADE deletion of:
        // - data_source_connections (organization_id → CASCADE)
        // - pending_invitations (organization_id → CASCADE)
        // - Any other organization-scoped data
        await client.query(
          `DELETE FROM organizations WHERE id = $1`,
          [user.organization_id]
        );

        logger.info({
          organizationId: user.organization_id,
          userId,
          totalMembersDeleted: allOrgMembers.length,
          reason: 'Owner deleted account - entire organization deleted'
        }, 'Organization and all members deleted');

      } else {
        // Single user deletion (non-owner or user without organization)
        // FK constraints with CASCADE will automatically delete:
        // - messages (user_id → CASCADE)
        // - conversations (user_id → CASCADE)
        // - blob_metadata (user_id → CASCADE)
        // - organization_members (user_id → CASCADE via user_profiles FK)
        // - audit_logs (user_id → SET NULL)
        await client.query(
          `DELETE FROM user_profiles WHERE user_id = $1`,
          [userId]
        );

        logger.info({
          userId,
          email: user.email
        }, 'User account deleted');
      }

      await client.query('COMMIT');

      // Trigger SSE event after successful deletion (if user had organization)
      if (user.organization_id) {
        const sseService = getSSEService();
        sseService.sendToOrganization(user.organization_id, {
          type: 'member_deleted_own_account',
          data: {
            userId,
            userEmail: user.email,
            reason: reason || 'User deleted own account',
            timestamp: new Date().toISOString()
          }
        });
      }

      logger.info({
        userId,
        email: user.email,
        organizationId: user.organization_id,
        reason
      }, 'User successfully deleted own account');

      return {
        success: true,
        message: 'Account permanently deleted',
        removedMember: {
          id: userId,
          email: user.email,
          role: user.role || 'user'
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');

      logger.error({
        userId,
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to delete own account - transaction rolled back');

      throw error;

    } finally {
      client.release();
    }
  }
}
