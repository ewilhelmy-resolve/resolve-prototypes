/**
 * WorkflowExecutionService - Handle iframe workflow execution
 *
 * Flow:
 * 1. Fetch webhook config from Valkey using hashkey
 * 2. Parse config (accessToken, tenantId, actionsApiBaseUrl, etc.)
 * 3. Call Actions API postEvent with proper auth
 * 4. Response flows through queue -> message storage -> SSE
 */

import axios from "axios";
import { logger } from "../config/logger.js";
import { getValkeyClient, getValkeyStatus } from "../config/valkey.js";
import type { IframeWebhookConfig } from "./sessionStore.js";

// Valkey key prefix - keys stored as rita:session:{guid}
const VALKEY_KEY_PREFIX = "rita:session:";

export interface ExecuteWorkflowResult {
	success: boolean;
	eventId?: string;
	error?: string;
	debug: {
		// Valkey info
		valkeyStatus: { configured: boolean; url: string; connected: boolean };
		valkeyKey?: string;
		valkeyDataLength?: number;
		valkeyConfigKeys?: string[];
		valkeyDurationMs?: number;
		// Webhook request info
		webhookUrl?: string;
		webhookPayloadSent?: Record<string, unknown>;
		// Webhook response info
		webhookStatus?: number;
		webhookResponse?: unknown;
		webhookDurationMs?: number;
		// Error info
		errorCode?: string;
		errorDetails?: string;
		// Totals
		totalDurationMs?: number;
	};
}

export class WorkflowExecutionService {
	/**
	 * Fetch webhook config from Valkey by hashkey
	 */
	async getConfigFromValkey(
		hashkey: string,
	): Promise<{
		config: IframeWebhookConfig | null;
		debug: ExecuteWorkflowResult["debug"];
	}> {
		const startTime = Date.now();
		const valkeyStatus = getValkeyStatus();
		const fullKey = `${VALKEY_KEY_PREFIX}${hashkey}`;

		const debug: ExecuteWorkflowResult["debug"] = {
			valkeyStatus,
			valkeyKey: fullKey,
		};

		logger.info(
			{ hashkey: hashkey.substring(0, 8) + "...", fullKey, valkeyStatus },
			"Fetching config from Valkey",
		);

		try {
			const client = getValkeyClient();

			// Data is stored as hash type: HGET rita:session:{guid} data
			const data = await client.hget(fullKey, "data");
			debug.valkeyDurationMs = Date.now() - startTime;

			if (!data) {
				debug.errorCode = "KEY_NOT_FOUND";
				debug.errorDetails = "Hashkey does not exist in Valkey or has expired";
				debug.totalDurationMs = Date.now() - startTime;
				return { config: null, debug };
			}

			debug.valkeyDataLength = data.length;

			// Parse JSON
			let config: IframeWebhookConfig;
			try {
				config = JSON.parse(data) as IframeWebhookConfig;
				debug.valkeyConfigKeys = Object.keys(config);
			} catch (parseError) {
				debug.errorCode = "JSON_PARSE_ERROR";
				debug.errorDetails = (parseError as Error).message;
				debug.totalDurationMs = Date.now() - startTime;
				return { config: null, debug };
			}

			// Validate required fields for webhook execution
			const requiredFields = [
				"actionsApiBaseUrl",
				"tenantId",
				"clientId",
				"clientKey",
			];
			const missingFields = requiredFields.filter(
				(field) => !(field in config),
			);

			if (missingFields.length > 0) {
				debug.errorCode = "MISSING_FIELDS";
				debug.errorDetails = `Missing: ${missingFields.join(", ")}`;
				debug.totalDurationMs = Date.now() - startTime;
				return { config: null, debug };
			}

			logger.info(
				{ tenantId: config.tenantId, durationMs: debug.valkeyDurationMs },
				"Valkey config validated",
			);
			return { config, debug };
		} catch (error) {
			const err = error as Error & { code?: string };
			debug.errorCode = err.code || err.name || "VALKEY_ERROR";
			debug.errorDetails = err.message;
			debug.valkeyDurationMs = Date.now() - startTime;
			debug.totalDurationMs = debug.valkeyDurationMs;
			return { config: null, debug };
		}
	}

