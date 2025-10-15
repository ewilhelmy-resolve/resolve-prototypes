import express from 'express';
import { pool } from '../config/database.js';
import { WebhookService } from '../services/WebhookService.js';
import { InvitationService } from '../services/InvitationService.js';
import { authenticateUser, requireRole } from '../middleware/auth.js';
import { logger } from '../config/logger.js';
import type { SendInvitationsRequest } from '../types/invitation.js';
import type { AuthenticatedRequest } from '../types/express.js';

const router = express.Router();
const webhookService = new WebhookService();
// Note: pool is still needed for InvitationService instantiation
const invitationService = new InvitationService(pool, webhookService);

// Simple in-memory rate limiter
const rateLimiter = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const limit = rateLimiter.get(key);

  if (!limit || now > limit.resetAt) {
    rateLimiter.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (limit.count >= maxRequests) {
    return false;
  }

  limit.count++;
  return true;
}

/**
 * POST /api/invitations/send
 * Send invitations to multiple emails
 * Auth: Required (owner/admin)
 * Rate Limit: 50 invitations per org per hour
 */
router.post('/send', authenticateUser, requireRole(['owner', 'admin']), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { emails } = req.body as SendInvitationsRequest;
    const userId = authReq.user.id;
    const organizationId = authReq.user.activeOrganizationId;

    // Validate input
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'Emails array is required' });
    }

    if (emails.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 invitations per request' });
    }

    // Rate limiting (50 per org per hour)
    const rateLimitKey = `invitations:${organizationId}`;
    if (!checkRateLimit(rateLimitKey, 50, 60 * 60 * 1000)) {
      return res.status(429).json({ error: 'Rate limit exceeded. Maximum 50 invitations per hour.' });
    }

    const result = await invitationService.sendInvitations(
      organizationId,
      userId,
      emails
    );

    logger.info({
      organizationId,
      userId,
      successCount: result.successCount,
      failureCount: result.failureCount
    }, 'Invitations sent');

    res.json(result);
  } catch (error) {
    logger.error({ error }, 'Failed to send invitations');
    res.status(500).json({ error: 'Failed to send invitations' });
  }
});

/**
 * GET /api/invitations/verify/:token
 * Verify invitation token and return details
 * Auth: Not required (public)
 */
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || token.length !== 64) {
      return res.status(400).json({ error: 'Invalid token format' });
    }

    const result = await invitationService.verifyToken(token);
    res.json(result);
  } catch (error) {
    logger.error({ error }, 'Failed to verify invitation');
    res.status(500).json({ error: 'Failed to verify invitation' });
  }
});

/**
 * POST /api/invitations/accept
 * Accept invitation and create account
 * Auth: Not required (public)
 * Rate Limit: 5 attempts per token per hour
 */
router.post('/accept', async (req, res) => {
  try {
    const { token, firstName, lastName, password } = req.body;

    // Validate input
    if (!token || !firstName || !lastName || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Rate limiting (5 attempts per token per hour)
    const rateLimitKey = `invitation-accept:${token}`;
    if (!checkRateLimit(rateLimitKey, 5, 60 * 60 * 1000)) {
      return res.status(429).json({ error: 'Too many attempts. Please try again later.' });
    }

    const result = await invitationService.acceptInvitation(
      token,
      firstName,
      lastName,
      password
    );

    logger.info({ email: result.email }, 'Invitation accepted');

    res.json({
      success: true,
      message: 'Account created successfully. You can sign in shortly.',
      email: result.email
    });
  } catch (error) {
    logger.error({ error }, 'Failed to accept invitation');

    if (error instanceof Error) {
      if (error.message.includes('already accepted')) {
        return res.status(400).json({ error: 'Invitation already accepted', code: 'INV003' });
      }
      if (error.message.includes('expired')) {
        return res.status(400).json({ error: 'Invitation expired', code: 'INV002' });
      }
      if (error.message.includes('already exists')) {
        return res.status(400).json({ error: 'An account with this email already exists', code: 'INV010' });
      }
    }

    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

/**
 * GET /api/invitations
 * List invitations for organization
 * Auth: Required (owner/admin)
 */
router.get('/', authenticateUser, requireRole(['owner', 'admin']), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const organizationId = authReq.user.activeOrganizationId;

    const { status, limit = '50', offset = '0' } = req.query;

    const invitations = await invitationService.listInvitations(
      organizationId,
      {
        status: status as string,
        limit: Number(limit),
        offset: Number(offset)
      }
    );

    res.json({ invitations });
  } catch (error) {
    logger.error({ error }, 'Failed to list invitations');
    res.status(500).json({ error: 'Failed to list invitations' });
  }
});

/**
 * DELETE /api/invitations/:id/cancel
 * Cancel pending invitation
 * Auth: Required (owner/admin)
 */
router.delete('/:id/cancel', authenticateUser, requireRole(['owner', 'admin']), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { id } = req.params;
    const organizationId = authReq.user.activeOrganizationId;
    const userId = authReq.user.id;

    const result = await invitationService.cancelInvitation(id, organizationId);

    logger.info({ invitationId: id, organizationId, userId }, 'Invitation cancelled');

    res.json(result);
  } catch (error) {
    logger.error({ error }, 'Failed to cancel invitation');

    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: 'Invitation not found or cannot be cancelled' });
    }

    res.status(500).json({ error: 'Failed to cancel invitation' });
  }
});

export default router;
