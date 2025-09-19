import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { resolve } from 'path';
import amqp from 'amqplib';
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

interface WebhookPayload {
  source: string;
  action: string;
  user_email: string;
  user_id: string;
  tenant_id: string;
  conversation_id: string;
  customer_message: string;
  message_id: string;
  document_ids: string[];
  timestamp: string;
}

interface MockResponse {
  message_id: string;
  conversation_id: string;
  tenant_id: string;
  user_id: string;
  response: string;
}

// RabbitMQ connection
let rabbitConnection: amqp.Connection | null = null;
let rabbitChannel: amqp.Channel | null = null;

async function connectRabbitMQ(): Promise<void> {
  const timer = new PerformanceTimer(rabbitLogger, 'connect-rabbitmq');
  try {
    rabbitLogger.info('Connecting to RabbitMQ...', { url: MOCK_CONFIG.rabbitUrl });
    rabbitConnection = await amqp.connect(MOCK_CONFIG.rabbitUrl);
    rabbitChannel = await rabbitConnection.createChannel();

    await rabbitChannel.assertQueue(MOCK_CONFIG.queueName, { durable: true });
    timer.end({ queueName: MOCK_CONFIG.queueName, success: true });
    rabbitLogger.info('Connected to RabbitMQ successfully', { queueName: MOCK_CONFIG.queueName });
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
    organizationId: response.organization_id,
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
      status: response.status,
      queueName: MOCK_CONFIG.queueName,
      success: true
    });
    contextLogger.info('Published response to queue', {
      status: response.status,
      queueName: MOCK_CONFIG.queueName
    });
  } catch (error) {
    timer.end({ success: false });
    logError(contextLogger, error as Error, { operation: 'publish-response' });
    throw error;
  }
}

function generateMockResponse(payload: WebhookPayload, scenario?: string): MockResponse {
  const useScenario = scenario || MOCK_CONFIG.defaultScenario;
  const isSuccess = Math.random() * 100 < MOCK_CONFIG.successRate;

  const content = payload.customer_message;
  const documentCount = payload.document_ids?.length || 0;

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
    message_id: payload.message_id,
    conversation_id: payload.conversation_id,
    tenant_id: payload.tenant_id,
    user_id: payload.user_id,
    response: responseText
  };
}

