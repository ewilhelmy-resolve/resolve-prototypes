/**
 * IframeService.test.ts
 *
 * Tests for iframe token validation and session creation.
 * Uses mocks for database and session dependencies.
 *
 * Includes tests for:
 * - Token validation
 * - Session creation with webhook config
 * - conversationId storage in session for message routing
 * - Valkey payload fetching
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before imports - use vi.hoisted for variables used in vi.mock
const { mockPoolQuery, mockWithOrgContext, mockSessionStore, mockValkeyClient } = vi.hoisted(() => ({
  mockPoolQuery: vi.fn(),
  mockWithOrgContext: vi.fn(),
  mockSessionStore: {
    createSession: vi.fn().mockResolvedValue({
      sessionId: 'mock-session-id',
      userId: '00000000-0000-0000-0000-000000000002',
      organizationId: '00000000-0000-0000-0000-000000000001',
    }),
    updateSession: vi.fn().mockResolvedValue({
      sessionId: 'mock-session-id',
      userId: '00000000-0000-0000-0000-000000000002',
      organizationId: '00000000-0000-0000-0000-000000000001',
      conversationId: 'new-conversation-id',
    }),
  },
  mockValkeyClient: {
    hget: vi.fn(),
  },
}));

vi.mock('../../config/database.js', () => ({
  pool: {
    query: mockPoolQuery,
  },
  withOrgContext: mockWithOrgContext,
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

import {
  IframeService,
  PUBLIC_USER_ID,
  PUBLIC_ORG_ID,
  isPublicUser,
  isPublicOrganization,
} from '../IframeService.js';

describe('IframeService', () => {
  let iframeService: IframeService;

  beforeEach(() => {
    vi.clearAllMocks();
    iframeService = new IframeService();
  });

  describe('validateToken', () => {
    it('should return token info for valid active token', async () => {
      mockPoolQuery.mockResolvedValueOnce({
        rows: [{
          id: 'token-id-1',
          token: 'valid-token',
          name: 'Test Token',
          description: 'Test description',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await iframeService.validateToken('valid-token');

      expect(result).not.toBeNull();
      expect(result?.token).toBe('valid-token');
      expect(result?.name).toBe('Test Token');
      expect(result?.isActive).toBe(true);
    });

    it('should return null for invalid token', async () => {
      mockPoolQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      const result = await iframeService.validateToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null for empty token', async () => {
      mockPoolQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      const result = await iframeService.validateToken('');

      expect(result).toBeNull();
    });
  });

  describe('validateAndSetup', () => {
    it('should reject missing token', async () => {
      const result = await iframeService.validateAndSetup('');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token required');
      expect(result.conversationId).toBeUndefined();
      expect(result.cookie).toBeUndefined();
    });

    it('should reject invalid token', async () => {
      mockPoolQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      const result = await iframeService.validateAndSetup('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid or inactive token');
      expect(result.conversationId).toBeUndefined();
      expect(result.cookie).toBeUndefined();
    });

    it('should accept valid token and create session', async () => {
      // Mock token validation
      mockPoolQuery.mockResolvedValueOnce({
        rows: [{
          id: 'token-id-1',
          token: 'valid-token',
          name: 'Test Token',
          description: null,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Mock conversation creation
      mockWithOrgContext.mockImplementation(async (_userId, _orgId, callback) => {
        const mockClient = {
          query: vi.fn().mockResolvedValue({
            rows: [{ id: 'new-conversation-id' }],
          }),
        };
        return await callback(mockClient as any);
      });

      const result = await iframeService.validateAndSetup('valid-token');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.publicUserId).toBe(PUBLIC_USER_ID);
      expect(result.conversationId).toBe('new-conversation-id');
      expect(result.cookie).toBeDefined();
      expect(result.tokenName).toBe('Test Token');
    });

    it('should use existing conversation ID if provided', async () => {
      // Mock token validation
      mockPoolQuery.mockResolvedValueOnce({
        rows: [{
          id: 'token-id-1',
          token: 'valid-token',
          name: 'Test Token',
          description: null,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await iframeService.validateAndSetup(
        'valid-token',
        undefined,
        'existing-conversation-id'
      );

      expect(result.valid).toBe(true);
      expect(result.conversationId).toBe('existing-conversation-id');
      // withOrgContext should not be called when using existing conversation
      expect(mockWithOrgContext).not.toHaveBeenCalled();
    });

    it('should pass intent-eid to conversation creation', async () => {
      // Mock token validation
      mockPoolQuery.mockResolvedValueOnce({
        rows: [{
          id: 'token-id-1',
          token: 'valid-token',
          name: 'Test Token',
          description: null,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Mock conversation creation
      mockWithOrgContext.mockImplementation(async (_userId, _orgId, callback) => {
        const mockClient = {
          query: vi.fn().mockResolvedValue({
            rows: [{ id: 'new-conversation-id' }],
          }),
        };
        return await callback(mockClient as any);
      });

      const result = await iframeService.validateAndSetup('valid-token', 'test-intent-123');

      expect(result.valid).toBe(true);
      expect(result.conversationId).toBeDefined();
    });
  });

  describe('helper functions', () => {
    it('isPublicUser should correctly identify public user', () => {
      expect(isPublicUser(PUBLIC_USER_ID)).toBe(true);
      expect(isPublicUser('some-other-id')).toBe(false);
    });

    it('isPublicOrganization should correctly identify public org', () => {
      expect(isPublicOrganization(PUBLIC_ORG_ID)).toBe(true);
      expect(isPublicOrganization('some-other-id')).toBe(false);
    });
  });

  describe('conversationId storage for message routing', () => {
    it('should store conversationId in session after creation', async () => {
      // Mock token validation
      mockPoolQuery.mockResolvedValueOnce({
        rows: [{
          id: 'token-id-1',
          token: 'valid-token',
          name: 'Test Token',
          description: null,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Mock conversation creation
      mockWithOrgContext.mockImplementation(async (_userId, _orgId, callback) => {
        const mockClient = {
          query: vi.fn().mockResolvedValue({
            rows: [{ id: 'created-conv-123' }],
          }),
        };
        return await callback(mockClient as any);
      });

      await iframeService.validateAndSetup('valid-token');

      // Verify updateSession was called with conversationId
      expect(mockSessionStore.updateSession).toHaveBeenCalledWith(
        'mock-session-id',
        { conversationId: 'created-conv-123' }
      );
    });

    it('should store existing conversationId in session', async () => {
      // Mock token validation
      mockPoolQuery.mockResolvedValueOnce({
        rows: [{
          id: 'token-id-1',
          token: 'valid-token',
          name: 'Test Token',
          description: null,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      await iframeService.validateAndSetup('valid-token', undefined, 'existing-conv-456');

      // Should still update session with the existing conversationId
      expect(mockSessionStore.updateSession).toHaveBeenCalledWith(
        'mock-session-id',
        { conversationId: 'existing-conv-456' }
      );
    });
  });

  describe('fetchValkeyPayload', () => {
    const validValkeyPayload = {
      accessToken: 'jwt-access-token',
      refreshToken: 'jwt-refresh-token',
      tabInstanceId: 'tab-123',
      tenantId: 'tenant-456',
      tenantName: 'Test Tenant',
      chatSessionId: 'chat-789',
      clientId: 'client-abc',
      clientKey: 'secret-key',
      tokenExpiry: Date.now() + 3600000,
      actionsApiBaseUrl: 'https://api.example.com',
      context: { workflowGuid: 'wf-123' },
    };

    it('should fetch and parse valid payload from Valkey', async () => {
      mockValkeyClient.hget.mockResolvedValueOnce(JSON.stringify(validValkeyPayload));

      const result = await iframeService.fetchValkeyPayload('hashkey-123');

      expect(result).not.toBeNull();
      expect(result?.tenantId).toBe('tenant-456');
      expect(result?.actionsApiBaseUrl).toBe('https://api.example.com');
      expect(result?.context).toEqual({ workflowGuid: 'wf-123' });
      expect(mockValkeyClient.hget).toHaveBeenCalledWith('rita:session:hashkey-123', 'data');
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
        // Missing other required fields
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
  });

  describe('validateAndSetup with hashkey (webhook config)', () => {
    const validValkeyPayload = {
      accessToken: 'jwt-access-token',
      refreshToken: 'jwt-refresh-token',
      tabInstanceId: 'tab-123',
      tenantId: 'tenant-456',
      tenantName: 'Test Tenant',
      chatSessionId: 'chat-789',
      clientId: 'client-abc',
      clientKey: 'secret-key',
      tokenExpiry: Date.now() + 3600000,
      actionsApiBaseUrl: 'https://api.example.com',
    };

    it('should load webhook config and include in result', async () => {
      // Mock token validation
      mockPoolQuery.mockResolvedValueOnce({
        rows: [{
          id: 'token-id-1',
          token: 'valid-token',
          name: 'Test Token',
          description: null,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Mock Valkey payload
      mockValkeyClient.hget.mockResolvedValueOnce(JSON.stringify(validValkeyPayload));

      // Mock conversation creation
      mockWithOrgContext.mockImplementation(async (_userId, _orgId, callback) => {
        const mockClient = {
          query: vi.fn().mockResolvedValue({
            rows: [{ id: 'new-conv-id' }],
          }),
        };
        return await callback(mockClient as any);
      });

      const result = await iframeService.validateAndSetup('valid-token', undefined, undefined, 'my-hashkey');

      expect(result.valid).toBe(true);
      expect(result.webhookConfigLoaded).toBe(true);
      expect(result.webhookTenantId).toBe('tenant-456');
    });

    it('should continue without webhook config if hashkey invalid', async () => {
      // Mock token validation
      mockPoolQuery.mockResolvedValueOnce({
        rows: [{
          id: 'token-id-1',
          token: 'valid-token',
          name: 'Test Token',
          description: null,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Mock Valkey returns null (key not found)
      mockValkeyClient.hget.mockResolvedValueOnce(null);

      // Mock conversation creation
      mockWithOrgContext.mockImplementation(async (_userId, _orgId, callback) => {
        const mockClient = {
          query: vi.fn().mockResolvedValue({
            rows: [{ id: 'new-conv-id' }],
          }),
        };
        return await callback(mockClient as any);
      });

      const result = await iframeService.validateAndSetup('valid-token', undefined, undefined, 'invalid-hashkey');

      // Should still succeed, just without webhook config
      expect(result.valid).toBe(true);
      expect(result.webhookConfigLoaded).toBeFalsy();
    });

    it('should pass webhook config to session creation', async () => {
      // Mock token validation
      mockPoolQuery.mockResolvedValueOnce({
        rows: [{
          id: 'token-id-1',
          token: 'valid-token',
          name: 'Test Token',
          description: null,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Mock Valkey payload
      mockValkeyClient.hget.mockResolvedValueOnce(JSON.stringify(validValkeyPayload));

      // Mock conversation creation
      mockWithOrgContext.mockImplementation(async (_userId, _orgId, callback) => {
        const mockClient = {
          query: vi.fn().mockResolvedValue({
            rows: [{ id: 'new-conv-id' }],
          }),
        };
        return await callback(mockClient as any);
      });

      await iframeService.validateAndSetup('valid-token', undefined, undefined, 'my-hashkey');

      // Verify createSession was called with webhook config
      expect(mockSessionStore.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: PUBLIC_USER_ID,
          organizationId: PUBLIC_ORG_ID,
          iframeWebhookConfig: expect.objectContaining({
            tenantId: 'tenant-456',
            actionsApiBaseUrl: 'https://api.example.com',
          }),
        })
      );
    });
  });
});
