import express from 'express';
import { getSessionService } from '../services/sessionService.js';
import { logger } from '../config/logger.js';

const router = express.Router();
const sessionService = getSessionService();

/**
 * Login endpoint - Creates a session cookie from a Keycloak access token.
 * This is used for browser-based flows where a cookie is needed (e.g., SSE).
 * POST /auth/login
 * Body: { accessToken: string }
 */
router.post('/login', async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        error: 'Access token is required'
      });
    }

    // Create session from Keycloak token
    const { session, cookie } = await sessionService.createSessionFromKeycloak(
      accessToken
    );

    // Set HttpOnly cookie
    res.setHeader('Set-Cookie', cookie);

    logger.info({
      userId: session.userId,
      sessionId: session.sessionId,
    }, 'User logged in and session cookie created');

    res.json({
      success: true,
      user: {
        id: session.userId,
        email: session.userEmail,
        organizationId: session.organizationId,
      },
      session: {
        id: session.sessionId,
        expiresAt: session.expiresAt,
      }
    });

  } catch (error) {
    logger.error({ error }, 'Login failed');
    if (error instanceof Error && error.message.includes('Invalid Keycloak token')) {
      return res.status(401).json({
        error: 'Invalid authentication credentials'
      });
    }
    res.status(500).json({
      error: 'Login failed. Please try again.'
    });
  }
});

/**
 * Logout endpoint - Destroys current session
 * DELETE /auth/logout
 */
router.delete('/logout', async (req, res) => {
  try {
    const sessionId = sessionService.parseSessionIdFromCookie(req.headers.cookie);

    if (sessionId) {
      await sessionService.destroySession(sessionId);
    }

    const destroyCookie = sessionService.generateDestroySessionCookie();
    res.setHeader('Set-Cookie', destroyCookie);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    logger.error({ error }, 'Logout failed');
    const destroyCookie = sessionService.generateDestroySessionCookie();
    res.setHeader('Set-Cookie', destroyCookie);
    res.status(500).json({
      error: 'Logout failed, but session has been cleared.'
    });
  }
});

/**
 * Logout all devices endpoint - Destroys all user sessions
 * This requires a valid session to identify the user.
 * DELETE /auth/logout-all
 */
router.delete('/logout-all', async (req, res) => {
  try {
    const sessionId = sessionService.parseSessionIdFromCookie(req.headers.cookie);
    if (!sessionId) {
      return res.status(401).json({ error: 'No active session found' });
    }

    const currentSession = await sessionService.getValidSession(sessionId);
    if (!currentSession) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const deletedCount = await sessionService.destroyUserSessions(currentSession.userId);

    const destroyCookie = sessionService.generateDestroySessionCookie();
    res.setHeader('Set-Cookie', destroyCookie);

    logger.info({ userId: currentSession.userId, deletedCount }, 'User logged out from all devices');

    res.json({
      success: true,
      deletedSessions: deletedCount
    });

  } catch (error) {
    logger.error({ error }, 'Logout all devices failed');
    const destroyCookie = sessionService.generateDestroySessionCookie();
    res.setHeader('Set-Cookie', destroyCookie);
    res.status(500).json({
      error: 'Failed to logout from all devices, but current session has been cleared.'
    });
  }
});

/**
 * Session status endpoint - Check if current session cookie is valid
 * GET /auth/session
 */
router.get('/session', async (req, res) => {
  try {
    const sessionId = sessionService.parseSessionIdFromCookie(req.headers.cookie);
    if (!sessionId) {
      return res.status(401).json({ authenticated: false, error: 'No session found' });
    }

    const session = await sessionService.getValidSession(sessionId);
    if (!session) {
      return res.status(401).json({ authenticated: false, error: 'Invalid or expired session' });
    }

    res.json({
      authenticated: true,
      user: {
        id: session.userId,
        email: session.userEmail,
        organizationId: session.organizationId,
      },
      session: {
        id: session.sessionId,
        expiresAt: session.expiresAt,
        lastAccessedAt: session.lastAccessedAt,
      }
    });

  } catch (error) {
    logger.error({ error }, 'Session status check failed');
    res.status(500).json({
      error: 'Failed to check session status',
      authenticated: false
    });
  }
});

export default router;