import { withOrgContext } from '../config/database.js';
import { logger } from '../config/logger.js';
import {
  getValkeyClient,
  getRitaOrgId,
  getRitaUserId,
  setRitaOrgMapping,
  setRitaUserMapping,
} from '../config/valkey.js';
import { getSessionStore, type CreateSessionData, type IframeWebhookConfig } from './sessionStore.js';
import { getSessionService } from './sessionService.js';
import { pool } from '../config/database.js';

// Valkey key prefix - keys stored as rita:session:{guid}
const VALKEY_KEY_PREFIX = 'rita:session:';

export class IframeService {
  private sessionStore = getSessionStore();
  private sessionService = getSessionService();

  /**
   * Fetch iframe webhook config from Valkey with debug info
   * Payload is stored as raw JSON by the host app
   * Key format: rita:session:{guid}
   */
  async fetchValkeyPayloadWithDebug(hashkey: string): Promise<{
    config: IframeWebhookConfig | null;
    debug: {
      fullKey: string;
      rawPayload: Record<string, unknown> | null;
      rawDataLength: number | null;
      missingFields: string[];
      error: string | null;
      durationMs: number;
    };
  }> {
    const startTime = Date.now();
    const fullKey = `${VALKEY_KEY_PREFIX}${hashkey}`;
    const debug: {
      fullKey: string;
      rawPayload: Record<string, unknown> | null;
      rawDataLength: number | null;
      missingFields: string[];
      error: string | null;
      durationMs: number;
    } = {
      fullKey,
      rawPayload: null,
      rawDataLength: null,
      missingFields: [],
      error: null,
      durationMs: 0,
    };

    logger.info({ hashkey: hashkey.substring(0, 8) + '...', fullKey }, 'Fetching Valkey payload...');

    try {
      const client = getValkeyClient();
      logger.debug({ fullKey }, 'Valkey client obtained, executing HGET...');

      // Data is stored as hash type: HGET rita:session:{guid} data
      const rawData = await client.hget(fullKey, 'data');
      debug.durationMs = Date.now() - startTime;

      if (!rawData) {
        logger.warn({ hashkey: hashkey.substring(0, 8) + '...', durationMs: debug.durationMs }, 'Valkey payload not found');
        debug.error = 'No data found at key';
        return { config: null, debug };
      }

      debug.rawDataLength = rawData.length;
      logger.info({ hashkey: hashkey.substring(0, 8) + '...', durationMs: debug.durationMs, dataLength: rawData.length }, 'Valkey payload retrieved');

      const payload = JSON.parse(rawData);
      // Sanitize: remove tokens for debug output
      debug.rawPayload = {
        ...payload,
        accessToken: payload.accessToken ? '[REDACTED]' : undefined,
        refreshToken: payload.refreshToken ? '[REDACTED]' : undefined,
        clientKey: payload.clientKey ? '[REDACTED]' : undefined,
      };

      // Validate required fields
      const requiredFields = [
        'accessToken', 'refreshToken', 'tabInstanceId', 'tenantId',
        'tenantName', 'chatSessionId', 'clientId', 'clientKey',
        'tokenExpiry', 'actionsApiBaseUrl', 'userGuid'
      ];

      for (const field of requiredFields) {
        if (!(field in payload)) {
          debug.missingFields.push(field);
        }
      }

      if (debug.missingFields.length > 0) {
        logger.warn({ hashkey: hashkey.substring(0, 8) + '...', missingFields: debug.missingFields }, 'Invalid Valkey payload - missing required fields');
        debug.error = `Missing required fields: ${debug.missingFields.join(', ')}`;
        return { config: null, debug };
      }

      logger.info(
        { hashkey: hashkey.substring(0, 8) + '...', tenantId: payload.tenantId },
        'Valkey payload retrieved successfully'
      );

      return {
        config: {
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
          userGuid: payload.userGuid,
        },
        debug,
      };
    } catch (error) {
      debug.durationMs = Date.now() - startTime;
      const err = error as Error;
      debug.error = `${err.name}: ${err.message}`;
      logger.error(
        {
          hashkey: hashkey.substring(0, 8) + '...',
          error: err.message,
          errorName: err.name,
          errorCode: (err as NodeJS.ErrnoException).code,
          durationMs: debug.durationMs,
          stack: err.stack?.split('\n').slice(0, 3).join(' | '),
        },
        'Failed to fetch/parse Valkey payload'
      );
      return { config: null, debug };
    }
  }

