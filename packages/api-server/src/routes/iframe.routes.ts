import express from 'express';
import { getIframeService } from '../services/IframeService.js';
import { logger } from '../config/logger.js';

const router = express.Router();

/**
 * Validate iframe instantiation and setup public session
 * POST /api/iframe/validate-instantiation
 *
 * NO AUTH MIDDLEWARE - This is a public endpoint for iframe access
 * Same-domain deployment provides security
 */
router.post('/validate-instantiation', async (req, res) => {
  try {
    const { intentEid, existingConversationId } = req.body;

    const iframeService = getIframeService();
    const result = await iframeService.validateAndSetup(intentEid, existingConversationId);

    // Set session cookie
    res.setHeader('Set-Cookie', result.cookie);

    logger.info(
      { conversationId: result.conversationId, intentEid },
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
