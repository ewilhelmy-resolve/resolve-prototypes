import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Channel, ConsumeMessage } from 'amqplib';

// Mock dependencies before importing the consumer
vi.mock('../../config/database.js', () => ({
  withOrgContext: vi.fn(),
}));

vi.mock('../../config/logger.js', () => {
  // Define MockPerformanceTimer inside the factory to avoid hoisting issues
  const MockPerformanceTimer = class {
    end = vi.fn();
  };

  return {
    logError: vi.fn(),
    PerformanceTimer: MockPerformanceTimer,
    queueLogger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnValue({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }),
    },
  };
});

vi.mock('../../services/sse.js', () => ({
  getSSEService: vi.fn().mockReturnValue({
    sendToUser: vi.fn(),
    sendToOrganization: vi.fn(),
  }),
}));

import { DocumentProcessingConsumer } from '../DocumentProcessingConsumer.js';
import { withOrgContext } from '../../config/database.js';

const mockedWithOrgContext = vi.mocked(withOrgContext);

describe('DocumentProcessingConsumer', () => {
  let consumer: DocumentProcessingConsumer;
  let mockChannel: Channel;
  let mockMessage: ConsumeMessage;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    consumer = new DocumentProcessingConsumer();

    mockChannel = {
      assertQueue: vi.fn().mockResolvedValue({}),
      consume: vi.fn(),
      ack: vi.fn(),
      nack: vi.fn(),
    } as unknown as Channel;

    mockMessage = {
      content: Buffer.from('{}'),
      fields: { deliveryTag: 1 },
      properties: {},
    } as unknown as ConsumeMessage;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('retry logic for race conditions', () => {
    it('should succeed on first attempt when document exists', async () => {
      const payload = {
        type: 'document_processing',
        blob_metadata_id: 'doc-123',
        tenant_id: 'org-456',
        user_id: 'user-789',
        status: 'processing_completed',
      };

      mockMessage.content = Buffer.from(JSON.stringify(payload));

      // Document found on first attempt
      mockedWithOrgContext.mockResolvedValueOnce({
        id: 'doc-123',
        filename: 'test.pdf',
        status: 'processed',
        updated_at: new Date(),
      });

      // Start consumer
      await consumer.startConsumer(mockChannel);

      // Get the callback registered with channel.consume
      const consumeCallback = (mockChannel.consume as ReturnType<typeof vi.fn>).mock.calls[0][1];

      // Call the callback with our message
      await consumeCallback(mockMessage);

      // Should only call withOrgContext once (no retries needed)
      expect(mockedWithOrgContext).toHaveBeenCalledTimes(1);
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });

    it('should retry and succeed when document not found initially (race condition)', async () => {
      const payload = {
        type: 'document_processing',
        blob_metadata_id: 'doc-123',
        tenant_id: 'org-456',
        user_id: 'user-789',
        status: 'processing_completed',
      };

      mockMessage.content = Buffer.from(JSON.stringify(payload));

      // First 2 attempts return null (document not found - race condition)
      // Third attempt succeeds
      mockedWithOrgContext
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'doc-123',
          filename: 'test.pdf',
          status: 'processed',
          updated_at: new Date(),
        });

      await consumer.startConsumer(mockChannel);
      const consumeCallback = (mockChannel.consume as ReturnType<typeof vi.fn>).mock.calls[0][1];

      // Start processing (don't await yet)
      const processPromise = consumeCallback(mockMessage);

      // Advance timers for retry delays (500ms, then 1000ms)
      await vi.advanceTimersByTimeAsync(500);
      await vi.advanceTimersByTimeAsync(1000);

      await processPromise;

      // Should have called withOrgContext 3 times (initial + 2 retries)
      expect(mockedWithOrgContext).toHaveBeenCalledTimes(3);
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });

    it('should fail after max retries when document never found', async () => {
      const payload = {
        type: 'document_processing',
        blob_metadata_id: 'doc-123',
        tenant_id: 'org-456',
        user_id: 'user-789',
        status: 'processing_completed',
      };

      mockMessage.content = Buffer.from(JSON.stringify(payload));

      // All attempts return null (document never found)
      mockedWithOrgContext.mockResolvedValue(null);

      await consumer.startConsumer(mockChannel);
      const consumeCallback = (mockChannel.consume as ReturnType<typeof vi.fn>).mock.calls[0][1];

      const processPromise = consumeCallback(mockMessage);

      // Advance through all retry delays: 500ms, 1000ms, 2000ms, 4000ms
      await vi.advanceTimersByTimeAsync(500);
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(4000);

      await processPromise;

      // Should have called withOrgContext 5 times (maxRetries = 5)
      expect(mockedWithOrgContext).toHaveBeenCalledTimes(5);
      // Message should be nack'd after all retries exhausted
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
      expect(mockChannel.ack).not.toHaveBeenCalled();
    });

    it('should handle processing_failed status with retry logic', async () => {
      const payload = {
        type: 'document_processing',
        blob_metadata_id: 'doc-123',
        tenant_id: 'org-456',
        user_id: 'user-789',
        status: 'processing_failed',
        error_message: 'Failed to parse document',
      };

      mockMessage.content = Buffer.from(JSON.stringify(payload));

      // First attempt returns null, second succeeds
      mockedWithOrgContext
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'doc-123',
          filename: 'test.pdf',
          status: 'failed',
          metadata: { error: 'Failed to parse document' },
          updated_at: new Date(),
        });

      await consumer.startConsumer(mockChannel);
      const consumeCallback = (mockChannel.consume as ReturnType<typeof vi.fn>).mock.calls[0][1];

      const processPromise = consumeCallback(mockMessage);

      // Advance timer for first retry delay
      await vi.advanceTimersByTimeAsync(500);

      await processPromise;

      expect(mockedWithOrgContext).toHaveBeenCalledTimes(2);
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
    });

    it('should use exponential backoff between retries', async () => {
      const payload = {
        type: 'document_processing',
        blob_metadata_id: 'doc-123',
        tenant_id: 'org-456',
        status: 'processing_completed',
      };

      mockMessage.content = Buffer.from(JSON.stringify(payload));

      // Track when withOrgContext is called
      const callTimes: number[] = [];
      mockedWithOrgContext.mockImplementation(async () => {
        callTimes.push(Date.now());
        return null;
      });

      await consumer.startConsumer(mockChannel);
      const consumeCallback = (mockChannel.consume as ReturnType<typeof vi.fn>).mock.calls[0][1];

      const processPromise = consumeCallback(mockMessage);

      // Advance through delays: 500, 1000, 2000, 4000
      await vi.advanceTimersByTimeAsync(500);
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(4000);

      await processPromise;

      // Verify delays increase exponentially
      // First call at ~0ms
      // Second call at ~500ms
      // Third call at ~1500ms (500 + 1000)
      // Fourth call at ~3500ms (500 + 1000 + 2000)
      // Fifth call at ~7500ms (500 + 1000 + 2000 + 4000)
      expect(callTimes.length).toBe(5);

      const delays = callTimes.map((t, i) => (i === 0 ? 0 : t - callTimes[i - 1]));
      // First delay is 0 (immediate first call)
      expect(delays[0]).toBe(0);
      // Subsequent delays should follow exponential pattern: 500, 1000, 2000, 4000
      expect(delays[1]).toBeGreaterThanOrEqual(500);
      expect(delays[2]).toBeGreaterThanOrEqual(1000);
      expect(delays[3]).toBeGreaterThanOrEqual(2000);
      expect(delays[4]).toBeGreaterThanOrEqual(4000);
    });

    it('should handle invalid payload gracefully', async () => {
      const payload = {
        type: 'document_processing',
        // Missing required fields
      };

      mockMessage.content = Buffer.from(JSON.stringify(payload));

      await consumer.startConsumer(mockChannel);
      const consumeCallback = (mockChannel.consume as ReturnType<typeof vi.fn>).mock.calls[0][1];

      await consumeCallback(mockMessage);

      // Should nack without calling withOrgContext (validation fails first)
      expect(mockedWithOrgContext).not.toHaveBeenCalled();
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
    });

    it('should handle unknown status gracefully', async () => {
      const payload = {
        type: 'document_processing',
        blob_metadata_id: 'doc-123',
        tenant_id: 'org-456',
        status: 'unknown_status',
      };

      mockMessage.content = Buffer.from(JSON.stringify(payload));

      await consumer.startConsumer(mockChannel);
      const consumeCallback = (mockChannel.consume as ReturnType<typeof vi.fn>).mock.calls[0][1];

      await consumeCallback(mockMessage);

      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
    });
  });

  describe('idempotency checks', () => {
    it('should skip update when document is already processed (idempotent)', async () => {
      const { getSSEService } = await import('../../services/sse.js');
      const mockSSE = vi.mocked(getSSEService);

      const payload = {
        type: 'document_processing',
        blob_metadata_id: 'doc-123',
        tenant_id: 'org-456',
        user_id: 'user-789',
        status: 'processing_completed',
      };

      mockMessage.content = Buffer.from(JSON.stringify(payload));

      // Return document with skipped flag (already processed)
      mockedWithOrgContext.mockResolvedValueOnce({
        id: 'doc-123',
        filename: 'test.pdf',
        status: 'processed',
        skipped: true,
      });

      await consumer.startConsumer(mockChannel);
      const consumeCallback = (mockChannel.consume as ReturnType<typeof vi.fn>).mock.calls[0][1];

      await consumeCallback(mockMessage);

      // Should ack the message
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
      // Should NOT send SSE event when skipped
      const sseService = mockSSE();
      expect(sseService.sendToUser).not.toHaveBeenCalled();
      expect(sseService.sendToOrganization).not.toHaveBeenCalled();
    });

    it('should skip failed update when document is already in final state', async () => {
      const { getSSEService } = await import('../../services/sse.js');
      const mockSSE = vi.mocked(getSSEService);

      const payload = {
        type: 'document_processing',
        blob_metadata_id: 'doc-123',
        tenant_id: 'org-456',
        user_id: 'user-789',
        status: 'processing_failed',
        error_message: 'Some error',
      };

      mockMessage.content = Buffer.from(JSON.stringify(payload));

      // Return document with skipped flag (already processed or failed)
      mockedWithOrgContext.mockResolvedValueOnce({
        id: 'doc-123',
        filename: 'test.pdf',
        status: 'processed',
        skipped: true,
      });

      await consumer.startConsumer(mockChannel);
      const consumeCallback = (mockChannel.consume as ReturnType<typeof vi.fn>).mock.calls[0][1];

      await consumeCallback(mockMessage);

      // Should ack the message
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
      // Should NOT send SSE event when skipped
      const sseService = mockSSE();
      expect(sseService.sendToUser).not.toHaveBeenCalled();
    });

    it('should process normally when document is not in final state', async () => {
      const { getSSEService } = await import('../../services/sse.js');
      const mockSSE = vi.mocked(getSSEService);

      const payload = {
        type: 'document_processing',
        blob_metadata_id: 'doc-123',
        tenant_id: 'org-456',
        user_id: 'user-789',
        status: 'processing_completed',
      };

      mockMessage.content = Buffer.from(JSON.stringify(payload));

      // Return document without skipped flag (normal update)
      mockedWithOrgContext.mockResolvedValueOnce({
        id: 'doc-123',
        filename: 'test.pdf',
        status: 'processed',
        updated_at: new Date(),
        // No skipped flag
      });

      await consumer.startConsumer(mockChannel);
      const consumeCallback = (mockChannel.consume as ReturnType<typeof vi.fn>).mock.calls[0][1];

      await consumeCallback(mockMessage);

      // Should ack and send SSE
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
      const sseService = mockSSE();
      expect(sseService.sendToUser).toHaveBeenCalled();
    });
  });

  describe('SSE notifications', () => {
    it('should send SSE event to user on successful processing', async () => {
      const { getSSEService } = await import('../../services/sse.js');
      const mockSSE = vi.mocked(getSSEService);

      const payload = {
        type: 'document_processing',
        blob_metadata_id: 'doc-123',
        tenant_id: 'org-456',
        user_id: 'user-789',
        status: 'processing_completed',
      };

      mockMessage.content = Buffer.from(JSON.stringify(payload));

      mockedWithOrgContext.mockResolvedValueOnce({
        id: 'doc-123',
        filename: 'test.pdf',
        status: 'processed',
        updated_at: new Date(),
      });

      await consumer.startConsumer(mockChannel);
      const consumeCallback = (mockChannel.consume as ReturnType<typeof vi.fn>).mock.calls[0][1];

      await consumeCallback(mockMessage);

      const sseService = mockSSE();
      expect(sseService.sendToUser).toHaveBeenCalledWith(
        'user-789',
        'org-456',
        expect.objectContaining({
          type: 'document_update',
          data: expect.objectContaining({
            blob_metadata_id: 'doc-123',
            status: 'processed',
          }),
        })
      );
    });

    it('should send SSE event to organization when no user_id', async () => {
      const { getSSEService } = await import('../../services/sse.js');
      const mockSSE = vi.mocked(getSSEService);

      const payload = {
        type: 'document_processing',
        blob_metadata_id: 'doc-123',
        tenant_id: 'org-456',
        // No user_id
        status: 'processing_completed',
      };

      mockMessage.content = Buffer.from(JSON.stringify(payload));

      mockedWithOrgContext.mockResolvedValueOnce({
        id: 'doc-123',
        filename: 'test.pdf',
        status: 'processed',
        updated_at: new Date(),
      });

      await consumer.startConsumer(mockChannel);
      const consumeCallback = (mockChannel.consume as ReturnType<typeof vi.fn>).mock.calls[0][1];

      await consumeCallback(mockMessage);

      const sseService = mockSSE();
      expect(sseService.sendToOrganization).toHaveBeenCalledWith(
        'org-456',
        expect.objectContaining({
          type: 'document_update',
        })
      );
    });
  });
});