	/**
	 * Execute workflow by calling Actions API postEvent
	 * @param config Webhook config from Valkey (contains all IDs for routing)
	 * @param debug Debug info object
	 */
	async executeWorkflow(
		config: IframeWebhookConfig,
		debug: ExecuteWorkflowResult["debug"],
	): Promise<ExecuteWorkflowResult> {
		const startTime = Date.now();

		// Validate required webhook fields (already validated in fetchAndValidateConfig, but TypeScript needs explicit checks)
		if (!config.actionsApiBaseUrl || !config.clientId || !config.clientKey) {
			throw new Error("Missing required webhook credentials");
		}

		// Build webhook URL from config (remove trailing slash if present)
		const baseUrl = config.actionsApiBaseUrl.replace(/\/$/, "");
		const webhookUrl = `${baseUrl}/api/Webhooks/postEvent/${config.tenantId}`;
		debug.webhookUrl = webhookUrl;

		// Build HTTP Basic auth header (clientId:clientKey base64 encoded)
		const authHeader = `Basic ${Buffer.from(`${config.clientId}:${config.clientKey}`).toString("base64")}`;

		// Build workflow trigger payload - spread entire Valkey config
		const payload = {
			source: "rita-chat-iframe",
			action: "workflow_trigger",
			timestamp: new Date().toISOString(),
			// Spread entire Valkey config (includes userGuid, tenantId, tokens, etc.)
			...config,
		};

		// Store payload in debug (mask tokens)
		debug.webhookPayloadSent = {
			...payload,
			accessToken: payload.accessToken ? "[MASKED]" : undefined,
			refreshToken: payload.refreshToken ? "[MASKED]" : undefined,
			clientKey: payload.clientKey ? "[MASKED]" : undefined,
		};

		try {
			logger.info(
				{ webhookUrl, tenantId: config.tenantId },
				"Executing workflow",
			);

			const response = await axios.post(webhookUrl, payload, {
				headers: {
					Authorization: authHeader,
					"Content-Type": "application/json",
				},
				timeout: 30000,
			});

			debug.webhookDurationMs = Date.now() - startTime;
			debug.webhookStatus = response.status;
			debug.webhookResponse = response.data;
			debug.totalDurationMs =
				(debug.valkeyDurationMs || 0) + debug.webhookDurationMs;

			logger.info(
				{ webhookUrl, status: response.status, tenantId: config.tenantId },
				"Workflow executed",
			);

			return {
				success: true,
				eventId: response.data?.eventId,
				debug,
			};
		} catch (error: unknown) {
			debug.webhookDurationMs = Date.now() - startTime;
			debug.totalDurationMs =
				(debug.valkeyDurationMs || 0) + debug.webhookDurationMs;

			const axiosError = error as {
				response?: { data?: unknown; status?: number; statusText?: string };
				message?: string;
				code?: string;
			};

			debug.webhookStatus = axiosError.response?.status;
			debug.webhookResponse = axiosError.response?.data;
			debug.errorCode =
				axiosError.code || `HTTP_${axiosError.response?.status || "NETWORK"}`;
			debug.errorDetails = axiosError.message || "Unknown error";

			logger.error(
				{
					webhookUrl,
					status: debug.webhookStatus,
					error: debug.errorDetails,
					response: debug.webhookResponse,
				},
				"Workflow execution failed",
			);

			return {
				success: false,
				error: `Webhook failed: ${debug.webhookStatus || "network"} - ${debug.errorDetails}`,
				debug,
			};
		}
	}

	/**
	 * Combined: fetch config from Valkey and execute workflow
	 * @param hashkey Valkey hashkey containing webhook config (includes all IDs)
	 */
	async executeFromHashkey(hashkey: string): Promise<ExecuteWorkflowResult> {
		const { config, debug } = await this.getConfigFromValkey(hashkey);

		if (!config) {
			return {
				success: false,
				error: `Config invalid: ${debug.errorCode}`,
				debug,
			};
		}

		return this.executeWorkflow(config, debug);
	}
}

// Singleton instance
let workflowExecutionService: WorkflowExecutionService | null = null;

export function getWorkflowExecutionService(): WorkflowExecutionService {
	if (!workflowExecutionService) {
		workflowExecutionService = new WorkflowExecutionService();
	}
	return workflowExecutionService;
}
