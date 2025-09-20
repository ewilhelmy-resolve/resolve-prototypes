import express from 'express';
import cors from 'cors';
import { authenticateUser } from './middleware/auth.js';

import authRoutes from './routes/auth.js';
import organizationRoutes from './routes/organizations.js';
import messageRoutes from './routes/messages.js';
import conversationRoutes from './routes/conversations.js';
import filesRoutes from './routes/files.js';
import sseRoutes from './routes/sse.js';
import { getRabbitMQService } from './services/rabbitmq.js';
import { getSSEService } from './services/sse.js';
import { destroySessionStore } from './services/sessionStore.js';
import { logger } from './config/logger.js';
import {
  requestLoggingMiddleware,
  addUserContextToLogs,
  errorLoggingMiddleware,
  healthCheckLoggingMiddleware,
  logApiOperation
} from './middleware/logging.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Logging middleware (must be first)
app.use(healthCheckLoggingMiddleware);
app.use(requestLoggingMiddleware);

// Basic middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Webhook routes (no auth required)



// Authentication routes (no auth required)
app.use('/auth', authRoutes);

// Test SSE endpoint (no auth required)
app.get('/test-sse', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': process.env.CLIENT_URL || 'http://localhost:5173',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  let counter = 0;

  const sendEvent = () => {
    counter++;
    const data = JSON.stringify({
      type: 'test_message',
      data: {
        message: `Test message ${counter}`,
        timestamp: new Date().toISOString(),
        counter: counter
      }
    });

    res.write(`data: ${data}\n\n`);
  };

  // Send initial message
  sendEvent();

  // Send a message every 3 seconds
  const interval = setInterval(sendEvent, 3000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
    console.log('Test SSE client disconnected');
  });
});

// Protected routes (require authentication)
app.use('/api/organizations', authenticateUser, addUserContextToLogs, organizationRoutes);
app.use('/api/conversations', authenticateUser, addUserContextToLogs, conversationRoutes);
app.use('/api/messages', authenticateUser, addUserContextToLogs, messageRoutes);
app.use('/api/files', authenticateUser, addUserContextToLogs, filesRoutes);
app.use('/api/sse', authenticateUser, addUserContextToLogs, sseRoutes);
app.get('/api/profile', authenticateUser, addUserContextToLogs, logApiOperation('get-profile'), (req: any, res) => {
  res.json({
    user: req.user,
    message: 'Authentication successful'
  });
});

// Test organization context
app.get('/api/test-org-context', authenticateUser, addUserContextToLogs, logApiOperation('test-org-context'), async (req: any, res) => {
  try {
    const { withOrgContext } = await import('./config/database.js');

    req.log.debug('Testing organization context');

    const result = await withOrgContext(
      req.user.id,
      req.user.activeOrganizationId,
      async (client) => {
        // Test query that uses RLS policies
        const messages = await client.query('SELECT * FROM messages LIMIT 5');
        const orgs = await client.query('SELECT * FROM organizations');

        return {
          messagesCount: messages.rows.length,
          organizationsCount: orgs.rows.length
        };
      }
    );

    req.log.info({ result }, 'Organization context test successful');

    res.json({
      user: req.user,
      orgContext: result,
      message: 'Organization context working'
    });
  } catch (error) {
    req.log.error({ error }, 'Organization context test failed');
    res.status(500).json({ error: 'Failed to test organization context' });
  }
});

// Error handling middleware (must be last)
app.use(errorLoggingMiddleware);

app.listen(PORT, async () => {
  logger.info({
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: `http://localhost:${PORT}/health`,
      auth: `http://localhost:${PORT}/auth`,
      profile: `http://localhost:${PORT}/api/profile`,
      conversations: `http://localhost:${PORT}/api/conversations`,
      conversationMessages: `http://localhost:${PORT}/api/conversations/:id/messages`,
      messages: `http://localhost:${PORT}/api/messages (convenience method)`,
      files: `http://localhost:${PORT}/api/files`,
      organizations: `http://localhost:${PORT}/api/organizations`,
      sse: `http://localhost:${PORT}/api/sse/events`
    }
  }, 'Rita API Server started successfully');

  // Initialize services
  try {
    // Initialize SSE service
    const sseService = getSSEService();
    logger.info('SSE service initialized successfully');

    // Initialize RabbitMQ consumer
    const rabbitmqService = getRabbitMQService();
    await rabbitmqService.connect();
    await rabbitmqService.startConsumer();
    logger.info('RabbitMQ consumer initialized successfully');
  } catch (error) {
    logger.fatal({ error }, 'Failed to initialize services');
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');

  try {
    // Shutdown SSE service first
    const sseService = getSSEService();
    sseService.shutdown();
    logger.info('SSE service shutdown complete');
  } catch (error) {
    logger.error({ error }, 'Error during SSE shutdown');
  }

  try {
    // Then shutdown RabbitMQ
    const rabbitmqService = getRabbitMQService();
    await rabbitmqService.close();
    logger.info('RabbitMQ connection closed');
  } catch (error) {
    logger.error({ error }, 'Error during RabbitMQ shutdown');
  }

  try {
    // Cleanup session store
    destroySessionStore();
    logger.info('Session store cleaned up');
  } catch (error) {
    logger.error({ error }, 'Error during session store cleanup');
  }

  logger.info('Server shutdown complete');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.fatal({
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    }
  }, 'Uncaught exception occurred');
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({
    reason: reason instanceof Error ? {
      name: reason.name,
      message: reason.message,
      stack: reason.stack
    } : reason,
    promise: promise
  }, 'Unhandled promise rejection occurred');
  process.exit(1);
});