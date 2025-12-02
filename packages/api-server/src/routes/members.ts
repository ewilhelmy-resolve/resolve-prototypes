import express from 'express';
import { pool } from '../config/database.js';
import { MemberService } from '../services/memberService.js';
import { authenticateUser, requireRole } from '../middleware/auth.js';
import { logger } from '../config/logger.js';
import type { AuthenticatedRequest } from '../types/express.js';
import type { OrganizationRole } from '../types/member.js';

const router = express.Router();
const memberService = new MemberService(pool);

/**
 * GET /api/organizations/members
 * List all members in the organization
 * Auth: Required (owner/admin)
 * Query params: role, limit, offset, sortBy, sortOrder
 */
router.get('/', authenticateUser, requireRole(['owner', 'admin']), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const organizationId = authReq.user.activeOrganizationId;

    // Parse query parameters
    const {
      role,
      status,
      search,
      limit = '50',
      offset = '0',
      sortBy = 'joinedAt',
      sortOrder = 'desc'
    } = req.query;

    // Validate role if provided
    if (role && !['owner', 'admin', 'user'].includes(role as string)) {
      return res.status(400).json({
        error: 'Invalid role. Must be one of: owner, admin, user',
        code: 'INVALID_ROLE'
      });
    }

    // Validate status if provided
    if (status && !['active', 'inactive'].includes(status as string)) {
      return res.status(400).json({
        error: 'Invalid status. Must be one of: active, inactive',
        code: 'INVALID_STATUS'
      });
    }

    // Validate sortBy
    if (sortBy && !['name', 'role', 'status', 'joinedAt', 'conversationsCount'].includes(sortBy as string)) {
      return res.status(400).json({
        error: 'Invalid sortBy. Must be one of: name, role, status, joinedAt, conversationsCount',
        code: 'INVALID_SORT'
      });
    }

    // Validate sortOrder
    if (sortOrder && !['asc', 'desc'].includes(sortOrder as string)) {
      return res.status(400).json({
        error: 'Invalid sortOrder. Must be asc or desc',
        code: 'INVALID_SORT_ORDER'
      });
    }

    const result = await memberService.listMembers(organizationId, {
      role: role as OrganizationRole | undefined,
      status: status as 'active' | 'inactive' | undefined,
      search: search as string | undefined,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
      sortBy: sortBy as 'name' | 'role' | 'status' | 'joinedAt' | 'conversationsCount',
      sortOrder: sortOrder as 'asc' | 'desc'
    });

    logger.debug({
      organizationId,
      userId: authReq.user.id,
      count: result.members.length,
      total: result.total
    }, 'Listed members');

    res.json(result);
  } catch (error) {
    logger.error({
      error,
      userId: authReq.user.id,
      organizationId: authReq.user.activeOrganizationId
    }, 'Failed to list members');
    res.status(500).json({
      error: 'Failed to list members',
      code: 'LIST_MEMBERS_FAILED'
    });
  }
});

/**
 * GET /api/organizations/members/:userId
 * Get detailed information about a specific member
 * Auth: Required (owner/admin)
 */
router.get('/:userId', authenticateUser, requireRole(['owner', 'admin']), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { userId } = req.params;
    const organizationId = authReq.user.activeOrganizationId;

    const member = await memberService.getMemberDetails(organizationId, userId);

    logger.debug({
      organizationId,
      userId: authReq.user.id,
      targetUserId: userId
    }, 'Retrieved member details');

    res.json({ member });
  } catch (error) {
    logger.error({
      error,
      userId: authReq.user.id,
      organizationId: authReq.user.activeOrganizationId,
      targetUserId: req.params.userId
    }, 'Failed to get member details');

    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Member not found',
        code: 'MEMBER_NOT_FOUND'
      });
    }

    res.status(500).json({
      error: 'Failed to get member details',
      code: 'GET_MEMBER_FAILED'
    });
  }
});

/**
 * PATCH /api/organizations/members/:userId/role
 * Update a member's role
 * Auth: Required (owner only)
 * Body: { role: 'owner' | 'admin' | 'user' }
 */
