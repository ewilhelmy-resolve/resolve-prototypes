import express from 'express';
import { getIframeService } from '../services/IframeService.js';
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
    const { token, intentEid, existingConversationId } = req.body;

    const iframeService = getIframeService();
    const result = await iframeService.validateAndSetup(token, intentEid, existingConversationId);

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
      { conversationId: result.conversationId, intentEid, tokenName: result.tokenName },
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

export default router;
