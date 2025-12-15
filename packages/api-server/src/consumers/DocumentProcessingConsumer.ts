import type { Channel, ConsumeMessage } from 'amqplib';
import { withOrgContext } from '../config/database.js';
import { logError, PerformanceTimer, queueLogger } from '../config/logger.js';
import { getSSEService } from '../services/sse.js';

/**
 * RabbitMQ Consumer for Document Processing Status Updates
 * Handles processing_completed and processing_failed events
 *
 * Includes retry logic with exponential backoff to handle race conditions
 * when blob_metadata may not be immediately visible after upload.
 */

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 5,
  initialDelayMs: 500,
  maxDelayMs: 8000,
  backoffMultiplier: 2,
};

// Base message type
interface DocumentProcessingStatusMessage {
  type: 'document_processing';
  blob_metadata_id: string;
  tenant_id: string;
  user_id?: string;
  status: 'processing_completed' | 'processing_failed';
}

// Success message
interface DocumentProcessingCompletedMessage extends DocumentProcessingStatusMessage {
  status: 'processing_completed';
  processed_markdown?: string;
}

// Failure message
interface DocumentProcessingFailedMessage extends DocumentProcessingStatusMessage {
  status: 'processing_failed';
  error_message?: string;
}

type DocumentProcessingMessage =
  | DocumentProcessingCompletedMessage
  | DocumentProcessingFailedMessage;

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a database operation with retry logic and exponential backoff.
 * Used to handle race conditions when blob_metadata may not be visible yet.
 *
 * @throws Error if document not found after all retries exhausted
 */
async function withRetry<T>(
  operation: () => Promise<T | null>,
  operationName: string,
  logger: any
): Promise<T> {
  let delay = RETRY_CONFIG.initialDelayMs;

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    const result = await operation();

    if (result !== null) {
      if (attempt > 1) {
        logger.info({ attempt, operationName }, 'Operation succeeded after retry');
      }
      return result;
    }

    // Result is null - document not found, may be a race condition
    if (attempt < RETRY_CONFIG.maxRetries) {
      logger.warn({
        attempt,
        maxRetries: RETRY_CONFIG.maxRetries,
        nextDelayMs: delay,
        operationName
      }, 'Document not found, retrying after delay (possible race condition)');

      await sleep(delay);
      delay = Math.min(delay * RETRY_CONFIG.backoffMultiplier, RETRY_CONFIG.maxDelayMs);
    }
  }

  logger.error({
    operationName,
    totalRetries: RETRY_CONFIG.maxRetries
  }, 'Document not found after all retries exhausted');

  throw new Error(`Document not found after ${RETRY_CONFIG.maxRetries} retries`);
}

export class DocumentProcessingConsumer {
  private readonly queueName: string;

  constructor() {
    this.queueName = process.env.DOCUMENT_PROCESSING_QUEUE || 'document_processing_status';
  }

  /**
   * Start consuming document processing status messages
   */
  async startConsumer(channel: Channel): Promise<void> {
    queueLogger.info({ queueName: this.queueName }, 'Starting Document Processing consumer...');

    // Assert queue exists
    await channel.assertQueue(this.queueName, { durable: true });

    // Start consuming messages
    await channel.consume(this.queueName, async (message: ConsumeMessage | null) => {
      if (!message) return;

      const timer = new PerformanceTimer(queueLogger, 'document-processing-status');
      try {
        const content: DocumentProcessingMessage = JSON.parse(message.content.toString());

        queueLogger.info({
          status: content.status,
          blobMetadataId: content.blob_metadata_id,
          tenantId: content.tenant_id
        }, 'Received document processing status message');

        // Process based on status
        await this.processDocumentStatus(content);

        // Acknowledge message
        channel.ack(message);
        timer.end({ status: content.status, success: true });

      } catch (error) {
        timer.end({ success: false });
        logError(queueLogger, error as Error, { operation: 'document-processing-status' });

        // Reject message and don't requeue to avoid infinite loops
        channel.nack(message, false, false);
      }
    });

    queueLogger.info({ queueName: this.queueName }, 'Document Processing consumer started successfully');
  }

