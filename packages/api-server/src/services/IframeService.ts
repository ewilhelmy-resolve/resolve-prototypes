import { pool, withOrgContext } from "../config/database.js";
import { logger } from "../config/logger.js";
import { getDevMockPayload, getValkeyClient } from "../config/valkey.js";
import { getSessionService } from "./sessionService.js";
import {
	type CreateSessionData,
	getSessionStore,
	type IframeWebhookConfig,
	type Session,
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
		userId: string,
	): Promise<string | null> {
		const result = await pool.query(
			`SELECT conversation_id FROM activity_contexts
			 WHERE activity_id = $1 AND organization_id = $2 AND user_id = $3`,
			[activityId, orgId, userId],
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
		userId: string,
	): Promise<void> {
		await pool.query(
			`INSERT INTO activity_contexts (activity_id, organization_id, conversation_id, user_id)
			 VALUES ($1, $2, $3, $4)
			 ON CONFLICT (activity_id, organization_id, user_id) DO UPDATE SET conversation_id = $3`,
			[activityId, orgId, conversationId, userId],
		);
		logger.info(
			{ activityId, orgId, conversationId },
			"Linked activity to conversation",
		);
	}

	/**
	 * Store conversationId inside the Valkey session data object for Platform Activity lookup (JAR-95)
	 * Reads existing data JSON, merges conversationId, writes back
	 */
	async storeConversationIdInValkey(
		sessionKey: string,
		conversationId: string,
	): Promise<void> {
		try {
			const client = getValkeyClient();
			const fullKey = `${VALKEY_KEY_PREFIX}${sessionKey}`;

			// Read existing data, merge conversationId, write back
			const rawData = await client.hget(fullKey, "data");
			const data = rawData ? JSON.parse(rawData) : {};
			data.conversationId = conversationId;
			await client.hset(fullKey, "data", JSON.stringify(data));
		} catch (error) {
			// Non-fatal: log but don't fail the setup
			logger.error(
				{
					error: (error as Error).message,
					sessionKey: `${sessionKey.substring(0, 8)}...`,
				},
				"Failed to store conversationId in Valkey",
			);
		}
	}

	/**
	 * Verify that a conversation belongs to the given user and organization.
	 * Returns true if the user owns the conversation, false otherwise.
	 */
	async verifyConversationOwnership(
		conversationId: string,
		organizationId: string,
		userId: string,
	): Promise<boolean> {
		const result = await pool.query(
			"SELECT id FROM conversations WHERE id = $1 AND organization_id = $2 AND user_id = $3",
			[conversationId, organizationId, userId],
		);
		return result.rows.length > 0;
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
	 * Send UI form response back to platform
	 * Used by UIFormRequestModal when user submits or cancels a form
	 * Sends webhook to Platform with form data for workflow correlation
	 */
	async sendUIFormResponse(payload: {
		requestId: string;
		action?: string;
		status: "submitted" | "cancelled";
		data?: Record<string, unknown>;
	}): Promise<void> {
		const { requestId, action, status, data } = payload;

		// 1. Look up the message containing this form request
		const client = await pool.connect();
		try {
			const msgResult = await client.query(
				`SELECT id, metadata, conversation_id, organization_id, user_id
				 FROM messages
				 WHERE metadata->>'request_id' = $1
				   AND metadata->>'type' = 'ui_form_request'
				 LIMIT 1`,
				[requestId],
			);

			if (msgResult.rows.length === 0) {
				throw new Error(`Form request ${requestId} not found`);
			}

			const msg = msgResult.rows[0];
			const existingMetadata = msg.metadata || {};

			if (existingMetadata.status === "completed") {
				throw new Error(`Form request ${requestId} already completed`);
			}

			// 2. Update message metadata to mark form as answered
			const submittedAt = new Date().toISOString();
			const updatedMetadata = {
				...existingMetadata,
				status: status === "submitted" ? "completed" : "cancelled",
				form_data: data || null,
				form_action: action || null,
				submitted_at: submittedAt,
			};

			await client.query(`UPDATE messages SET metadata = $1 WHERE id = $2`, [
				JSON.stringify(updatedMetadata),
				msg.id,
			]);

			logger.info(
				{
					requestId,
					messageId: msg.id,
					workflowId: existingMetadata.workflow_id,
					activityId: existingMetadata.activity_id,
					status,
					action,
					hasData: !!data,
				},
				"UI form response stored in message metadata",
			);

			// 3. Get webhook config from session (re-read Valkey for Actions Platform updates)
			let webhookConfig: IframeWebhookConfig | null = null;
			if (msg.conversation_id) {
				const session = await this.sessionStore.getSessionByConversationId(
					msg.conversation_id,
				);
				if (session?.valkeySessionKey) {
					await this.refreshSessionFromValkey(session.sessionId);
					const refreshed = await this.sessionStore.getSessionByConversationId(
						msg.conversation_id,
					);
					webhookConfig = refreshed?.iframeWebhookConfig || null;
				} else {
					webhookConfig = session?.iframeWebhookConfig || null;
				}
			}

			// 4. Send webhook to Platform if we have config
			if (
				webhookConfig?.actionsApiBaseUrl &&
				webhookConfig?.clientId &&
				webhookConfig?.clientKey
			) {
				const baseUrl = webhookConfig.actionsApiBaseUrl.replace(/\/$/, "");
				const webhookUrl = `${baseUrl}/api/Webhooks/postEvent/${webhookConfig.tenantId}`;
				const authHeader = `Basic ${Buffer.from(`${webhookConfig.clientId}:${webhookConfig.clientKey}`).toString("base64")}`;

				const webhookPayload = {
					source: "rita-chat-iframe" as const,
					action: "ui_form_response",
					tenant_id: webhookConfig.tenantId,
					user_id: webhookConfig.userGuid,
					workflow_id: existingMetadata.workflow_id,
					activity_id: existingMetadata.activity_id,
					request_id: requestId,
					status,
					form_action: action,
					form_data: data || {},
					timestamp: submittedAt,
				};

				// Use axios directly for custom URL
				const axios = (await import("axios")).default;
				await axios.post(webhookUrl, webhookPayload, {
					headers: {
						Authorization: authHeader,
						"Content-Type": "application/json",
					},
					timeout: 10000,
				});

				logger.info(
					{
						requestId,
						workflowId: existingMetadata.workflow_id,
						activityId: existingMetadata.activity_id,
						webhookUrl,
					},
					"UI form response webhook sent to platform",
				);
			} else {
				logger.warn(
					{
						requestId,
						hasConversationId: !!msg.conversation_id,
						hasWebhookConfig: !!webhookConfig,
					},
					"No webhook config available for UI form response",
				);
			}
		} finally {
			client.release();
		}
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
		preResolvedUserId?: string,
	): Promise<{
		conversationId: string;
		ritaOrgId: string;
		ritaUserId: string;
	}> {
		// 1. Use pre-resolved org or resolve from Jarvis tenant
		const ritaOrgId =
			preResolvedOrgId ||
			(await this.resolveRitaOrg(config.tenantId, config.tenantName)).ritaOrgId;

		// 2. Use pre-resolved user or resolve from Jarvis GUID
		const ritaUserId =
			preResolvedUserId ||
			(await this.resolveRitaUser(config.userGuid, ritaOrgId)).ritaUserId;

		// 3. Always ensure org membership (ON CONFLICT DO NOTHING handles idempotency)
		if (!preResolvedUserId) {
			await this.ensureOrgMembership(ritaOrgId, ritaUserId);
		}

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
	 * Re-read Valkey payload and merge fresh context into session
	 * Actions Platform updates Valkey mid-session (e.g. adds runId, activityId after workflow runs)
	 * Rita re-reads before every webhook so payloads to Actions Platform contain latest context
	 */
	async refreshSessionFromValkey(sessionId: string): Promise<Session | null> {
		const session = await this.sessionStore.getSession(sessionId);
		if (!session?.valkeySessionKey || !session.iframeWebhookConfig) {
			return session;
		}

		try {
			const { config } = await this.fetchValkeyPayloadWithDebug(
				session.valkeySessionKey,
			);
			if (!config) return session;

			// Merge all fresh Valkey fields into the session config
			// Platform may update tokens, chatSessionId, context, etc. mid-session
			// Filter out undefined values so they don't overwrite existing fields
			const freshFields: Record<string, unknown> = {};
			for (const [key, value] of Object.entries(config)) {
				if (value !== undefined && key !== "context") {
					freshFields[key] = value;
				}
			}

			const updatedConfig = {
				...session.iframeWebhookConfig,
				...freshFields,
				// Deep-merge context to preserve existing fields not in the fresh payload
				context: { ...session.iframeWebhookConfig.context, ...config.context },
			};

			return this.sessionStore.updateSession(sessionId, {
				iframeWebhookConfig: updatedConfig,
			});
		} catch (error) {
			logger.error(
				{
					sessionId,
					error: (error as Error).message,
				},
				"Failed to refresh session from Valkey",
			);
			return session;
		}
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
		/** Host page origin for secure postMessage targetOrigin */
		parentOrigin?: string;
		/** Full Valkey payload for dev tools (sensitive fields redacted) */
		valkeyPayload?: Record<string, unknown>;
		/** Debug info for diagnosing validation failures (server-side only) */
		debug?: Record<string, unknown>;
	}> {
		// SessionKey (Valkey hashkey) required
		if (!sessionKey) {
			logger.warn("Iframe instantiation attempted without sessionKey");
			return { valid: false, error: "sessionKey required" };
		}

		// Fetch config from Valkey with debug info (dev mode handled in getDevMockPayload)
		const { config, debug: valkeyDebug } =
			await this.fetchValkeyPayloadWithDebug(sessionKey);

		if (!config) {
			const errorDetail = valkeyDebug?.error || "unknown";
			logger.warn(
				{
					sessionKey: `${sessionKey.substring(0, 8)}...`,
					valkeyDebug,
				},
				"Valkey config unavailable",
			);
			return {
				valid: false,
				error: "Invalid or missing Valkey configuration",
				debug: { reason: errorDetail },
			};
		}

		let conversationId: string;
		let ritaOrgId: string;
		let ritaUserId: string;

		// Resolve Rita org and user early (needed for activity lookup scoped by user)
		const { ritaOrgId: resolvedOrgId } = await this.resolveRitaOrg(
			config.tenantId,
			config.tenantName,
		);
		ritaOrgId = resolvedOrgId;

		const { ritaUserId: resolvedUserId } = await this.resolveRitaUser(
			config.userGuid,
			ritaOrgId,
		);
		ritaUserId = resolvedUserId;
		await this.ensureOrgMembership(ritaOrgId, ritaUserId);

		// Extract activityId from context if available
		const activityId = config.context?.activityId as number | undefined;

		// Use conversation ID from: 1) frontend param, 2) Valkey config, 3) create new
		// Note: activity_contexts lookup removed (JAR-106) — each activity open creates
		// a fresh conversation. Closing the activity tab discards conversation state.
		const resolvedExistingConversationId =
			existingConversationId || config.conversationId;

		if (resolvedExistingConversationId) {
			// Verify conversation ownership before using it
			const convCheck = await pool.query(
				`SELECT id FROM conversations WHERE id = $1 AND organization_id = $2 AND user_id = $3`,
				[resolvedExistingConversationId, ritaOrgId, ritaUserId],
			);
			if (convCheck.rows.length === 0) {
				const source = existingConversationId
					? "frontend_param"
					: "valkey_config";

				logger.warn(
					{
						conversationId: resolvedExistingConversationId,
						conversationIdSource: source,
						ritaOrgId,
						ritaUserId,
					},
					"Conversation not found in DB — stale reference",
				);

				return {
					valid: false,
					error: "Conversation not found or access denied",
					debug: {
						reason: "conversation_not_in_db",
						conversationId: resolvedExistingConversationId,
						source,
					},
				};
			}
			conversationId = resolvedExistingConversationId;
		} else {
			// New conversation - pass pre-resolved org+user to avoid duplicate lookup
			const result = await this.createIframeConversation(
				config,
				intentEid,
				ritaOrgId,
				ritaUserId,
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
					ritaUserId,
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

		// Store conversationId and valkeySessionKey in session
		await this.sessionStore.updateSession(session.sessionId, {
			conversationId,
			valkeySessionKey: sessionKey,
		});

		// Write conversationId back to Valkey for Platform Activity lookup (JAR-95)
		await this.storeConversationIdInValkey(sessionKey, conversationId);

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
			// Host page origin for secure postMessage targetOrigin
			parentOrigin: config.parentOrigin,
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
