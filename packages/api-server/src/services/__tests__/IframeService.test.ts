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

  // Production Valkey payload structure (from staging environment)
  const validValkeyPayload = {
    accessToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
    refreshToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
    tabInstanceId: 'b677747a-fc2b-4960-8553-eb69a9d46507',
    tenantName: 'staging',
    tenantId: '00F4F67D-3B92-4FD2-A574-7BE22C6BE796',
    chatSessionId: 'b974d74f-a440-4a78-bbf8-82fb9c5c1518',
    clientId: 'E14730FA-D1B5-4037-ACE3-CF97FBC676C2',
    clientKey: 'secret-client-key',
    tokenExpiry: 1767902104,
    context: { designer: 'workflow' },
    actionsApiBaseUrl: 'https://actions-api-staging.resolve.io/',
    userGuid: '275fb79d-0a6f-4336-bc05-1f6fcbaf775b',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    iframeService = new IframeService();

    // Default session store behavior
    mockSessionStore.createSession.mockResolvedValue({
      sessionId: 'mock-session-id',
      userId: validValkeyPayload.userGuid,
      organizationId: validValkeyPayload.tenantId,
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

    it('should reject payload missing userGuid', async () => {
      const payloadWithoutUser = {
        accessToken: 'token',
        refreshToken: 'refresh',
        tabInstanceId: 'tab-123',
        tenantId: 'tenant-456',
        tenantName: 'Test',
        chatSessionId: 'chat-789',
        clientId: 'client-abc',
        clientKey: 'key',
        tokenExpiry: Date.now() + 3600000,
        actionsApiBaseUrl: 'https://api.example.com',
        // Missing userGuid
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
        .mockResolvedValueOnce({ rows: orgExists ? [{ id: validValkeyPayload.tenantId }] : [] })
        // resolveRitaOrg: insert or update
        .mockResolvedValueOnce({ rows: [] })
        // resolveRitaUser: check if exists by keycloak_id
        .mockResolvedValueOnce({ rows: userExists ? [{ user_id: validValkeyPayload.userGuid }] : [] })
        // resolveRitaUser: insert or update
        .mockResolvedValueOnce({ rows: [{ user_id: validValkeyPayload.userGuid }] })
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

      // Verify org check then insert
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM organizations'),
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
      // Org and user resolution with existing records
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: validValkeyPayload.tenantId }] }) // org exists
        .mockResolvedValueOnce({ rows: [] }) // update org
        .mockResolvedValueOnce({ rows: [{ user_id: validValkeyPayload.userGuid }] }) // user exists
        .mockResolvedValueOnce({ rows: [] }); // update user

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

    it('should skip org membership when both org and user exist', async () => {
      mockValkeyClient.hget.mockResolvedValueOnce(JSON.stringify(validValkeyPayload));
      // Both org and user already exist
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: validValkeyPayload.tenantId }] }) // org exists
        .mockResolvedValueOnce({ rows: [] }) // update org
        .mockResolvedValueOnce({ rows: [{ user_id: validValkeyPayload.userGuid }] }) // user exists
        .mockResolvedValueOnce({ rows: [] }); // update user
      // No membership query should be called

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

      // 4 pool.query calls (org check + org update + user check + user update), no membership
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

      // Verify org check query
      const orgCheckQuery = mockPool.query.mock.calls[0][0];
      expect(orgCheckQuery).toContain('SELECT id FROM organizations');

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
});
