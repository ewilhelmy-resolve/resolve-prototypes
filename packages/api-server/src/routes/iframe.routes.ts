/**
 * Iframe Routes (/iframe/chat)
 *
 * Webhook source: rita-chat-iframe
 *
 * This is one of three chat applications in Rita:
 * - rita-chat: Main app (/chat)
 * - rita-chat-iframe: Iframe embed (/iframe/chat) <-- this file
 * - rita-chat-workflows: Workflow builder (/jirita)
 *
 * Sessions use Valkey IDs (userId, tenantId) from host app.
 * See types/webhook.ts for ChatWebhookSource type definition.
 */
import express from "express";
import { logger } from "../config/logger.js";
import { getValkeyStatus } from "../config/valkey.js";
import { registry, z } from "../docs/openapi.js";
import { ErrorResponseSchema } from "../schemas/common.js";
import {
	IframeDebugResponseSchema,
	IframeDeleteConversationResponseSchema,
	IframeExecuteRequestSchema,
	IframeExecuteResponseSchema,
	IframeValidateRequestSchema,
	IframeValidateResponseSchema,
} from "../schemas/iframe.js";
import { getIframeService } from "../services/IframeService.js";
import { getWorkflowExecutionService } from "../services/WorkflowExecutionService.js";

// ============================================================================
// OpenAPI Documentation Registration
// ============================================================================

