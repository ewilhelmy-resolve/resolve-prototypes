import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InvitationService } from '../InvitationService.js';
import { WebhookService } from '../WebhookService.js';
import type { Pool, PoolClient } from 'pg';

// Mock WebhookService
vi.mock('../WebhookService.js', () => {
  return {
    WebhookService: class MockWebhookService {
      sendGenericEvent = vi.fn().mockResolvedValue({ success: true });
    }
  };
});

describe('InvitationService', () => {
  let invitationService: InvitationService;
  let mockPool: Pool;
  let mockWebhookService: WebhookService;
  let mockClient: PoolClient;

  beforeEach(() => {
    // Mock database pool
    mockClient = {
      query: vi.fn(),
      release: vi.fn()
    } as any;

    mockPool = {
      query: vi.fn(),
      connect: vi.fn().mockResolvedValue(mockClient)
    } as any;

    mockWebhookService = new WebhookService();
    invitationService = new InvitationService(mockPool, mockWebhookService);

    // Set environment variables
    process.env.CLIENT_URL = 'http://localhost:5173';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('sendInvitations', () => {
    const organizationId = 'org-123';
    const invitedByUserId = 'user-456';
    const validEmails = ['test@example.com', 'test2@example.com'];

    beforeEach(() => {
      // Mock organization query
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [
          {
            org_name: 'Test Org',
            inviter_email: 'inviter@example.com'
          }
        ],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);
    });

    it('should successfully send invitations to valid emails', async () => {
      // For 2 emails, we need to mock queries in this order:
      // For each email: member check, user with org check, existing invitation check, existingCheck, INSERT

      // Email 1: test@example.com
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [], command: '', oid: 0, rowCount: 0, fields: [] } as any); // member check
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [], command: '', oid: 0, rowCount: 0, fields: [] } as any); // user with org check
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [], command: '', oid: 0, rowCount: 0, fields: [] } as any); // existing invitation check

      // Email 2: test2@example.com
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [], command: '', oid: 0, rowCount: 0, fields: [] } as any); // member check
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [], command: '', oid: 0, rowCount: 0, fields: [] } as any); // user with org check
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [], command: '', oid: 0, rowCount: 0, fields: [] } as any); // existing invitation check

      // Now process invitations (for each valid email):
      // Email 1: existingCheck + INSERT
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [], command: '', oid: 0, rowCount: 0, fields: [] } as any); // existingCheck
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [{ id: 'inv-1' }], command: 'INSERT', oid: 0, rowCount: 1, fields: [] } as any); // INSERT

      // Email 2: existingCheck + INSERT
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [], command: '', oid: 0, rowCount: 0, fields: [] } as any); // existingCheck
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [{ id: 'inv-2' }], command: 'INSERT', oid: 0, rowCount: 1, fields: [] } as any); // INSERT

      const result = await invitationService.sendInvitations(
        organizationId,
        invitedByUserId,
        validEmails
      );

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(result.invitations).toHaveLength(2);
      expect(result.invitations[0].status).toBe('sent');
      expect(result.invitations[1].status).toBe('sent');
      expect(mockWebhookService.sendGenericEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId,
          userId: invitedByUserId,
          source: 'rita-chat',
          action: 'send_invitation'
        })
      );
    });

    it('should skip users who are already members (INV006)', async () => {
      // Mock member check (is a member)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ user_id: 'user-789' }],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);

      const result = await invitationService.sendInvitations(
        organizationId,
        invitedByUserId,
        ['existing@example.com']
      );

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.invitations[0].status).toBe('skipped');
      expect(result.invitations[0].code).toBe('INV006');
      expect(result.invitations[0].reason).toBe('User is already a member of this organization');
      expect(mockWebhookService.sendGenericEvent).not.toHaveBeenCalled();
    });

    it('should skip users who already have an organization (INV012)', async () => {
      // Mock member check (not a member)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      // Mock user with org check (has an org)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ user_id: 'user-789' }],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);

      const result = await invitationService.sendInvitations(
        organizationId,
        invitedByUserId,
        ['hasorg@example.com']
      );

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.invitations[0].status).toBe('skipped');
      expect(result.invitations[0].code).toBe('INV012');
      expect(result.invitations[0].reason).toBe('User already has an organization');
      expect(mockWebhookService.sendGenericEvent).not.toHaveBeenCalled();
    });

    it('should skip invalid email formats (INV007)', async () => {
      const result = await invitationService.sendInvitations(
        organizationId,
        invitedByUserId,
        ['invalid-email', 'no-at-sign', '@missing-local.com']
      );

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(3);
      expect(result.invitations[0].status).toBe('skipped');
      expect(result.invitations[0].code).toBe('INV007');
      expect(result.invitations[0].reason).toBe('Invalid email format');
      expect(mockWebhookService.sendGenericEvent).not.toHaveBeenCalled();
    });

    it('should skip already-accepted invitations (INV003)', async () => {
      // Mock member check (not a member)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      // Mock user with org check (no org)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      // Mock existing invitation check (accepted)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ id: 'inv-existing', status: 'accepted' }],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);

      // Mock user existence check (user EXISTS - so don't clean up)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ user_id: 'existing-user-123' }],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);

      const result = await invitationService.sendInvitations(
        organizationId,
        invitedByUserId,
        ['accepted@example.com']
      );

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.invitations[0].status).toBe('skipped');
      expect(result.invitations[0].code).toBe('INV003');
      expect(result.invitations[0].reason).toBe('User already accepted invitation');
      expect(mockWebhookService.sendGenericEvent).not.toHaveBeenCalled();
    });

    it('should handle webhook failures and mark invitations as failed', async () => {
      // Mock member check (not a member)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      // Mock user with org check (no org)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      // Mock existing invitation check (none)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      // Mock existingCheck query (line 143-147)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      // Mock invitation INSERT
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ id: 'inv-1' }],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);

      // Mock UPDATE for failed status
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);

      // Mock webhook failure
      vi.mocked(mockWebhookService.sendGenericEvent).mockResolvedValueOnce({
        success: false,
        status: 500
      });

      const result = await invitationService.sendInvitations(
        organizationId,
        invitedByUserId,
        ['test@example.com']
      );

      expect(result.success).toBe(false);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.invitations[0].status).toBe('failed');
      expect(result.invitations[0].code).toBe('INV009');
      expect(result.invitations[0].reason).toBe('Webhook failed to send invitation emails');
    });

    it('should allow resending pending invitations', async () => {
      // Mock member check (not a member)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      // Mock user with org check (no org)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      // Mock existing invitation check (pending)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ id: 'inv-existing', status: 'pending' }],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);

      // Mock existingCheck query (line 143-147) - returns existing invitation
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ id: 'inv-existing' }],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);

      // Mock invitation UPDATE
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ id: 'inv-existing' }],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);

      const result = await invitationService.sendInvitations(
        organizationId,
        invitedByUserId,
        ['pending@example.com']
      );

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);
      expect(result.invitations[0].status).toBe('sent');
      expect(mockWebhookService.sendGenericEvent).toHaveBeenCalled();
    });

    it('should generate 64-character hex tokens', async () => {
      // Mock member check (not a member)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      // Mock user with org check (no org)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      // Mock existing invitation check (none)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      // Mock existingCheck query (line 143-147)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      // Mock invitation INSERT
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ id: 'inv-1' }],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);

      await invitationService.sendInvitations(
        organizationId,
        invitedByUserId,
        ['test@example.com']
      );

      // Check webhook was called with proper token format
      const webhookCall = vi.mocked(mockWebhookService.sendGenericEvent).mock.calls[0][0];
      const invitation = webhookCall.additionalData?.invitations[0];
      expect(invitation?.invitation_token).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('verifyToken', () => {
    it('should return valid for a valid token', async () => {
      const token = 'a'.repeat(64);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [
          {
            email: 'test@example.com',
            token_expires_at: expiresAt,
            status: 'pending',
            organization_name: 'Test Org',
            inviter_name: 'inviter@example.com'
          }
        ],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);

      const result = await invitationService.verifyToken(token);

      expect(result.valid).toBe(true);
      expect(result.invitation).toBeTruthy();
      expect(result.invitation?.email).toBe('test@example.com');
      expect(result.invitation?.organizationName).toBe('Test Org');
    });

    it('should return invalid for expired tokens (INV002)', async () => {
      const token = 'a'.repeat(64);
      const expiresAt = new Date(Date.now() - 1000); // Expired 1 second ago

      vi.mocked(mockPool.query)
        .mockResolvedValueOnce({
          rows: [
            {
              email: 'test@example.com',
              token_expires_at: expiresAt,
              status: 'pending',
              organization_name: 'Test Org',
              inviter_name: 'inviter@example.com'
            }
          ],
          command: '',
          oid: 0,
          rowCount: 1,
          fields: []
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          command: '',
          oid: 0,
          rowCount: 1,
          fields: []
        } as any); // UPDATE query

      const result = await invitationService.verifyToken(token);

      expect(result.valid).toBe(false);
      expect(result.invitation).toBeNull();
      expect(result.error).toBe('Invitation has expired');
    });

    it('should return invalid for wrong token format (INV001)', async () => {
      const shortToken = 'abc123';

      const result = await invitationService.verifyToken(shortToken);

      expect(result.valid).toBe(false);
      expect(result.invitation).toBeNull();
      expect(result.error).toBe('Invalid token format');
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should return invalid for non-existent tokens', async () => {
      const token = 'a'.repeat(64);

      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      const result = await invitationService.verifyToken(token);

      expect(result.valid).toBe(false);
      expect(result.invitation).toBeNull();
      expect(result.error).toBe('Invitation not found');
    });

    it('should return invalid for already-accepted invitations (INV003)', async () => {
      const token = 'a'.repeat(64);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [
          {
            email: 'test@example.com',
            token_expires_at: expiresAt,
            status: 'accepted',
            organization_name: 'Test Org',
            inviter_name: 'inviter@example.com'
          }
        ],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);

      const result = await invitationService.verifyToken(token);

      expect(result.valid).toBe(false);
      expect(result.invitation).toBeNull();
      expect(result.error).toBe('Invitation has already been accepted');
    });

    it('should return invalid for cancelled invitations (INV004)', async () => {
      const token = 'a'.repeat(64);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [
          {
            email: 'test@example.com',
            token_expires_at: expiresAt,
            status: 'cancelled',
            organization_name: 'Test Org',
            inviter_name: 'inviter@example.com'
          }
        ],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);

      const result = await invitationService.verifyToken(token);

      expect(result.valid).toBe(false);
      expect(result.invitation).toBeNull();
      expect(result.error).toBe('Invitation has been cancelled');
    });
  });

  describe('acceptInvitation', () => {
    const token = 'a'.repeat(64);
    const firstName = 'John';
    const lastName = 'Doe';
    const password = 'SecurePass123!';
    const email = 'test@example.com';

    beforeEach(() => {
      // Mock verifyToken (valid)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [
          {
            email,
            token_expires_at: expiresAt,
            status: 'pending',
            organization_name: 'Test Org',
            inviter_name: 'inviter@example.com'
          }
        ],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);
    });

    it('should successfully accept a valid invitation', async () => {
      // Mock existing user check (none)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      // Mock get invitation details
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ id: 'inv-123', organization_id: 'org-456' }],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);

      // Mock update invitation status
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ id: 'inv-123' }],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);

      // Mock auto-cancel query (no competing invitations)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: 'UPDATE',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      const result = await invitationService.acceptInvitation(
        token,
        firstName,
        lastName,
        password
      );

      expect(result.success).toBe(true);
      expect(result.email).toBe(email);
      expect(mockWebhookService.sendGenericEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'rita-chat',
          action: 'accept_invitation',
          additionalData: expect.objectContaining({
            invitation_id: 'inv-123',
            first_name: firstName,
            last_name: lastName,
            email_verified: true
          })
        })
      );
    });

    it('should encode password in base64', async () => {
      // Mock existing user check (none)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      // Mock get invitation details
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ id: 'inv-123', organization_id: 'org-456' }],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);

      // Mock update invitation status
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ id: 'inv-123' }],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);

      // Mock auto-cancel query (no competing invitations)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: 'UPDATE',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      await invitationService.acceptInvitation(token, firstName, lastName, password);

      const webhookCall = vi.mocked(mockWebhookService.sendGenericEvent).mock.calls[0][0];
      const encodedPassword = webhookCall.additionalData?.password as string;

      // Verify it's base64 encoded
      expect(Buffer.from(encodedPassword, 'base64').toString()).toBe(password);
    });

    it('should prevent duplicate account creation (INV010)', async () => {
      // Mock existing user check (user exists)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ user_id: 'existing-user-id' }],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);

      await expect(
        invitationService.acceptInvitation(token, firstName, lastName, password)
      ).rejects.toThrow('An account with this email already exists');
    });

    it('should prevent accepting already-accepted invitations', async () => {
      // Mock existing user check (none)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      // Mock get invitation details (not found because status != pending)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      await expect(
        invitationService.acceptInvitation(token, firstName, lastName, password)
      ).rejects.toThrow('Invitation already accepted or invalid');
    });

    it('should ensure atomic status update', async () => {
      // Mock existing user check (none)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      // Mock get invitation details
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ id: 'inv-123', organization_id: 'org-456' }],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);

      // Mock update with no rows (another request already accepted it)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      await expect(
        invitationService.acceptInvitation(token, firstName, lastName, password)
      ).rejects.toThrow('Invitation already accepted');
    });
  });

  describe('cancelInvitation', () => {
    it('should successfully cancel a pending invitation', async () => {
      const invitationId = 'inv-123';
      const organizationId = 'org-456';

      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ id: invitationId }],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);

      const result = await invitationService.cancelInvitation(invitationId, organizationId);

      expect(result.success).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE pending_invitations'),
        [invitationId, organizationId]
      );
    });

    it('should throw error if invitation not found', async () => {
      const invitationId = 'inv-123';
      const organizationId = 'org-456';

      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      await expect(
        invitationService.cancelInvitation(invitationId, organizationId)
      ).rejects.toThrow('Invitation not found or cannot be cancelled');
    });
  });

  describe('listInvitations', () => {
    it('should list invitations for an organization', async () => {
      const organizationId = 'org-123';

      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [
          {
            id: 'inv-1',
            organization_id: organizationId,
            email: 'test1@example.com',
            status: 'pending',
            invited_by_name: 'inviter@example.com'
          },
          {
            id: 'inv-2',
            organization_id: organizationId,
            email: 'test2@example.com',
            status: 'accepted',
            invited_by_name: 'inviter@example.com'
          }
        ],
        command: '',
        oid: 0,
        rowCount: 2,
        fields: []
      } as any);

      const result = await invitationService.listInvitations(organizationId);

      expect(result).toHaveLength(2);
      expect(result[0].email).toBe('test1@example.com');
      expect(result[1].status).toBe('accepted');
    });

    it('should filter by status', async () => {
      const organizationId = 'org-123';

      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [
          {
            id: 'inv-1',
            organization_id: organizationId,
            email: 'test1@example.com',
            status: 'pending',
            invited_by_name: 'inviter@example.com'
          }
        ],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);

      await invitationService.listInvitations(organizationId, { status: 'pending' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND pi.status = $2'),
        expect.arrayContaining([organizationId, 'pending'])
      );
    });

    it('should respect limit and offset', async () => {
      const organizationId = 'org-123';

      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      await invitationService.listInvitations(organizationId, { limit: 10, offset: 20 });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([organizationId, 10, 20])
      );
    });
  });

  describe('Orphaned Invitation Cleanup (Layer 2: Self-Healing)', () => {
    const organizationId = 'org-123';
    const invitedByUserId = 'user-456';
    const orphanedEmail = 'deleted@example.com';

    beforeEach(() => {
      // Mock organization query
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [
          {
            org_name: 'Test Org',
            inviter_email: 'inviter@example.com'
          }
        ],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);
    });

    it('should clean up orphaned accepted invitation when user deleted', async () => {
      // Mock member check (not a member)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      // Mock user with org check (no org)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      // Mock existing invitation check (accepted invitation exists)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ id: 'orphaned-inv-123', status: 'accepted' }],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);

      // Mock user existence check (user does NOT exist - orphaned!)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      // Mock DELETE orphaned invitation
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: 'DELETE',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);

      // Mock existingCheck (should find no invitation after cleanup)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      // Mock INSERT new invitation
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ id: 'new-inv-456' }],
        command: 'INSERT',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);

      const result = await invitationService.sendInvitations(
        organizationId,
        invitedByUserId,
        [orphanedEmail]
      );

      // Should successfully send new invitation after cleanup
      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);
      expect(result.invitations[0].status).toBe('sent');
      expect(result.invitations[0].email).toBe(orphanedEmail);

      // Verify DELETE was called to clean up orphan
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM pending_invitations WHERE id = $1'),
        ['orphaned-inv-123']
      );

      // Verify webhook was called to send new invitation
      expect(mockWebhookService.sendGenericEvent).toHaveBeenCalled();
    });

    it('should NOT clean up accepted invitation when user still exists', async () => {
      // Mock member check (not a member)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      // Mock user with org check (no org)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      // Mock existing invitation check (accepted invitation exists)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ id: 'valid-inv-123', status: 'accepted' }],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);

      // Mock user existence check (user EXISTS)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ user_id: 'existing-user-123' }],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);

      const result = await invitationService.sendInvitations(
        organizationId,
        invitedByUserId,
        ['active@example.com']
      );

      // Should skip invitation (user exists and already accepted)
      expect(result.success).toBe(true);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.invitations[0].status).toBe('skipped');
      expect(result.invitations[0].code).toBe('INV003');
      expect(result.invitations[0].reason).toBe('User already accepted invitation');

      // Verify DELETE was NOT called (no orphan cleanup)
      expect(mockPool.query).not.toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM pending_invitations'),
        expect.anything()
      );

      // Verify webhook was NOT called
      expect(mockWebhookService.sendGenericEvent).not.toHaveBeenCalled();
    });
  });

  describe('Cross-Organization Invitation Auto-Cancel', () => {
    const token = 'a'.repeat(64);
    const firstName = 'John';
    const lastName = 'Doe';
    const password = 'SecurePass123!';
    const email = 'user@example.com';
    const orgAId = 'org-A-uuid';
    const orgBId = 'org-B-uuid';

    beforeEach(() => {
      // Mock verifyToken (valid)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [
          {
            email,
            token_expires_at: expiresAt,
            status: 'pending',
            organization_name: 'Org A',
            inviter_name: 'inviter@orgA.com'
          }
        ],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);
    });

    it('should auto-cancel competing invitations from other orgs when user accepts', async () => {
      // Mock existing user check (none)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      // Mock get invitation details (Org A)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ id: 'inv-A', organization_id: orgAId }],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);

      // Mock update invitation status (Org A accepted)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ id: 'inv-A' }],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);

      // Mock auto-cancel other pending invitations (Org B cancelled)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [
          { id: 'inv-B', organization_id: orgBId },
          { id: 'inv-C', organization_id: 'org-C-uuid' }
        ],
        command: 'UPDATE',
        oid: 0,
        rowCount: 2,
        fields: []
      } as any);

      const result = await invitationService.acceptInvitation(
        token,
        firstName,
        lastName,
        password
      );

      expect(result.success).toBe(true);
      expect(result.email).toBe(email);

      // Verify auto-cancel query was called
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'cancelled'"),
        [email, 'inv-A']
      );

      // Verify webhook was called
      expect(mockWebhookService.sendGenericEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgAId,
          action: 'accept_invitation'
        })
      );
    });

    it('should handle case where no competing invitations exist', async () => {
      // Mock existing user check (none)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      // Mock get invitation details
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ id: 'inv-only', organization_id: orgAId }],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);

      // Mock update invitation status
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ id: 'inv-only' }],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: []
      } as any);

      // Mock auto-cancel query (no competing invitations found)
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        command: 'UPDATE',
        oid: 0,
        rowCount: 0,
        fields: []
      } as any);

      const result = await invitationService.acceptInvitation(
        token,
        firstName,
        lastName,
        password
      );

      expect(result.success).toBe(true);
      expect(result.email).toBe(email);

      // Verify auto-cancel query was still called (but found nothing)
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'cancelled'"),
        [email, 'inv-only']
      );
    });
  });
});
