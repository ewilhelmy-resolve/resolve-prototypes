import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import memberRoutes from '../members.js';

// Mock dependencies
vi.mock('../../services/memberService.js', () => {
  const listMembers = vi.fn();
  const getMemberDetails = vi.fn();
  const updateMemberRole = vi.fn();
  const updateMemberStatus = vi.fn();
  const removeMember = vi.fn();
  const deleteMemberPermanent = vi.fn();
  const deleteOwnAccount = vi.fn();

  return {
    MemberService: class MockMemberService {
      listMembers = listMembers;
      getMemberDetails = getMemberDetails;
      updateMemberRole = updateMemberRole;
      updateMemberStatus = updateMemberStatus;
      removeMember = removeMember;
      deleteMemberPermanent = deleteMemberPermanent;
      deleteOwnAccount = deleteOwnAccount;
    }
  };
});

vi.mock('../../config/database.js', () => ({
  pool: {
    query: vi.fn()
  }
}));

vi.mock('../../middleware/auth.js', () => ({
  authenticateUser: vi.fn((req, _res, next) => {
    // Inject mock authenticated user
    (req as any).user = {
      id: 'test-user-id',
      activeOrganizationId: 'test-org-id',
      email: 'test@example.com',
      role: 'owner' // Default to owner
    };
    next();
  }),
  requireRole: vi.fn((roles: string[]) => {
    return (req: any, res: any, next: any) => {
      const userRole = req.user?.role || 'user';
      if (roles.includes(userRole)) {
        next();
      } else {
        res.status(403).json({
          error: 'Forbidden',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }
    };
  })
}));

import { MemberService } from '../../services/memberService.js';

describe('Members Routes - API Contracts', () => {
  let app: express.Application;
  let mockMemberService: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/organizations/members', memberRoutes);

    // Get the mocked service instance
    mockMemberService = new MemberService({} as any);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/organizations/members', () => {
    it('should return 200 with member list', async () => {
      mockMemberService.listMembers.mockResolvedValueOnce({
        members: [
          {
            id: 'user-1',
            email: 'user1@example.com',
            firstName: 'User',
            lastName: 'One',
            role: 'owner',
            isActive: true,
            joinedAt: '2024-01-01T00:00:00Z',
            conversationsCount: 5
          }
        ],
        total: 1
      });

      const response = await request(app)
        .get('/api/organizations/members')
        .expect(200);

      expect(response.body).toHaveProperty('members');
      expect(response.body).toHaveProperty('total');
      expect(response.body.members).toHaveLength(1);
      expect(response.body.total).toBe(1);
    });

    it('should accept query parameters for filtering', async () => {
      mockMemberService.listMembers.mockResolvedValueOnce({
        members: [],
        total: 0
      });

      await request(app)
        .get('/api/organizations/members')
        .query({ role: 'admin', limit: '10', offset: '0' })
        .expect(200);

      expect(mockMemberService.listMembers).toHaveBeenCalledWith(
        'test-org-id',
        expect.objectContaining({
          role: 'admin',
          limit: 10,
          offset: 0
        })
      );
    });

    // Auth middleware tests are already covered by middleware tests
    // Skipping duplicate auth testing here
  });

  describe('GET /api/organizations/members/:userId', () => {
    it('should return 200 with member details', async () => {
      mockMemberService.getMemberDetails.mockResolvedValueOnce({
        id: 'user-1',
        email: 'user1@example.com',
        firstName: 'User',
        lastName: 'One',
        role: 'user',
        isActive: true,
        joinedAt: '2024-01-01T00:00:00Z',
        conversationsCount: 5
      });

      const response = await request(app)
        .get('/api/organizations/members/user-1')
        .expect(200);

      expect(response.body).toHaveProperty('member');
      expect(response.body.member.id).toBe('user-1');
    });

    it('should return 404 when member not found', async () => {
      mockMemberService.getMemberDetails.mockRejectedValueOnce(
        new Error('Member not found')
      );

      const response = await request(app)
        .get('/api/organizations/members/user-999')
        .expect(404);

      expect(response.body.code).toBe('MEMBER_NOT_FOUND');
    });
  });

  describe('PATCH /api/organizations/members/:userId/role', () => {
    it('should return 200 when role updated successfully', async () => {
      mockMemberService.updateMemberRole.mockResolvedValueOnce({
        id: 'user-1',
        email: 'user1@example.com',
        role: 'admin',
        isActive: true,
        joinedAt: '2024-01-01T00:00:00Z',
        conversationsCount: 5
      });

      const response = await request(app)
        .patch('/api/organizations/members/user-1/role')
        .send({ role: 'admin' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.member.role).toBe('admin');
    });

    it('should return 400 for invalid role', async () => {
      const response = await request(app)
        .patch('/api/organizations/members/user-1/role')
        .send({ role: 'superadmin' })
        .expect(400);

      expect(response.body.error).toContain('Invalid role');
    });

    it('should return 400 when trying to change own role', async () => {
      mockMemberService.updateMemberRole.mockRejectedValueOnce(
        new Error('Cannot change your own role')
      );

      const response = await request(app)
        .patch('/api/organizations/members/test-user-id/role')
        .send({ role: 'admin' })
        .expect(400);

      expect(response.body.code).toBe('CANNOT_MODIFY_SELF');
    });

    it('should return 409 when demoting last owner', async () => {
      mockMemberService.updateMemberRole.mockRejectedValueOnce(
        new Error('Cannot demote the last active owner')
      );

      const response = await request(app)
        .patch('/api/organizations/members/owner-1/role')
        .send({ role: 'user' })
        .expect(409);

      expect(response.body.code).toBe('LAST_OWNER');
    });

    // Auth middleware role checks are already covered by middleware tests
    // Skipping duplicate role testing here
  });

  describe('PATCH /api/organizations/members/:userId/status', () => {
    it('should return 200 when status updated successfully', async () => {
      mockMemberService.updateMemberStatus.mockResolvedValueOnce({
        id: 'user-1',
        email: 'user1@example.com',
        role: 'user',
        isActive: false,
        joinedAt: '2024-01-01T00:00:00Z',
        conversationsCount: 5
      });

      const response = await request(app)
        .patch('/api/organizations/members/user-1/status')
        .send({ isActive: false })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.member.isActive).toBe(false);
    });

    it('should return 400 for invalid status value', async () => {
      const response = await request(app)
        .patch('/api/organizations/members/user-1/status')
        .send({ isActive: 'maybe' })
        .expect(400);

      expect(response.body.error).toContain('isActive must be a boolean');
    });

    it('should return 400 when trying to change own status', async () => {
      mockMemberService.updateMemberStatus.mockRejectedValueOnce(
        new Error('Cannot change your own status')
      );

      const response = await request(app)
        .patch('/api/organizations/members/test-user-id/status')
        .send({ isActive: false })
        .expect(400);

      expect(response.body.code).toBe('CANNOT_MODIFY_SELF');
    });

    it('should return 403 when admin tries to deactivate owner', async () => {
      mockMemberService.updateMemberStatus.mockRejectedValueOnce(
        new Error('Permission denied: You cannot change this member\'s status')
      );

      const response = await request(app)
        .patch('/api/organizations/members/owner-1/status')
        .send({ isActive: false })
        .expect(403);

      expect(response.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('DELETE /api/organizations/members/:userId', () => {
    it('should return 200 when member removed successfully', async () => {
      mockMemberService.removeMember.mockResolvedValueOnce({
        success: true,
        message: 'Member removed from organization successfully',
        removedMember: {
          id: 'user-1',
          email: 'user1@example.com',
          role: 'user'
        }
      });

      const response = await request(app)
        .delete('/api/organizations/members/user-1')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.removedMember.id).toBe('user-1');
    });

    it('should return 400 when trying to remove self', async () => {
      mockMemberService.removeMember.mockRejectedValueOnce(
        new Error('Cannot remove yourself from the organization')
      );

      const response = await request(app)
        .delete('/api/organizations/members/test-user-id')
        .expect(400);

      expect(response.body.code).toBe('CANNOT_REMOVE_SELF');
    });

    it('should return 409 when removing last owner', async () => {
      mockMemberService.removeMember.mockRejectedValueOnce(
        new Error('Cannot remove the last active owner')
      );

      const response = await request(app)
        .delete('/api/organizations/members/owner-1')
        .expect(409);

      expect(response.body.code).toBe('LAST_OWNER');
    });

    it('should return 403 when admin tries to remove owner', async () => {
      mockMemberService.removeMember.mockRejectedValueOnce(
        new Error('Permission denied: You cannot remove this member')
      );

      const response = await request(app)
        .delete('/api/organizations/members/owner-1')
        .expect(403);

      expect(response.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('Phase 2 Hard Delete Endpoints', () => {
    it('should successfully delete member permanently', async () => {
      mockMemberService.deleteMemberPermanent.mockResolvedValueOnce({
        success: true,
        message: 'Member permanently deleted',
        removedMember: {
          userId: 'user-1',
          email: 'user1@example.com',
          role: 'user'
        }
      });

      const response = await request(app)
        .delete('/api/organizations/members/user-1/permanent?reason=Test deletion')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.removedMember.email).toBe('user1@example.com');
    });

    it('should successfully delete own account', async () => {
      mockMemberService.deleteOwnAccount.mockResolvedValueOnce({
        success: true,
        message: 'Account permanently deleted',
        removedMember: {
          userId: 'test-user-id',
          email: 'test@example.com',
          role: 'owner'
        }
      });

      const response = await request(app)
        .delete('/api/organizations/members/self/permanent?reason=User requested deletion')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.removedMember.email).toBe('test@example.com');
    });
  });

  describe('Input Validation', () => {
    it('should return 400 for missing role in update role', async () => {
      const response = await request(app)
        .patch('/api/organizations/members/user-1/role')
        .send({})
        .expect(400);

      expect(response.body.error).toContain('role');
    });

    it('should return 400 for missing isActive in update status', async () => {
      const response = await request(app)
        .patch('/api/organizations/members/user-1/status')
        .send({})
        .expect(400);

      expect(response.body.error).toContain('isActive');
    });
  });
});