router.patch('/:userId/role', authenticateUser, requireRole(['owner']), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const organizationId = authReq.user.activeOrganizationId;
    const performedBy = authReq.user.id;

    // Validate role
    if (!role || !['owner', 'admin', 'user'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role. Must be one of: owner, admin, user',
        code: 'INVALID_ROLE'
      });
    }

    const updatedMember = await memberService.updateMemberRole(
      organizationId,
      userId,
      role,
      performedBy
    );

    logger.info({
      organizationId,
      userId: performedBy,
      targetUserId: userId,
      newRole: role
    }, 'Member role updated');

    res.json({
      success: true,
      member: updatedMember,
      message: 'Member role updated successfully'
    });
  } catch (error) {
    logger.error({
      error,
      userId: authReq.user.id,
      organizationId: authReq.user.activeOrganizationId,
      targetUserId: req.params.userId
    }, 'Failed to update member role');

    if (error instanceof Error) {
      if (error.message.includes('own role')) {
        return res.status(400).json({
          error: 'Cannot change your own role',
          code: 'CANNOT_MODIFY_SELF'
        });
      }
      if (error.message.includes('last active owner')) {
        return res.status(409).json({
          error: 'Cannot demote the last active owner',
          code: 'LAST_OWNER'
        });
      }
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Member not found',
          code: 'MEMBER_NOT_FOUND'
        });
      }
    }

    res.status(500).json({
      error: 'Failed to update member role',
      code: 'UPDATE_ROLE_FAILED'
    });
  }
});

/**
 * PATCH /api/organizations/members/:userId/status
 * Update a member's active status (activate/deactivate)
 * Auth: Required (owner/admin with restrictions)
 * Body: { isActive: boolean }
 */
