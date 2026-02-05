import axios, { type AxiosResponse } from "axios";
import { pool } from "../config/database.js";
import type {
	SyncTicketsWebhookPayload,
	SyncTriggerWebhookPayload,
	VerifyWebhookPayload,
} from "../types/dataSource.js";
import type {
	WebhookConfig,
	WebhookError,
	WebhookResponse,
} from "../types/webhook.js";

export class DataSourceWebhookService {
	private config: WebhookConfig;

	constructor(config?: Partial<WebhookConfig>) {
		this.config = {
			url:
				config?.url ||
				process.env.AUTOMATION_WEBHOOK_URL ||
				"http://localhost:3001/webhook",
			authHeader: config?.authHeader || process.env.AUTOMATION_AUTH || "",
			timeout: config?.timeout || 10000,
			retryAttempts: config?.retryAttempts || 3,
			retryDelay: config?.retryDelay || 1000,
		};
	}

	/**
	 * Send verify credentials webhook event
	 * @param params.isDelegationSetup - Set to true when called from credential delegation flow
	 */
	async sendVerifyEvent(params: {
		organizationId: string;
		userId: string;
		userEmail: string;
		connectionId: string;
		connectionType: string;
		credentials: Record<string, any>;
		settings: Record<string, any>;
		isDelegationSetup?: boolean;
	}): Promise<WebhookResponse> {
		const payload: VerifyWebhookPayload = {
			source: "rita-chat",
			action: "verify_credentials",
			tenant_id: params.organizationId,
			user_id: params.userId,
			user_email: params.userEmail,
			connection_id: params.connectionId,
			connection_type: params.connectionType as any,
			credentials: params.credentials,
			settings: params.settings,
			timestamp: new Date().toISOString(),
			...(params.isDelegationSetup && { is_delegation_setup: true }),
		};

		return this.sendEvent(payload);
	}

	/**
	 * Send sync trigger webhook event
	 */
	async sendSyncTriggerEvent(params: {
		organizationId: string;
		userId: string;
		userEmail: string;
		connectionId: string;
		connectionType: string;
		settings: Record<string, any>;
	}): Promise<WebhookResponse> {
		const payload: SyncTriggerWebhookPayload = {
			source: "rita-chat",
			action: "trigger_sync",
			tenant_id: params.organizationId,
			user_id: params.userId,
			user_email: params.userEmail,
			connection_id: params.connectionId,
			connection_type: params.connectionType as any,
			settings: params.settings,
			timestamp: new Date().toISOString(),
		};

		return this.sendEvent(payload);
	}

	/**
	 * Send sync tickets webhook event (ITSM Autopilot)
	 * Triggers ITSM ticket sync for clustering
	 */
	async sendSyncTicketsEvent(params: {
		organizationId: string;
		userId: string;
		userEmail: string;
		connectionId: string;
		connectionType: string;
		ingestionRunId: string;
		settings: Record<string, any>;
	}): Promise<WebhookResponse> {
		const payload: SyncTicketsWebhookPayload = {
			source: "rita-chat",
			action: "sync_tickets",
			tenant_id: params.organizationId,
			user_id: params.userId,
			user_email: params.userEmail,
			connection_id: params.connectionId,
			connection_type: params.connectionType as any,
			ingestion_run_id: params.ingestionRunId,
			settings: params.settings,
			timestamp: new Date().toISOString(),
		};

		return this.sendEvent(payload);
	}

