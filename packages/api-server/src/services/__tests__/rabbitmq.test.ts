/**
 * rabbitmq.test.ts
 *
 * Tests for RabbitMQ message processing, specifically SSE routing.
 *
 * Key fix tested: processMessage always fetches user_id from conversation table,
 * ignoring payload user_id (which may be Valkey userGuid for legacy users).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before imports
const {
  mockPool,
  mockWithOrgContext,
  mockSSEService,
} = vi.hoisted(() => ({
  mockPool: {
    connect: vi.fn(),
    query: vi.fn(),
  },
  mockWithOrgContext: vi.fn(),
  mockSSEService: {
    sendToUser: vi.fn(),
  },
}));

vi.mock('../../config/database.js', () => ({
  pool: mockPool,
  withOrgContext: mockWithOrgContext,
}));

vi.mock('../sse.js', () => ({
  getSSEService: () => mockSSEService,
}));

vi.mock('../../config/logger.js', () => ({
  queueLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
  logError: vi.fn(),
  PerformanceTimer: vi.fn(),
}));

vi.mock('amqplib', () => ({
  default: {
    connect: vi.fn(),
  },
}));

vi.mock('../../consumers/DataSourceStatusConsumer.js', () => ({
  DataSourceStatusConsumer: class {
    startConsumer = vi.fn();
  },
}));

vi.mock('../../consumers/DocumentProcessingConsumer.js', () => ({
  DocumentProcessingConsumer: class {
    startConsumer = vi.fn();
  },
}));

vi.mock('../../consumers/WorkflowConsumer.js', () => ({
  WorkflowConsumer: class {
    startConsumer = vi.fn();
  },
}));

import { RabbitMQService } from '../rabbitmq.js';

describe('RabbitMQService', () => {
  let service: RabbitMQService;
  let mockClient: { query: ReturnType<typeof vi.fn>; release: ReturnType<typeof vi.fn> };

  // Actual test data from production iframe session
  // This is the webhook payload sent to platform (user_id = Valkey userGuid)
  const productionPayload = {
    user_id: '275fb79d-0a6f-4336-bc05-1f6fcbaf775b',  // Valkey userGuid
    tenant_id: '00F4F67D-3B92-4FD2-A574-7BE22C6BE796',
    conversation_id: 'b18c9d56-7c26-42d0-87ff-07cd7dabb171',
    message_id: '2b6a2b62-86ef-4bcd-893b-6b6d55c7f7f9',
    response: 'Test response from platform',
  };

  // The Rita DB user_id stored in conversation (may differ from Valkey userGuid for legacy users)
  const ritaDbUserId = 'rita-db-user-id-different-from-valkey';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RabbitMQService();

    // Setup mock client for pool.connect()
    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };
    mockPool.connect.mockResolvedValue(mockClient);
  });

  describe('processMessage - SSE routing fix', () => {
    it('should fetch user_id from conversation table, not from payload', async () => {
      // Setup: conversation has different user_id than payload
      mockClient.query.mockResolvedValueOnce({
        rows: [{ user_id: ritaDbUserId }],
      });

      // Setup withOrgContext to capture the user_id passed to it
      let capturedUserId: string | undefined;
      mockWithOrgContext.mockImplementation(async (userId, _orgId, callback) => {
        capturedUserId = userId;
        // Return minimal mock for the callback
        const mockOrgClient = {
          query: vi.fn()
            .mockResolvedValueOnce({ rows: [{ id: productionPayload.message_id }] }) // message check
            .mockResolvedValueOnce({ rows: [] }) // update message
            .mockResolvedValueOnce({ rows: [{ id: 'new-assistant-msg-id' }] }) // insert assistant msg
            .mockResolvedValueOnce({ rows: [] }), // audit log
        };
        return callback(mockOrgClient);
      });

      // Call processMessage via the private method (access it for testing)
      const processMessage = (service as any).processMessage.bind(service);
      await processMessage(productionPayload);

      // Verify: conversation query was called with correct IDs
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT user_id FROM conversations WHERE id = $1 AND organization_id = $2',
        [productionPayload.conversation_id, productionPayload.tenant_id]
      );

      // Verify: withOrgContext received Rita DB user_id, NOT payload user_id
      expect(capturedUserId).toBe(ritaDbUserId);
      expect(capturedUserId).not.toBe(productionPayload.user_id);

      // Verify: SSE sendToUser called with Rita DB user_id
      expect(mockSSEService.sendToUser).toHaveBeenCalled();
      const sseCall = mockSSEService.sendToUser.mock.calls[0];
      expect(sseCall[0]).toBe(ritaDbUserId); // user_id
      expect(sseCall[1]).toBe(productionPayload.tenant_id); // organization_id
    });

    it('should work when payload user_id matches DB user_id (new users)', async () => {
      // For new users, Valkey userGuid IS the Rita DB user_id
      const newUserPayload = {
        ...productionPayload,
        user_id: productionPayload.user_id, // Same as Valkey userGuid
      };

      // Conversation has same user_id as payload (new user case)
      mockClient.query.mockResolvedValueOnce({
        rows: [{ user_id: productionPayload.user_id }],
      });

      let capturedUserId: string | undefined;
      mockWithOrgContext.mockImplementation(async (userId, _orgId, callback) => {
        capturedUserId = userId;
        const mockOrgClient = {
          query: vi.fn()
            .mockResolvedValueOnce({ rows: [{ id: newUserPayload.message_id }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ id: 'new-assistant-msg-id' }] })
            .mockResolvedValueOnce({ rows: [] }),
        };
        return callback(mockOrgClient);
      });

      const processMessage = (service as any).processMessage.bind(service);
      await processMessage(newUserPayload);

      // For new users, captured user_id should equal payload user_id
      expect(capturedUserId).toBe(productionPayload.user_id);
    });

    it('should throw error if conversation not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const processMessage = (service as any).processMessage.bind(service);

      await expect(processMessage(productionPayload)).rejects.toThrow(
        `Conversation ${productionPayload.conversation_id} not found or doesn't belong to organization ${productionPayload.tenant_id}`
      );
    });

    it('should throw error if required fields missing', async () => {
      const invalidPayload = {
        response: 'Test response',
        // Missing: message_id, tenant_id, conversation_id
      };

      const processMessage = (service as any).processMessage.bind(service);

      await expect(processMessage(invalidPayload)).rejects.toThrow(
        'Invalid message payload: missing required fields'
      );
    });

    it('should release DB client even on error', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('DB error'));

      const processMessage = (service as any).processMessage.bind(service);

      await expect(processMessage(productionPayload)).rejects.toThrow('DB error');

      // Client should still be released
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('processMessage - production data validation', () => {
    it('should handle actual production IDs format', async () => {
      // Verify the test uses actual production ID formats
      expect(productionPayload.user_id).toMatch(/^[0-9a-f-]{36}$/i); // UUID format
      expect(productionPayload.tenant_id).toMatch(/^[0-9a-f-]{36}$/i);
      expect(productionPayload.conversation_id).toMatch(/^[0-9a-f-]{36}$/i);
      expect(productionPayload.message_id).toMatch(/^[0-9a-f-]{36}$/i);
    });
  });
});
