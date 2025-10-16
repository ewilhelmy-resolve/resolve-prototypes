import type { Pool } from 'pg';
import { createChildLogger } from '../config/logger.js';
import { getSSEService } from './sse.js';
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
      sortBy = 'joinedAt',
      sortOrder = 'desc'
    } = options;

    // Build query with optional role filter and conversation counts
    let query = `
      SELECT
        up.user_id as id,
        up.email,
        up.first_name,
        up.last_name,
        om.role,
        om.is_active,
        om.joined_at,
        COALESCE(conv_count.count, 0)::INTEGER as conversations_count
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

    // Add sorting
    const sortColumn = sortBy === 'email' ? 'up.email' :
                       sortBy === 'role' ? 'om.role' :
                       'om.joined_at';
    query += ` ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`;

    // Add pagination
    params.push(limit, offset);
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await this.pool.query(query, params);

    // Get total count (without pagination)
    let countQuery = `
      SELECT COUNT(*) as total
      FROM organization_members om
      WHERE om.organization_id = $1
    `;
    const countParams: any[] = [organizationId];

    if (role) {
      countParams.push(role);
      countQuery += ` AND om.role = $${countParams.length}`;
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
   * Permanently delete a member (hard delete with Keycloak cleanup)
   * Phase 2: Requires webhook integration
   *
   * @throws Error - Not implemented in Phase 1
   */
  async deleteMemberPermanent(
    organizationId: string,
    userId: string,
    performedBy: string,
    reason?: string
  ): Promise<never> {
    logger.warn({
      organizationId,
      userId,
      performedBy,
      reason
    }, 'Attempted to call Phase 2 method: deleteMemberPermanent');

    throw new Error('Hard delete not implemented - Phase 2 feature');
  }

  /**
   * Delete own account
   * Phase 2: Requires webhook integration
   *
   * @throws Error - Not implemented in Phase 1
   */
  async deleteOwnAccount(userId: string, reason?: string): Promise<never> {
    logger.warn({
      userId,
      reason
    }, 'Attempted to call Phase 2 method: deleteOwnAccount');

    throw new Error('Delete own account not implemented - Phase 2 feature');
  }
}
