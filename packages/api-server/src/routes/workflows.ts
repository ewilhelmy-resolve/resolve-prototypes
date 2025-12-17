import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { WebhookService } from '../services/WebhookService.js';
import type { AuthenticatedRequest } from '../types/express.js';
import { logger } from '../config/logger.js';

const router = express.Router();
const webhookService = new WebhookService();

/**
 * Generate a dynamic workflow
 * POST /api/workflows/generate
 *
 * Uses same webhook pattern as RitaGo chat, different queue for responses
 */
router.post('/generate', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;

  try {
    const { query, index_name } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query is required' });
    }

    logger.info({ query: query.trim() }, 'Sending workflow generation request');

    const response = await webhookService.sendGenericEvent({
      organizationId: authReq.user.activeOrganizationId,
      userId: authReq.user.id,
      userEmail: authReq.user.email,
      source: 'rita-workflows',
      action: 'generate_dynamic_workflow',
      additionalData: {
        query: query.trim(),
        index_name: index_name || 'qasa_snippets3',
      },
    });

    if (!response.success) {
      logger.error({ error: response.error }, 'Workflow generation webhook failed');
      return res.status(500).json({ error: response.error || 'Workflow generation failed' });
    }

    logger.info('Workflow generation request sent');
    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Workflow generation failed');
    res.status(500).json({ error: 'Workflow generation failed' });
  }
});

export default router;
