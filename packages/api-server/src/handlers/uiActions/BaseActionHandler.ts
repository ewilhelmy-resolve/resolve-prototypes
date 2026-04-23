/**
 * Base Action Handler
 *
 * Implements the 5-step webhook pattern from IframeService.sendUIFormResponse:
 * 1. Lookup message by messageId
 * 2. Update message metadata (store action_data, status=completed)
 * 3. Retrieve webhook config from session (already in context)
 * 4. Build webhook payload with correlation IDs
 * 5. Send Basic-auth POST to Actions API
 */

import axios from "axios";
import { pool } from "../../config/database.js";
import { logger } from "../../config/logger.js";
import type {
	ActionHandlerContext,
	ActionHandlerResult,
	BaseUIActionPayload,
	UIActionHandler,
	UIActionWebhookPayload,
} from "../../types/uiAction.js";

export class BaseActionHandler implements UIActionHandler {
	protected readonly actionTypes: string[];

	constructor(actionTypes: string[]) {
		this.actionTypes = actionTypes;
	}

	canHandle(action: string): boolean {
		return this.actionTypes.includes(action);
	}

	async handle(context: ActionHandlerContext): Promise<ActionHandlerResult> {
		const { payload, message, webhookConfig } = context;

		try {
			// Step 2: Update message metadata with action data
			await this.updateMessageMetadata(message.id, payload);

			// Step 3: Webhook config already in context from session lookup

			// Steps 4 & 5: Build and send webhook (if config available and complete)
			let webhookSent = false;
			if (
				webhookConfig?.actionsApiBaseUrl &&
				webhookConfig?.clientId &&
				webhookConfig?.clientKey
			) {
				await this.sendWebhook(
					{
						actionsApiBaseUrl: webhookConfig.actionsApiBaseUrl,
						clientId: webhookConfig.clientId,
						clientKey: webhookConfig.clientKey,
						tenantId: webhookConfig.tenantId,
						userGuid: webhookConfig.userGuid,
					},
					message,
					payload,
				);
				webhookSent = true;
			} else {
				logger.warn(
					{ action: payload.action, messageId: payload.messageId },
					"Webhook config incomplete or missing - action logged only",
				);
			}

			return { success: true, webhookSent };
		} catch (error) {
			const err = error as Error;
			logger.error(
				{ action: payload.action, error: err.message },
				"Action handler failed",
			);
			return { success: false, webhookSent: false, error: err.message };
		}
	}

	/**
	 * Step 2: Update message metadata with action data
	 * Pattern from IframeService.sendUIFormResponse (lines 450-463)
	 * Uses jsonb merge to preserve existing metadata
	 */
	// TODO: migrate to Kysely when messages queries are moved to the ORM
	protected async updateMessageMetadata(
		messageId: string,
		payload: BaseUIActionPayload,
	): Promise<void> {
		const client = await pool.connect();
		try {
			const actionMetadata = {
				type: "ui_action",
				action: payload.action,
				action_data: payload.data || {},
				status: "completed",
				processed_at: new Date().toISOString(),
			};

			await client.query(
				`UPDATE messages
         SET metadata = metadata || $1::jsonb,
             processed_at = NOW()
         WHERE id = $2`,
				[JSON.stringify(actionMetadata), messageId],
			);

			logger.info(
				{ messageId, action: payload.action },
				"Message metadata updated with action data",
			);
		} finally {
			client.release();
		}
	}

	/**
	 * Steps 4 & 5: Build webhook payload and send to Actions API
	 * Pattern from IframeService.sendUIFormResponse (lines 487-519)
	 */
	protected async sendWebhook(
		config: {
			actionsApiBaseUrl: string;
			clientId: string;
			clientKey: string;
			tenantId: string;
			userGuid: string;
		},
		message: any,
		payload: BaseUIActionPayload,
	): Promise<void> {
		const baseUrl = config.actionsApiBaseUrl.replace(/\/$/, "");
		const webhookUrl = `${baseUrl}/api/Webhooks/postEvent/${config.tenantId}`;
		const authHeader = `Basic ${Buffer.from(`${config.clientId}:${config.clientKey}`).toString("base64")}`;

		const webhookPayload: UIActionWebhookPayload = {
			source: "rita-chat-iframe",
			action: payload.action,
			tenant_id: config.tenantId,
			user_id: config.userGuid,

			// Correlation from message metadata (optional - may be null)
			request_id: message.metadata?.request_id,
			workflow_id: message.metadata?.workflow_id,
			activity_id: message.metadata?.activity_id,

			// Action data
			action_data: payload.data || {},

			// Metadata
			message_id: payload.messageId,
			conversation_id: payload.conversationId,
			timestamp: payload.timestamp,
		};

		await axios.post(webhookUrl, webhookPayload, {
			headers: {
				Authorization: authHeader,
				"Content-Type": "application/json",
			},
			timeout: 10000,
		});

		logger.info(
			{
				action: payload.action,
				messageId: payload.messageId,
				webhookUrl,
			},
			"UI action webhook sent to platform",
		);
	}
}
