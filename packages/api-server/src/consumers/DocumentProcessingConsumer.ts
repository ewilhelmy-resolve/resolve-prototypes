import type { Channel, ConsumeMessage } from 'amqplib';
import { withOrgContext } from '../config/database.js';
import { logError, PerformanceTimer, queueLogger } from '../config/logger.js';
import { getSSEService } from '../services/sse.js';

/**
 * RabbitMQ Consumer for Document Processing Status Updates
 * Handles processing_completed and processing_failed events
 */

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
   */
  private async handleProcessingCompleted(
    payload: DocumentProcessingCompletedMessage,
    messageLogger: any
  ): Promise<void> {
    // Update database via withOrgContext - only update status and clear errors
    // The external system has already updated processed_markdown directly
    const updatedDocument = await withOrgContext(
      payload.user_id || 'system',  // Fallback to system if no user_id
      payload.tenant_id,
      async (client) => {
        const result = await client.query(`
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

        return result.rows[0] || null;
      }
    );

    if (!updatedDocument) {
      messageLogger.error('Document not found');
      throw new Error(`Document ${payload.blob_metadata_id} not found for organization ${payload.tenant_id}`);
    }

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
   */
  private async handleProcessingFailed(
    payload: DocumentProcessingFailedMessage,
    messageLogger: any
  ): Promise<void> {
    // Update database with error
    const updatedDocument = await withOrgContext(
      payload.user_id || 'system',
      payload.tenant_id,
      async (client) => {
        const result = await client.query(`
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

        return result.rows[0] || null;
      }
    );

    if (!updatedDocument) {
      messageLogger.error('Document not found');
      throw new Error(`Document ${payload.blob_metadata_id} not found for organization ${payload.tenant_id}`);
    }

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
