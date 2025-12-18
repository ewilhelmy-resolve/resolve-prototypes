import express from 'express';
import { getIframeService } from '../services/IframeService.js';
import { getWorkflowExecutionService } from '../services/WorkflowExecutionService.js';
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
  try {
    const { token, intentEid, existingConversationId, hashkey } = req.body;

    const iframeService = getIframeService();
    const result = await iframeService.validateAndSetup(token, intentEid, existingConversationId, hashkey);

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
    });
  } catch (error) {
    logger.error({ error }, 'Iframe instantiation failed');
    res.status(500).json({
      valid: false,
      error: 'Failed to initialize iframe session',
    });
  }
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
  try {
    const { hashkey } = req.body;

    if (!hashkey) {
      res.status(400).json({
        success: false,
        error: 'Missing hashkey parameter',
      });
      return;
    }

    logger.info({ hashkey }, 'Executing workflow from hashkey');

    const workflowService = getWorkflowExecutionService();
    const result = await workflowService.executeFromHashkey(hashkey);

    if (!result.success) {
      logger.warn({ hashkey, error: result.error }, 'Workflow execution failed');
      res.status(400).json(result);
      return;
    }

    logger.info({ hashkey, eventId: result.eventId }, 'Workflow execution initiated');
    res.json(result);
  } catch (error) {
    logger.error({ error }, 'Workflow execution error');
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