  /**
   * Process document status update based on status type
   */
  private async processDocumentStatus(payload: DocumentProcessingMessage): Promise<void> {
    const { blob_metadata_id, tenant_id, status } = payload;

    // Validate required fields
    if (!blob_metadata_id || !tenant_id || !status) {
      const messageLogger = queueLogger.child({
        blobMetadataId: blob_metadata_id,
        tenantId: tenant_id,
        status: status
      });
      messageLogger.error({ payload }, 'Invalid document processing payload: missing required fields');
      throw new Error('Invalid document processing payload: missing required fields');
    }

    const messageLogger = queueLogger.child({
      blobMetadataId: blob_metadata_id,
      tenantId: tenant_id,
      status: status
    });

    messageLogger.info('Processing document status update');

    // Switch on status
    switch (status) {
      case 'processing_completed':
        await this.handleProcessingCompleted(payload as DocumentProcessingCompletedMessage, messageLogger);
        break;

      case 'processing_failed':
        await this.handleProcessingFailed(payload as DocumentProcessingFailedMessage, messageLogger);
        break;

      default:
        messageLogger.error({ status }, 'Unknown document processing status');
        throw new Error(`Unknown document processing status: ${status}`);
    }

    messageLogger.info('Document status processing completed successfully');
  }

  /**
   * Handle processing_completed status
   * Note: processed_markdown is updated directly by the external system in the database
   *
   * Features:
   * - Retry logic for race conditions when blob_metadata may not be visible yet
   * - Idempotency check: skips if already processed
   * - Row locking (FOR UPDATE) to prevent parallel processing conflicts
   */
  private async handleProcessingCompleted(
    payload: DocumentProcessingCompletedMessage,
    messageLogger: any
  ): Promise<void> {
    // Update database via withOrgContext with retry logic
    // The external system has already updated processed_markdown directly
    const result = await withRetry(
      async () => {
        return withOrgContext(
          payload.user_id || 'system',  // Fallback to system if no user_id
          payload.tenant_id,
          async (client) => {
            // First, check current status with row lock to prevent parallel processing
            // SKIP LOCKED allows other consumers to process different documents
            // while this one waits, instead of blocking on contention
            const currentDoc = await client.query(`
              SELECT id, filename, status
              FROM blob_metadata
              WHERE id = $1 AND organization_id = $2
              FOR UPDATE SKIP LOCKED
            `, [payload.blob_metadata_id, payload.tenant_id]);

            if (currentDoc.rows.length === 0) {
              // Document not found OR locked by another consumer - will trigger retry
              return null;
            }

            const doc = currentDoc.rows[0];

            // Idempotency check: if already processed, skip update
            if (doc.status === 'processed') {
              messageLogger.info({ currentStatus: doc.status }, 'Document already processed, skipping (idempotent)');
              return { ...doc, skipped: true };
            }

            // Perform the update
            const updateResult = await client.query(`
              UPDATE blob_metadata
              SET status = 'processed',
                  metadata = CASE
                    WHEN metadata ? 'error' THEN metadata - 'error'
                    ELSE metadata
                  END,
                  updated_at = NOW()
              WHERE id = $1 AND organization_id = $2
              RETURNING id, filename, status, updated_at
            `, [payload.blob_metadata_id, payload.tenant_id]);

            return updateResult.rows[0] || null;
          }
        );
      },
      'handleProcessingCompleted',
      messageLogger
    );

    // Skip SSE if this was an idempotent no-op
    if (result.skipped) {
      return;
    }

    const updatedDocument = result;

    messageLogger.info('Document processing completed successfully');

    // Send SSE event to notify frontend
    try {
      const sseService = getSSEService();

      // Send to user (or organization if user_id not available)
      if (payload.user_id) {
        sseService.sendToUser(payload.user_id, payload.tenant_id, {
          type: 'document_update',
          data: {
            blob_metadata_id: payload.blob_metadata_id,
            filename: updatedDocument.filename,
            status: 'processed',
            timestamp: new Date().toISOString()
          }
        });
      } else {
        sseService.sendToOrganization(payload.tenant_id, {
          type: 'document_update',
          data: {
            blob_metadata_id: payload.blob_metadata_id,
            filename: updatedDocument.filename,
            status: 'processed',
            timestamp: new Date().toISOString()
          }
        });
      }

      messageLogger.info({ eventType: 'document_update' }, 'SSE event sent');
    } catch (sseError) {
      messageLogger.warn({
        error: sseError instanceof Error ? sseError.message : String(sseError)
      }, 'Failed to send SSE event');
      // Don't throw here - SSE failure shouldn't prevent status processing
    }
  }

