import { pool, withOrgContext } from "../config/database.js";
import { logger } from "../config/logger.js";
import { getDevMockPayload, getValkeyClient } from "../config/valkey.js";
import { getSessionService } from "./sessionService.js";
import {
	type CreateSessionData,
	getSessionStore,
	type IframeWebhookConfig,
} from "./sessionStore.js";

// Valkey key prefix - keys stored as rita:session:{guid}
const VALKEY_KEY_PREFIX = "rita:session:";

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

		logger.info(
			{ hashkey: `${hashkey.substring(0, 8)}...`, fullKey },
			"Fetching Valkey payload...",
		);

		try {
			// Dev mode: return mock payload for dev-* and demo-* session keys
			const devMockData = getDevMockPayload(hashkey);
			let rawData: string | null;

			if (devMockData) {
				rawData = devMockData;
				debug.durationMs = Date.now() - startTime;
			} else {
				const client = getValkeyClient();
				logger.debug({ fullKey }, "Valkey client obtained, executing HGET...");

				// Data is stored as hash type: HGET rita:session:{guid} data
				rawData = await client.hget(fullKey, "data");
			}
			debug.durationMs = Date.now() - startTime;

			if (!rawData) {
				logger.warn(
					{
						hashkey: `${hashkey.substring(0, 8)}...`,
						durationMs: debug.durationMs,
					},
					"Valkey payload not found",
				);
				debug.error = "No data found at key";
				return { config: null, debug };
			}

			debug.rawDataLength = rawData.length;
			logger.info(
				{
					hashkey: `${hashkey.substring(0, 8)}...`,
					durationMs: debug.durationMs,
					dataLength: rawData.length,
				},
				"Valkey payload retrieved",
			);

			const payload = JSON.parse(rawData);
			// Sanitize: remove tokens for debug output
			debug.rawPayload = {
				...payload,
				accessToken: payload.accessToken ? "[REDACTED]" : undefined,
				refreshToken: payload.refreshToken ? "[REDACTED]" : undefined,
				clientKey: payload.clientKey ? "[REDACTED]" : undefined,
			};

			// Validate required fields (Platform sends camelCase)
			// REQUIRED - core identity: tenantId, userGuid
			// REQUIRED for webhook execution: actionsApiBaseUrl, clientId, clientKey (validated in WorkflowExecutionService)
			// Pass-through to Actions API: accessToken, refreshToken, tokenExpiry, tabInstanceId
			const requiredFields = ["tenantId", "userGuid"];

			for (const field of requiredFields) {
				if (!(field in payload)) {
					debug.missingFields.push(field);
				}
			}

			if (debug.missingFields.length > 0) {
				logger.warn(
					{
						hashkey: `${hashkey.substring(0, 8)}...`,
						missingFields: debug.missingFields,
					},
					"Invalid Valkey payload - missing required fields",
				);
				debug.error = `Missing required fields: ${debug.missingFields.join(", ")}`;
				return { config: null, debug };
			}

			logger.info(
				{
					hashkey: `${hashkey.substring(0, 8)}...`,
					tenantId: payload.tenantId,
				},
				"Valkey payload retrieved successfully",
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
					uiConfig: payload.uiConfig
						? {
								titleText: payload.uiConfig.titleText,
								welcomeText: payload.uiConfig.welcomeText,
								placeholderText: payload.uiConfig.placeholderText,
							}
						: undefined,
				},
				debug,
			};
		} catch (error) {
			debug.durationMs = Date.now() - startTime;
			const err = error as Error;
			debug.error = `${err.name}: ${err.message}`;
			logger.error(
				{
					hashkey: `${hashkey.substring(0, 8)}...`,
					error: err.message,
					errorName: err.name,
					errorCode: (err as NodeJS.ErrnoException).code,
					durationMs: debug.durationMs,
					stack: err.stack?.split("\n").slice(0, 3).join(" | "),
				},
				"Failed to fetch/parse Valkey payload",
			);
			return { config: null, debug };
		}
	}

	/**
	 * Fetch iframe webhook config from Valkey (simple version without debug)
	 */
	async fetchValkeyPayload(
		hashkey: string,
	): Promise<IframeWebhookConfig | null> {
		const result = await this.fetchValkeyPayloadWithDebug(hashkey);
		return result.config;
	}

	/**
	 * Resolve or create Rita organization from Jarvis tenant ID
	 * Checks by id first to handle any existing orgs
	 */
	async resolveRitaOrg(
		jarvisTenantId: string,
		tenantName?: string,
	): Promise<{ ritaOrgId: string; wasCreated: boolean }> {
		const orgName =
			tenantName || `Jarvis Tenant ${jarvisTenantId.substring(0, 8)}`;

		// 1. Check if org exists by ID (also fetch name for comparison)
		const existing = await pool.query(
			`SELECT id, name FROM organizations WHERE id = $1`,
			[jarvisTenantId],
		);

		if (existing.rows.length > 0) {
			// Only update name if it has changed (Jarvis is source of truth)
			if (existing.rows[0].name !== orgName) {
				await pool.query(
					`UPDATE organizations SET name = $1, updated_at = NOW() WHERE id = $2`,
					[orgName, jarvisTenantId],
				);
			}
			return { ritaOrgId: jarvisTenantId, wasCreated: false };
		}

		// 2. Create new org with jarvisTenantId as id
		await pool.query(
			`INSERT INTO organizations (id, name, created_at)
       VALUES ($1, $2, NOW())`,
			[jarvisTenantId, orgName],
		);

		logger.info(
			{ jarvisTenantId, orgName },
			"Created Rita org using Jarvis tenantId",
		);

		return { ritaOrgId: jarvisTenantId, wasCreated: true };
	}

	/**
	 * Resolve or create Rita user from Jarvis user GUID
	 * Checks by keycloak_id to handle existing users (may have old UUID as user_id)
	 */
	async resolveRitaUser(
		jarvisGuid: string,
		ritaOrgId: string,
	): Promise<{ ritaUserId: string; wasCreated: boolean }> {
		const keycloakId = `jarvis-${jarvisGuid}`;

		// 1. Check if user exists by keycloak_id (handles legacy users with old UUIDs)
		const existing = await pool.query(
			`SELECT user_id FROM user_profiles WHERE keycloak_id = $1`,
			[keycloakId],
		);

		if (existing.rows.length > 0) {
			// Update active org for existing user
			await pool.query(
				`UPDATE user_profiles SET active_organization_id = $1, updated_at = NOW() WHERE keycloak_id = $2`,
				[ritaOrgId, keycloakId],
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
				"Iframe",
				"User",
				ritaOrgId,
			],
		);

		logger.info(
			{ jarvisGuid, ritaOrgId },
			"Created Rita user using Jarvis GUID",
		);

		return { ritaUserId: result.rows[0].user_id, wasCreated: true };
	}

	/**
	 * Ensure user is a member of the organization
	 */
	async ensureOrgMembership(
		ritaOrgId: string,
		ritaUserId: string,
	): Promise<void> {
		await pool.query(
			`INSERT INTO organization_members (organization_id, user_id, role, is_active, joined_at)
       VALUES ($1, $2, 'member', true, NOW())
       ON CONFLICT (organization_id, user_id) DO NOTHING`,
			[ritaOrgId, ritaUserId],
		);
	}

	/**
	 * Find existing conversation by activityId
	 * Used to reuse conversation when same activity is opened (activity-based chat)
	 */
	async findConversationByActivityId(
		activityId: number,
		orgId: string,
	): Promise<string | null> {
		const result = await pool.query(
			`SELECT conversation_id FROM activity_contexts
			 WHERE activity_id = $1 AND organization_id = $2`,
			[activityId, orgId],
		);
		return result.rows[0]?.conversation_id || null;
	}

	/**
	 * Link an activity to a conversation
	 * Creates or updates the activity_contexts record
	 */
	async linkActivityToConversation(
		activityId: number,
		orgId: string,
		conversationId: string,
	): Promise<void> {
		await pool.query(
			`INSERT INTO activity_contexts (activity_id, organization_id, conversation_id)
			 VALUES ($1, $2, $3)
			 ON CONFLICT (activity_id, organization_id) DO UPDATE SET conversation_id = $3`,
			[activityId, orgId, conversationId],
		);
		logger.info(
			{ activityId, orgId, conversationId },
			"Linked activity to conversation",
		);
	}

	/**
	 * Delete a conversation by ID
	 * Messages cascade delete via FK constraint
	 */
	async deleteConversation(conversationId: string): Promise<void> {
		await pool.query(`DELETE FROM conversations WHERE id = $1`, [
			conversationId,
		]);
		logger.info({ conversationId }, "Iframe conversation deleted");
	}

	/**
	 * Send UI action back to platform
	 * Used by SchemaRenderer when user interacts with dynamic UI components
	 * TODO: Integrate with WorkflowExecutionService to call Actions API
	 */
	async sendUIAction(payload: {
		action: string;
		data?: Record<string, unknown>;
		messageId: string;
		conversationId: string;
		timestamp: string;
	}): Promise<void> {
		// For now, log the action. In production, this would:
		// 1. Look up the webhook config for this conversation
		// 2. Call the Actions API with the action payload
		// 3. Handle the response/error
		logger.info(
			{
				action: payload.action,
				messageId: payload.messageId,
				conversationId: payload.conversationId,
				hasData: !!payload.data,
				dataKeys: payload.data ? Object.keys(payload.data) : [],
			},
			"UI action received - forwarding to platform",
		);

		// TODO: Implement webhook call to Actions API
		// const session = await this.sessionStore.getSessionByConversationId(payload.conversationId);
		// const workflowService = getWorkflowExecutionService();
		// await workflowService.sendUIAction(session.iframeWebhookConfig, payload);
	}

	/**
	 * Create a conversation for iframe user
	 * Uses JIT provisioning to map Jarvis IDs → Rita IDs
	 * Conversation reuse is via activityId (activity_contexts table), not sessionKey
	 */
	async createIframeConversation(
		config: IframeWebhookConfig,
		intentEid?: string,
		preResolvedOrgId?: string,
	): Promise<{
		conversationId: string;
		ritaOrgId: string;
		ritaUserId: string;
	}> {
		// 1. Use pre-resolved org or resolve from Jarvis tenant
		const ritaOrgId =
			preResolvedOrgId ||
			(await this.resolveRitaOrg(config.tenantId, config.tenantName)).ritaOrgId;

		// 2. Resolve Rita user from Jarvis GUID
		const { ritaUserId } = await this.resolveRitaUser(
			config.userGuid,
			ritaOrgId,
		);

		// 3. Always ensure org membership (ON CONFLICT DO NOTHING handles idempotency)
		await this.ensureOrgMembership(ritaOrgId, ritaUserId);

		// 4. Create conversation with Rita IDs (using org context for RLS)
		const result = await withOrgContext(
			ritaUserId,
			ritaOrgId,
			async (client) => {
				const conversationResult = await client.query(
					`INSERT INTO conversations (organization_id, user_id, title, source)
           VALUES ($1, $2, $3, 'jarvis')
           RETURNING id`,
					[ritaOrgId, ritaUserId, "Iframe Chat"],
				);
				return conversationResult.rows[0];
			},
		);

		logger.info(
			{
				conversationId: result.id,
				intentEid,
				jarvisTenantId: config.tenantId,
				jarvisGuid: config.userGuid,
				ritaOrgId,
				ritaUserId,
			},
			"Iframe conversation created with JIT-provisioned Rita IDs",
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
		existingConversationId?: string,
	): Promise<{
		valid: boolean;
		error?: string;
		conversationId?: string;
		cookie?: string;
		webhookConfigLoaded?: boolean;
		webhookTenantId?: string;
		/** Session data for dev tools export (JAR-69) */
		chatSessionId?: string;
		tabInstanceId?: string;
		tenantName?: string;
		/** Custom UI text from Valkey ui_config object */
		uiConfig?: {
			titleText?: string;
			welcomeText?: string;
			placeholderText?: string;
		};
		/** Full Valkey payload for dev tools (sensitive fields redacted) */
		valkeyPayload?: Record<string, unknown>;
	}> {
		// SessionKey (Valkey hashkey) required
		if (!sessionKey) {
			logger.warn("Iframe instantiation attempted without sessionKey");
			return { valid: false, error: "sessionKey required" };
		}

		// Fetch config from Valkey (dev mode handled in getDevMockPayload)
		const config = await this.fetchValkeyPayload(sessionKey);

		if (!config) {
			logger.warn(
				{ sessionKey: `${sessionKey.substring(0, 8)}...` },
				"Invalid or missing Valkey config",
			);
			return {
				valid: false,
				error: "Invalid or missing Valkey configuration",
			};
		}

		let conversationId: string;
		let ritaOrgId: string;
		let ritaUserId: string;

		// Resolve Rita org early (needed for activityId lookup)
		const { ritaOrgId: resolvedOrgId } = await this.resolveRitaOrg(
			config.tenantId,
			config.tenantName,
		);
		ritaOrgId = resolvedOrgId;

		// Extract activityId from context if available
		const activityId = config.context?.activityId as number | undefined;

		// Use conversation ID from: 1) frontend param, 2) Valkey config, 3) activityId lookup, 4) sessionKey lookup, 5) create new
		let resolvedExistingConversationId =
			existingConversationId || config.conversationId;

		// If no conversation ID provided, check by activityId first (activity-based chat)
		if (!resolvedExistingConversationId && activityId) {
			resolvedExistingConversationId =
				(await this.findConversationByActivityId(activityId, ritaOrgId)) ||
				undefined;
			if (resolvedExistingConversationId) {
				logger.info(
					{
						activityId,
						conversationId: resolvedExistingConversationId,
					},
					"Reusing existing conversation for activityId",
				);
			}
		}

		// No activityId = no context to tie conversation to, always create new
		// (sessionKey is stored for tracking but not used for lookup)

		if (resolvedExistingConversationId) {
			// Existing conversation - resolve user (org already resolved above)
			const { ritaUserId: userId } = await this.resolveRitaUser(
				config.userGuid,
				ritaOrgId,
			);
			ritaUserId = userId;

			// Always ensure membership for existing conversation path
			await this.ensureOrgMembership(ritaOrgId, ritaUserId);

			// Verify conversation ownership before using it
			const convCheck = await pool.query(
				`SELECT id FROM conversations WHERE id = $1 AND organization_id = $2 AND user_id = $3`,
				[resolvedExistingConversationId, ritaOrgId, ritaUserId],
			);
			if (convCheck.rows.length === 0) {
				logger.warn(
					{
						existingConversationId: resolvedExistingConversationId,
						ritaOrgId,
						ritaUserId,
					},
					"Conversation not found or not owned by user",
				);
				return {
					valid: false,
					error: "Conversation not found or access denied",
				};
			}
			conversationId = resolvedExistingConversationId;
		} else {
			// New conversation - pass pre-resolved org to avoid duplicate lookup
			const result = await this.createIframeConversation(
				config,
				intentEid,
				ritaOrgId,
			);
			conversationId = result.conversationId;
			ritaOrgId = result.ritaOrgId;
			ritaUserId = result.ritaUserId;

			// Link activity to conversation (if activityId available)
			if (activityId) {
				await this.linkActivityToConversation(
					activityId,
					ritaOrgId,
					conversationId,
				);
			}
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
		await this.sessionStore.updateSession(session.sessionId, {
			conversationId,
		});

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
			"Iframe instantiation complete with Rita IDs",
		);

		return {
			valid: true,
			conversationId,
			cookie,
			webhookConfigLoaded: true,
			webhookTenantId: config.tenantId,
			// Session data for dev tools export (JAR-69)
			chatSessionId: config.chatSessionId,
			tabInstanceId: config.tabInstanceId,
			tenantName: config.tenantName,
			// Custom UI text from Valkey ui_config (undefined if not provided)
			uiConfig: config.uiConfig,
			// Full Valkey payload for dev tools (sensitive fields redacted)
			valkeyPayload: {
				...config,
				// Redact sensitive authentication fields
				accessToken: config.accessToken ? "[REDACTED]" : undefined,
				refreshToken: config.refreshToken ? "[REDACTED]" : undefined,
				clientKey: config.clientKey ? "[REDACTED]" : undefined,
			},
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
