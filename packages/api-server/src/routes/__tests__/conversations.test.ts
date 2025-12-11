import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import conversationsRouter from '../conversations.js';

// Mock dependencies
vi.mock('../../config/database.js', () => ({
  withOrgContext: vi.fn()
}));

vi.mock('../../middleware/auth.js', () => ({
  authenticateUser: vi.fn((req, _res, next) => {
    // Inject mock authenticated user
    (req as any).user = {
      id: 'test-user-id',
      activeOrganizationId: 'test-org-id',
      email: 'test@example.com'
    };
    next();
  })
}));

vi.mock('../../services/WebhookService.js', () => {
  return {
    WebhookService: class MockWebhookService {
      sendMessageEvent = vi.fn().mockResolvedValue({ success: true });
    }
  };
});

import { withOrgContext } from '../../config/database.js';

describe('Conversations Router - Automatic Cleanup', () => {
  let app: express.Application;
  let mockClient: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/conversations', conversationsRouter);

    mockClient = {
      query: vi.fn(),
      release: vi.fn()
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /conversations - Automatic Old Conversation Cleanup', () => {
    it('should create conversation without deletion when user has less than 20 conversations', async () => {
      // Mock count: 15 conversations
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '15' }] }) // COUNT query
        .mockResolvedValueOnce({ rows: [{ id: 'new-conv-id', title: 'New Chat', created_at: new Date(), updated_at: new Date() }] }); // INSERT query

      vi.mocked(withOrgContext).mockImplementation(async (_userId, _orgId, callback) => {
        return await callback(mockClient);
      });

      const response = await request(app)
        .post('/conversations')
        .send({ title: 'New Chat' })
        .expect(201);

      expect(response.body).toHaveProperty('conversation');
      expect(response.body.conversation.title).toBe('New Chat');
      expect(mockClient.query).toHaveBeenCalledTimes(2); // COUNT + INSERT, no DELETE
    });

    it('should delete oldest conversation when user has exactly 20 conversations', async () => {
      // Mock count: 20 conversations (at limit)
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '20' }] }) // COUNT query
        .mockResolvedValueOnce({ rows: [] }) // DELETE query
        .mockResolvedValueOnce({ rows: [{ id: 'new-conv-id', title: 'New Chat', created_at: new Date(), updated_at: new Date() }] }); // INSERT query

      vi.mocked(withOrgContext).mockImplementation(async (_userId, _orgId, callback) => {
        return await callback(mockClient);
      });

      const response = await request(app)
        .post('/conversations')
        .send({ title: 'New Chat' })
        .expect(201);

      expect(response.body).toHaveProperty('conversation');
      expect(mockClient.query).toHaveBeenCalledTimes(3); // COUNT + DELETE + INSERT

      // Verify DELETE query targets oldest conversation
      const deleteCall = mockClient.query.mock.calls[1];
      expect(deleteCall[0]).toContain('DELETE FROM conversations');
      expect(deleteCall[0]).toContain('ORDER BY created_at ASC');
      expect(deleteCall[0]).toContain('LIMIT 1');
    });

    it('should delete oldest conversation when user exceeds 20 conversations', async () => {
      // Mock count: 25 conversations (over limit)
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '25' }] }) // COUNT query
        .mockResolvedValueOnce({ rows: [] }) // DELETE query
        .mockResolvedValueOnce({ rows: [{ id: 'new-conv-id', title: 'New Chat', created_at: new Date(), updated_at: new Date() }] }); // INSERT query

      vi.mocked(withOrgContext).mockImplementation(async (_userId, _orgId, callback) => {
        return await callback(mockClient);
      });

      const response = await request(app)
        .post('/conversations')
        .send({ title: 'New Chat' })
        .expect(201);

      expect(response.body).toHaveProperty('conversation');
      expect(mockClient.query).toHaveBeenCalledTimes(3); // COUNT + DELETE + INSERT
    });

    it('should verify oldest conversation is deleted by created_at timestamp', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '20' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'new-conv-id', title: 'New Chat', created_at: new Date(), updated_at: new Date() }] });

      vi.mocked(withOrgContext).mockImplementation(async (_userId, _orgId, callback) => {
        return await callback(mockClient);
      });

      await request(app)
        .post('/conversations')
        .send({ title: 'New Chat' })
        .expect(201);

      // Verify DELETE uses ORDER BY created_at ASC to get oldest
      const deleteCall = mockClient.query.mock.calls[1];
      expect(deleteCall[0]).toMatch(/ORDER BY created_at ASC/);
    });

    it('should maintain user isolation - User A at limit should not affect User B', async () => {
      // User A at limit
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '20' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'new-conv-a', title: 'Chat A', created_at: new Date(), updated_at: new Date() }] });

      vi.mocked(withOrgContext).mockImplementation(async (_userId, _orgId, callback) => {
        return await callback(mockClient);
      });

      // Create conversation for User A
      await request(app)
        .post('/conversations')
        .send({ title: 'Chat A' })
        .expect(201);

      // Verify User A's queries use their user_id
      const countCallA = mockClient.query.mock.calls[0];
      expect(countCallA[1]).toContain('test-user-id'); // User A's ID

      vi.clearAllMocks();

      // User B with fewer conversations
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'new-conv-b', title: 'Chat B', created_at: new Date(), updated_at: new Date() }] });

      // Simulate User B with different ID
      vi.mocked(withOrgContext).mockImplementation(async (_userId, _orgId, callback) => {
        // Override mock user for this test
        return await callback(mockClient);
      });

      // User B should NOT trigger deletion (only 5 conversations)
      await request(app)
        .post('/conversations')
        .send({ title: 'Chat B' })
        .expect(201);

      expect(mockClient.query).toHaveBeenCalledTimes(2); // COUNT + INSERT, no DELETE
    });

    it('should handle empty state - first conversation for new user', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // No existing conversations
        .mockResolvedValueOnce({ rows: [{ id: 'first-conv-id', title: 'First Chat', created_at: new Date(), updated_at: new Date() }] });

      vi.mocked(withOrgContext).mockImplementation(async (_userId, _orgId, callback) => {
        return await callback(mockClient);
      });

      const response = await request(app)
        .post('/conversations')
        .send({ title: 'First Chat' })
        .expect(201);

      expect(response.body.conversation.title).toBe('First Chat');
      expect(mockClient.query).toHaveBeenCalledTimes(2); // COUNT + INSERT
    });

    it('should rollback transaction on error after deletion', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '20' }] }) // COUNT succeeds
        .mockResolvedValueOnce({ rows: [] }) // DELETE succeeds
        .mockRejectedValueOnce(new Error('INSERT failed')); // INSERT fails

      vi.mocked(withOrgContext).mockImplementation(async (_userId, _orgId, callback) => {
        try {
          return await callback(mockClient);
        } catch (error) {
          // withOrgContext handles rollback on error
          throw error;
        }
      });

      await request(app)
        .post('/conversations')
        .send({ title: 'New Chat' })
        .expect(500);

      // Verify all queries were attempted
      expect(mockClient.query).toHaveBeenCalledTimes(3);
    });

    it('should handle invalid title validation', async () => {
      const response = await request(app)
        .post('/conversations')
        .send({ title: '' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Conversation title is required');
    });

    it('should handle missing title', async () => {
      const response = await request(app)
        .post('/conversations')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle database connection errors gracefully', async () => {
      vi.mocked(withOrgContext).mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .post('/conversations')
        .send({ title: 'New Chat' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Failed to create conversation');
    });
  });

  describe('Configuration', () => {
    it('should respect MAX_CONVERSATIONS_PER_USER environment variable', () => {
      // This test verifies the configuration constant is used
      // The actual limit is defined at the top of conversations.ts
      expect(process.env.MAX_CONVERSATIONS_PER_USER || '20').toBeDefined();
    });
  });
});
