import { withOrgContext } from '../config/database.js';
import { logger } from '../config/logger.js';
import { getSessionStore, type CreateSessionData, type Session } from './sessionStore.js';
import { getSessionService } from './sessionService.js';

/**
 * PUBLIC SYSTEM CONSTANTS
 *
 * These UUIDs identify the public/guest access system.
 * Users and orgs matching these IDs should have RESTRICTED features:
 * - No file uploads
 * - No data source connections
 * - Limited conversation history
 * - No org settings access
 * - etc.
 *
 * Use isPublicUser() and isPublicOrganization() helpers to check.
 */
export const PUBLIC_USER_ID = '00000000-0000-0000-0000-000000000002';
export const PUBLIC_ORG_ID = '00000000-0000-0000-0000-000000000001';
export const PUBLIC_USER_ROLE = 'public';

/**
 * Check if a user ID is the public guest user
 */
export function isPublicUser(userId: string): boolean {
  return userId === PUBLIC_USER_ID;
}

/**
 * Check if an organization ID is the public system org
 */
export function isPublicOrganization(organizationId: string): boolean {
  return organizationId === PUBLIC_ORG_ID;
}

export class IframeService {
  private sessionStore = getSessionStore();
  private sessionService = getSessionService();

  /**
   * Create a session for the public guest user
   * Bypasses Keycloak JWT validation - directly creates session for public user
   */
  async createPublicSession(): Promise<{ session: Session; cookie: string }> {
    const sessionData: CreateSessionData = {
      userId: PUBLIC_USER_ID,
      organizationId: PUBLIC_ORG_ID,
      userEmail: 'public-guest@internal.system',
      firstName: 'Public',
      lastName: 'Guest',
      sessionDurationMs: 24 * 60 * 60 * 1000, // 24 hours
    };

    const session = await this.sessionStore.createSession(sessionData);
    const cookie = this.sessionService.generateSessionCookie(session.sessionId);

    logger.info(
      { sessionId: session.sessionId, userId: PUBLIC_USER_ID },
      'Public iframe session created'
    );

    return { session, cookie };
  }

  /**
   * Create a conversation for the public guest user
   */
  async createPublicConversation(intentEid?: string): Promise<{ conversationId: string }> {
    const result = await withOrgContext(
      PUBLIC_USER_ID,
      PUBLIC_ORG_ID,
      async (client) => {
        const conversationResult = await client.query(`
          INSERT INTO conversations (organization_id, user_id, title)
          VALUES ($1, $2, $3)
          RETURNING id
        `, [PUBLIC_ORG_ID, PUBLIC_USER_ID, 'Iframe Chat']);

        return conversationResult.rows[0];
      }
    );

    logger.info(
      { conversationId: result.id, intentEid },
      'Public iframe conversation created'
    );

    return { conversationId: result.id };
  }

  /**
   * Validate instantiation and setup public session + conversation
   * If existingConversationId provided, skip conversation creation (session-only mode)
   */
  async validateAndSetup(intentEid?: string, existingConversationId?: string): Promise<{
    valid: boolean;
    publicUserId: string;
    conversationId: string;
    cookie: string;
  }> {
    // Create session for public user
    const { session, cookie } = await this.createPublicSession();

    // Use existing conversation or create new one
    const conversationId = existingConversationId
      ? existingConversationId
      : (await this.createPublicConversation(intentEid)).conversationId;

    logger.info(
      { conversationId, intentEid, sessionId: session.sessionId, existingConversation: !!existingConversationId },
      'Iframe instantiation complete'
    );

    return {
      valid: true,
      publicUserId: PUBLIC_USER_ID,
      conversationId,
      cookie,
    };
  }
}

// Singleton pattern
let iframeService: IframeService;
export function getIframeService(): IframeService {
  if (!iframeService) {
    iframeService = new IframeService();
  }
  return iframeService;
}
