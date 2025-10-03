import type { Channel, ConsumeMessage } from 'amqplib';
import { DataSourceService } from '../services/DataSourceService.js';
import { getSSEService } from '../services/sse.js';
import { queueLogger, logError, PerformanceTimer } from '../config/logger.js';
import type { SyncStatusMessage } from '../types/dataSource.js';

export class DataSourceSyncConsumer {
  private readonly queueName: string;
  private dataSourceService: DataSourceService;

  constructor() {
    this.queueName = process.env.DATA_SOURCE_SYNC_QUEUE || 'data_source_sync_status';
    this.dataSourceService = new DataSourceService();
  }

  /**
   * Start consuming sync status messages
   */
  async startConsumer(channel: Channel): Promise<void> {
    queueLogger.info({ queueName: this.queueName }, 'Starting Data Source Sync consumer...');

    // Assert queue exists
    await channel.assertQueue(this.queueName, {
      durable: true
    });

    // Start consuming messages
    await channel.consume(this.queueName, async (message: ConsumeMessage | null) => {
      if (!message) return;

      const timer = new PerformanceTimer(queueLogger, 'data-source-sync-processing');
      try {
        const content: SyncStatusMessage = JSON.parse(message.content.toString());
        queueLogger.info({
          connectionId: content.connection_id,
          tenantId: content.tenant_id,
          status: content.status
        }, 'Received sync status message');

        await this.processSyncStatus(content);

        // Acknowledge message
        channel.ack(message);
        timer.end({
          connectionId: content.connection_id,
          status: content.status,
          success: true
        });
        queueLogger.info({
          connectionId: content.connection_id
        }, 'Sync status processed successfully');

      } catch (error) {
        timer.end({ success: false });
        logError(queueLogger, error as Error, { operation: 'data-source-sync-processing' });

        // Reject message and don't requeue to avoid infinite loops
        channel.nack(message, false, false);
      }
    });

    queueLogger.info({ queueName: this.queueName }, 'Data Source Sync consumer started successfully');
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
          true // Update last_sync_at
        );
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
          connectionId: connection_id,
          status: updatedDataSource.status,
          lastSyncStatus: updatedDataSource.last_sync_status,
          lastSyncAt: updatedDataSource.last_sync_at,
          errorMessage: error_message,
          documentsProcessed: payload.documents_processed,
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
}