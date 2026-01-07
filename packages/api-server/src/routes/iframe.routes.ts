/**
 * Iframe Routes (/iframe/chat)
 *
 * Webhook source: rita-chat-iframe
 *
 * This is one of three chat applications in Rita:
 * - rita-chat: Main app (/chat)
 * - rita-chat-iframe: Iframe embed (/iframe/chat) <-- this file
 * - rita-chat-workflows: Workflow builder (/jirita)
 *
 * Sessions use Valkey IDs (userId, tenantId) from host app.
 * See types/webhook.ts for ChatWebhookSource type definition.
 */
import express from 'express';
import { getIframeService } from '../services/IframeService.js';
import { getWorkflowExecutionService } from '../services/WorkflowExecutionService.js';
import { getValkeyStatus } from '../config/valkey.js';
import { logger } from '../config/logger.js';

const router = express.Router();

/**
 * Validate iframe instantiation and setup session
 * POST /api/iframe/validate-instantiation
 *
 * Validates token and loads Valkey config for routing IDs.
 * No organization DB checks - IDs come from Valkey.
 */
router.post('/validate-instantiation', async (req, res) => {
  const startTime = Date.now();
  logger.info({ hasHashkey: !!(req.body.hashkey || req.body.sessionKey) }, 'Iframe validate-instantiation started');

  try {
    const { token, intentEid, existingConversationId, hashkey, sessionKey } = req.body;
    // Support both hashkey and sessionKey (portal uses sessionKey)
    const resolvedHashkey = hashkey || sessionKey;

    const iframeService = getIframeService();
    const result = await iframeService.validateAndSetup(token, intentEid, existingConversationId, resolvedHashkey);
    const duration = Date.now() - startTime;
    logger.info({ durationMs: duration, valid: result.valid }, 'Iframe validate-instantiation completed');

    // Handle validation failure
    if (!result.valid) {
      logger.warn({ error: result.error }, 'Iframe token validation failed');
      res.status(401).json({
        valid: false,
        error: result.error,
      });
      return;
    }

    // Set session cookie (cookie is guaranteed when valid=true)
    if (result.cookie) {
      res.setHeader('Set-Cookie', result.cookie);
    }

    logger.info(
      {
        conversationId: result.conversationId,
        intentEid,
        tokenName: result.tokenName,
        hasWebhookConfig: !!resolvedHashkey,
      },
      'Iframe instantiation successful'
    );

    res.json({
      valid: result.valid,
      conversationId: result.conversationId,
      webhookConfigLoaded: result.webhookConfigLoaded,
      webhookTenantId: result.webhookTenantId,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const err = error as Error;
    logger.error({
      error: err.message,
      errorName: err.name,
      errorCode: (err as NodeJS.ErrnoException).code,
      durationMs: duration,
      stack: err.stack?.split('\n').slice(0, 3).join(' | '),
    }, 'Iframe instantiation failed');
    res.status(500).json({
      valid: false,
      error: 'Failed to initialize iframe session',
    });
  }
});

/**
 * Debug endpoint - check Valkey status and configuration
 * GET /api/iframe/debug
 */
router.get('/debug', async (_req, res) => {
  const valkeyStatus = getValkeyStatus();
  const envVars = {
    VALKEY_URL: process.env.VALKEY_URL ? 'set' : 'not set',
    REDIS_URL: process.env.REDIS_URL ? 'set' : 'not set',
    ACTIONS_API_URL: process.env.ACTIONS_API_URL ? 'set' : 'not set',
  };

  res.json({
    timestamp: new Date().toISOString(),
    valkey: valkeyStatus,
    environment: envVars,
  });
});

/**
 * Execute workflow from Valkey hashkey
 * POST /api/iframe/execute
 *
 * No DB checks - all IDs from Valkey config.
 * Flow:
 * 1. Client sends hashkey
 * 2. Backend fetches payload from Valkey (userId, tenantId, chatSessionId, webhook creds)
 * 3. Backend calls Actions API postEvent with rita_* routing IDs
 * 4. Response flows: Actions API → RabbitMQ → SSE → iframe
 */
router.post('/execute', async (req, res) => {
  const startTime = Date.now();

  try {
    const { hashkey, sessionKey } = req.body;
    // Support both hashkey and sessionKey (portal uses sessionKey)
    const resolvedHashkey = hashkey || sessionKey;

    if (!resolvedHashkey) {
      res.status(400).json({
        success: false,
        error: 'Missing hashkey parameter',
        debug: {
          valkeyStatus: getValkeyStatus(),
        },
      });
      return;
    }

    logger.info({
      hashkey: resolvedHashkey.substring(0, 8) + '...',
    }, 'Executing workflow from hashkey');

    // All IDs come from Valkey config (set by host application)
    const workflowService = getWorkflowExecutionService();
    const result = await workflowService.executeFromHashkey(resolvedHashkey);

    if (!result.success) {
      logger.warn({
        hashkey: resolvedHashkey.substring(0, 8) + '...',
        error: result.error,
        debug: result.debug,
      }, 'Workflow execution failed');
      res.status(400).json(result);
      return;
    }

    logger.info({
      hashkey: resolvedHashkey.substring(0, 8) + '...',
      eventId: result.eventId,
      durationMs: result.debug.totalDurationMs,
    }, 'Workflow execution initiated');
    res.json(result);
  } catch (error) {
    const duration = Date.now() - startTime;
    const err = error as Error & { code?: string };
    logger.error({
      error: err.message,
      errorCode: err.code,
      durationMs: duration,
      stack: err.stack?.split('\n').slice(0, 3).join(' | '),
    }, 'Workflow execution error');
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      debug: {
        valkeyStatus: getValkeyStatus(),
        errorCode: err.code || err.name,
        errorDetails: err.message,
        durationMs: duration,
      },
    });
  }
});

export default router;
