import * as jose from 'jose';
import { pool } from '../config/database.js';
import { logger } from '../config/logger.js';
import { type CreateSessionData, getSessionStore, type Session } from './sessionStore.js';

// Keycloak configuration from environment variables (same as middleware)
const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'rita-chat-realm';
const KEYCLOAK_ISSUER = process.env.KEYCLOAK_ISSUER || `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`;
const JWKS = jose.createRemoteJWKSet(new URL(`${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`));

export class SessionService {
  private sessionStore = getSessionStore();

  async createSessionFromKeycloak(
    keycloakAccessToken: string,
    sessionDurationMs?: number
  ): Promise<{ session: Session; cookie: string }> {
    try {
      const { payload } = await jose.jwtVerify(keycloakAccessToken, JWKS, {
        issuer: KEYCLOAK_ISSUER,
      });

      if (!payload.sub || !payload.email) {
        throw new Error('Invalid Keycloak token payload. Missing sub or email.');
      }

      const user = await this.findOrCreateUser(payload);

      const sessionData: CreateSessionData = {
        userId: user.id,
        organizationId: user.activeOrganizationId,
        userEmail: user.email,
        sessionDurationMs,
      };

      const session = await this.sessionStore.createSession(sessionData);
      const cookie = this.generateSessionCookie(session.sessionId);

      logger.info(
        { sessionId: session.sessionId, userId: user.id },
        'Session created successfully from Keycloak token'
      );

      return { session, cookie };
    } catch (error) {
      logger.error({ error }, 'Failed to create session from Keycloak token');
      throw error;
    }
  }

  public async findOrCreateUser(tokenPayload: jose.JWTPayload): Promise<{ id: string; email: string; activeOrganizationId: string; }> {
    // biome-ignore lint/style/noNonNullAssertion: must be non-null
    const keycloakId = tokenPayload.sub!;
    const email = tokenPayload.email as string;
    // Future: extract username from token
    // const givenName = (tokenPayload.given_name as string) || '';
    // const familyName = (tokenPayload.family_name as string) || '';
    // const name = (tokenPayload.name as string) || `${givenName} ${familyName}`.trim();

    const existingUserResult = await pool.query(
      'SELECT up.user_id, up.active_organization_id, up.email FROM user_profiles up WHERE up.keycloak_id = $1',
      [keycloakId]
    );

    if (existingUserResult.rows.length > 0) {
      const user = existingUserResult.rows[0];
      return {
        id: user.user_id,
        email: user.email,
        activeOrganizationId: user.active_organization_id,
      };
    }

    logger.info({ keycloakId, email }, 'New user detected. Starting provisioning...');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Generate UUID for new user and insert directly into user_profiles
      const newUserResult = await client.query(
        'INSERT INTO user_profiles (user_id, email, keycloak_id) VALUES (gen_random_uuid(), $1, $2) RETURNING user_id',
        [email, keycloakId]
      );
      const newUserId = newUserResult.rows[0].user_id;

      const newOrgResult = await client.query(
        `INSERT INTO organizations (name) VALUES ($1) RETURNING id`,
        [`${email}'s Organization`]
      );
      const newOrgId = newOrgResult.rows[0].id;

      await client.query(
        'INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, \'owner\')',
        [newOrgId, newUserId]
      );

      await client.query(
        'UPDATE user_profiles SET active_organization_id = $1 WHERE user_id = $2',
        [newOrgId, newUserId]
      );

      await client.query('COMMIT');
      logger.info({ userId: newUserId, keycloakId }, 'New user provisioned successfully');

      return {
        id: newUserId,
        email: email,
        activeOrganizationId: newOrgId,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({ error, keycloakId }, 'Failed to provision new user');
      throw new Error('Failed to provision new user.');
    } finally {
      client.release();
    }
  }

  async getValidSession(sessionId: string): Promise<Session | null> {
    const session = await this.sessionStore.getSession(sessionId);
    if (!session) return null;
    await this.sessionStore.refreshSessionAccess(sessionId);
    return session;
  }

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session | null> {
    return this.sessionStore.updateSession(sessionId, updates);
  }

  async destroySession(sessionId: string): Promise<boolean> {
    const deleted = await this.sessionStore.deleteSession(sessionId);
    if (deleted) logger.info({ sessionId }, 'Session destroyed');
    return deleted;
  }

  async destroyUserSessions(userId: string): Promise<number> {
    const deletedCount = await this.sessionStore.deleteUserSessions(userId);
    logger.info({ userId, deletedCount }, 'All user sessions destroyed');
    return deletedCount;
  }

  generateSessionCookie(sessionId: string): string {
    const isProduction = process.env.NODE_ENV === 'production';
    const domain = process.env.COOKIE_DOMAIN || undefined;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    const cookieOptions = [
      `rita_session=${sessionId}`,
      `Max-Age=${maxAge}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
    ];
    if (isProduction) cookieOptions.push('Secure');
    if (domain) cookieOptions.push(`Domain=${domain}`);
    return cookieOptions.join('; ');
  }

  generateDestroySessionCookie(): string {
    const isProduction = process.env.NODE_ENV === 'production';
    const domain = process.env.COOKIE_DOMAIN || undefined;
    const cookieOptions = [
      'rita_session=',
      'Max-Age=0',
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
    ];
    if (isProduction) cookieOptions.push('Secure');
    if (domain) cookieOptions.push(`Domain=${domain}`);
    return cookieOptions.join('; ');
  }

  parseSessionIdFromCookie(cookieHeader: string | undefined): string | null {
    if (!cookieHeader) return null;
    const match = cookieHeader.match(/rita_session=([^;]+)/);
    return match ? match[1] : null;
  }

  async cleanupExpiredSessions(): Promise<number> {
    return this.sessionStore.cleanupExpiredSessions();
  }
}

let sessionService: SessionService;
export function getSessionService(): SessionService {
  if (!sessionService) {
    sessionService = new SessionService();
  }
  return sessionService;
}