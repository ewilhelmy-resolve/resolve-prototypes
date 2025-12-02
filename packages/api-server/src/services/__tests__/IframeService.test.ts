/**
 * IframeService.test.ts
 *
 * Tests for iframe token validation and session creation.
 * Uses mocks for database and session dependencies.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before imports - use vi.hoisted for variables used in vi.mock
const { mockPoolQuery, mockWithOrgContext } = vi.hoisted(() => ({
  mockPoolQuery: vi.fn(),
  mockWithOrgContext: vi.fn(),
}));

vi.mock('../../config/database.js', () => ({
  pool: {
    query: mockPoolQuery,
  },
  withOrgContext: mockWithOrgContext,
}));

vi.mock('./sessionStore.js', () => ({
  getSessionStore: vi.fn(() => ({
    createSession: vi.fn().mockResolvedValue({
      sessionId: 'mock-session-id',
      userId: '00000000-0000-0000-0000-000000000002',
      organizationId: '00000000-0000-0000-0000-000000000001',
    }),
  })),
}));

vi.mock('./sessionService.js', () => ({
  getSessionService: vi.fn(() => ({
    generateSessionCookie: vi.fn().mockReturnValue('session=mock-session-id; Path=/; HttpOnly'),
  })),
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
});
