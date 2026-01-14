/**
 * IframeService.test.ts
 *
 * Tests for iframe session creation using Valkey config.
 * JIT provisioning uses Jarvis IDs directly as Rita IDs (no mapping).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before imports - use vi.hoisted for variables used in vi.mock
const {
  mockWithOrgContext,
  mockPool,
  mockSessionStore,
  mockValkeyClient,
} = vi.hoisted(() => ({
  mockWithOrgContext: vi.fn(),
  mockPool: {
    query: vi.fn(),
  },
  mockSessionStore: {
    createSession: vi.fn(),
    updateSession: vi.fn(),
  },
  mockValkeyClient: {
    hget: vi.fn(),
  },
}));

vi.mock('../../config/database.js', () => ({
  withOrgContext: mockWithOrgContext,
  pool: mockPool,
}));

vi.mock('../sessionStore.js', () => ({
  getSessionStore: vi.fn(() => mockSessionStore),
}));

vi.mock('../sessionService.js', () => ({
  getSessionService: vi.fn(() => ({
    generateSessionCookie: vi.fn().mockReturnValue('session=mock-session-id; Path=/; HttpOnly'),
  })),
}));

vi.mock('../../config/valkey.js', () => ({
  getValkeyClient: () => mockValkeyClient,
}));

vi.mock('../../config/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { IframeService } from '../IframeService.js';

describe('IframeService', () => {
  let iframeService: IframeService;

  // Production Valkey payload structure (snake_case for tenant_id, user_guid)
  const validValkeyPayload = {
    accessToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
    refreshToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
    tabInstanceId: 'b677747a-fc2b-4960-8553-eb69a9d46507',
    tenantName: 'staging',
    tenant_id: '00F4F67D-3B92-4FD2-A574-7BE22C6BE796',
    clientId: 'E14730FA-D1B5-4037-ACE3-CF97FBC676C2',
    clientKey: 'secret-client-key',
    tokenExpiry: 1767902104,
    context: { designer: 'workflow' },
    actionsApiBaseUrl: 'https://actions-api-staging.resolve.io/',
    user_guid: '275fb79d-0a6f-4336-bc05-1f6fcbaf775b',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    iframeService = new IframeService();

    // Default session store behavior
    mockSessionStore.createSession.mockResolvedValue({
      sessionId: 'mock-session-id',
      userId: validValkeyPayload.user_guid,
      organizationId: validValkeyPayload.tenant_id,
    });
    mockSessionStore.updateSession.mockResolvedValue({
      sessionId: 'mock-session-id',
      conversationId: 'new-conversation-id',
    });
  });

  describe('fetchValkeyPayload', () => {
    it('should fetch and parse valid payload from Valkey', async () => {
      mockValkeyClient.hget.mockResolvedValueOnce(JSON.stringify(validValkeyPayload));

      const result = await iframeService.fetchValkeyPayload('352957ba-4e60-49b2-817f-fb0f236a273e');

      expect(result).not.toBeNull();
      expect(result?.tenantId).toBe('00F4F67D-3B92-4FD2-A574-7BE22C6BE796');
      expect(result?.userGuid).toBe('275fb79d-0a6f-4336-bc05-1f6fcbaf775b');
      expect(result?.actionsApiBaseUrl).toBe('https://actions-api-staging.resolve.io/');
      expect(mockValkeyClient.hget).toHaveBeenCalledWith('rita:session:352957ba-4e60-49b2-817f-fb0f236a273e', 'data');
    });

    it('should return null when key not found in Valkey', async () => {
      mockValkeyClient.hget.mockResolvedValueOnce(null);

      const result = await iframeService.fetchValkeyPayload('missing-key');

      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', async () => {
      mockValkeyClient.hget.mockResolvedValueOnce('not-valid-json{{{');

      const result = await iframeService.fetchValkeyPayload('bad-json-key');

      expect(result).toBeNull();
    });

    it('should return null when required fields are missing', async () => {
      const incompletePayload = {
        tenantId: 'tenant-456',
        // Missing userId and other required fields
      };
      mockValkeyClient.hget.mockResolvedValueOnce(JSON.stringify(incompletePayload));

      const result = await iframeService.fetchValkeyPayload('incomplete-key');

      expect(result).toBeNull();
    });

    it('should handle Valkey connection errors', async () => {
      mockValkeyClient.hget.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await iframeService.fetchValkeyPayload('any-key');

      expect(result).toBeNull();
    });

    it('should reject payload missing user_guid', async () => {
      const payloadWithoutUser = {
        accessToken: 'token',
        refreshToken: 'refresh',
        tabInstanceId: 'tab-123',
        tenant_id: 'tenant-456',
        tenantName: 'Test',
        clientId: 'client-abc',
        clientKey: 'key',
        tokenExpiry: Date.now() + 3600000,
        actionsApiBaseUrl: 'https://api.example.com',
        // Missing user_guid
      };
      mockValkeyClient.hget.mockResolvedValueOnce(JSON.stringify(payloadWithoutUser));

      const result = await iframeService.fetchValkeyPayload('no-user-key');

      expect(result).toBeNull();
    });
  });

  describe('validateAndSetup', () => {
    // Helper to set up JIT provisioning mocks (check-first-then-insert pattern)
    const setupJitMocks = (orgExists = false, userExists = false) => {
      mockPool.query
        // resolveRitaOrg: check if exists
        .mockResolvedValueOnce({ rows: orgExists ? [{ id: validValkeyPayload.tenant_id }] : [] })
        // resolveRitaOrg: insert or update
        .mockResolvedValueOnce({ rows: [] })
        // resolveRitaUser: check if exists by keycloak_id
        .mockResolvedValueOnce({ rows: userExists ? [{ user_id: validValkeyPayload.user_guid }] : [] })
        // resolveRitaUser: insert or update
        .mockResolvedValueOnce({ rows: [{ user_id: validValkeyPayload.user_guid }] })
        // ensureOrgMembership (only if org or user was created)
        .mockResolvedValueOnce({ rows: [] });
    };

    it('should reject missing sessionKey', async () => {
      const result = await iframeService.validateAndSetup('');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('sessionKey required');
    });

    it('should reject invalid Valkey config', async () => {
      mockValkeyClient.hget.mockResolvedValueOnce(null);

      const result = await iframeService.validateAndSetup('bad-session-key');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid or missing Valkey configuration');
    });

    it('should use Jarvis IDs directly as Rita IDs', async () => {
      mockValkeyClient.hget.mockResolvedValueOnce(JSON.stringify(validValkeyPayload));
      setupJitMocks(); // new org, new user

      // Mock conversation creation
      mockWithOrgContext.mockImplementation(async (_userId, _orgId, callback) => {
        const mockClient = {
          query: vi.fn().mockResolvedValue({
            rows: [{ id: 'new-conv-id' }],
          }),
        };
        return await callback(mockClient as any);
      });

      const result = await iframeService.validateAndSetup('352957ba-4e60-49b2-817f-fb0f236a273e');

      expect(result.valid).toBe(true);
      expect(result.webhookConfigLoaded).toBe(true);
      expect(result.webhookTenantId).toBe('00F4F67D-3B92-4FD2-A574-7BE22C6BE796');
      expect(result.conversationId).toBe('new-conv-id');

      // Verify org check then insert (now selects name for comparison)
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, name FROM organizations'),
        ['00F4F67D-3B92-4FD2-A574-7BE22C6BE796']
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO organizations'),
        ['00F4F67D-3B92-4FD2-A574-7BE22C6BE796', 'staging']
      );

      // Verify user check then insert
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT user_id FROM user_profiles'),
        ['jarvis-275fb79d-0a6f-4336-bc05-1f6fcbaf775b']
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_profiles'),
        expect.arrayContaining(['275fb79d-0a6f-4336-bc05-1f6fcbaf775b'])
      );

      // Session uses Jarvis IDs
      expect(mockSessionStore.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '275fb79d-0a6f-4336-bc05-1f6fcbaf775b',
          organizationId: '00F4F67D-3B92-4FD2-A574-7BE22C6BE796',
          isIframeSession: true,
        })
      );

      // Conversation created with Jarvis IDs
      expect(mockWithOrgContext).toHaveBeenCalledWith(
        '275fb79d-0a6f-4336-bc05-1f6fcbaf775b',
        '00F4F67D-3B92-4FD2-A574-7BE22C6BE796',
        expect.any(Function)
      );
    });

    it('should use existing conversation ID if provided', async () => {
      mockValkeyClient.hget.mockResolvedValueOnce(JSON.stringify(validValkeyPayload));
      // Org and user resolution with existing records (name same, no update)
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: validValkeyPayload.tenant_id, name: 'staging' }] }) // org exists
        .mockResolvedValueOnce({ rows: [{ user_id: validValkeyPayload.user_guid }] }) // user exists
        .mockResolvedValueOnce({ rows: [] }) // update user
        .mockResolvedValueOnce({ rows: [] }) // membership (always called)
        .mockResolvedValueOnce({ rows: [{ id: 'existing-conversation-id' }] }); // conversation ownership check

      const result = await iframeService.validateAndSetup(
        'my-session-key',
        undefined,
        'existing-conversation-id'
      );

      expect(result.valid).toBe(true);
      expect(result.conversationId).toBe('existing-conversation-id');
      // withOrgContext should not be called when using existing conversation
      expect(mockWithOrgContext).not.toHaveBeenCalled();
    });

    it('should store conversationId in session', async () => {
      mockValkeyClient.hget.mockResolvedValueOnce(JSON.stringify(validValkeyPayload));
      setupJitMocks();

      // Mock conversation creation
      mockWithOrgContext.mockImplementation(async (_userId, _orgId, callback) => {
        const mockClient = {
          query: vi.fn().mockResolvedValue({
            rows: [{ id: 'created-conv-123' }],
          }),
        };
        return await callback(mockClient as any);
      });

      await iframeService.validateAndSetup('my-session-key');

      // Verify updateSession was called with conversationId
      expect(mockSessionStore.updateSession).toHaveBeenCalledWith(
        'mock-session-id',
        { conversationId: 'created-conv-123' }
      );
    });

    it('should pass intentEid to createIframeConversation', async () => {
      mockValkeyClient.hget.mockResolvedValueOnce(JSON.stringify(validValkeyPayload));
      setupJitMocks();

      // Mock conversation creation
      mockWithOrgContext.mockImplementation(async (_userId, _orgId, callback) => {
        const mockClient = {
          query: vi.fn().mockResolvedValue({
            rows: [{ id: 'intent-conv-id' }],
          }),
        };
        return await callback(mockClient as any);
      });

      const result = await iframeService.validateAndSetup('my-session-key', 'intent-eid-123');

      expect(result.valid).toBe(true);
      expect(result.conversationId).toBe('intent-conv-id');
    });

    it('should always call org membership even when both org and user exist', async () => {
      mockValkeyClient.hget.mockResolvedValueOnce(JSON.stringify(validValkeyPayload));
      // Both org and user already exist (org name same, so no update)
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: validValkeyPayload.tenant_id, name: 'staging' }] }) // org exists with same name
        .mockResolvedValueOnce({ rows: [{ user_id: validValkeyPayload.user_guid }] }) // user exists
        .mockResolvedValueOnce({ rows: [] }) // user update
        .mockResolvedValueOnce({ rows: [] }); // membership (always called)

      // Mock conversation creation
      mockWithOrgContext.mockImplementation(async (_userId, _orgId, callback) => {
        const mockClient = {
          query: vi.fn().mockResolvedValue({
            rows: [{ id: 'conv-id' }],
          }),
        };
        return await callback(mockClient as any);
      });

      const result = await iframeService.validateAndSetup('my-session-key');

      expect(result.valid).toBe(true);

      // 4 pool.query calls: org check (no update since name same) + user check + user update + membership
      expect(mockPool.query).toHaveBeenCalledTimes(4);
    });

    it('should create org membership when user is new', async () => {
      mockValkeyClient.hget.mockResolvedValueOnce(JSON.stringify(validValkeyPayload));
      setupJitMocks(true, false); // existing org, new user

      // Mock conversation creation
      mockWithOrgContext.mockImplementation(async (_userId, _orgId, callback) => {
        const mockClient = {
          query: vi.fn().mockResolvedValue({
            rows: [{ id: 'conv-id' }],
          }),
        };
        return await callback(mockClient as any);
      });

      await iframeService.validateAndSetup('my-session-key');

      // 5 pool.query calls: org check + org update + user check + user insert + membership
      expect(mockPool.query).toHaveBeenCalledTimes(5);
      expect(mockPool.query).toHaveBeenLastCalledWith(
        expect.stringContaining('INSERT INTO organization_members'),
        expect.arrayContaining([
          '00F4F67D-3B92-4FD2-A574-7BE22C6BE796', // orgId
          '275fb79d-0a6f-4336-bc05-1f6fcbaf775b', // userId
        ])
      );
    });

    it('should check-first-then-insert for org and user', async () => {
      mockValkeyClient.hget.mockResolvedValueOnce(JSON.stringify(validValkeyPayload));
      setupJitMocks();

      // Mock conversation creation
      mockWithOrgContext.mockImplementation(async (_userId, _orgId, callback) => {
        const mockClient = {
          query: vi.fn().mockResolvedValue({
            rows: [{ id: 'conv-id' }],
          }),
        };
        return await callback(mockClient as any);
      });

      await iframeService.validateAndSetup('my-session-key');

      // Verify org check query (now includes name for comparison)
      const orgCheckQuery = mockPool.query.mock.calls[0][0];
      expect(orgCheckQuery).toContain('SELECT id, name FROM organizations');

      // Verify user check query
      const userCheckQuery = mockPool.query.mock.calls[2][0];
      expect(userCheckQuery).toContain('SELECT user_id FROM user_profiles');
    });

    it('should handle legacy users with old UUID', async () => {
      const legacyUserId = 'legacy-uuid-12345';
      mockValkeyClient.hget.mockResolvedValueOnce(JSON.stringify(validValkeyPayload));
      // Org is new, user exists with legacy UUID
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // org doesn't exist
        .mockResolvedValueOnce({ rows: [] }) // insert org
        .mockResolvedValueOnce({ rows: [{ user_id: legacyUserId }] }) // user exists with legacy UUID
        .mockResolvedValueOnce({ rows: [] }) // update user
        .mockResolvedValueOnce({ rows: [] }); // membership

      // Mock conversation creation
      mockWithOrgContext.mockImplementation(async (_userId, _orgId, callback) => {
        const mockClient = {
          query: vi.fn().mockResolvedValue({
            rows: [{ id: 'conv-id' }],
          }),
        };
        return await callback(mockClient as any);
      });

      const result = await iframeService.validateAndSetup('my-session-key');

      expect(result.valid).toBe(true);

      // Session should use the legacy user_id (not jarvisGuid)
      expect(mockSessionStore.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: legacyUserId,
          organizationId: '00F4F67D-3B92-4FD2-A574-7BE22C6BE796',
        })
      );
    });

  });

  /**
   * Bug fix tests - these document expected behavior after fixes
   * Some will fail until the bugs are fixed
   */
  describe('Bug fixes (expected behavior)', () => {
    // Mock setup helper for existing org/user scenario
    const setupExistingOrgAndUser = () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: validValkeyPayload.tenant_id }] }) // org exists
        .mockResolvedValueOnce({ rows: [] }) // org update
        .mockResolvedValueOnce({ rows: [{ user_id: validValkeyPayload.user_guid }] }) // user exists
        .mockResolvedValueOnce({ rows: [] }) // user update
        .mockResolvedValueOnce({ rows: [] }); // membership (expected to be called)

      mockWithOrgContext.mockImplementation(async (_userId, _orgId, callback) => {
        const mockClient = {
          query: vi.fn().mockResolvedValue({ rows: [{ id: 'conv-id' }] }),
        };
        return await callback(mockClient as any);
      });
    };

    it('BUG #1: should always call ensureOrgMembership even when both org and user exist', async () => {
      // Currently: membership is skipped when both exist
      // Expected: membership should always be called (ON CONFLICT DO NOTHING handles idempotency)
      mockValkeyClient.hget.mockResolvedValueOnce(JSON.stringify(validValkeyPayload));
      setupExistingOrgAndUser();

      const result = await iframeService.validateAndSetup('my-session-key');

      expect(result.valid).toBe(true);
      // This assertion will FAIL until bug is fixed - membership query should be made
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO organization_members'),
        expect.arrayContaining([
          validValkeyPayload.tenant_id,
          validValkeyPayload.user_guid,
        ])
      );
    });

    it('BUG #2: should reject existingConversationId that does not belong to user/org', async () => {
      // Verify conversation belongs to the user before using it
      mockValkeyClient.hget.mockResolvedValueOnce(JSON.stringify(validValkeyPayload));
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: validValkeyPayload.tenant_id, name: 'staging' }] }) // org exists
        .mockResolvedValueOnce({ rows: [{ user_id: validValkeyPayload.user_guid }] }) // user exists
        .mockResolvedValueOnce({ rows: [] }) // user update
        .mockResolvedValueOnce({ rows: [] }) // membership
        // Conversation ownership check - NOT owned by this user
        .mockResolvedValueOnce({ rows: [] });

      const result = await iframeService.validateAndSetup(
        'my-session-key',
        undefined,
        'conversation-from-another-user'
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('BUG #2: should accept existingConversationId that belongs to user', async () => {
      // Valid ownership should succeed
      mockValkeyClient.hget.mockResolvedValueOnce(JSON.stringify(validValkeyPayload));
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: validValkeyPayload.tenant_id, name: 'staging' }] }) // org exists
        .mockResolvedValueOnce({ rows: [{ user_id: validValkeyPayload.user_guid }] }) // user exists
        .mockResolvedValueOnce({ rows: [] }) // user update
        .mockResolvedValueOnce({ rows: [] }) // membership
        // Conversation ownership check - owned by this user
        .mockResolvedValueOnce({ rows: [{ id: 'my-valid-conversation' }] });

      const result = await iframeService.validateAndSetup(
        'my-session-key',
        undefined,
        'my-valid-conversation'
      );

      expect(result.valid).toBe(true);
      expect(result.conversationId).toBe('my-valid-conversation');
    });

    it('BUG #5: should skip org name update when name has not changed', async () => {
      // Currently: UPDATE is always called even if name is same
      // Expected: should only UPDATE when name actually changed
      // Note: This requires changing SELECT to also fetch 'name' column
      mockValkeyClient.hget.mockResolvedValueOnce(JSON.stringify(validValkeyPayload));
      // Org exists with SAME name as incoming payload
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: validValkeyPayload.tenant_id, name: 'staging' }] }) // org exists with same name
        .mockResolvedValueOnce({ rows: [{ user_id: validValkeyPayload.user_guid }] }) // user exists
        .mockResolvedValueOnce({ rows: [] }) // user update
        .mockResolvedValueOnce({ rows: [] }); // membership

      mockWithOrgContext.mockImplementation(async (_userId, _orgId, callback) => {
        const mockClient = {
          query: vi.fn().mockResolvedValue({ rows: [{ id: 'conv-id' }] }),
        };
        return await callback(mockClient as any);
      });

      await iframeService.validateAndSetup('my-session-key');

      // This assertion will FAIL until bug is fixed - no UPDATE should be made
      const updateOrgCalls = mockPool.query.mock.calls.filter(
        call => call[0].includes('UPDATE organizations')
      );
      expect(updateOrgCalls).toHaveLength(0);
    });

    it('BUG #5: should update org name when name has changed', async () => {
      // When name is different, UPDATE should be called
      mockValkeyClient.hget.mockResolvedValueOnce(JSON.stringify(validValkeyPayload));
      // Org exists with DIFFERENT name
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: validValkeyPayload.tenant_id, name: 'old-tenant-name' }] })
        .mockResolvedValueOnce({ rows: [] }) // org update (when name changed)
        .mockResolvedValueOnce({ rows: [{ user_id: validValkeyPayload.user_guid }] }) // user exists
        .mockResolvedValueOnce({ rows: [] }) // user update
        .mockResolvedValueOnce({ rows: [] }); // membership

      mockWithOrgContext.mockImplementation(async (_userId, _orgId, callback) => {
        const mockClient = {
          query: vi.fn().mockResolvedValue({ rows: [{ id: 'conv-id' }] }),
        };
        return await callback(mockClient as any);
      });

      await iframeService.validateAndSetup('my-session-key');

      // UPDATE should be called when name changed
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE organizations SET name'),
        ['staging', validValkeyPayload.tenant_id]
      );
    });
  });
});
