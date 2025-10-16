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

    // Validate sortBy
    if (sortBy && !['email', 'role', 'joinedAt'].includes(sortBy as string)) {
      return res.status(400).json({
        error: 'Invalid sortBy. Must be one of: email, role, joinedAt',
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
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
      sortBy: sortBy as 'email' | 'role' | 'joinedAt',
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
// Phase 2 Placeholder Endpoints (Not Implemented)
// ============================================================================

/**
 * DELETE /api/organizations/members/:userId/permanent
 * Permanently delete a member (hard delete)
 * Phase 2: Requires webhook integration with Keycloak
 * Auth: Required (owner only)
 */
router.delete('/:userId/permanent', authenticateUser, requireRole(['owner']), async (req, res) => {
  const authReq = req as AuthenticatedRequest;

  logger.warn({
    userId: authReq.user.id,
    organizationId: authReq.user.activeOrganizationId,
    targetUserId: req.params.userId
  }, 'Attempted to call Phase 2 endpoint: deleteMemberPermanent');

  res.status(501).json({
    error: 'Hard delete not implemented',
    code: 'NOT_IMPLEMENTED',
    message: 'Permanent member deletion will be available in Phase 2. This feature requires webhook integration for Keycloak account cleanup.'
  });
});

/**
 * DELETE /api/organizations/members/self/permanent
 * Delete own account
 * Phase 2: Requires webhook integration with Keycloak
 * Auth: Required (any authenticated user)
 */
router.delete('/self/permanent', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;

  logger.warn({
    userId: authReq.user.id,
    organizationId: authReq.user.activeOrganizationId
  }, 'Attempted to call Phase 2 endpoint: deleteOwnAccount');

  res.status(501).json({
    error: 'Delete own account not implemented',
    code: 'NOT_IMPLEMENTED',
    message: 'Self-deletion will be available in Phase 2. This feature requires webhook integration for Keycloak account cleanup and organization deletion if you are the last owner.'
  });
});

export default router;
