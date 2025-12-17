import express from 'express';
import axios from 'axios';
import { authenticateUser } from '../middleware/auth.js';
import type { AuthenticatedRequest } from '../types/express.js';
import { logger } from '../config/logger.js';

const router = express.Router();

const ACTIONS_API_URL = process.env.ACTIONS_API_URL;
const WORKFLOW_CREATOR_GUID = process.env.WORKFLOW_CREATOR_GUID || '00F4F67D-3B92-4FD2-A574-7BE22C6BE796';

/**
 * Generate a dynamic workflow
 * POST /api/workflows/generate
 */
router.post('/generate', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;

  try {
    const { query, index_name } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query is required' });
    }

    if (!ACTIONS_API_URL) {
      logger.error('ACTIONS_API_URL not configured');
      return res.status(500).json({ error: 'Workflow service not configured' });
    }

    const payload = {
      action: 'generate_dynamic_workflow',
      tenant_id: authReq.user.activeOrganizationId,
      user_email: authReq.user.email,
      user_id: authReq.user.id,
      query: query.trim(),
      index_name: index_name || 'qasa_snippets3',
    };

    const url = `${ACTIONS_API_URL}/api/Webhooks/postEvent/${WORKFLOW_CREATOR_GUID}`;

    logger.info({ url, query: payload.query }, 'Sending workflow generation request');

    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    logger.info({ status: response.status }, 'Workflow generation request sent');

    res.json({ success: true, data: response.data });
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
    const status = error.response?.status;

    logger.error({ error: errorMessage, status }, 'Workflow generation failed');

    res.status(status || 500).json({
      error: `Workflow generation failed: ${errorMessage}`,
    });
  }
});

export default router;
