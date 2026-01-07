import { withOrgContext } from '../config/database.js';
import { logger } from '../config/logger.js';
import { getValkeyClient } from '../config/valkey.js';
import { getSessionStore, type CreateSessionData, type Session, type IframeWebhookConfig } from './sessionStore.js';
import { getSessionService } from './sessionService.js';

// Valkey key prefix - keys stored as rita:session:{guid}
const VALKEY_KEY_PREFIX = 'rita:session:';

export class IframeService {
  private sessionStore = getSessionStore();
  private sessionService = getSessionService();

  /**
   * Fetch iframe webhook config from Valkey
   * Payload is stored as raw JSON by the host app
   * Key format: rita:session:{guid}
   */
  async fetchValkeyPayload(hashkey: string): Promise<IframeWebhookConfig | null> {
    const startTime = Date.now();
    // Build full key with prefix: rita:session:{guid}
    const fullKey = `${VALKEY_KEY_PREFIX}${hashkey}`;
    logger.info({ hashkey: hashkey.substring(0, 8) + '...', fullKey }, 'Fetching Valkey payload...');

    try {
      const client = getValkeyClient();
      logger.debug({ fullKey }, 'Valkey client obtained, executing HGET...');

      // Data is stored as hash type: HGET rita:session:{guid} data
      const rawData = await client.hget(fullKey, 'data');
      const duration = Date.now() - startTime;

      if (!rawData) {
        logger.warn({ hashkey: hashkey.substring(0, 8) + '...', durationMs: duration }, 'Valkey payload not found');
        return null;
      }

      logger.info({ hashkey: hashkey.substring(0, 8) + '...', durationMs: duration, dataLength: rawData.length }, 'Valkey payload retrieved');

      const payload = JSON.parse(rawData);

      // Validate required fields
      const requiredFields = [
        'accessToken', 'refreshToken', 'tabInstanceId', 'tenantId',
        'tenantName', 'chatSessionId', 'clientId', 'clientKey',
        'tokenExpiry', 'actionsApiBaseUrl', 'userId'
      ];

      for (const field of requiredFields) {
        if (!(field in payload)) {
          logger.warn({ hashkey: hashkey.substring(0, 8) + '...', missingField: field }, 'Invalid Valkey payload - missing required field');
          return null;
        }
      }

      logger.info(
        { hashkey: hashkey.substring(0, 8) + '...', tenantId: payload.tenantId },
        'Valkey payload retrieved successfully'
      );

      return {
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        tabInstanceId: payload.tabInstanceId,
        tenantId: payload.tenantId,
        tenantName: payload.tenantName,
        chatSessionId: payload.chatSessionId,
        clientId: payload.clientId,
        clientKey: payload.clientKey,
        tokenExpiry: payload.tokenExpiry,
        actionsApiBaseUrl: payload.actionsApiBaseUrl,
        context: payload.context,
        userId: payload.userId,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error as Error;
      logger.error(
        {
          hashkey: hashkey.substring(0, 8) + '...',
          error: err.message,
          errorName: err.name,
          errorCode: (err as NodeJS.ErrnoException).code,
          durationMs: duration,
          stack: err.stack?.split('\n').slice(0, 3).join(' | '),
        },
        'Failed to fetch/parse Valkey payload'
      );
      return null;
    }
  }

  /**
   * Create a session for iframe embed using Valkey config IDs
   * Session uses real user IDs from Valkey (userId, tenantId) for SSE routing
   */
  async createIframeSession(config: IframeWebhookConfig): Promise<{ session: Session; cookie: string }> {
    const sessionData: CreateSessionData = {
      userId: config.userId,
      organizationId: config.tenantId,
      userEmail: `iframe-${config.userId.substring(0, 8)}@iframe.internal`,
      sessionDurationMs: 24 * 60 * 60 * 1000, // 24 hours
      iframeWebhookConfig: config,
      isIframeSession: true,
    };

    const session = await this.sessionStore.createSession(sessionData);
    const cookie = this.sessionService.generateSessionCookie(session.sessionId);

    logger.info(
      {
        sessionId: session.sessionId,
        userId: config.userId,
        tenantId: config.tenantId,
      },
      'Iframe session created with Valkey IDs'
    );

    return { session, cookie };
  }

  /**
   * Create a conversation for iframe user using Valkey IDs
   */
  async createIframeConversation(
    config: IframeWebhookConfig,
    intentEid?: string
  ): Promise<{ conversationId: string }> {
    const result = await withOrgContext(
      config.userId,
      config.tenantId,
      async (client) => {
        const conversationResult = await client.query(`
          INSERT INTO conversations (organization_id, user_id, title)
          VALUES ($1, $2, $3)
          RETURNING id
        `, [config.tenantId, config.userId, 'Iframe Chat']);

        return conversationResult.rows[0];
      }
    );

    logger.info(
      { conversationId: result.id, intentEid, userId: config.userId, tenantId: config.tenantId },
      'Iframe conversation created with Valkey IDs'
    );

    return { conversationId: result.id };
  }

  /**
   * Validate instantiation and setup iframe session + conversation
   * Requires valid Valkey config (sessionKey).
   * Session uses real user IDs from Valkey for SSE routing.
   */
  async validateAndSetup(
    sessionKey: string,
    intentEid?: string,
    existingConversationId?: string
  ): Promise<{
    valid: boolean;
    error?: string;
    conversationId?: string;
    cookie?: string;
    webhookConfigLoaded?: boolean;
    webhookTenantId?: string;
  }> {
    // SessionKey (Valkey hashkey) required
    if (!sessionKey) {
      logger.warn('Iframe instantiation attempted without sessionKey');
      return { valid: false, error: 'sessionKey required' };
    }

    // Fetch and validate Valkey config
    const config = await this.fetchValkeyPayload(sessionKey);
    if (!config) {
      logger.warn({ sessionKey: sessionKey.substring(0, 8) + '...' }, 'Invalid or missing Valkey config');
      return { valid: false, error: 'Invalid or missing Valkey configuration' };
    }

    // Create session with Valkey IDs (for SSE routing)
    const { session, cookie } = await this.createIframeSession(config);

    // Use existing conversation or create new one
    const conversationId = existingConversationId
      ? existingConversationId
      : (await this.createIframeConversation(config, intentEid)).conversationId;

    // Store conversationId in session for /execute endpoint to use
    await this.sessionStore.updateSession(session.sessionId, { conversationId });

    logger.info(
      {
        conversationId,
        intentEid,
        sessionId: session.sessionId,
        userId: config.userId,
        tenantId: config.tenantId,
        existingConversation: !!existingConversationId,
      },
      'Iframe instantiation complete'
    );

    return {
      valid: true,
      conversationId,
      cookie,
      webhookConfigLoaded: true,
      webhookTenantId: config.tenantId,
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
