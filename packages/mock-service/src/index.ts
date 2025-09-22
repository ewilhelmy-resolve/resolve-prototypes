import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { resolve } from 'path';
import { connect, Channel, ChannelModel } from 'amqplib';
import {
  logger,
  webhookLogger,
  rabbitLogger,
  configLogger,
  generateCorrelationId,
  createContextLogger,
  PerformanceTimer,
  logError
} from './config/logger.js';


// Load environment from root .env file
config({ path: resolve(process.cwd(), '../../.env') });

const app = express();
const PORT = process.env.MOCK_SERVICE_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock service configuration
const MOCK_CONFIG = {
  // Response scenarios: 'success', 'failure', 'timeout', 'processing'
  defaultScenario: process.env.MOCK_SCENARIO || 'success',
  // Response delays in milliseconds
  responseDelay: parseInt(process.env.MOCK_DELAY || '2000'),
  // Success rate (0-100)
  successRate: parseInt(process.env.MOCK_SUCCESS_RATE || '90'),
  // RabbitMQ configuration
  queueName: process.env.QUEUE_NAME || 'chat.responses',
  rabbitUrl: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'
};

// Base webhook payload shared by all webhook types
interface BaseWebhookPayload {
  source: string;
  action: string;
  user_email?: string;
  user_id?: string;
  tenant_id: string;
  timestamp?: string;
}

// Message webhook payload for rita-chat
interface MessageWebhookPayload extends BaseWebhookPayload {
  source: 'rita-chat';
  action: 'message_created';
  conversation_id: string;
  customer_message: string;
  message_id: string;
  document_ids?: string[];
}

// Document webhook payload for rita-documents
interface DocumentWebhookPayload extends BaseWebhookPayload {
  source: 'rita-documents';
  action: 'document_uploaded';
  document_id: string;
  document_url: string;
  file_type: string;
  file_size: number;
  original_filename: string;
}

// Union type for all webhook payloads
type WebhookPayload = MessageWebhookPayload | DocumentWebhookPayload | BaseWebhookPayload;

interface MockResponse {
  message_id: string;
  conversation_id: string;
  tenant_id: string;
  user_id?: string;
  response: string;
}

// RabbitMQ connection
let rabbitConnection: ChannelModel | null = null;
let rabbitChannel: Channel | null = null;

async function connectRabbitMQ(): Promise<void> {
  const timer = new PerformanceTimer(rabbitLogger, 'connect-rabbitmq');
  try {
    rabbitLogger.info({ url: MOCK_CONFIG.rabbitUrl }, 'Connecting to RabbitMQ...');
    rabbitConnection = await connect(MOCK_CONFIG.rabbitUrl);
    rabbitChannel = await rabbitConnection.createChannel();

    await rabbitChannel.assertQueue(MOCK_CONFIG.queueName, { durable: true });
    timer.end({ queueName: MOCK_CONFIG.queueName, success: true });
    rabbitLogger.info({ queueName: MOCK_CONFIG.queueName }, 'Connected to RabbitMQ successfully');
  } catch (error) {
    timer.end({ success: false });
    logError(rabbitLogger, error as Error, { operation: 'connect-rabbitmq', url: MOCK_CONFIG.rabbitUrl });
    throw error;
  }
}