	/**
	 * Core event sending method with retry logic
	 */
	private async sendEvent(
		payload:
			| VerifyWebhookPayload
			| SyncTriggerWebhookPayload
			| SyncTicketsWebhookPayload,
	): Promise<WebhookResponse> {
		let lastError: WebhookError | null = null;

		// Validate payload is JSON-serializable before sending
		try {
			const testJson = JSON.stringify(payload);
			JSON.parse(testJson); // Verify it's valid JSON
		} catch (validationError) {
			console.error(
				"[DataSourceWebhook] Payload validation failed:",
				validationError,
			);
			console.error("[DataSourceWebhook] Invalid payload:", payload);
			return {
				success: false,
				status: 0,
				error: `Invalid JSON payload: ${validationError instanceof Error ? validationError.message : "Unknown error"}`,
			};
		}

		for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
			try {
				console.log(
					`[DataSourceWebhook] Sending event (attempt ${attempt}/${this.config.retryAttempts}):`,
					{
						source: payload.source,
						action: payload.action,
						tenant_id: payload.tenant_id,
						connection_id: payload.connection_id,
					},
				);

				const response: AxiosResponse = await axios.post(
					this.config.url,
					payload,
					{
						headers: {
							Authorization: this.config.authHeader,
							"Content-Type": "application/json",
						},
						timeout: this.config.timeout,
					},
				);

				console.log(`[DataSourceWebhook] Success: ${response.status}`);

				return {
					success: true,
					data: response.data,
					status: response.status,
				};
			} catch (error: any) {
				const webhookError = this.createWebhookError(error);
				lastError = webhookError;

				console.error(`[DataSourceWebhook] Attempt ${attempt} failed:`, {
					status: webhookError.status,
					message: webhookError.message,
					isRetryable: webhookError.isRetryable,
				});

				// Don't retry if it's not a retryable error or if this is the last attempt
				if (
					!webhookError.isRetryable ||
					attempt === this.config.retryAttempts
				) {
					// Store failure for non-retryable errors or after all retries exhausted
					await this.storeWebhookFailure(payload, webhookError, attempt);
					break;
				}

				// Wait before retrying
				await this.delay(this.config.retryDelay * attempt);
			}
		}

		console.error(
			`[DataSourceWebhook] All attempts failed for ${payload.action}`,
		);

		return {
			success: false,
			status: lastError?.status || 0,
			error: lastError?.message || "Unknown error",
		};
	}

	/**
	 * Create a standardized webhook error
	 */
	private createWebhookError(error: any): WebhookError {
		const webhookError = new Error(
			error.message || "Webhook request failed",
		) as WebhookError;

		if (error.response) {
			webhookError.status = error.response.status;
			webhookError.response = error.response.data;

			// Determine if error is retryable based on status code
			webhookError.isRetryable =
				error.response.status >= 500 ||
				error.response.status === 429 ||
				error.response.status === 408;
		} else if (error.code === "ECONNABORTED" || error.code === "ENOTFOUND") {
			// Network/timeout errors are retryable
			webhookError.isRetryable = true;
		} else {
			webhookError.isRetryable = false;
		}

		return webhookError;
	}

	/**
	 * Store webhook failure in database
	 */
	private async storeWebhookFailure(
		payload:
			| VerifyWebhookPayload
			| SyncTriggerWebhookPayload
			| SyncTicketsWebhookPayload,
		error: WebhookError | null,
		retryCount: number,
	): Promise<void> {
		try {
			const client = await pool.connect();
			try {
				await client.query(
					`
          INSERT INTO rag_webhook_failures (
            tenant_id, webhook_type, payload, retry_count, max_retries,
            last_error, status, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `,
					[
						payload.tenant_id || null,
						payload.action,
						JSON.stringify(payload),
						retryCount,
						this.config.retryAttempts,
						error?.message || "Unknown error",
						error?.isRetryable ? "failed" : "dead_letter",
					],
				);

				console.log(`[DataSourceWebhook] Webhook failure stored in database`, {
					tenant_id: payload.tenant_id,
					webhook_type: payload.action,
					connection_id: payload.connection_id,
					retry_count: retryCount,
					error_message: error?.message,
				});
			} finally {
				client.release();
			}
		} catch (storeError) {
			console.error(
				`[DataSourceWebhook] Failed to store webhook failure in database:`,
				{
					error:
						storeError instanceof Error
							? storeError.message
							: String(storeError),
					original_error: error?.message,
					webhook_action: payload.action,
					connection_id: payload.connection_id,
				},
			);
		}
	}

	/**
	 * Simple delay utility for retry logic
	 */
	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
