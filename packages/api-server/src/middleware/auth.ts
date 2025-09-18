import { Request, Response, NextFunction } from 'express';
import * as jose from 'jose';
import { getSessionService } from '../services/sessionService.js';
import { logger } from '../config/logger.js';

// Keycloak configuration from environment variables
const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'rita-chat-realm';
const KEYCLOAK_ISSUER = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`;
const JWKS = jose.createRemoteJWKSet(new URL(`${KEYCLOAK_ISSUER}/protocol/openid-connect/certs`));

async function validateKeycloakToken(token: string) {
  try {
    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: KEYCLOAK_ISSUER,
    });
    return payload;
  } catch (error) {
    logger.warn({ error }, 'Keycloak JWT validation failed');
    return null;
  }
}

export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    // 1. Authenticate with Keycloak JWT if present
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = await validateKeycloakToken(token);

      if (payload && payload.sub) {
        // JIT User Provisioning - find or create user from Keycloak token
        const sessionService = getSessionService();
        try {
          const user = await (sessionService as any).findOrCreateUser(payload);
          req.user = {
            id: user.id,
            email: user.email,
            activeOrganizationId: user.activeOrganizationId,
          };
          logger.debug({ userId: req.user.id, endpoint: `${req.method} ${req.path}` }, 'User authenticated via JWT');
          return next();
        } catch (error) {
          logger.error({ error, keycloakId: payload.sub }, 'Failed to provision user from JWT');
          res.status(500).json({
            error: 'Failed to provision user. Please try again.',
            code: 'USER_PROVISIONING_ERROR',
          });
          return;
        }
      }
    }

    // 2. Fallback to session cookie for SSE and browser flows
    const sessionService = getSessionService();
    const sessionId = sessionService.parseSessionIdFromCookie(req.headers.cookie);

    if (!sessionId) {
      res.status(401).json({
        error: 'No session or token found. Please login.',
        code: 'NO_AUTH',
      });
      return;
    }

    const session = await sessionService.getValidSession(sessionId);
    if (!session) {
      res.status(401).json({
        error: 'Invalid or expired session. Please login again.',
        code: 'INVALID_SESSION',
      });
      return;
    }

    req.user = {
      id: session.userId,
      email: session.userEmail,
      activeOrganizationId: session.organizationId,
    };
    req.session = { sessionId: session.sessionId };

    logger.debug({ userId: session.userId, sessionId: session.sessionId }, 'User authenticated via session');
    next();
  } catch (error) {
    logger.error({ error, path: req.path }, 'Authentication error');
    res.status(500).json({
      error: 'Authentication failed. Please try again.',
      code: 'AUTH_ERROR',
    });
  }
};