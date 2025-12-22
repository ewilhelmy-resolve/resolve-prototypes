import express from 'express';
import { getIframeService } from '../services/IframeService.js';
import { getWorkflowExecutionService } from '../services/WorkflowExecutionService.js';
import { getValkeyStatus } from '../config/valkey.js';
import { logger } from '../config/logger.js';

const router = express.Router();

/**
 * Validate iframe instantiation and setup public session
 * POST /api/iframe/validate-instantiation
 *
 * Requires valid token in request body.
 * Token validated against iframe_tokens table.
 */
router.post('/validate-instantiation', async (req, res) => {
  const startTime = Date.now();
  logger.info({ hasHashkey: !!req.body.hashkey }, 'Iframe validate-instantiation started');

  try {
    const { token, intentEid, existingConversationId, hashkey } = req.body;

    const iframeService = getIframeService();
    const result = await iframeService.validateAndSetup(token, intentEid, existingConversationId, hashkey);
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
        hasWebhookConfig: !!hashkey,
      },
      'Iframe instantiation successful'
    );

    res.json({
      valid: result.valid,
      publicUserId: result.publicUserId,
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
 * Flow:
 * 1. Client sends hashkey (stored by host in Valkey)
 * 2. Backend fetches payload from Valkey (contains JWT, tenantId, workflow params)
 * 3. Backend calls Actions API postEvent webhook
 * 4. Response flows through queue -> message -> SSE
 */
router.post('/execute', async (req, res) => {
  const startTime = Date.now();

  try {
    const { hashkey } = req.body;

    if (!hashkey) {
      res.status(400).json({
        success: false,
        error: 'Missing hashkey parameter',
        debug: {
          valkeyStatus: getValkeyStatus(),
        },
      });
      return;
    }

    logger.info({ hashkey: hashkey.substring(0, 8) + '...' }, 'Executing workflow from hashkey');

    const workflowService = getWorkflowExecutionService();
    const result = await workflowService.executeFromHashkey(hashkey);
    const duration = Date.now() - startTime;

    // Add duration to debug
    if (result.debug) {
      result.debug.durationMs = duration;
    }

    if (!result.success) {
      logger.warn({
        hashkey: hashkey.substring(0, 8) + '...',
        error: result.error,
        debug: result.debug,
        durationMs: duration,
      }, 'Workflow execution failed');
      res.status(400).json(result);
      return;
    }

    logger.info({
      hashkey: hashkey.substring(0, 8) + '...',
      eventId: result.eventId,
      durationMs: duration,
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
