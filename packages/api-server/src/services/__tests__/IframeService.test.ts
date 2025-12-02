/**
 * IframeService.test.ts
 *
 * Tests for iframe token validation and session creation.
 * Ensures only valid tokens can access the iframe chat.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { pool } from '../../config/database.js';
import { IframeService, PUBLIC_USER_ID, PUBLIC_ORG_ID, isPublicUser, isPublicOrganization } from '../IframeService.js';

describe('IframeService', () => {
  let iframeService: IframeService;
  const TEST_TOKEN = 'test-token-' + Date.now();
  const INVALID_TOKEN = 'invalid-token-xyz';

  beforeAll(async () => {
    // Insert test token
    await pool.query(
      `INSERT INTO iframe_tokens (token, name, description, is_active)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (token) DO NOTHING`,
      [TEST_TOKEN, 'Test Token', 'Token for testing', true]
    );
  });

  afterAll(async () => {
    // Clean up test token
    await pool.query('DELETE FROM iframe_tokens WHERE token = $1', [TEST_TOKEN]);
  });

  beforeEach(() => {
    iframeService = new IframeService();
  });

  describe('validateToken', () => {
    it('should return token info for valid active token', async () => {
      const result = await iframeService.validateToken(TEST_TOKEN);

      expect(result).not.toBeNull();
      expect(result?.token).toBe(TEST_TOKEN);
      expect(result?.name).toBe('Test Token');
      expect(result?.isActive).toBe(true);
    });

    it('should return null for invalid token', async () => {
      const result = await iframeService.validateToken(INVALID_TOKEN);

      expect(result).toBeNull();
    });

    it('should return null for empty token', async () => {
      const result = await iframeService.validateToken('');

      expect(result).toBeNull();
    });

    it('should return null for inactive token', async () => {
      // Create inactive token
      const inactiveToken = 'inactive-token-' + Date.now();
      await pool.query(
        `INSERT INTO iframe_tokens (token, name, is_active)
         VALUES ($1, $2, $3)`,
        [inactiveToken, 'Inactive Token', false]
      );

      const result = await iframeService.validateToken(inactiveToken);

      expect(result).toBeNull();

      // Cleanup
      await pool.query('DELETE FROM iframe_tokens WHERE token = $1', [inactiveToken]);
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
      const result = await iframeService.validateAndSetup(INVALID_TOKEN);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid or inactive token');
      expect(result.conversationId).toBeUndefined();
      expect(result.cookie).toBeUndefined();
    });

    it('should accept valid token and create session', async () => {
      const result = await iframeService.validateAndSetup(TEST_TOKEN);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.publicUserId).toBe(PUBLIC_USER_ID);
      expect(result.conversationId).toBeDefined();
      expect(result.cookie).toBeDefined();
      expect(result.tokenName).toBe('Test Token');

      // Cleanup conversation
      if (result.conversationId) {
        await pool.query('DELETE FROM conversations WHERE id = $1', [result.conversationId]);
      }
    });

    it('should use existing conversation ID if provided', async () => {
      // First create a conversation
      const createResult = await iframeService.validateAndSetup(TEST_TOKEN);
      const existingConversationId = createResult.conversationId;

      // Now validate with existing conversation
      const result = await iframeService.validateAndSetup(
        TEST_TOKEN,
        undefined,
        existingConversationId
      );

      expect(result.valid).toBe(true);
      expect(result.conversationId).toBe(existingConversationId);

      // Cleanup
      if (existingConversationId) {
        await pool.query('DELETE FROM conversations WHERE id = $1', [existingConversationId]);
      }
    });

    it('should pass intent-eid to conversation creation', async () => {
      const intentEid = 'test-intent-123';
      const result = await iframeService.validateAndSetup(TEST_TOKEN, intentEid);

      expect(result.valid).toBe(true);
      expect(result.conversationId).toBeDefined();

      // Cleanup
      if (result.conversationId) {
        await pool.query('DELETE FROM conversations WHERE id = $1', [result.conversationId]);
      }
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

  describe('dev token', () => {
    it('should have dev token seeded in database', async () => {
      const result = await iframeService.validateToken('dev-iframe-token-2024');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Development Token');
      expect(result?.isActive).toBe(true);
    });
  });
});
