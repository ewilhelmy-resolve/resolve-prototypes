import express from 'express';
import { ClusterService } from '../services/ClusterService.js';
import type { AuthenticatedRequest } from '../types/express.js';

const router = express.Router();
const clusterService = new ClusterService();

/**
 * GET /api/tickets/:id
 * Get a single ticket by ID
 */
router.get('/:id', async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const { id } = req.params;

  try {
    const ticket = await clusterService.getTicketById(
      id,
      authReq.user.activeOrganizationId
    );

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({ data: ticket });
  } catch (error) {
    console.error('[Tickets] Error fetching ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

export default router;
