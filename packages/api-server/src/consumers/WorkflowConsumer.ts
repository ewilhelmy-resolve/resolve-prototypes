import type { Channel, ConsumeMessage } from 'amqplib';
import { logError, PerformanceTimer, queueLogger } from '../config/logger.js';
import { getSSEService, type DynamicWorkflowEvent } from '../services/sse.js';

/**
 * Workflow message from platform
 */
interface WorkflowMessage {
  tenant_id: string;
  user_id: string;
  action: 'workflow_created' | 'workflow_executed' | 'progress_update';
  workflow?: DynamicWorkflowEvent['data']['workflow'];
  mappings?: Record<string, Record<string, string>>;
  visualization?: string;
  result?: any;
  progress?: string;
  error?: string;
}

/**
 * RabbitMQ Consumer for Dynamic Workflow Events
 * Listens to workflow.responses queue and pushes events via SSE
 */
export class WorkflowConsumer {
  private readonly queueName: string;

  constructor() {
    this.queueName = process.env.WORKFLOW_RESPONSE_QUEUE || 'workflow.responses';
  }

  /**
   * Start consuming workflow messages
   */
  async startConsumer(channel: Channel): Promise<void> {
    queueLogger.info({ queueName: this.queueName }, 'Starting Workflow consumer...');

    // Assert queue exists
    await channel.assertQueue(this.queueName, {
      durable: true
    });

    // Start consuming messages
    await channel.consume(this.queueName, async (message: ConsumeMessage | null) => {
      if (!message) return;

      const timer = new PerformanceTimer(queueLogger, 'workflow-processing');
      try {
        const content: WorkflowMessage = JSON.parse(message.content.toString());

        queueLogger.info({
          action: content.action,
          tenantId: content.tenant_id,
          userId: content.user_id
        }, 'Received workflow message');

        await this.processWorkflowMessage(content);

        // Acknowledge message
        channel.ack(message);
        timer.end({
          action: content.action,
          tenantId: content.tenant_id,
          success: true
        });
        queueLogger.info({
          action: content.action
        }, 'Workflow message processed successfully');

      } catch (error) {
        timer.end({ success: false });
        logError(queueLogger, error as Error, { operation: 'workflow-processing' });

        // Reject message and don't requeue to avoid infinite loops
        channel.nack(message, false, false);
      }
    });

    queueLogger.info({ queueName: this.queueName }, 'Workflow consumer started successfully');
  }

  /**
   * Process workflow message and send SSE event
   */
  private async processWorkflowMessage(payload: WorkflowMessage): Promise<void> {
    const { tenant_id, user_id, action, workflow, mappings, visualization, result, progress, error } = payload;

    // Validate required fields
    if (!tenant_id || !user_id || !action) {
      const messageLogger = queueLogger.child({
        tenantId: tenant_id,
        userId: user_id,
        action: action
      });
      messageLogger.error({ payload }, 'Invalid workflow payload: missing required fields');
      throw new Error('Invalid workflow payload: missing required fields');
    }

    const messageLogger = queueLogger.child({
      tenantId: tenant_id,
      userId: user_id,
      action: action
    });

    messageLogger.info('Processing workflow message');

    // Send SSE event to the user
    try {
      const sseService = getSSEService();

      const event: DynamicWorkflowEvent = {
        type: 'dynamic_workflow',
        data: {
          action,
          workflow,
          mappings,
          visualization,
          result,
          progress,
          error,
          timestamp: new Date().toISOString()
        }
      };

      // Send to the specific user who initiated the workflow request
      sseService.sendToUser(user_id, tenant_id, event);

      messageLogger.info({ eventType: 'dynamic_workflow', action }, 'SSE event sent to user');
    } catch (sseError) {
      messageLogger.warn({
        error: sseError instanceof Error ? sseError.message : String(sseError)
      }, 'Failed to send SSE event');
      // Don't throw here - SSE failure shouldn't prevent message processing
    }

    messageLogger.info('Workflow message processing completed successfully');
  }
}