router.patch('/:userId/status', authenticateUser, requireRole(['owner', 'admin']), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    const organizationId = authReq.user.activeOrganizationId;
    const performedBy = authReq.user.id;

    // Validate isActive
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        error: 'isActive must be a boolean',
        code: 'INVALID_STATUS'
      });
    }

    const updatedMember = await memberService.updateMemberStatus(
      organizationId,
      userId,
      isActive,
      performedBy
    );

    logger.info({
      organizationId,
      userId: performedBy,
      targetUserId: userId,
      isActive
    }, 'Member status updated');

    res.json({
      success: true,
      member: updatedMember,
      message: `Member ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    logger.error({
      error,
      userId: authReq.user.id,
      organizationId: authReq.user.activeOrganizationId,
      targetUserId: req.params.userId
    }, 'Failed to update member status');

    if (error instanceof Error) {
      if (error.message.includes('own status')) {
        return res.status(400).json({
          error: 'Cannot change your own status',
          code: 'CANNOT_MODIFY_SELF'
        });
      }
      if (error.message.includes('last active owner')) {
        return res.status(409).json({
          error: 'Cannot deactivate the last active owner',
          code: 'LAST_OWNER'
        });
      }
      if (error.message.includes('Permission denied')) {
        return res.status(403).json({
          error: error.message,
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Member not found',
          code: 'MEMBER_NOT_FOUND'
        });
      }
    }

    res.status(500).json({
      error: 'Failed to update member status',
      code: 'UPDATE_STATUS_FAILED'
    });
  }
});

/**
 * DELETE /api/organizations/members/:userId
 * Remove a member from the organization (soft delete)
 * Auth: Required (owner/admin with restrictions)
 * Note: This removes the membership but preserves the user account
 */
router.delete('/:userId', authenticateUser, requireRole(['owner', 'admin']), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { userId } = req.params;
    const organizationId = authReq.user.activeOrganizationId;
    const performedBy = authReq.user.id;

    const result = await memberService.removeMember(
      organizationId,
      userId,
      performedBy
    );

    logger.info({
      organizationId,
      userId: performedBy,
      targetUserId: userId
    }, 'Member removed from organization');

    res.json(result);
  } catch (error) {
    logger.error({
      error,
      userId: authReq.user.id,
      organizationId: authReq.user.activeOrganizationId,
      targetUserId: req.params.userId
    }, 'Failed to remove member');

    if (error instanceof Error) {
      if (error.message.includes('yourself')) {
        return res.status(400).json({
          error: 'Cannot remove yourself from the organization',
          code: 'CANNOT_REMOVE_SELF'
        });
      }
      if (error.message.includes('last active owner')) {
        return res.status(409).json({
          error: 'Cannot remove the last active owner',
          code: 'LAST_OWNER'
        });
      }
      if (error.message.includes('Permission denied')) {
        return res.status(403).json({
          error: error.message,
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Member not found',
          code: 'MEMBER_NOT_FOUND'
        });
      }
    }

    res.status(500).json({
      error: 'Failed to remove member',
      code: 'REMOVE_MEMBER_FAILED'
    });
  }
});

// ============================================================================
// Phase 2 Hard Delete Endpoints
// ============================================================================

/**
 * DELETE /api/organizations/members/self/permanent
 * Delete own account
 * Phase 2: Webhook integration with Keycloak
 * Auth: Required (any authenticated user)
 *
 * IMPORTANT: This route MUST come before /:userId/permanent to avoid
 * Express matching "self" as a userId parameter
 */
router.delete('/self/permanent', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const { reason } = req.query;

  logger.info({
    userId: authReq.user.id,
    organizationId: authReq.user.activeOrganizationId,
    reason
  }, 'Processing delete own account request');

  try {
    const result = await memberService.deleteOwnAccount(
      authReq.user.id,
      reason as string | undefined
    );

    logger.info({
      userId: authReq.user.id,
      email: result.removedMember.email,
      organizationId: authReq.user.activeOrganizationId
    }, 'User successfully deleted own account');

    res.status(200).json(result);

  } catch (error) {
    logger.error({
      userId: authReq.user.id,
      organizationId: authReq.user.activeOrganizationId,
      error: error instanceof Error ? error.message : String(error)
    }, 'Failed to delete own account');

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Map specific error messages to appropriate HTTP status codes
    if (errorMessage.includes('not found')) {
      res.status(404).json({ error: errorMessage, code: 'NOT_FOUND' });
    } else if (errorMessage.includes('last active owner')) {
      res.status(400).json({ error: errorMessage, code: 'LAST_OWNER' });
    } else if (errorMessage.includes('Keycloak deletion failed')) {
      res.status(502).json({ error: errorMessage, code: 'WEBHOOK_FAILED' });
    } else {
      res.status(500).json({ error: 'Failed to delete account', code: 'INTERNAL_ERROR' });
    }
  }
});

/**
 * DELETE /api/organizations/members/:userId/permanent
 * Permanently delete a member (hard delete)
 * Phase 2: Webhook integration with Keycloak
 * Auth: Required (owner only)
 *
 * IMPORTANT: This route MUST come after /self/permanent to avoid
 * matching "self" as a userId parameter
 */
router.delete('/:userId/permanent', authenticateUser, requireRole(['owner']), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const { userId: targetUserId } = req.params;
  const { reason } = req.query;

  logger.info({
    userId: authReq.user.id,
    organizationId: authReq.user.activeOrganizationId,
    targetUserId,
    reason
  }, 'Processing permanent member deletion request');

  try {
    const result = await memberService.deleteMemberPermanent(
      authReq.user.activeOrganizationId,
      targetUserId,
      authReq.user.id,
      reason as string | undefined
    );

    logger.info({
      userId: authReq.user.id,
      organizationId: authReq.user.activeOrganizationId,
      targetUserId,
      targetEmail: result.removedMember.email
    }, 'Member permanently deleted successfully');

    res.status(200).json(result);

  } catch (error) {
    logger.error({
      userId: authReq.user.id,
      organizationId: authReq.user.activeOrganizationId,
      targetUserId,
      error: error instanceof Error ? error.message : String(error)
    }, 'Failed to permanently delete member');

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Map specific error messages to appropriate HTTP status codes
    if (errorMessage.includes('Permission denied')) {
      res.status(403).json({ error: errorMessage, code: 'FORBIDDEN' });
    } else if (errorMessage.includes('not found')) {
      res.status(404).json({ error: errorMessage, code: 'NOT_FOUND' });
    } else if (errorMessage.includes('last active owner')) {
      res.status(400).json({ error: errorMessage, code: 'LAST_OWNER' });
    } else if (errorMessage.includes('Cannot delete yourself')) {
      res.status(400).json({ error: errorMessage, code: 'CANNOT_DELETE_SELF' });
    } else if (errorMessage.includes('Keycloak deletion failed')) {
      res.status(502).json({ error: errorMessage, code: 'WEBHOOK_FAILED' });
    } else {
      res.status(500).json({ error: 'Failed to delete member', code: 'INTERNAL_ERROR' });
    }
  }
});

export default router;