  /**
   * Handle processing_failed status
   *
   * Features:
   * - Retry logic for race conditions when blob_metadata may not be visible yet
   * - Idempotency check: skips if already in final state (processed/failed)
   * - Row locking (FOR UPDATE) to prevent parallel processing conflicts
   */
  private async handleProcessingFailed(
    payload: DocumentProcessingFailedMessage,
    messageLogger: any
  ): Promise<void> {
    // Update database with error using retry logic
    const result = await withRetry(
      async () => {
        return withOrgContext(
          payload.user_id || 'system',
          payload.tenant_id,
          async (client) => {
            // First, check current status with row lock to prevent parallel processing
            // SKIP LOCKED allows other consumers to process different documents
            // while this one waits, instead of blocking on contention
            const currentDoc = await client.query(`
              SELECT id, filename, status
              FROM blob_metadata
              WHERE id = $1 AND organization_id = $2
              FOR UPDATE SKIP LOCKED
            `, [payload.blob_metadata_id, payload.tenant_id]);

            if (currentDoc.rows.length === 0) {
              // Document not found OR locked by another consumer - will trigger retry
              return null;
            }

            const doc = currentDoc.rows[0];

            // Idempotency check: if already in final state, skip update
            if (doc.status === 'processed' || doc.status === 'failed') {
              messageLogger.info({ currentStatus: doc.status }, 'Document already in final state, skipping (idempotent)');
              return { ...doc, skipped: true };
            }

            // Perform the update
            const updateResult = await client.query(`
              UPDATE blob_metadata
              SET status = 'failed',
                  metadata = jsonb_set(
                    COALESCE(metadata, '{}'::jsonb),
                    '{error}',
                    to_jsonb($1::text)
                  ),
                  updated_at = NOW()
              WHERE id = $2 AND organization_id = $3
              RETURNING id, filename, status, metadata, updated_at
            `, [payload.error_message || 'Processing failed', payload.blob_metadata_id, payload.tenant_id]);

            return updateResult.rows[0] || null;
          }
        );
      },
      'handleProcessingFailed',
      messageLogger
    );

    // Skip SSE if this was an idempotent no-op
    if (result.skipped) {
      return;
    }

    const updatedDocument = result;

    messageLogger.error({
      errorMessage: payload.error_message
    }, 'Document processing failed');

    // Send SSE event to notify frontend
    try {
      const sseService = getSSEService();

      if (payload.user_id) {
        sseService.sendToUser(payload.user_id, payload.tenant_id, {
          type: 'document_update',
          data: {
            blob_metadata_id: payload.blob_metadata_id,
            filename: updatedDocument.filename,
            status: 'failed',
            error_message: payload.error_message,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        sseService.sendToOrganization(payload.tenant_id, {
          type: 'document_update',
          data: {
            blob_metadata_id: payload.blob_metadata_id,
            filename: updatedDocument.filename,
            status: 'failed',
            error_message: payload.error_message,
            timestamp: new Date().toISOString()
          }
        });
      }

      messageLogger.info({ eventType: 'document_update' }, 'SSE event sent');
    } catch (sseError) {
      messageLogger.warn({
        error: sseError instanceof Error ? sseError.message : String(sseError)
      }, 'Failed to send SSE event');
      // Don't throw here - SSE failure shouldn't prevent status processing
    }
  }
}