  /**
   * Fetch iframe webhook config from Valkey (simple version without debug)
   */
  async fetchValkeyPayload(hashkey: string): Promise<IframeWebhookConfig | null> {
    const result = await this.fetchValkeyPayloadWithDebug(hashkey);
    return result.config;
  }

  /**
   * Resolve or create Rita organization from Jarvis tenant ID
   * Uses JIT provisioning with Valkey-cached mapping
   */
  private async resolveRitaOrg(
    jarvisTenantId: string,
    tenantName: string
  ): Promise<{ ritaOrgId: string; wasCreated: boolean }> {
    // 1. Check Valkey mapping cache
    const ritaOrgId = await getRitaOrgId(jarvisTenantId);
    if (ritaOrgId) {
      // Org exists - update name if changed (Jarvis is source of truth)
      const orgName = tenantName || `Jarvis Tenant ${jarvisTenantId.substring(0, 8)}`;
      await pool.query(
        `UPDATE organizations SET name = $1, updated_at = NOW()
         WHERE id = $2 AND name != $1`,
        [orgName, ritaOrgId]
      );
      return { ritaOrgId, wasCreated: false };
    }

    // 2. Create new org in Rita DB
    const orgName = tenantName || `Jarvis Tenant ${jarvisTenantId.substring(0, 8)}`;
    const orgResult = await pool.query(
      `INSERT INTO organizations (name, created_at)
       VALUES ($1, NOW())
       RETURNING id`,
      [orgName]
    );
    const newOrgId: string = orgResult.rows[0].id;

    // 3. Save mapping to Valkey
    await setRitaOrgMapping(jarvisTenantId, newOrgId);

    logger.info(
      { jarvisTenantId, ritaOrgId: newOrgId, orgName },
      'Created Rita org from Jarvis tenant'
    );

    return { ritaOrgId: newOrgId, wasCreated: true };
  }

  /**
   * Resolve or create Rita user from Jarvis user GUID (Keycloak user ID)
   * Uses JIT provisioning with Valkey-cached mapping.
   *
   * Note: jarvisGuid is the Keycloak user ID from the shared Keycloak instance
   * used by both Jarvis and Rita. We create a separate Rita user_profile entry
   * to store Rita-specific data while maintaining the mapping.
   */
  private async resolveRitaUser(
    jarvisGuid: string,
    ritaOrgId: string
  ): Promise<{ ritaUserId: string; wasCreated: boolean }> {
    // 1. Check Valkey mapping cache
    const ritaUserId = await getRitaUserId(jarvisGuid);
    if (ritaUserId) {
      return { ritaUserId, wasCreated: false };
    }

    // 2. Create new user in Rita DB with placeholder data
    const userResult = await pool.query(
      `INSERT INTO user_profiles (email, keycloak_id, first_name, last_name, active_organization_id, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING user_id`,
      [
        `iframe-${jarvisGuid.substring(0, 8)}@iframe.internal`,
        `jarvis-${jarvisGuid}`,
        'Iframe',
        'User',
        ritaOrgId
      ]
    );
    const newUserId: string = userResult.rows[0].user_id;

    // 3. Save mapping to Valkey
    await setRitaUserMapping(jarvisGuid, newUserId);

    logger.info(
      { jarvisGuid, ritaUserId: newUserId, ritaOrgId },
      'Created Rita user from Jarvis GUID'
    );

    return { ritaUserId: newUserId, wasCreated: true };
  }

  /**
   * Ensure user is a member of the organization
   */
  private async ensureOrgMembership(ritaOrgId: string, ritaUserId: string): Promise<void> {
    await pool.query(
      `INSERT INTO organization_members (organization_id, user_id, role, is_active, joined_at)
       VALUES ($1, $2, 'member', true, NOW())
       ON CONFLICT (organization_id, user_id) DO NOTHING`,
      [ritaOrgId, ritaUserId]
    );
  }