registry.registerPath({
	method: "post",
	path: "/api/iframe/validate-instantiation",
	tags: ["Iframe"],
	summary: "Validate iframe instantiation",
	description:
		"Validate Valkey session key and setup iframe session. No auth required - sessionKey is the auth.",
	security: [],
	request: {
		body: {
			content: { "application/json": { schema: IframeValidateRequestSchema } },
		},
	},
	responses: {
		200: {
			description: "Validation successful",
			content: { "application/json": { schema: IframeValidateResponseSchema } },
		},
		401: {
			description: "Validation failed - invalid session",
			content: { "application/json": { schema: IframeValidateResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

registry.registerPath({
	method: "get",
	path: "/api/iframe/debug",
	tags: ["Iframe"],
	summary: "Debug iframe config",
	description:
		"Check Valkey status and environment configuration for debugging.",
	security: [],
	responses: {
		200: {
			description: "Debug information",
			content: { "application/json": { schema: IframeDebugResponseSchema } },
		},
	},
});

registry.registerPath({
	method: "post",
	path: "/api/iframe/execute",
	tags: ["Iframe"],
	summary: "Execute workflow",
	description:
		"Execute workflow from Valkey hashkey. No auth required - hashkey provides context.",
	security: [],
	request: {
		body: {
			content: { "application/json": { schema: IframeExecuteRequestSchema } },
		},
	},
	responses: {
		200: {
			description: "Execution started",
			content: { "application/json": { schema: IframeExecuteResponseSchema } },
		},
		400: {
			description: "Invalid input or execution failed",
			content: { "application/json": { schema: IframeExecuteResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: IframeExecuteResponseSchema } },
		},
	},
});

registry.registerPath({
	method: "delete",
	path: "/api/iframe/conversation/{conversationId}",
	tags: ["Iframe"],
	summary: "Delete conversation",
	description:
		"Delete iframe conversation and all messages. Used for 'Clear Chat' feature.",
	security: [],
	request: {
		params: z.object({
			conversationId: z
				.string()
				.uuid()
				.openapi({ description: "Conversation ID to delete" }),
		}),
	},
	responses: {
		200: {
			description: "Conversation deleted",
			content: {
				"application/json": { schema: IframeDeleteConversationResponseSchema },
			},
		},
		400: {
			description: "Missing conversationId",
			content: {
				"application/json": { schema: IframeDeleteConversationResponseSchema },
			},
		},
		500: {
			description: "Deletion failed",
			content: {
				"application/json": { schema: IframeDeleteConversationResponseSchema },
			},
		},
	},
});

const router = express.Router();

/**
 * Validate iframe instantiation and setup session
 * POST /api/iframe/validate-instantiation
 *
 * Validates Valkey config (sessionKey) for routing IDs.
 * No token or organization DB checks - IDs come from Valkey.
 */
router.post("/validate-instantiation", async (req, res) => {
	const startTime = Date.now();
	logger.info(
		{ hasSessionKey: !!req.body.sessionKey },
		"Iframe validate-instantiation started",
	);

	try {
		const { intentEid, existingConversationId, sessionKey } = req.body;

		const iframeService = getIframeService();
		const result = await iframeService.validateAndSetup(
			sessionKey,
			intentEid,
			existingConversationId,
		);
		const duration = Date.now() - startTime;
		logger.info(
			{ durationMs: duration, valid: result.valid },
			"Iframe validate-instantiation completed",
		);

		// Handle validation failure
		if (!result.valid) {
			logger.warn(
				{
					error: result.error,
					sessionKey: sessionKey?.substring(0, 8) + "...",
				},
				"Iframe validation failed",
			);
			res.status(401).json({
				valid: false,
				error: result.error,
			});
			return;
		}

		// Set session cookie (cookie is guaranteed when valid=true)
		if (result.cookie) {
			res.setHeader("Set-Cookie", result.cookie);
		}

		logger.info(
			{
				conversationId: result.conversationId,
				intentEid,
				tenantId: result.webhookTenantId,
			},
			"Iframe instantiation successful",
		);

		res.json({
			valid: result.valid,
			conversationId: result.conversationId,
			webhookConfigLoaded: result.webhookConfigLoaded,
			webhookTenantId: result.webhookTenantId,
			// Custom UI text from Valkey ui_config (undefined = use i18n defaults)
			titleText: result.uiConfig?.titleText,
			welcomeText: result.uiConfig?.welcomeText,
			placeholderText: result.uiConfig?.placeholderText,
			// Full Valkey payload for dev tools (sensitive fields excluded)
			valkeyPayload: result.valkeyPayload,
		});
	} catch (error) {
		const duration = Date.now() - startTime;
		const err = error as Error;
		logger.error(
			{
				error: err.message,
				errorName: err.name,
				errorCode: (err as NodeJS.ErrnoException).code,
				durationMs: duration,
				stack: err.stack?.split("\n").slice(0, 3).join(" | "),
			},
			"Iframe instantiation failed",
		);
		res.status(500).json({
			valid: false,
			error: "Failed to initialize iframe session",
			debug: {
				valkeyStatus: getValkeyStatus(),
				sessionKeyProvided: !!req.body.sessionKey,
				sessionKeyReceived: req.body.sessionKey || null,
				valkeyKeyUsed: req.body.sessionKey
					? `rita:session:${req.body.sessionKey}`
					: null,
				errorMessage: err.message,
				errorCode: (err as NodeJS.ErrnoException).code,
				durationMs: duration,
			},
		});
	}
});

/**
 * Debug endpoint - check Valkey status and configuration
 * GET /api/iframe/debug
 */
router.get("/debug", async (_req, res) => {
	const valkeyStatus = getValkeyStatus();
	const envVars = {
		VALKEY_URL: process.env.VALKEY_URL ? "set" : "not set",
		REDIS_URL: process.env.REDIS_URL ? "set" : "not set",
		ACTIONS_API_URL: process.env.ACTIONS_API_URL ? "set" : "not set",
	};

	res.json({
		timestamp: new Date().toISOString(),
		valkey: valkeyStatus,
		environment: envVars,
	});
});

/**
 * Execute workflow from Valkey hashkey
 * POST /api/iframe/execute
 *
 * No DB checks - all IDs from Valkey config.
 * Flow:
 * 1. Client sends hashkey
 * 2. Backend fetches payload from Valkey (user_guid, tenant_id, webhook creds)
 * 3. Backend calls Actions API postEvent with rita_* routing IDs
 * 4. Response flows: Actions API → RabbitMQ → SSE → iframe
 */
router.post("/execute", async (req, res) => {
	const startTime = Date.now();

	try {
		const { hashkey, sessionKey } = req.body;
		// Support both hashkey and sessionKey (portal uses sessionKey)
		const resolvedHashkey = hashkey || sessionKey;

		if (!resolvedHashkey) {
			res.status(400).json({
				success: false,
				error: "Missing hashkey parameter",
				debug: {
					valkeyStatus: getValkeyStatus(),
				},
			});
			return;
		}

		logger.info(
			{
				hashkey: resolvedHashkey.substring(0, 8) + "...",
			},
			"Executing workflow from hashkey",
		);

		// All IDs come from Valkey config (set by host application)
		const workflowService = getWorkflowExecutionService();
		const result = await workflowService.executeFromHashkey(resolvedHashkey);

		if (!result.success) {
			logger.warn(
				{
					hashkey: resolvedHashkey.substring(0, 8) + "...",
					error: result.error,
					debug: result.debug,
				},
				"Workflow execution failed",
			);
			res.status(400).json(result);
			return;
		}

		logger.info(
			{
				hashkey: resolvedHashkey.substring(0, 8) + "...",
				eventId: result.eventId,
				durationMs: result.debug.totalDurationMs,
			},
			"Workflow execution initiated",
		);
		res.json(result);
	} catch (error) {
		const duration = Date.now() - startTime;
		const err = error as Error & { code?: string };
		logger.error(
			{
				error: err.message,
				errorCode: err.code,
				durationMs: duration,
				stack: err.stack?.split("\n").slice(0, 3).join(" | "),
			},
			"Workflow execution error",
		);
		res.status(500).json({
			success: false,
			error: "Internal server error",
			debug: {
				valkeyStatus: getValkeyStatus(),
				errorCode: err.code || err.name,
				errorDetails: err.message,
				durationMs: duration,
			},
		});
	}
});

/**
 * Delete iframe conversation
 * DELETE /api/iframe/conversation/:conversationId
 *
 * Deletes conversation and all messages (cascade via FK).
 * Used by "Clear Chat" feature to start fresh.
 */
router.delete("/conversation/:conversationId", async (req, res) => {
	const { conversationId } = req.params;

	if (!conversationId) {
		res.status(400).json({ success: false, error: "Missing conversationId" });
		return;
	}

	try {
		const iframeService = getIframeService();
		await iframeService.deleteConversation(conversationId);
		res.json({ success: true });
	} catch (error) {
		const err = error as Error;
		logger.error(
			{ conversationId, error: err.message },
			"Failed to delete conversation",
		);
		res.status(500).json({ success: false, error: "Failed to delete" });
	}
});

/**
 * Send UI action back to platform
 * POST /api/iframe/ui-action
 *
 * Used by SchemaRenderer when user interacts with dynamic UI components.
 * Forwards action payload to platform via webhook.
 */
router.post("/ui-action", async (req, res) => {
	const { action, data, messageId, conversationId, timestamp } = req.body;

	if (!action || !messageId || !conversationId) {
		res.status(400).json({
			success: false,
			error: "Missing required fields: action, messageId, conversationId",
		});
		return;
	}

	try {
		logger.info(
			{
				action,
				messageId,
				conversationId,
				hasData: !!data,
			},
			"Processing UI action",
		);

		const iframeService = getIframeService();
		await iframeService.sendUIAction({
			action,
			data,
			messageId,
			conversationId,
			timestamp,
		});

		res.json({ success: true });
	} catch (error) {
		const err = error as Error;
		logger.error(
			{ action, conversationId, error: err.message },
			"Failed to send UI action",
		);
		res.status(500).json({ success: false, error: err.message });
	}
});

export default router;
