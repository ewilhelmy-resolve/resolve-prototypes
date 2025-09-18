import { Router } from 'express';
import { randomUUID } from 'crypto';
import { getSSEService } from '../services/sse.js';
import { createContextLogger, generateCorrelationId } from '../config/logger.js';

const router = Router();
const sseService = getSSEService();

// SSE endpoint for real-time updates
router.get('/events', (req: any, res) => {
  const correlationId = generateCorrelationId();
  const contextLogger = createContextLogger(req.log, correlationId, {
    userId: req.user?.id,
    organizationId: req.user?.activeOrganizationId,
    email: req.user?.email
  });

  if (!req.user?.id || !req.user?.activeOrganizationId) {
    contextLogger.warn('SSE connection rejected - missing user context');
    return res.status(401).json({ error: 'User context required for SSE connection' });
  }

  const connectionId = randomUUID();

  contextLogger.info({
    connectionId,
    userAgent: req.headers['user-agent']
  }, 'Establishing SSE connection');

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': process.env.CLIENT_URL || 'http://localhost:5173',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Cache-Control',
    'X-Accel-Buffering': 'no' // Disable nginx buffering
  });

  // Create SSE connection
  const connection = {
    id: connectionId,
    userId: req.user.id,
    organizationId: req.user.activeOrganizationId,
    response: res,
    lastHeartbeat: new Date()
  };

  sseService.addConnection(connection);

  contextLogger.info({
    connectionId,
    totalConnections: sseService.getConnectionStats().totalConnections
  }, 'SSE connection established');
});

// SSE connection stats endpoint (for monitoring)
router.get('/stats', (req: any, res) => {
  const correlationId = generateCorrelationId();
  const contextLogger = createContextLogger(req.log, correlationId, {
    userId: req.user?.id,
    organizationId: req.user?.organizationId
  });

  const stats = sseService.getConnectionStats();

  contextLogger.info(stats, 'SSE stats requested');

  res.json({
    timestamp: new Date().toISOString(),
    ...stats
  });
});

export default router;
