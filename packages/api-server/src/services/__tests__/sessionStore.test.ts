/**
 * sessionStore.test.ts
 *
 * Tests for in-memory session store, focusing on:
 * - Session CRUD operations
 * - conversationId storage and retrieval (for iframe message routing)
 * - Session expiration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import the class directly for testing (not the singleton)
// We need to access the internal class, so we'll test via the factory
import {
  getSessionStore,
  destroySessionStore,
  type Session,
  type CreateSessionData,
} from '../sessionStore.js';

describe('sessionStore', () => {
  let sessionStore: ReturnType<typeof getSessionStore>;

  beforeEach(() => {
    // Destroy any existing store to get fresh instance
    destroySessionStore();
    sessionStore = getSessionStore();
  });

  afterEach(() => {
    destroySessionStore();
    vi.restoreAllMocks();
  });

  describe('createSession', () => {
    it('should create session with basic data', async () => {
      const sessionData: CreateSessionData = {
        userId: 'user-123',
        organizationId: 'org-456',
        userEmail: 'test@example.com',
      };

      const session = await sessionStore.createSession(sessionData);

      expect(session.sessionId).toBeDefined();
      expect(session.sessionId.length).toBe(64); // 32 bytes hex
      expect(session.userId).toBe('user-123');
      expect(session.organizationId).toBe('org-456');
      expect(session.userEmail).toBe('test@example.com');
      expect(session.expiresAt).toBeInstanceOf(Date);
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.lastAccessedAt).toBeInstanceOf(Date);
    });

    it('should create session with optional fields', async () => {
      const sessionData: CreateSessionData = {
        userId: 'user-123',
        organizationId: 'org-456',
        userEmail: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      const session = await sessionStore.createSession(sessionData);

      expect(session.firstName).toBe('John');
      expect(session.lastName).toBe('Doe');
    });

    it('should create session with iframe webhook config', async () => {
      const webhookConfig = {
        accessToken: 'token-123',
        refreshToken: 'refresh-456',
        tabInstanceId: 'tab-789',
        tenantId: 'tenant-abc',
        tenantName: 'Test Tenant',
        clientId: 'client-ghi',
        clientKey: 'key-jkl',
        tokenExpiry: Date.now() + 3600000,
        actionsApiBaseUrl: 'https://api.example.com',
        userGuid: 'host-user-123',
      };

      const sessionData: CreateSessionData = {
        userId: 'user-123',
        organizationId: 'org-456',
        userEmail: 'test@example.com',
        iframeWebhookConfig: webhookConfig,
      };

      const session = await sessionStore.createSession(sessionData);

      expect(session.iframeWebhookConfig).toEqual(webhookConfig);
    });

    it('should set default 24-hour expiration', async () => {
      const beforeCreate = Date.now();

      const session = await sessionStore.createSession({
        userId: 'user-123',
        organizationId: 'org-456',
        userEmail: 'test@example.com',
      });

      const expectedExpiry = beforeCreate + 24 * 60 * 60 * 1000;
      const actualExpiry = session.expiresAt.getTime();

      // Allow 1 second tolerance
      expect(actualExpiry).toBeGreaterThanOrEqual(expectedExpiry - 1000);
      expect(actualExpiry).toBeLessThanOrEqual(expectedExpiry + 1000);
    });

    it('should respect custom session duration', async () => {
      const customDuration = 60 * 60 * 1000; // 1 hour
      const beforeCreate = Date.now();

      const session = await sessionStore.createSession({
        userId: 'user-123',
        organizationId: 'org-456',
        userEmail: 'test@example.com',
        sessionDurationMs: customDuration,
      });

      const expectedExpiry = beforeCreate + customDuration;
      const actualExpiry = session.expiresAt.getTime();

      expect(actualExpiry).toBeGreaterThanOrEqual(expectedExpiry - 1000);
      expect(actualExpiry).toBeLessThanOrEqual(expectedExpiry + 1000);
    });
  });

  describe('getSession', () => {
    it('should retrieve existing session', async () => {
      const created = await sessionStore.createSession({
        userId: 'user-123',
        organizationId: 'org-456',
        userEmail: 'test@example.com',
      });

      const retrieved = await sessionStore.getSession(created.sessionId);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.sessionId).toBe(created.sessionId);
      expect(retrieved?.userId).toBe('user-123');
    });

    it('should return null for non-existent session', async () => {
      const retrieved = await sessionStore.getSession('non-existent-id');

      expect(retrieved).toBeNull();
    });

    it('should return null for expired session', async () => {
      // Create session with very short duration
      const session = await sessionStore.createSession({
        userId: 'user-123',
        organizationId: 'org-456',
        userEmail: 'test@example.com',
        sessionDurationMs: 1, // 1ms
      });

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 10));

      const retrieved = await sessionStore.getSession(session.sessionId);

      expect(retrieved).toBeNull();
    });
  });

  describe('updateSession', () => {
    it('should update session fields', async () => {
      const session = await sessionStore.createSession({
        userId: 'user-123',
        organizationId: 'org-456',
        userEmail: 'test@example.com',
      });

      const updated = await sessionStore.updateSession(session.sessionId, {
        firstName: 'Updated',
        lastName: 'Name',
      });

      expect(updated).not.toBeNull();
      expect(updated?.firstName).toBe('Updated');
      expect(updated?.lastName).toBe('Name');
      expect(updated?.userId).toBe('user-123'); // Unchanged
    });

    it('should update conversationId for iframe routing', async () => {
      const session = await sessionStore.createSession({
        userId: '00000000-0000-0000-0000-000000000002',
        organizationId: '00000000-0000-0000-0000-000000000001',
        userEmail: 'public-guest@internal.system',
      });

      expect(session.conversationId).toBeUndefined();

      const updated = await sessionStore.updateSession(session.sessionId, {
        conversationId: 'conv-abc-123',
      });

      expect(updated?.conversationId).toBe('conv-abc-123');

      // Verify it persists on retrieval
      const retrieved = await sessionStore.getSession(session.sessionId);
      expect(retrieved?.conversationId).toBe('conv-abc-123');
    });

    it('should not allow changing sessionId', async () => {
      const session = await sessionStore.createSession({
        userId: 'user-123',
        organizationId: 'org-456',
        userEmail: 'test@example.com',
      });

      const originalId = session.sessionId;

      const updated = await sessionStore.updateSession(session.sessionId, {
        sessionId: 'hacked-id',
      } as Partial<Session>);

      expect(updated?.sessionId).toBe(originalId);
    });

    it('should update lastAccessedAt on update', async () => {
      const session = await sessionStore.createSession({
        userId: 'user-123',
        organizationId: 'org-456',
        userEmail: 'test@example.com',
      });

      const originalAccess = session.lastAccessedAt;

      // Small delay to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await sessionStore.updateSession(session.sessionId, {
        firstName: 'Test',
      });

      expect(updated?.lastAccessedAt.getTime()).toBeGreaterThan(
        originalAccess.getTime()
      );
    });

    it('should return null for non-existent session', async () => {
      const updated = await sessionStore.updateSession('non-existent', {
        firstName: 'Test',
      });

      expect(updated).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('should delete existing session', async () => {
      const session = await sessionStore.createSession({
        userId: 'user-123',
        organizationId: 'org-456',
        userEmail: 'test@example.com',
      });

      const deleted = await sessionStore.deleteSession(session.sessionId);
      expect(deleted).toBe(true);

      const retrieved = await sessionStore.getSession(session.sessionId);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent session', async () => {
      const deleted = await sessionStore.deleteSession('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('deleteUserSessions', () => {
    it('should delete all sessions for a user', async () => {
      // Create multiple sessions for same user
      await sessionStore.createSession({
        userId: 'user-123',
        organizationId: 'org-456',
        userEmail: 'test@example.com',
      });
      await sessionStore.createSession({
        userId: 'user-123',
        organizationId: 'org-789',
        userEmail: 'test@example.com',
      });
      // Different user
      await sessionStore.createSession({
        userId: 'user-other',
        organizationId: 'org-456',
        userEmail: 'other@example.com',
      });

      const deletedCount = await sessionStore.deleteUserSessions('user-123');

      expect(deletedCount).toBe(2);
    });
  });

  describe('refreshSessionAccess', () => {
    it('should update lastAccessedAt', async () => {
      const session = await sessionStore.createSession({
        userId: 'user-123',
        organizationId: 'org-456',
        userEmail: 'test@example.com',
      });

      const originalAccess = session.lastAccessedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const refreshed = await sessionStore.refreshSessionAccess(
        session.sessionId
      );

      expect(refreshed?.lastAccessedAt.getTime()).toBeGreaterThan(
        originalAccess.getTime()
      );
    });
  });

  describe('iframe message routing scenario', () => {
    it('should support full iframe session flow with conversationId', async () => {
      // 1. Create public session (like IframeService does)
      const session = await sessionStore.createSession({
        userId: '00000000-0000-0000-0000-000000000002',
        organizationId: '00000000-0000-0000-0000-000000000001',
        userEmail: 'public-guest@internal.system',
        iframeWebhookConfig: {
          accessToken: 'jwt-token',
          refreshToken: 'refresh-token',
          tabInstanceId: 'tab-123',
          tenantId: 'tenant-456',
          tenantName: 'Test Tenant',
          clientId: 'client-abc',
          clientKey: 'key-def',
          tokenExpiry: Date.now() + 3600000,
          actionsApiBaseUrl: 'https://api.example.com',
          userGuid: 'host-user-xyz',
        },
      });

      // 2. Store conversationId after conversation creation
      await sessionStore.updateSession(session.sessionId, {
        conversationId: 'conv-new-123',
      });

      // 3. Retrieve session in /execute endpoint
      const retrieved = await sessionStore.getSession(session.sessionId);

      // 4. Verify all rita IDs are available for webhook
      expect(retrieved?.userId).toBe('00000000-0000-0000-0000-000000000002');
      expect(retrieved?.organizationId).toBe(
        '00000000-0000-0000-0000-000000000001'
      );
      expect(retrieved?.conversationId).toBe('conv-new-123');
      expect(retrieved?.iframeWebhookConfig?.tenantId).toBe('tenant-456');
    });
  });
});
