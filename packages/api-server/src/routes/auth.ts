import express from 'express';
import crypto from 'crypto';
import { getSessionService } from '../services/sessionService.js';
import { WebhookService } from '../services/WebhookService.js';
import { pool } from '../config/database.js';
import { logger } from '../config/logger.js';

const router = express.Router();
const sessionService = getSessionService();
const webhookService = new WebhookService();

/**
 * Signup endpoint - Creates a pending user and triggers webhook for email verification
 * POST /auth/signup
 * Body: { name: string, email: string }
 */
router.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, company, password } = req.body;

    if (!firstName || !lastName || !email || !company || !password) {
      return res.status(400).json({
        error: 'First name, last name, email, company, and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    // Check if user already exists
    const existingUserResult = await pool.query(
      'SELECT user_id FROM user_profiles WHERE email = $1',
      [email]
    );

    if (existingUserResult.rows.length > 0) {
      return res.status(400).json({
        error: 'An account with this email already exists'
      });
    }

    // Check if there's already a pending signup for this email
    const existingPendingResult = await pool.query(
      'SELECT id FROM pending_users WHERE email = $1',
      [email]
    );

    if (existingPendingResult.rows.length > 0) {
      // Delete the existing pending user so they can sign up again
      await pool.query('DELETE FROM pending_users WHERE email = $1', [email]);
    }

    // Generate verification token and expiration (24 hours)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Trigger webhook to platform for Keycloak user creation and email sending
    // Do this BEFORE storing in database to avoid storing data if webhook fails
    const webhookResponse = await webhookService.sendGenericEvent({
      organizationId: 'pending', // Temporary org ID for pending users
      userEmail: email,
      source: 'rita-signup',
      action: 'user_signup',
      additionalData: {
        first_name: firstName,
        last_name: lastName,
        company,
        password: Buffer.from(password).toString('base64'),
        verification_token: verificationToken,
        verification_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`
      }
    });

    // If webhook fails, don't store pending user
    if (!webhookResponse.success) {
      logger.error({ email, webhookError: webhookResponse.error }, 'Webhook failed during signup');
      return res.status(500).json({
        error: 'Failed to create account. Please try again.'
      });
    }

    // Create pending user (WITHOUT password - it was sent to webhook only)
    const pendingUserResult = await pool.query(
      `INSERT INTO pending_users (email, first_name, last_name, company, verification_token, token_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [email, firstName, lastName, company, verificationToken, tokenExpiresAt]
    );

    const pendingUserId = pendingUserResult.rows[0].id;

    logger.info({
      email,
      pendingUserId,
      tokenExpiresAt
    }, 'User signup initiated, verification email triggered');

    res.json({
      success: true,
      message: 'Signup successful. Please check your email for verification instructions.'
    });

  } catch (error) {
    logger.error({ error }, 'Signup failed');
    res.status(500).json({
      error: 'Signup failed. Please try again.'
    });
  }
});

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
 * Email verification endpoint - Verifies signup token and marks user as ready for Keycloak signin
 * POST /auth/verify-email
 * Body: { token: string }
 */
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Verification token is required'
      });
    }

    // Find pending user by token
    const pendingUserResult = await pool.query(
      'SELECT id, email, first_name, last_name, token_expires_at FROM pending_users WHERE verification_token = $1',
      [token]
    );

    if (pendingUserResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid or expired verification token'
      });
    }

    const pendingUser = pendingUserResult.rows[0];

    // Check if token has expired
    if (new Date() > new Date(pendingUser.token_expires_at)) {
      // Clean up expired token
      await pool.query('DELETE FROM pending_users WHERE id = $1', [pendingUser.id]);
      return res.status(400).json({
        error: 'Verification token has expired. Please sign up again.'
      });
    }

    // Check if user already exists (someone might have been created in the meantime)
    const existingUserResult = await pool.query(
      'SELECT user_id FROM user_profiles WHERE email = $1',
      [pendingUser.email]
    );

    if (existingUserResult.rows.length > 0) {
      // Clean up pending user since they already exist
      await pool.query('DELETE FROM pending_users WHERE id = $1', [pendingUser.id]);
      return res.status(400).json({
        error: 'An account with this email already exists. Please sign in instead.'
      });
    }

    // Remove the pending user record (verification complete)
    await pool.query('DELETE FROM pending_users WHERE id = $1', [pendingUser.id]);

    logger.info({
      email: pendingUser.email,
      pendingUserId: pendingUser.id
    }, 'Email verification successful, user ready for Keycloak signin');

    res.json({
      success: true,
      message: 'Email verified successfully. You can now sign in.',
      email: pendingUser.email
    });

  } catch (error) {
    logger.error({ error }, 'Email verification failed');
    res.status(500).json({
      error: 'Email verification failed. Please try again.'
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