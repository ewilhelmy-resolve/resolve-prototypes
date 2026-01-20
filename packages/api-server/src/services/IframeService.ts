import { withOrgContext, pool } from '../config/database.js';
import { logger } from '../config/logger.js';
import { getValkeyClient } from '../config/valkey.js';
import { getSessionStore, type CreateSessionData, type IframeWebhookConfig } from './sessionStore.js';
import { getSessionService } from './sessionService.js';

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

      // Validate required fields (Platform sends camelCase)
      // REQUIRED - core identity: tenantId, userGuid
      // REQUIRED for webhook execution: actionsApiBaseUrl, clientId, clientKey (validated in WorkflowExecutionService)
      // Pass-through to Actions API: accessToken, refreshToken, tokenExpiry, tabInstanceId
      const requiredFields = [
        'tenantId',
        'userGuid'
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

      // Platform sends camelCase - map directly to internal type
      return {
        config: {
          // REQUIRED - core identity (camelCase from platform)
          tenantId: payload.tenantId,
          userGuid: payload.userGuid,
          // OPTIONAL - conversation handling (omit for new, provide to resume)
          conversationId: payload.conversationId,
          // REQUIRED for webhook execution (Actions API auth)
          actionsApiBaseUrl: payload.actionsApiBaseUrl,
          clientId: payload.clientId,
          clientKey: payload.clientKey,
          // Pass-through to Actions API (not used by Rita)
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken,
          tabInstanceId: payload.tabInstanceId,
          tokenExpiry: payload.tokenExpiry,
          // OPTIONAL - metadata
          tenantName: payload.tenantName,
          chatSessionId: payload.chatSessionId,
          context: payload.context,
          // OPTIONAL - custom UI text (camelCase from platform)
          uiConfig: payload.uiConfig ? {
            titleText: payload.uiConfig.titleText,
            welcomeText: payload.uiConfig.welcomeText,
            placeholderText: payload.uiConfig.placeholderText,
          } : undefined,
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
   * Checks by id first to handle any existing orgs
   */
  private async resolveRitaOrg(
    jarvisTenantId: string,
    tenantName?: string
  ): Promise<{ ritaOrgId: string; wasCreated: boolean }> {
    const orgName = tenantName || `Jarvis Tenant ${jarvisTenantId.substring(0, 8)}`;

    // 1. Check if org exists by ID (also fetch name for comparison)
    const existing = await pool.query(
      `SELECT id, name FROM organizations WHERE id = $1`,
      [jarvisTenantId]
    );

    if (existing.rows.length > 0) {
      // Only update name if it has changed (Jarvis is source of truth)
      if (existing.rows[0].name !== orgName) {
        await pool.query(
          `UPDATE organizations SET name = $1, updated_at = NOW() WHERE id = $2`,
          [orgName, jarvisTenantId]
        );
      }
      return { ritaOrgId: jarvisTenantId, wasCreated: false };
    }

    // 2. Create new org with jarvisTenantId as id
    await pool.query(
      `INSERT INTO organizations (id, name, created_at)
       VALUES ($1, $2, NOW())`,
      [jarvisTenantId, orgName]
    );

    logger.info(
      { jarvisTenantId, orgName },
      'Created Rita org using Jarvis tenantId'
    );

    return { ritaOrgId: jarvisTenantId, wasCreated: true };
  }

  /**
   * Resolve or create Rita user from Jarvis user GUID
   * Checks by keycloak_id to handle existing users (may have old UUID as user_id)
   */
  private async resolveRitaUser(
    jarvisGuid: string,
    ritaOrgId: string
  ): Promise<{ ritaUserId: string; wasCreated: boolean }> {
    const keycloakId = `jarvis-${jarvisGuid}`;

    // 1. Check if user exists by keycloak_id (handles legacy users with old UUIDs)
    const existing = await pool.query(
      `SELECT user_id FROM user_profiles WHERE keycloak_id = $1`,
      [keycloakId]
    );

    if (existing.rows.length > 0) {
      // Update active org for existing user
      await pool.query(
        `UPDATE user_profiles SET active_organization_id = $1, updated_at = NOW() WHERE keycloak_id = $2`,
        [ritaOrgId, keycloakId]
      );
      return { ritaUserId: existing.rows[0].user_id, wasCreated: false };
    }

    // 2. Create new user with jarvisGuid as user_id
    const result = await pool.query(
      `INSERT INTO user_profiles (user_id, email, keycloak_id, first_name, last_name, active_organization_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING user_id`,
      [
        jarvisGuid,
        `iframe-${jarvisGuid.substring(0, 8)}@iframe.internal`,
        keycloakId,
        'Iframe',
        'User',
        ritaOrgId
      ]
    );

    logger.info(
      { jarvisGuid, ritaOrgId },
      'Created Rita user using Jarvis GUID'
    );

    return { ritaUserId: result.rows[0].user_id, wasCreated: true };
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

    // 3. Always ensure org membership (ON CONFLICT DO NOTHING handles idempotency)
    await this.ensureOrgMembership(ritaOrgId, ritaUserId);

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
    /** Custom UI text from Valkey ui_config object */
    uiConfig?: {
      titleText?: string;
      welcomeText?: string;
      placeholderText?: string;
    };
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

    // Dev mode bypass - use hardcoded test config for local development
    const DEV_SESSION_KEY = 'dev-test-session';
    const isDevSession = sessionKey === DEV_SESSION_KEY && process.env.NODE_ENV !== 'production';

    let config: IframeWebhookConfig | null = null;
    let valkeyDebug: {
      fullKey: string;
      rawPayload: Record<string, unknown> | null;
      rawDataLength: number | null;
      missingFields: string[];
      error: string | null;
      durationMs: number;
    } | undefined;

    if (isDevSession) {
      // Dev mode: use hardcoded test values (stable UUIDs that persist across restarts)
      // E2E demo for custom ui_config - shows custom title, welcome, and placeholder text
      logger.info('Using dev test session bypass');
      config = {
        tenantId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        tenantName: 'Dev Test Org',
        userGuid: '11111111-2222-3333-4444-555555555555',
        tabInstanceId: 'dev-tab-instance',
        accessToken: 'dev-access-token',
        refreshToken: 'dev-refresh-token',
        clientId: 'dev-client',
        clientKey: 'dev-key',
        tokenExpiry: 9999999999,
        actionsApiBaseUrl: 'http://localhost:3001',
        // E2E demo: custom UI text from Valkey ui_config
        uiConfig: {
          titleText: 'Ask Workflow Designer',
          welcomeText: 'I can help you build workflow automations. Describe what you want to automate.',
          placeholderText: 'Describe your workflow...',
        },
      };
    } else {
      // Normal mode: fetch from Valkey
      const result = await this.fetchValkeyPayloadWithDebug(sessionKey);
      config = result.config;
      valkeyDebug = result.debug;
    }
    if (!config) {
      logger.warn({ sessionKey: sessionKey.substring(0, 8) + '...' }, 'Invalid or missing Valkey config');
      return { valid: false, error: 'Invalid or missing Valkey configuration', valkeyDebug };
    }

    let conversationId: string;
    let ritaOrgId: string;
    let ritaUserId: string;

    // Use conversation ID from: 1) frontend param, 2) Valkey config, 3) create new
    const resolvedExistingConversationId = existingConversationId || config.conversationId;

    if (resolvedExistingConversationId) {
      // Existing conversation - resolve Rita IDs first
      const { ritaOrgId: orgId } = await this.resolveRitaOrg(config.tenantId, config.tenantName);
      const { ritaUserId: userId } = await this.resolveRitaUser(config.userGuid, orgId);
      ritaOrgId = orgId;
      ritaUserId = userId;

      // Always ensure membership for existing conversation path
      await this.ensureOrgMembership(ritaOrgId, ritaUserId);

      // Verify conversation ownership before using it
      const convCheck = await pool.query(
        `SELECT id FROM conversations WHERE id = $1 AND organization_id = $2 AND user_id = $3`,
        [resolvedExistingConversationId, ritaOrgId, ritaUserId]
      );
      if (convCheck.rows.length === 0) {
        logger.warn(
          { existingConversationId: resolvedExistingConversationId, ritaOrgId, ritaUserId },
          'Conversation not found or not owned by user'
        );
        return { valid: false, error: 'Conversation not found or access denied', valkeyDebug };
      }
      conversationId = resolvedExistingConversationId;
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
        existingConversation: !!resolvedExistingConversationId,
      },
      'Iframe instantiation complete with Rita IDs'
    );

    return {
      valid: true,
      conversationId,
      cookie,
      webhookConfigLoaded: true,
      webhookTenantId: config.tenantId,
      // Custom UI text from Valkey ui_config (undefined if not provided)
      uiConfig: config.uiConfig,
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
