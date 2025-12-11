import type { Channel, ConsumeMessage } from 'amqplib';
import { logError, PerformanceTimer, queueLogger } from '../config/logger.js';
import { DataSourceService } from '../services/DataSourceService.js';
import { getSSEService } from '../services/sse.js';
import type { DataSourceStatusMessage, IngestionStatusMessage, SyncStatusMessage, VerificationStatusMessage } from '../types/dataSource.js';

/**
 * Unified RabbitMQ Consumer for Data Source Status Updates
 * Handles both sync and verification events from a single queue
 * Discriminates message types via 'type' field
 */
export class DataSourceStatusConsumer {
  private readonly queueName: string;
  private dataSourceService: DataSourceService;

  constructor() {
    this.queueName = process.env.DATA_SOURCE_STATUS_QUEUE || 'data_source_status';
    this.dataSourceService = new DataSourceService();
  }

  /**
   * Start consuming data source status messages
   */
  async startConsumer(channel: Channel): Promise<void> {
    queueLogger.info({ queueName: this.queueName }, 'Starting Data Source Status consumer...');

    // Assert queue exists
    await channel.assertQueue(this.queueName, {
      durable: true
    });

    // Start consuming messages
    await channel.consume(this.queueName, async (message: ConsumeMessage | null) => {
      if (!message) return;

      const timer = new PerformanceTimer(queueLogger, 'data-source-status-processing');
      try {
        const content: DataSourceStatusMessage = JSON.parse(message.content.toString());

        queueLogger.info({
          type: content.type,
          connectionId: content.connection_id,
          tenantId: content.tenant_id
        }, 'Received data source status message');

        // Discriminate based on type field
        if (content.type === 'sync') {
          await this.processSyncStatus(content);
        } else if (content.type === 'verification') {
          await this.processVerificationStatus(content);
        } else if (content.type === 'ticket_ingestion') {
          await this.processTicketIngestionStatus(content);
        } else {
          throw new Error(`Unknown message type: ${(content as any).type}`);
        }

        // Acknowledge message
        channel.ack(message);
        timer.end({
          type: content.type,
          connectionId: content.connection_id,
          success: true
        });
        queueLogger.info({
          connectionId: content.connection_id
        }, 'Data source status processed successfully');

      } catch (error) {
        timer.end({ success: false });
        logError(queueLogger, error as Error, { operation: 'data-source-status-processing' });

        // Reject message and don't requeue to avoid infinite loops
        channel.nack(message, false, false);
      }
    });

    queueLogger.info({ queueName: this.queueName }, 'Data Source Status consumer started successfully');
  }

  /**
   * Process sync status message
   */
  private async processSyncStatus(payload: SyncStatusMessage): Promise<void> {
    const { connection_id, tenant_id, status, error_message } = payload;

    // Validate required fields
    if (!connection_id || !tenant_id || !status) {
      const messageLogger = queueLogger.child({
        connectionId: connection_id,
        tenantId: tenant_id,
        status: status
      });
      messageLogger.error({ payload }, 'Invalid sync status payload: missing required fields');
      throw new Error('Invalid sync status payload: missing required fields');
    }

    const messageLogger = queueLogger.child({
      connectionId: connection_id,
      tenantId: tenant_id,
      status: status
    });

    messageLogger.info('Processing sync status update');

    // Update data source status based on message type
    let updatedDataSource = null;

    switch (status) {
      case 'sync_started':
        updatedDataSource = await this.dataSourceService.updateDataSourceStatus(
          connection_id,
          tenant_id,
          'syncing'
        );
        messageLogger.info('Data source status updated to syncing');
        break;

      case 'sync_completed':
        updatedDataSource = await this.dataSourceService.updateDataSourceStatus(
          connection_id,
          tenant_id,
          'idle',
          'completed',
          true, // Update last_sync_at
          true  // Require status to be 'syncing' to prevent race condition
        );

        // If update failed (returned null), the sync was likely cancelled
        if (!updatedDataSource) {
          messageLogger.warn({
            connection_id,
            tenant_id
          }, 'Sync completed message ignored - sync may have been cancelled');
          return; // Don't send SSE notification
        }

        messageLogger.info({
          documentsProcessed: payload.documents_processed
        }, 'Data source sync completed successfully');
        break;

      case 'sync_failed':
        updatedDataSource = await this.dataSourceService.updateDataSourceStatus(
          connection_id,
          tenant_id,
          'idle',
          'failed',
          true // Update last_sync_at
        );
        messageLogger.error({
          errorMessage: error_message
        }, 'Data source sync failed');
        break;

      case 'sync_cancelled':
        updatedDataSource = await this.dataSourceService.updateDataSourceStatus(
          connection_id,
          tenant_id,
          'cancelled',
          'failed',
          true // Update last_sync_at
        );
        messageLogger.info({
          errorMessage: error_message || 'Sync cancelled by user'
        }, 'Data source sync cancelled');
        break;

      default:
        messageLogger.error({ status }, 'Unknown sync status type');
        throw new Error(`Unknown sync status type: ${status}`);
    }

    if (!updatedDataSource) {
      messageLogger.error('Data source not found');
      throw new Error(`Data source ${connection_id} not found for organization ${tenant_id}`);
    }

    // Send SSE event to notify frontend of status change
    try {
      const sseService = getSSEService();

      // Send to organization (all users in the org can see data source updates)
      sseService.sendToOrganization(tenant_id, {
        type: 'data_source_update',
        data: {
          connection_id: connection_id,
          connection_type: updatedDataSource.type,
          status: updatedDataSource.status,
          last_sync_status: updatedDataSource.last_sync_status,
          last_sync_at: updatedDataSource.last_sync_at,
          last_sync_error: error_message,
          documents_processed: payload.documents_processed,
          timestamp: new Date().toISOString()
        }
      });

      messageLogger.info({ eventType: 'data_source_update' }, 'SSE event sent to organization');
    } catch (sseError) {
      messageLogger.warn({
        error: sseError instanceof Error ? sseError.message : String(sseError)
      }, 'Failed to send SSE event');
      // Don't throw here - SSE failure shouldn't prevent status processing
    }

    messageLogger.info('Sync status processing completed successfully');
  }