async function publishResponse(response: MockResponse): Promise<void> {
  const timer = new PerformanceTimer(rabbitLogger, 'publish-response');
  const contextLogger = createContextLogger(rabbitLogger, generateCorrelationId(), {
    messageId: response.message_id,
    tenantId: response.tenant_id,
    userId: response.user_id
  });

  try {
    if (!rabbitChannel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    const messageBuffer = Buffer.from(JSON.stringify(response));
    rabbitChannel.sendToQueue(MOCK_CONFIG.queueName, messageBuffer, {
      persistent: true
    });

    timer.end({
      messageId: response.message_id,
      queueName: MOCK_CONFIG.queueName,
      success: true
    });
    contextLogger.info({
      queueName: MOCK_CONFIG.queueName
    }, 'Published response to queue');
  } catch (error) {
    timer.end({ success: false });
    logError(contextLogger, error as Error, { operation: 'publish-response' });
    throw error;
  }
}

function generateMockResponse(payload: WebhookPayload, scenario?: string): MockResponse | null {
  // Only generate responses for rita-chat messages, not document processing
  if (payload.source !== 'rita-chat') {
    return null;
  }

  const messagePayload = payload as MessageWebhookPayload;
  const useScenario = scenario || MOCK_CONFIG.defaultScenario;
  const isSuccess = Math.random() * 100 < MOCK_CONFIG.successRate;

  const content = messagePayload.customer_message;
  const documentCount = messagePayload.document_ids?.length || 0;

  let responseText: string;

  switch (useScenario) {
    case 'success':
      responseText = `✅ Mock automation completed successfully for: "${content}". Generated response with ${documentCount} document(s) processed.`;
      break;

    case 'failure':
      responseText = `❌ Mock automation failed: Unable to process "${content}". Simulated error for testing.`;
      break;

    case 'processing':
      responseText = `🔄 Mock automation is processing: "${content}". This is an intermediate status.`;
      break;

    case 'random':
      if (isSuccess) {
        responseText = `🎲 Random success! Processed: "${content}" with ${Math.floor(Math.random() * 10)} operations completed.`;
      } else {
        responseText = `🎲 Random failure! Could not process: "${content}". Error code: ${Math.floor(Math.random() * 1000)}`;
      }
      break;

    default:
      responseText = `Default mock response for: "${content}"`;
      break;
  }

  return {
    message_id: messagePayload.message_id,
    conversation_id: messagePayload.conversation_id,
    tenant_id: messagePayload.tenant_id,
    user_id: messagePayload.user_id,
    response: responseText
  };
}

// Health check
app.get('/health', (req, res) => {
  const correlationId = generateCorrelationId();
  const contextLogger = createContextLogger(logger, correlationId);

  contextLogger.info({}, 'Health check requested');

  res.json({
    status: 'ok',
    service: 'rita-mock-automation',
    timestamp: new Date().toISOString(),
    config: MOCK_CONFIG
  });
});

// Webhook endpoint - main automation receiver
app.post('/webhook', async (req, res) => {
  const correlationId = generateCorrelationId();
  const timer = new PerformanceTimer(webhookLogger, 'webhook-processing');

  try {
    const payload: WebhookPayload = req.body;

    // Basic validation - all webhooks must have source, action, and tenant_id
    if (!payload.source || !payload.action || !payload.tenant_id) {
      const errorLogger = createContextLogger(webhookLogger, correlationId);
      errorLogger.warn({
        hasSource: !!payload.source,
        hasAction: !!payload.action,
        hasTenantId: !!payload.tenant_id
      }, 'Webhook validation failed - missing basic required fields');
      return res.status(400).json({
        error: 'Missing required fields: source, action, tenant_id'
      });
    }

    // Handle different webhook types
    if (payload.source === 'rita-chat' && payload.action === 'message_created') {
      const messagePayload = payload as MessageWebhookPayload;

      const contextLogger = createContextLogger(webhookLogger, correlationId, {
        messageId: messagePayload.message_id,
        tenantId: messagePayload.tenant_id,
        userId: messagePayload.user_id,
        conversationId: messagePayload.conversation_id
      });

      contextLogger.info({
        source: messagePayload.source,
        action: messagePayload.action,
        user_email: messagePayload.user_email,
        content: messagePayload.customer_message?.substring(0, 50) + '...',
        documentCount: messagePayload.document_ids?.length || 0,
        conversationId: messagePayload.conversation_id
      }, 'Received message webhook');

      // Validate message-specific required fields
      if (!messagePayload.message_id || !messagePayload.conversation_id || !messagePayload.customer_message) {
        contextLogger.warn({
          hasMessageId: !!messagePayload.message_id,
          hasConversationId: !!messagePayload.conversation_id,
          hasCustomerMessage: !!messagePayload.customer_message
        }, 'Message webhook validation failed - missing required fields');
        return res.status(400).json({
          error: 'Missing required fields for message webhook: message_id, conversation_id, customer_message'
        });
      }

    } else if (payload.source === 'rita-documents' && payload.action === 'document_uploaded') {
      const documentPayload = payload as DocumentWebhookPayload;

      const contextLogger = createContextLogger(webhookLogger, correlationId, {
        documentId: documentPayload.document_id,
        tenantId: documentPayload.tenant_id,
        userId: documentPayload.user_id
      });

      contextLogger.info({
        source: documentPayload.source,
        action: documentPayload.action,
        user_email: documentPayload.user_email,
        document_id: documentPayload.document_id,
        document_url: documentPayload.document_url,
        file_type: documentPayload.file_type,
        file_size: documentPayload.file_size,
        original_filename: documentPayload.original_filename
      }, 'Received document webhook');

      // Validate document-specific required fields
      if (!documentPayload.document_id || !documentPayload.document_url || !documentPayload.file_type) {
        contextLogger.warn({
          hasDocumentId: !!documentPayload.document_id,
          hasDocumentUrl: !!documentPayload.document_url,
          hasFileType: !!documentPayload.file_type
        }, 'Document webhook validation failed - missing required fields');
        return res.status(400).json({
          error: 'Missing required fields for document webhook: document_id, document_url, file_type'
        });
      }

    } else {
      const errorLogger = createContextLogger(webhookLogger, correlationId);
      // Avoid accessing properties on a value narrowed to never by referencing raw body as BaseWebhookPayload
      const basePayload = req.body as BaseWebhookPayload;
      errorLogger.warn({
        source: basePayload.source,
        action: basePayload.action
      }, 'Unsupported webhook type');
      return res.status(400).json({
        error: `Unsupported webhook type: ${basePayload.source}:${basePayload.action}`
      });
    }

    const contextLogger = createContextLogger(webhookLogger, correlationId, {
      tenantId: payload.tenant_id,
      userId: payload.user_id
    });

    // Check authorization
    const authHeader = req.headers.authorization;
    const expectedAuth = `Basic ${process.env.AUTOMATION_AUTH}`;

    if (authHeader !== expectedAuth) {
      contextLogger.warn({
        hasAuthHeader: !!authHeader,
        authHeaderPrefix: authHeader?.substring(0, 10) + '...'
      }, 'Webhook authentication failed');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    contextLogger.info({}, 'Webhook authenticated successfully');

    // Handle processing based on webhook type
    if (payload.source === 'rita-chat') {
      // Message processing - generate response and send to RabbitMQ
      const estimatedCompletion = new Date(Date.now() + MOCK_CONFIG.responseDelay);
      timer.end({
        messageId: (payload as MessageWebhookPayload).message_id,
        estimatedCompletion: estimatedCompletion.toISOString(),
        responseDelay: MOCK_CONFIG.responseDelay,
        success: true
      });

      contextLogger.info({
        estimatedCompletion: estimatedCompletion.toISOString(),
        responseDelay: MOCK_CONFIG.responseDelay
      }, 'Message webhook acknowledged, processing scheduled');

      res.status(202).json({
        message: 'Message webhook received, processing started',
        message_id: (payload as MessageWebhookPayload).message_id,
        estimated_completion: estimatedCompletion.toISOString()
      });

      // Process message with configured delay
      setTimeout(async () => {
        const processingTimer = new PerformanceTimer(webhookLogger, 'mock-message-processing');
        const messagePayload = payload as MessageWebhookPayload;
        const processingLogger = createContextLogger(webhookLogger, correlationId, {
          messageId: messagePayload.message_id,
          tenantId: messagePayload.tenant_id,
          userId: messagePayload.user_id,
          conversationId: messagePayload.conversation_id
        });

        try {
          processingLogger.info({}, 'Starting mock message response generation');
          const response = generateMockResponse(payload);
          if (response) {
            await publishResponse(response);
            processingTimer.end({
              messageId: messagePayload.message_id,
              success: true
            });
            processingLogger.info({}, 'Mock message processing completed successfully');
          } else {
            processingLogger.warn({}, 'No response generated for message');
          }
        } catch (error) {
          processingTimer.end({ success: false });
          logError(processingLogger, error as Error, {
            operation: 'mock-message-processing',
            messageId: messagePayload.message_id
          });

          // Send failure response
          const failureResponse = generateMockResponse(payload, 'failure');
          if (failureResponse) {
            try {
              await publishResponse(failureResponse);
              processingLogger.info({}, 'Published failure response after error');
            } catch (publishError) {
              logError(processingLogger, publishError as Error, {
                operation: 'publish-failure-response',
                messageId: messagePayload.message_id
              });
            }
          }
        }
      }, MOCK_CONFIG.responseDelay);

    } else if (payload.source === 'rita-documents') {
      // Document processing - just log as placeholder
      const documentPayload = payload as DocumentWebhookPayload;
      timer.end({
        documentId: documentPayload.document_id,
        success: true
      });

      contextLogger.info({
        document_id: documentPayload.document_id,
        document_url: documentPayload.document_url,
        file_type: documentPayload.file_type,
        file_size: documentPayload.file_size,
        original_filename: documentPayload.original_filename,
        note: 'Document processing is placeholder - only logging to console'
      }, '📄 PLACEHOLDER: Document processing webhook received');

      res.status(200).json({
        message: 'Document webhook received and logged (placeholder implementation)',
        document_id: documentPayload.document_id,
        status: 'acknowledged'
      });
    }

  } catch (error) {
    timer.end({ success: false });
    const errorLogger = createContextLogger(webhookLogger, correlationId);
    logError(errorLogger, error as Error, { operation: 'webhook-processing' });
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Configuration endpoint
app.get('/config', (req, res) => {
  const correlationId = generateCorrelationId();
  const contextLogger = createContextLogger(configLogger, correlationId);

  contextLogger.info({}, 'Configuration requested');

  res.json({
    config: MOCK_CONFIG,
    scenarios: ['success', 'failure', 'processing', 'random'],
    description: 'Mock automation service for Rita Chat testing'
  });
});


// Start server
app.listen(PORT, async () => {
  logger.info({
    port: PORT,
    endpoints: {
      health: `http://localhost:${PORT}/health`,
      config: `http://localhost:${PORT}/config`,
      webhook: `http://localhost:${PORT}/webhook`
    },
    scenario: MOCK_CONFIG.defaultScenario,
    responseDelay: MOCK_CONFIG.responseDelay
  }, 'Rita Mock Automation Service started');

  // Initialize RabbitMQ connection
  try {
    await connectRabbitMQ();
  } catch (error) {
    logError(logger, error as Error, { operation: 'startup', component: 'rabbitmq-initialization' });
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  const shutdownLogger = logger.child({ operation: 'graceful-shutdown' });
  shutdownLogger.info({}, 'Mock service shutting down gracefully...');

  try {
    if (rabbitChannel) {
      await rabbitChannel.close();
      shutdownLogger.info({}, 'RabbitMQ channel closed');
    }
    if (rabbitConnection) {
      await (rabbitConnection as unknown as { close: () => Promise<void> }).close();
      shutdownLogger.info({}, 'RabbitMQ connection closed');
    }
    shutdownLogger.info({}, 'Graceful shutdown completed');
  } catch (error) {
    logError(shutdownLogger, error as Error, { operation: 'graceful-shutdown' });
  }
  process.exit(0);
});