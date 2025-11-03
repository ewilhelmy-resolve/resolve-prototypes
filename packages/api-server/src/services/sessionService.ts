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

      // Query user_profiles to get first_name and last_name from database
      const userProfileResult = await pool.query(
        'SELECT first_name, last_name FROM user_profiles WHERE user_id = $1',
        [user.id]
      );

      const userProfile = userProfileResult.rows[0];

      const sessionData: CreateSessionData = {
        userId: user.id,
        organizationId: user.activeOrganizationId,
        userEmail: user.email,
        firstName: userProfile?.first_name || null,
        lastName: userProfile?.last_name || null,
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

    // Extract names from Keycloak JWT token (single source of truth)
    const firstName = (tokenPayload.given_name as string) || null;
    const lastName = (tokenPayload.family_name as string) || null;

    const existingUserResult = await pool.query(
      'SELECT up.user_id, up.active_organization_id, up.email, up.first_name, up.last_name FROM user_profiles up WHERE up.keycloak_id = $1',
      [keycloakId]
    );

    if (existingUserResult.rows.length > 0) {
      const user = existingUserResult.rows[0];

      // Backfill names for existing users created before first and last names were added
      if (!user.first_name || !user.last_name) {
        if (firstName || lastName) {
          await pool.query(
            'UPDATE user_profiles SET first_name = $1, last_name = $2 WHERE user_id = $3',
            [firstName, lastName, user.user_id]
          );

          logger.info(
            {
              userId: user.user_id,
              email: user.email,
              hadFirstName: !!user.first_name,
              hadLastName: !!user.last_name
            },
            'Backfilled user names from Keycloak token'
          );
        }
      }

      return {
        id: user.user_id,
        email: user.email,
        activeOrganizationId: user.active_organization_id,
      };
    }

    logger.info({ keycloakId, email }, 'New user detected. Starting provisioning...');

    // Check pending_users for company name (signup flow only)
    const pendingUserResult = await pool.query(
      `SELECT company
       FROM pending_users
       WHERE email = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [email]
    );

    const company = pendingUserResult.rows.length > 0
      ? pendingUserResult.rows[0].company
      : null;

    // Check for accepted invitations FIRST (before creating anything)
    const invitationsResult = await pool.query(
      `SELECT id, organization_id
       FROM pending_invitations
       WHERE email = $1 AND status = 'accepted'
       ORDER BY created_at ASC`,
      [email]
    );

    // Log data sources for debugging
    logger.debug({
      email,
      hasNames: !!(firstName && lastName),
      hasCompany: !!company,
      source: {
        names: 'keycloak_jwt',
        company: company ? 'pending_users' : 'none'
      }
    }, 'User provisioning data sources');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Generate UUID for new user and insert directly into user_profiles with names
      const newUserResult = await client.query(
        `INSERT INTO user_profiles (user_id, email, keycloak_id, first_name, last_name)
         VALUES (gen_random_uuid(), $1, $2, $3, $4)
         RETURNING user_id`,
        [email, keycloakId, firstName, lastName]
      );
      const newUserId = newUserResult.rows[0].user_id;

      let activeOrganizationId: string;

      if (invitationsResult.rows.length > 0) {
        // User was invited - add to invited org(s), DON'T create personal org
        logger.info({ userId: newUserId, email, invitationCount: invitationsResult.rows.length }, 'User has accepted invitations. Adding to invited organization(s).');

        for (const invitation of invitationsResult.rows) {
          await client.query(
            `INSERT INTO organization_members (organization_id, user_id, role)
             VALUES ($1, $2, 'user')
             ON CONFLICT (organization_id, user_id) DO NOTHING`,
            [invitation.organization_id, newUserId]
          );
        }

        // Set first invited org as active
        activeOrganizationId = invitationsResult.rows[0].organization_id;

        await client.query(
          'UPDATE user_profiles SET active_organization_id = $1 WHERE user_id = $2',
          [activeOrganizationId, newUserId]
        );

        logger.info({ userId: newUserId, organizationId: activeOrganizationId }, 'Invited user provisioned successfully (no personal org created)');
      } else {
        // Normal signup flow - create personal organization
        const organizationName = company || `${email}'s Organization`;
        const newOrgResult = await client.query(
          `INSERT INTO organizations (name) VALUES ($1) RETURNING id`,
          [organizationName]
        );
        activeOrganizationId = newOrgResult.rows[0].id;

        await client.query(
          'INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, \'owner\')',
          [activeOrganizationId, newUserId]
        );

        await client.query(
          'UPDATE user_profiles SET active_organization_id = $1 WHERE user_id = $2',
          [activeOrganizationId, newUserId]
        );

        logger.info({ userId: newUserId, organizationId: activeOrganizationId }, 'New user provisioned successfully with personal organization');
      }

      // Cleanup: Delete verified pending_users record (company name already used)
      if (company) {
        await client.query(
          'DELETE FROM pending_users WHERE email = $1 AND status = $2',
          [email, 'verified']
        );
        logger.debug({ email }, 'Cleaned up verified pending_users record after user provisioning');
      }

      await client.query('COMMIT');

      return {
        id: newUserId,
        email: email,
        activeOrganizationId: activeOrganizationId,
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