  /**
   * Process verification status message
   */
  private async processVerificationStatus(payload: VerificationStatusMessage): Promise<void> {
    const { connection_id, tenant_id, status, options, error } = payload;

    // Validate required fields
    if (!connection_id || !tenant_id || !status) {
      const messageLogger = queueLogger.child({
        connectionId: connection_id,
        tenantId: tenant_id,
        status: status
      });
      messageLogger.error({ payload }, 'Invalid verification status payload: missing required fields');
      throw new Error('Invalid verification status payload: missing required fields');
    }

    const messageLogger = queueLogger.child({
      connectionId: connection_id,
      tenantId: tenant_id,
      status: status
    });

    messageLogger.info('Processing verification status update');

    // Update verification status in database
    const updatedDataSource = await this.dataSourceService.updateVerificationStatus(
      connection_id,
      tenant_id,
      status,
      options || undefined,
      error || undefined
    );

    if (!updatedDataSource) {
      messageLogger.error('Data source not found');
      throw new Error(`Data source ${connection_id} not found for organization ${tenant_id}`);
    }

    if (status === 'success') {
      messageLogger.info({
        hasOptions: !!options
      }, 'Data source verification completed successfully');
    } else {
      messageLogger.error({
        errorMessage: error
      }, 'Data source verification failed');
    }

    // Send SSE event to notify frontend of verification result
    try {
      const sseService = getSSEService();

      // Send to organization (all users in the org can see data source updates)
      sseService.sendToOrganization(tenant_id, {
        type: 'data_source_update',
        data: {
          connection_id: connection_id,
          status: updatedDataSource.status,
          last_verification_at: updatedDataSource.last_verification_at,
          last_verification_error: updatedDataSource.last_verification_error,
          latest_options: updatedDataSource.latest_options,
          timestamp: new Date().toISOString()
        }
      });

      messageLogger.info({ eventType: 'data_source_update' }, 'SSE event sent to organization');
    } catch (sseError) {
      messageLogger.warn({
        error: sseError instanceof Error ? sseError.message : String(sseError)
      }, 'Failed to send SSE event');
      // Don't throw here - SSE failure shouldn't prevent status processing
    }

    messageLogger.info('Verification status processing completed successfully');
  }

  /**
   * Process ticket ingestion status message (ITSM Autopilot)
   */
  private async processTicketIngestionStatus(payload: IngestionStatusMessage): Promise<void> {
    const { ingestion_run_id, tenant_id, connection_id, status, records_processed, records_failed, error_message } = payload;

    // Validate required fields
    if (!ingestion_run_id || !tenant_id || !status) {
      const messageLogger = queueLogger.child({
        ingestionRunId: ingestion_run_id,
        tenantId: tenant_id,
        status: status
      });
      messageLogger.error({ payload }, 'Invalid ticket ingestion payload: missing required fields');
      throw new Error('Invalid ticket ingestion payload: missing required fields');
    }

    const messageLogger = queueLogger.child({
      ingestionRunId: ingestion_run_id,
      tenantId: tenant_id,
      status: status
    });

    messageLogger.info('Processing ticket ingestion status update');

    // Update ingestion_runs table
    await this.dataSourceService.updateIngestionRunStatus(
      ingestion_run_id,
      status,
      error_message
    );

    // Update records count if provided
    if (records_processed !== undefined || records_failed !== undefined) {
      await this.dataSourceService.updateIngestionRunRecords(
        ingestion_run_id,
        records_processed,
        records_failed
      );
    }

    messageLogger.info({
      recordsProcessed: records_processed,
      recordsFailed: records_failed
    }, `Ticket ingestion ${status}`);

    // Send SSE event to notify frontend
    try {
      const sseService = getSSEService();

      sseService.sendToOrganization(tenant_id, {
        type: 'ingestion_run_update',
        data: {
          ingestion_run_id: ingestion_run_id,
          connection_id: connection_id,
          status: status,
          records_processed: records_processed,
          records_failed: records_failed,
          error_message: error_message,
          timestamp: new Date().toISOString()
        }
      });

      messageLogger.info({ eventType: 'ingestion_run_update' }, 'SSE event sent to organization');
    } catch (sseError) {
      messageLogger.warn({
        error: sseError instanceof Error ? sseError.message : String(sseError)
      }, 'Failed to send SSE event');
      // Don't throw here - SSE failure shouldn't prevent status processing
    }

    messageLogger.info('Ticket ingestion status processing completed successfully');
  }
}