// Health check
app.get('/health', (req, res) => {
  const correlationId = generateCorrelationId();
  const contextLogger = createContextLogger(logger, correlationId);

  contextLogger.info('Health check requested');

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

    const contextLogger = createContextLogger(webhookLogger, correlationId, {
      messageId: payload.message_id,
      tenantId: payload.tenant_id,
      userId: payload.user_id,
      conversationId: payload.conversation_id
    });

    contextLogger.info('Received webhook', {
      source: payload.source,
      action: payload.action,
      user_email: payload.user_email,
      content: payload.customer_message?.substring(0, 50) + '...',
      documentCount: payload.document_ids?.length || 0,
      conversationId: payload.conversation_id
    });

    // Validate required fields
    if (!payload.message_id || !payload.tenant_id || !payload.conversation_id || !payload.user_id) {
      contextLogger.warn('Webhook validation failed - missing required fields', {
        hasMessageId: !!payload.message_id,
        hasTenantId: !!payload.tenant_id,
        hasConversationId: !!payload.conversation_id,
        hasUserId: !!payload.user_id
      });
      return res.status(400).json({
        error: 'Missing required fields: message_id, tenant_id, conversation_id, user_id'
      });
    }

    // Check authorization
    const authHeader = req.headers.authorization;
    const expectedAuth = `Basic ${process.env.AUTOMATION_AUTH}`;

    if (authHeader !== expectedAuth) {
      contextLogger.warn('Webhook authentication failed', {
        hasAuthHeader: !!authHeader,
        authHeaderPrefix: authHeader?.substring(0, 10) + '...'
      });
      return res.status(401).json({ error: 'Unauthorized' });
    }

    contextLogger.info('Webhook authenticated successfully');

    // Acknowledge receipt immediately
    const estimatedCompletion = new Date(Date.now() + MOCK_CONFIG.responseDelay);
    timer.end({
      messageId: payload.message_id,
      estimatedCompletion: estimatedCompletion.toISOString(),
      responseDelay: MOCK_CONFIG.responseDelay,
      success: true
    });

    contextLogger.info('Webhook acknowledged, processing scheduled', {
      estimatedCompletion: estimatedCompletion.toISOString(),
      responseDelay: MOCK_CONFIG.responseDelay
    });

    res.status(202).json({
      message: 'Webhook received, processing started',
      message_id: payload.message_id,
      estimated_completion: estimatedCompletion.toISOString()
    });

    // Process with configured delay
    setTimeout(async () => {
      const processingTimer = new PerformanceTimer(webhookLogger, 'mock-response-generation');
      const processingLogger = createContextLogger(webhookLogger, correlationId, {
        messageId: payload.message_id,
        tenantId: payload.tenant_id,
        userId: payload.user_id,
        conversationId: payload.conversation_id
      });

      try {
        processingLogger.info('Starting mock response generation');
        const response = generateMockResponse(payload);
        await publishResponse(response);
        processingTimer.end({
          messageId: payload.message_id,
          status: response.status,
          success: true
        });
        processingLogger.info('Mock processing completed successfully', {
          status: response.status
        });
      } catch (error) {
        processingTimer.end({ success: false });
        logError(processingLogger, error as Error, {
          operation: 'mock-response-generation',
          messageId: payload.message_id
        });

        // Send failure response
        const failureResponse = generateMockResponse(payload, 'failure');
        try {
          await publishResponse(failureResponse);
          processingLogger.info('Published failure response after error');
        } catch (publishError) {
          logError(processingLogger, publishError as Error, {
            operation: 'publish-failure-response',
            messageId: payload.message_id
          });
        }
      }
    }, MOCK_CONFIG.responseDelay);

  } catch (error) {
    timer.end({ success: false });
    const errorLogger = createContextLogger(webhookLogger, correlationId);
    logError(errorLogger, error as Error, { operation: 'webhook-processing' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test endpoint to trigger specific scenarios
app.post('/test/:scenario', async (req, res) => {
  const correlationId = generateCorrelationId();
  const timer = new PerformanceTimer(webhookLogger, 'test-scenario');

  try {
    const { scenario } = req.params;
    const payload: WebhookPayload = req.body;
    const contextLogger = createContextLogger(webhookLogger, correlationId, {
      messageId: payload.message_id,
      tenantId: payload.tenant_id,
      userId: payload.user_id,
      conversationId: payload.conversation_id
    });

    if (!['success', 'failure', 'processing', 'random'].includes(scenario)) {
      contextLogger.warn('Invalid test scenario requested', { scenario });
      return res.status(400).json({ error: 'Invalid scenario. Use: success, failure, processing, random' });
    }

    contextLogger.info('Test scenario triggered', { scenario });

    const response = generateMockResponse(payload, scenario);
    await publishResponse(response);

    timer.end({
      scenario,
      messageId: payload.message_id,
      status: response.status,
      success: true
    });

    contextLogger.info('Test scenario executed successfully', {
      scenario,
      status: response.status
    });

    res.json({
      message: `Test scenario "${scenario}" executed`,
      response
    });

  } catch (error) {
    timer.end({ success: false });
    const errorLogger = createContextLogger(webhookLogger, correlationId);
    logError(errorLogger, error as Error, { operation: 'test-scenario' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Configuration endpoint
app.get('/config', (req, res) => {
  const correlationId = generateCorrelationId();
  const contextLogger = createContextLogger(configLogger, correlationId);

  contextLogger.info('Configuration requested');

  res.json({
    config: MOCK_CONFIG,
    scenarios: ['success', 'failure', 'processing', 'random'],
    description: 'Mock automation service for Rita Chat testing'
  });
});

app.post('/config', (req, res) => {
  const correlationId = generateCorrelationId();
  const contextLogger = createContextLogger(configLogger, correlationId);
  const { scenario, delay, successRate } = req.body;
  const oldConfig = { ...MOCK_CONFIG };

  contextLogger.info('Configuration update requested', {
    requestedChanges: { scenario, delay, successRate }
  });

  if (scenario && ['success', 'failure', 'processing', 'random'].includes(scenario)) {
    MOCK_CONFIG.defaultScenario = scenario;
  }

  if (delay && delay >= 0) {
    MOCK_CONFIG.responseDelay = parseInt(delay);
  }

  if (successRate && successRate >= 0 && successRate <= 100) {
    MOCK_CONFIG.successRate = parseInt(successRate);
  }

  contextLogger.info('Configuration updated successfully', {
    oldConfig,
    newConfig: MOCK_CONFIG
  });

  res.json({
    message: 'Configuration updated',
    config: MOCK_CONFIG
  });
});

// Start server
app.listen(PORT, async () => {
  logger.info('Rita Mock Automation Service started', {
    port: PORT,
    endpoints: {
      health: `http://localhost:${PORT}/health`,
      config: `http://localhost:${PORT}/config`,
      webhook: `http://localhost:${PORT}/webhook`
    },
    scenario: MOCK_CONFIG.defaultScenario,
    responseDelay: MOCK_CONFIG.responseDelay
  });

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
  shutdownLogger.info('Mock service shutting down gracefully...');

  try {
    if (rabbitChannel) {
      await rabbitChannel.close();
      shutdownLogger.info('RabbitMQ channel closed');
    }
    if (rabbitConnection) {
      await rabbitConnection.close();
      shutdownLogger.info('RabbitMQ connection closed');
    }
    shutdownLogger.info('Graceful shutdown completed');
  } catch (error) {
    logError(shutdownLogger, error as Error, { operation: 'graceful-shutdown' });
  }
  process.exit(0);
});