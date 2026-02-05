import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemberService } from '../memberService.js';
import type { Pool } from 'pg';

// Mock WebhookService to avoid DATABASE_URL requirement
vi.mock('../WebhookService.js', () => {
  return {
    WebhookService: class MockWebhookService {
      deleteKeycloakUser = vi.fn().mockResolvedValue({
        success: true,
        status: 200
      });
    }
  };
});

// Mock SSE service
vi.mock('../sse.js', () => ({
  getSSEService: vi.fn(() => ({
    sendToOrganization: vi.fn()
  }))
}));

describe('MemberService - Critical Business Rules', () => {
  let memberService: MemberService;
  let mockPool: Pool;
  let mockClient: any;

  beforeEach(() => {
    // Mock database client
    mockClient = {
      query: vi.fn(),
      release: vi.fn()
    };

    // Mock pool
    mockPool = {
      query: vi.fn(),
      connect: vi.fn().mockResolvedValue(mockClient)
    } as any;

    memberService = new MemberService(mockPool);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Last Owner Protection', () => {
    const orgId = 'org-123';
    const ownerId = 'owner-456';
    const performerId = 'admin-789';

    it('should prevent demoting last active owner', async () => {
      // Mock BEGIN
      mockClient.query.mockResolvedValueOnce({});

      // Mock current role check (user is owner)
      mockClient.query.mockResolvedValueOnce({
        rows: [{ role: 'owner', is_active: true }],
        rowCount: 1
      });

      // Mock isLastActiveOwner check (returns 0 other owners)
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ owner_count: 0 }],
        rowCount: 1
      });

      // Mock ROLLBACK
      mockClient.query.mockResolvedValueOnce({});

      await expect(
        memberService.updateMemberRole(orgId, ownerId, 'admin', performerId)
      ).rejects.toThrow('Cannot demote the last active owner');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should allow demoting owner when other active owners exist', async () => {
      // Mock BEGIN
      mockClient.query.mockResolvedValueOnce({});

      // Mock current role check (user is owner)
      mockClient.query.mockResolvedValueOnce({
        rows: [{ role: 'owner', is_active: true }],
        rowCount: 1
      });

      // Mock isLastActiveOwner check (returns 2 other owners)
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ owner_count: 2 }],
        rowCount: 1
      });

      // Mock UPDATE role
      mockClient.query.mockResolvedValueOnce({});

      // Mock member details query
      mockClient.query.mockResolvedValueOnce({
        rows: [{ email: 'owner@example.com', first_name: 'Owner', last_name: 'User' }],
        rowCount: 1
      });

      // Mock audit log INSERT
      mockClient.query.mockResolvedValueOnce({});

      // Mock COMMIT
      mockClient.query.mockResolvedValueOnce({});

      // Mock getMemberDetails (called after commit)
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{
          id: ownerId,
          email: 'owner@example.com',
          first_name: 'Owner',
          last_name: 'User',
          role: 'admin',
          is_active: true,
          joined_at: new Date(),
          conversations_count: 5
        }],
        rowCount: 1
      });

      const result = await memberService.updateMemberRole(orgId, ownerId, 'admin', performerId);

      expect(result.role).toBe('admin');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should prevent deactivating last active owner', async () => {
      // Mock BEGIN
      mockClient.query.mockResolvedValueOnce({});

      // Mock permission check - get roles
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ performer_role: 'owner', target_role: 'owner' }],
        rowCount: 1
      });

      // Mock current status check (user is active owner)
      mockClient.query.mockResolvedValueOnce({
        rows: [{ role: 'owner', is_active: true }],
        rowCount: 1
      });

      // Mock isLastActiveOwner check (returns 0 other owners)
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ owner_count: 0 }],
        rowCount: 1
      });

      // Mock ROLLBACK
      mockClient.query.mockResolvedValueOnce({});

      await expect(
        memberService.updateMemberStatus(orgId, ownerId, false, performerId)
      ).rejects.toThrow('Cannot deactivate the last active owner');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should prevent removing last active owner', async () => {
      // Mock BEGIN
      mockClient.query.mockResolvedValueOnce({});

      // Mock permission check - get roles
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ performer_role: 'owner', target_role: 'owner' }],
        rowCount: 1
      });

      // Mock member details query (user is active owner)
      mockClient.query.mockResolvedValueOnce({
        rows: [{ email: 'owner@example.com', role: 'owner', is_active: true }],
        rowCount: 1
      });

      // Mock isLastActiveOwner check (returns 0 other owners)
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ owner_count: 0 }],
        rowCount: 1
      });

      // Mock ROLLBACK
      mockClient.query.mockResolvedValueOnce({});

      await expect(
        memberService.removeMember(orgId, ownerId, performerId)
      ).rejects.toThrow('Cannot remove the last active owner');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('Self-Modification Prevention', () => {
    const orgId = 'org-123';
    const userId = 'user-456';

    it('should prevent changing own role', async () => {
      // Mock BEGIN
      mockClient.query.mockResolvedValueOnce({});

      // Mock ROLLBACK
      mockClient.query.mockResolvedValueOnce({});

      await expect(
        memberService.updateMemberRole(orgId, userId, 'admin', userId)
      ).rejects.toThrow('Cannot change your own role');

      // Should rollback transaction
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should prevent changing own status', async () => {
      // Mock BEGIN
      mockClient.query.mockResolvedValueOnce({});

      // Mock ROLLBACK
      mockClient.query.mockResolvedValueOnce({});

      await expect(
        memberService.updateMemberStatus(orgId, userId, false, userId)
      ).rejects.toThrow('Cannot change your own status');

      // Should rollback transaction
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should prevent removing self', async () => {
      // Mock BEGIN
      mockClient.query.mockResolvedValueOnce({});

      // Mock ROLLBACK
      mockClient.query.mockResolvedValueOnce({});

      await expect(
        memberService.removeMember(orgId, userId, userId)
      ).rejects.toThrow('Cannot remove yourself from the organization');

      // Should rollback transaction
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('Permission Matrix', () => {
    const orgId = 'org-123';

    describe('canPerformAction', () => {
      it('should allow owners to manage all members', async () => {
        (mockPool.query as any).mockResolvedValueOnce({
          rows: [{ performer_role: 'owner', target_role: 'user' }],
          rowCount: 1
        });

        const result = await memberService.canPerformAction(
          orgId,
          'owner-123',
          'user-456',
          'remove_member'
        );

        expect(result).toBe(true);
      });

      it('should prevent owners from managing themselves', async () => {
        (mockPool.query as any).mockResolvedValueOnce({
          rows: [{ performer_role: 'owner', target_role: 'owner' }],
          rowCount: 1
        });

        const result = await memberService.canPerformAction(
          orgId,
          'owner-123',
          'owner-123', // Same user
          'update_role'
        );

        expect(result).toBe(false);
      });

      it('should allow admins to remove regular users', async () => {
        (mockPool.query as any).mockResolvedValueOnce({
          rows: [{ performer_role: 'admin', target_role: 'user' }],
          rowCount: 1
        });

        const result = await memberService.canPerformAction(
          orgId,
          'admin-123',
          'user-456',
          'remove_member'
        );

        expect(result).toBe(true);
      });

      it('should prevent admins from removing owners', async () => {
        (mockPool.query as any).mockResolvedValueOnce({
          rows: [{ performer_role: 'admin', target_role: 'owner' }],
          rowCount: 1
        });

        const result = await memberService.canPerformAction(
          orgId,
          'admin-123',
          'owner-456',
          'remove_member'
        );

        expect(result).toBe(false);
      });

      it('should prevent admins from removing other admins', async () => {
        (mockPool.query as any).mockResolvedValueOnce({
          rows: [{ performer_role: 'admin', target_role: 'admin' }],
          rowCount: 1
        });

        const result = await memberService.canPerformAction(
          orgId,
          'admin-123',
          'admin-456',
          'remove_member'
        );

        expect(result).toBe(false);
      });

      it('should prevent admins from changing any roles', async () => {
        (mockPool.query as any).mockResolvedValueOnce({
          rows: [{ performer_role: 'admin', target_role: 'user' }],
          rowCount: 1
        });

        const result = await memberService.canPerformAction(
          orgId,
          'admin-123',
          'user-456',
          'update_role'
        );

        expect(result).toBe(false);
      });

      it('should prevent regular users from performing any management actions', async () => {
        (mockPool.query as any).mockResolvedValueOnce({
          rows: [{ performer_role: 'user', target_role: 'user' }],
          rowCount: 1
        });

        const result = await memberService.canPerformAction(
          orgId,
          'user-123',
          'user-456',
          'remove_member'
        );

        expect(result).toBe(false);
      });
    });

    it('should enforce permissions in updateMemberStatus', async () => {
      const orgId = 'org-123';
      const adminId = 'admin-123';
      const ownerId = 'owner-456';

      // Mock BEGIN
      mockClient.query.mockResolvedValueOnce({});

      // Mock permission check - admin cannot manage owner
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ performer_role: 'admin', target_role: 'owner' }],
        rowCount: 1
      });

      // Mock ROLLBACK
      mockClient.query.mockResolvedValueOnce({});

      await expect(
        memberService.updateMemberStatus(orgId, ownerId, false, adminId)
      ).rejects.toThrow('Permission denied: You cannot change this member\'s status');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should enforce permissions in removeMember', async () => {
      const orgId = 'org-123';
      const adminId = 'admin-123';
      const ownerId = 'owner-456';

      // Mock BEGIN
      mockClient.query.mockResolvedValueOnce({});

      // Mock permission check - admin cannot remove owner
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ performer_role: 'admin', target_role: 'owner' }],
        rowCount: 1
      });

      // Mock ROLLBACK
      mockClient.query.mockResolvedValueOnce({});

      await expect(
        memberService.removeMember(orgId, ownerId, adminId)
      ).rejects.toThrow('Permission denied: You cannot remove this member');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('Member Not Found', () => {
    const orgId = 'org-123';
    const performerId = 'owner-123';
    const nonExistentId = 'user-999';

    it('should throw error when updating role of non-existent member', async () => {
      // Mock BEGIN
      mockClient.query.mockResolvedValueOnce({});

      // Mock current role check (no rows)
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      // Mock ROLLBACK
      mockClient.query.mockResolvedValueOnce({});

      await expect(
        memberService.updateMemberRole(orgId, nonExistentId, 'admin', performerId)
      ).rejects.toThrow('Member not found');
    });

    it('should throw error when getting details of non-existent member', async () => {
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      await expect(
        memberService.getMemberDetails(orgId, nonExistentId)
      ).rejects.toThrow('Member not found');
    });
  });

  describe('Active Organization ID Cleanup', () => {
    it('should clear active_organization_id when removing member', async () => {
      const orgId = 'org-123';
      const userId = 'user-456';
      const performerId = 'owner-789';

      // Mock BEGIN
      mockClient.query.mockResolvedValueOnce({});

      // Mock permission check - owner can remove user
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ performer_role: 'owner', target_role: 'user' }],
        rowCount: 1
      });

      // Mock member details query
      mockClient.query.mockResolvedValueOnce({
        rows: [{ email: 'user@example.com', role: 'user', is_active: true }],
        rowCount: 1
      });

      // Mock audit log INSERT
      mockClient.query.mockResolvedValueOnce({});

      // Mock DELETE from organization_members
      mockClient.query.mockResolvedValueOnce({});

      // Mock UPDATE user_profiles (clear active_organization_id)
      mockClient.query.mockResolvedValueOnce({});

      // Mock COMMIT
      mockClient.query.mockResolvedValueOnce({});

      await memberService.removeMember(orgId, userId, performerId);

      // Verify UPDATE query was called with correct parameters
      const updateCall = mockClient.query.mock.calls.find((call: any) =>
        call[0].includes('UPDATE user_profiles')
      );

      expect(updateCall).toBeDefined();
      expect(updateCall[0]).toContain('active_organization_id = NULL');
      expect(updateCall[1]).toEqual([userId, orgId]);
    });
  });

  describe('Phase 2 Hard Delete Methods', () => {
    it('deleteMemberPermanent should call webhook and delete user', async () => {
      const orgId = 'org-123';
      const userId = 'user-456';
      const performerId = 'owner-789';

      // Mock BEGIN
      mockClient.query.mockResolvedValueOnce({});

      // Mock permission check
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ performer_role: 'owner', target_role: 'user' }],
        rowCount: 1
      });

      // Mock member details
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          user_id: userId,
          email: 'user@example.com',
          first_name: 'Test',
          last_name: 'User',
          role: 'user',
          is_active: true,
          joined_at: new Date()
        }],
        rowCount: 1
      });

      // Mock invitation cleanup DELETE
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      // Mock audit log INSERT
      mockClient.query.mockResolvedValueOnce({});

      // Mock DELETE user_profiles
      mockClient.query.mockResolvedValueOnce({});

      // Mock COMMIT
      mockClient.query.mockResolvedValueOnce({});

      const result = await memberService.deleteMemberPermanent(orgId, userId, performerId);

      expect(result.success).toBe(true);
      expect(result.removedMember.email).toBe('user@example.com');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('deleteOwnAccount should handle last owner self-deletion', async () => {
      const userId = 'owner-123';

      // Mock BEGIN
      mockClient.query.mockResolvedValueOnce({});

      // Mock user details
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          user_id: userId,
          email: 'owner@example.com',
          first_name: 'Owner',
          last_name: 'User',
          organization_id: 'org-123',
          role: 'owner',
          is_active: true
        }],
        rowCount: 1
      });

      // Mock all org members
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          user_id: userId,
          email: 'owner@example.com',
          role: 'owner'
        }],
        rowCount: 1
      });

      // Mock isLastActiveOwner check (returns 0 other owners = is last owner)
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ owner_count: 0 }],
        rowCount: 1
      });

      // Mock invitation cleanup DELETE (for entire organization)
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      // Mock audit log INSERT
      mockClient.query.mockResolvedValueOnce({});

      // Mock DELETE user_profiles (batch delete all members)
      mockClient.query.mockResolvedValueOnce({});

      // Mock DELETE organization
      mockClient.query.mockResolvedValueOnce({});

      // Mock COMMIT
      mockClient.query.mockResolvedValueOnce({});

      const result = await memberService.deleteOwnAccount(userId);

      expect(result.success).toBe(true);
      expect(result.removedMember.email).toBe('owner@example.com');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('deleteOwnAccount should handle owner self-deletion with other owners', async () => {
      const userId = 'owner-123';

      // Mock BEGIN
      mockClient.query.mockResolvedValueOnce({});

      // Mock user details
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          user_id: userId,
          email: 'owner@example.com',
          first_name: 'Owner',
          last_name: 'User',
          organization_id: 'org-123',
          role: 'owner',
          is_active: true
        }],
        rowCount: 1
      });

      // Mock all org members (2 owners)
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            user_id: userId,
            email: 'owner@example.com',
            role: 'owner'
          },
          {
            user_id: 'owner-456',
            email: 'owner2@example.com',
            role: 'owner'
          }
        ],
        rowCount: 2
      });

      // Mock isLastActiveOwner check (returns 1 other owner = not last owner)
      (mockPool.query as any).mockResolvedValueOnce({
        rows: [{ owner_count: 1 }],
        rowCount: 1
      });

      // Mock invitation cleanup DELETE (for single user)
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      // Mock audit log INSERT
      mockClient.query.mockResolvedValueOnce({});

      // Mock DELETE user_profiles (only delete this owner)
      mockClient.query.mockResolvedValueOnce({});

      // Mock COMMIT
      mockClient.query.mockResolvedValueOnce({});

      const result = await memberService.deleteOwnAccount(userId);

      expect(result.success).toBe(true);
      expect(result.removedMember.email).toBe('owner@example.com');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });
});