  /**
   * Create a conversation for iframe user
   * Uses JIT provisioning to map Jarvis IDs → Rita IDs
   */
  async createIframeConversation(
    config: IframeWebhookConfig,
    intentEid?: string
  ): Promise<{ conversationId: string; ritaOrgId: string; ritaUserId: string }> {
    // 1. Resolve Rita org from Jarvis tenant
    const { ritaOrgId, wasCreated: orgCreated } = await this.resolveRitaOrg(
      config.tenantId,
      config.tenantName
    );

    // 2. Resolve Rita user from Jarvis GUID
    const { ritaUserId, wasCreated: userCreated } = await this.resolveRitaUser(
      config.userGuid,
      ritaOrgId
    );

    // 3. Ensure org membership if either was newly created
    if (orgCreated || userCreated) {
      await this.ensureOrgMembership(ritaOrgId, ritaUserId);
    }

    // 4. Create conversation with Rita IDs (using org context for RLS)
    const result = await withOrgContext(
      ritaUserId,
      ritaOrgId,
      async (client) => {
        const conversationResult = await client.query(
          `INSERT INTO conversations (organization_id, user_id, title)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [ritaOrgId, ritaUserId, 'Iframe Chat']
        );
        return conversationResult.rows[0];
      }
    );

    logger.info(
      {
        conversationId: result.id,
        intentEid,
        jarvisTenantId: config.tenantId,
        jarvisGuid: config.userGuid,
        ritaOrgId,
        ritaUserId,
        orgCreated,
        userCreated,
      },
      'Iframe conversation created with JIT-provisioned Rita IDs'
    );

    return { conversationId: result.id, ritaOrgId, ritaUserId };
  }

  /**
   * Validate instantiation and setup iframe session + conversation
   * Requires valid Valkey config (sessionKey).
   * Session uses Rita internal IDs (resolved from Jarvis IDs) for SSE routing.
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
    valkeyDebug?: {
      fullKey: string;
      rawPayload: Record<string, unknown> | null;
      rawDataLength: number | null;
      missingFields: string[];
      error: string | null;
      durationMs: number;
    };
  }> {
    // SessionKey (Valkey hashkey) required
    if (!sessionKey) {
      logger.warn('Iframe instantiation attempted without sessionKey');
      return { valid: false, error: 'sessionKey required' };
    }

    // Fetch and validate Valkey config with debug info
    const { config, debug: valkeyDebug } = await this.fetchValkeyPayloadWithDebug(sessionKey);
    if (!config) {
      logger.warn({ sessionKey: sessionKey.substring(0, 8) + '...' }, 'Invalid or missing Valkey config');
      return { valid: false, error: 'Invalid or missing Valkey configuration', valkeyDebug };
    }

    let conversationId: string;
    let ritaOrgId: string;
    let ritaUserId: string;

    if (existingConversationId) {
      // Existing conversation - still need to resolve Rita IDs for session
      conversationId = existingConversationId;
      const { ritaOrgId: orgId } = await this.resolveRitaOrg(config.tenantId, config.tenantName);
      const { ritaUserId: userId } = await this.resolveRitaUser(config.userGuid, orgId);
      ritaOrgId = orgId;
      ritaUserId = userId;
    } else {
      // New conversation - this also resolves Rita IDs
      const result = await this.createIframeConversation(config, intentEid);
      conversationId = result.conversationId;
      ritaOrgId = result.ritaOrgId;
      ritaUserId = result.ritaUserId;
    }

    // Create session with Rita IDs (for SSE routing and internal operations)
    const sessionData: CreateSessionData = {
      userId: ritaUserId,
      organizationId: ritaOrgId,
      userEmail: `iframe-${config.userGuid.substring(0, 8)}@iframe.internal`,
      sessionDurationMs: 24 * 60 * 60 * 1000, // 24 hours
      iframeWebhookConfig: config, // Keep original Jarvis config for webhooks
      isIframeSession: true,
    };

    const session = await this.sessionStore.createSession(sessionData);
    const cookie = this.sessionService.generateSessionCookie(session.sessionId);

    // Store conversationId in session for /execute endpoint to use
    await this.sessionStore.updateSession(session.sessionId, { conversationId });

    logger.info(
      {
        conversationId,
        intentEid,
        sessionId: session.sessionId,
        jarvisTenantId: config.tenantId,
        jarvisGuid: config.userGuid,
        ritaOrgId,
        ritaUserId,
        existingConversation: !!existingConversationId,
      },
      'Iframe instantiation complete with Rita IDs'
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
