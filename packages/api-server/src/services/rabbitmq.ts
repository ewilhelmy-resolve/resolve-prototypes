import amqp from "amqplib";
import { pool, withOrgContext } from "../config/database.js";
import { logError, PerformanceTimer, queueLogger } from "../config/logger.js";
import { DataSourceStatusConsumer } from "../consumers/DataSourceStatusConsumer.js";
import { DocumentProcessingConsumer } from "../consumers/DocumentProcessingConsumer.js";
import { WorkflowConsumer } from "../consumers/WorkflowConsumer.js";
import { getSSEService } from "./sse.js";

// Connection state types
type ConnectionStatus =
	| "disconnected"
	| "connecting"
	| "connected"
	| "reconnecting"
	| "circuit_open";

interface ConnectionState {
	status: ConnectionStatus;
	lastConnectedAt: Date | null;
	lastErrorAt: Date | null;
	reconnectAttempts: number;
	consecutiveFailures: number;
	currentRetryTimer: NodeJS.Timeout | null;
}

interface RetryConfig {
	maxAttempts: number;
	initialDelayMs: number;
	maxDelayMs: number;
	backoffMultiplier: number;
	jitterEnabled: boolean;
}

interface HealthStatus {
	status: ConnectionStatus;
	lastConnectedAt: Date | null;
	reconnectAttempts: number;
	consecutiveFailures: number;
	message: string;
}

export class RabbitMQService {
	private connection: any = null;
	private channel: any = null;
	private readonly queueName: string;
	private dataSourceStatusConsumer: DataSourceStatusConsumer;
	private documentProcessingConsumer: DocumentProcessingConsumer;
	private workflowConsumer: WorkflowConsumer;

	// Connection resilience state
	private state: ConnectionState = {
		status: "disconnected",
		lastConnectedAt: null,
		lastErrorAt: null,
		reconnectAttempts: 0,
		consecutiveFailures: 0,
		currentRetryTimer: null,
	};

	private retryConfig: RetryConfig;
	private isShuttingDown = false;

	constructor() {
		this.queueName = process.env.QUEUE_NAME || "chat.responses";
		this.dataSourceStatusConsumer = new DataSourceStatusConsumer();
		this.documentProcessingConsumer = new DocumentProcessingConsumer();
		this.workflowConsumer = new WorkflowConsumer();

		// Initialize retry configuration from environment variables
		this.retryConfig = {
			maxAttempts: Number.parseInt(
				process.env.RABBITMQ_RETRY_MAX_ATTEMPTS || "10",
				10,
			),
			initialDelayMs: Number.parseInt(
				process.env.RABBITMQ_RETRY_INITIAL_DELAY_MS || "1000",
				10,
			),
			maxDelayMs: Number.parseInt(
				process.env.RABBITMQ_RETRY_MAX_DELAY_MS || "32000",
				10,
			),
			backoffMultiplier: Number.parseFloat(
				process.env.RABBITMQ_RETRY_BACKOFF_MULTIPLIER || "2",
			),
			jitterEnabled: process.env.RABBITMQ_RETRY_JITTER_ENABLED !== "false",
		};

		queueLogger.info(
			{ retryConfig: this.retryConfig },
			"RabbitMQ service initialized with retry configuration",
		);
	}

	/**
	 * Calculate exponential backoff delay with optional jitter
	 */
	private calculateBackoffDelay(attempt: number): number {
		const delay = Math.min(
			this.retryConfig.initialDelayMs *
				this.retryConfig.backoffMultiplier ** attempt,
			this.retryConfig.maxDelayMs,
		);

		// Add jitter (±25% randomness) to prevent thundering herd
		if (this.retryConfig.jitterEnabled) {
			const jitter = delay * 0.25 * (Math.random() * 2 - 1);
			return Math.floor(delay + jitter);
		}

		return delay;
	}

	/**
	 * Setup connection event listeners for automatic reconnection
	 */
	private setupEventListeners(): void {
		if (!this.connection) return;

		this.connection.on("error", (error: Error) => {
			queueLogger.error(
				{
					event: "rabbitmq_connection_error",
					error: error.message,
					errorCode: (error as any).code,
					state: this.state.status,
				},
				"RabbitMQ connection error detected",
			);

			// Don't trigger reconnection if already reconnecting or shutting down
			if (this.state.status !== "reconnecting" && !this.isShuttingDown) {
				this.handleConnectionLoss(error);
			}
		});

		this.connection.on("close", () => {
			queueLogger.warn(
				{
					event: "rabbitmq_connection_closed",
					lastConnectedAt: this.state.lastConnectedAt,
					uptimeMs: this.state.lastConnectedAt
						? Date.now() - this.state.lastConnectedAt.getTime()
						: 0,
					state: this.state.status,
				},
				"RabbitMQ connection closed",
			);

			// Don't trigger reconnection if shutting down gracefully
			if (!this.isShuttingDown && this.state.status !== "reconnecting") {
				this.handleConnectionLoss(new Error("Connection closed"));
			}
		});

		this.connection.on("blocked", (reason: string) => {
			queueLogger.warn(
				{
					event: "rabbitmq_connection_blocked",
					reason,
				},
				"RabbitMQ connection blocked - server is low on resources",
			);
		});

		this.connection.on("unblocked", () => {
			queueLogger.info(
				{
					event: "rabbitmq_connection_unblocked",
				},
				"RabbitMQ connection unblocked",
			);
		});
	}

	/**
	 * Handle connection loss and trigger reconnection
	 */
	private handleConnectionLoss(error: Error): void {
		this.state.status = "reconnecting";
		this.state.lastErrorAt = new Date();
		this.state.consecutiveFailures++;

		queueLogger.warn(
			{
				event: "rabbitmq_connection_lost",
				error: error.message,
				consecutiveFailures: this.state.consecutiveFailures,
				reconnectAttempts: this.state.reconnectAttempts,
			},
			"RabbitMQ connection lost, initiating reconnection",
		);

		// Start reconnection process
		this.reconnect();
	}

	/**
	 * Reconnection logic with exponential backoff
	 */
	private async reconnect(): Promise<void> {
		// Check if we've exceeded max attempts (0 means infinite retries)
		if (
			this.retryConfig.maxAttempts > 0 &&
			this.state.reconnectAttempts >= this.retryConfig.maxAttempts
		) {
			queueLogger.error(
				{
					event: "rabbitmq_reconnect_failed_max_attempts",
					maxAttempts: this.retryConfig.maxAttempts,
					consecutiveFailures: this.state.consecutiveFailures,
				},
				"RabbitMQ reconnection failed - max attempts reached",
			);

			this.state.status = "disconnected";
			return;
		}

		// Don't reconnect if shutting down
		if (this.isShuttingDown) {
			return;
		}

		const delay = this.calculateBackoffDelay(this.state.reconnectAttempts);

		queueLogger.info(
			{
				event: "rabbitmq_reconnect_scheduled",
				attempt: this.state.reconnectAttempts + 1,
				maxAttempts: this.retryConfig.maxAttempts || "infinite",
				delayMs: delay,
				nextRetryAt: new Date(Date.now() + delay).toISOString(),
			},
			"RabbitMQ reconnection scheduled",
		);

		// Clear any existing retry timer
		if (this.state.currentRetryTimer) {
			clearTimeout(this.state.currentRetryTimer);
		}

		// Schedule reconnection attempt
		this.state.currentRetryTimer = setTimeout(async () => {
			this.state.reconnectAttempts++;

			queueLogger.info(
				{
					event: "rabbitmq_reconnect_attempt",
					attempt: this.state.reconnectAttempts,
					maxAttempts: this.retryConfig.maxAttempts || "infinite",
				},
				"Attempting RabbitMQ reconnection",
			);

			try {
				await this.connect();

				// Reconnection successful - restart consumers
				if (this.state.status === "connected") {
					await this.startConsumer();

					queueLogger.info(
						{
							event: "rabbitmq_reconnect_success",
							attempt: this.state.reconnectAttempts,
							downtimeMs: this.state.lastErrorAt
								? Date.now() - this.state.lastErrorAt.getTime()
								: 0,
						},
						"RabbitMQ reconnection successful, consumers restarted",
					);
				}
			} catch (error) {
				queueLogger.warn(
					{
						event: "rabbitmq_reconnect_attempt_failed",
						attempt: this.state.reconnectAttempts,
						error: (error as Error).message,
					},
					"RabbitMQ reconnection attempt failed, will retry",
				);

				// Continue reconnection loop
				await this.reconnect();
			}
		}, delay);
	}

	async connect(): Promise<void> {
		const timer = new PerformanceTimer(queueLogger, "rabbitmq-connect");

		// Update state to connecting
		const wasReconnecting = this.state.status === "reconnecting";
		this.state.status = "connecting";

		try {
			const rabbitUrl =
				process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";

			queueLogger.info(
				{
					event: "rabbitmq_connecting",
					url: rabbitUrl.replace(/\/\/.*:.*@/, "//***:***@"), // Hide credentials in logs
					attempt: wasReconnecting ? this.state.reconnectAttempts : 1,
				},
				"Connecting to RabbitMQ",
			);

			this.connection = await amqp.connect(rabbitUrl);
			this.channel = await this.connection.createChannel();

			// Setup event listeners for automatic reconnection
			this.setupEventListeners();

			// Assert queue exists
			await this.channel.assertQueue(this.queueName, {
				durable: true,
			});

			// Update state to connected
			this.state.status = "connected";
			this.state.lastConnectedAt = new Date();
			this.state.consecutiveFailures = 0;
			this.state.reconnectAttempts = 0;

			timer.end({
				queueName: this.queueName,
				success: true,
				wasReconnecting,
			});

			queueLogger.info(
				{
					event: "rabbitmq_connected",
					queueName: this.queueName,
					wasReconnecting,
					downtimeMs:
						wasReconnecting && this.state.lastErrorAt
							? Date.now() - this.state.lastErrorAt.getTime()
							: 0,
				},
				"RabbitMQ connected successfully",
			);
		} catch (error) {
			this.state.status = wasReconnecting ? "reconnecting" : "disconnected";
			this.state.lastErrorAt = new Date();
			this.state.consecutiveFailures++;

			timer.end({ success: false });

			queueLogger.error(
				{
					event: "rabbitmq_connection_failed",
					error: (error as Error).message,
					errorCode: (error as any).code,
					attempt: wasReconnecting ? this.state.reconnectAttempts : 1,
					consecutiveFailures: this.state.consecutiveFailures,
				},
				"RabbitMQ connection failed",
			);

			logError(queueLogger, error as Error, { operation: "rabbitmq-connect" });
			throw error;
		}
	}

	async startConsumer(): Promise<void> {
		if (!this.channel) {
			throw new Error("RabbitMQ channel not initialized");
		}

		queueLogger.info(
			{ queueName: this.queueName },
			"Starting RabbitMQ consumer...",
		);

		// Start chat responses consumer
		await this.channel.consume(this.queueName, async (message: any) => {
			if (!message) return;

			const timer = new PerformanceTimer(queueLogger, "message-processing");
			try {
				const content = JSON.parse(message.content.toString());
				queueLogger.info(
					{
						messageId: content.message_id,
						organizationId: content.organization_id,
						status: content.status,
					},
					"Received message from queue",
				);

				await this.processMessage(content);

				// Acknowledge message
				this.channel?.ack(message);
				timer.end({
					messageId: content.message_id,
					status: content.status,
					success: true,
				});
				queueLogger.info(
					{
						messageId: content.message_id,
					},
					"Message processed successfully",
				);
			} catch (error) {
				timer.end({ success: false });
				logError(queueLogger, error as Error, {
					operation: "message-processing",
				});

				// Store the failure in the database
				await this.storeMessageFailure(message, error as Error);

				// Reject message and don't requeue to avoid infinite loops
				this.channel?.nack(message, false, false);
			}
		});

		// Start unified data source status consumer (also handles credential delegation verification)
		await this.dataSourceStatusConsumer.startConsumer(this.channel);

		// Start document processing status consumer
		await this.documentProcessingConsumer.startConsumer(this.channel);

		// Start workflow consumer
		await this.workflowConsumer.startConsumer(this.channel);
	}

	private async processMessage(payload: any): Promise<void> {
		const {
			message_id,
			conversation_id,
			tenant_id: organization_id, // Remap tenant_id from external service to organization_id
			response,
			metadata, // Optional metadata for rich message types
			response_group_id, // Optional group ID for multi-part responses
		} = payload;

		// Validate minimum required fields
		if (!message_id || !organization_id || !conversation_id) {
			const messageLogger = queueLogger.child({
				messageId: message_id,
				conversationId: conversation_id,
				organizationId: organization_id,
			});
			messageLogger.error(
				{ payload },
				"Invalid message payload: missing required fields (message_id, tenant_id, conversation_id)",
			);
			throw new Error("Invalid message payload: missing required fields");
		}

		// Always fetch user_id from conversation for SSE routing
		// (payload user_id may be Valkey userGuid which doesn't match SSE subscription)
		const client = await pool.connect();
		let user_id: string;
		try {
			const conversationResult = await client.query(
				"SELECT user_id FROM conversations WHERE id = $1 AND organization_id = $2",
				[conversation_id, organization_id],
			);

			if (conversationResult.rows.length === 0) {
				throw new Error(
					`Conversation ${conversation_id} not found or doesn't belong to organization ${organization_id}`,
				);
			}

			user_id = conversationResult.rows[0].user_id;
		} finally {
			client.release();
		}

		const messageLogger = queueLogger.child({
			messageId: message_id,
			conversationId: conversation_id,
			organizationId: organization_id,
			userId: user_id,
		});

		messageLogger.info({ userIdSource: "conversation" }, "Processing message");
		const sseService = getSSEService();

		// Process message with organization context
		await withOrgContext(user_id, organization_id, async (client) => {
			// Verify message exists and belongs to the correct organization
			const messageCheck = await client.query(
				"SELECT id FROM messages WHERE id = $1 AND organization_id = $2",
				[message_id, organization_id],
			);

			if (messageCheck.rows.length === 0) {
				throw new Error(
					`Message ${message_id} not found or doesn't belong to organization ${organization_id}`,
				);
			}

			// Update original user message status to completed
			await client.query(
				`
        UPDATE messages
        SET status = $1, processed_at = $2
        WHERE id = $3
      `,
				["completed", new Date(), message_id],
			);

			// Create new assistant message with the response and hybrid data
			const assistantMessageResult = await client.query(
				`
        INSERT INTO messages (organization_id, conversation_id, user_id, message, metadata, response_group_id, role, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'assistant', 'completed', NOW())
        RETURNING id
      `,
				[
					organization_id,
					conversation_id,
					user_id,
					response,
					metadata ? JSON.stringify(metadata) : null,
					response_group_id,
				],
			);

			const assistantMessageId = assistantMessageResult.rows[0].id;

			// Log the message processing for audit trail
			await client.query(
				`
        INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, metadata)
        VALUES ($1, $2, 'assistant_message_created', 'message', $3, $4)
      `,
				[
					organization_id,
					user_id,
					assistantMessageId,
					JSON.stringify({
						original_user_message_id: message_id,
						response_length: response?.length || 0,
						conversation_id: conversation_id,
					}),
				],
			);

			messageLogger.info(
				{ newStatus: "completed" },
				"Database update completed",
			);

			// Send SSE events to user about both message updates
			try {
				// Event for user message completion
				sseService.sendToUser(user_id, organization_id, {
					type: "message_update",
					data: {
						messageId: message_id,
						status: "completed" as any,
						responseContent: undefined,
						errorMessage: undefined,
						processedAt: new Date().toISOString(),
					},
				});

				// Event for new assistant message with hybrid data
				sseService.sendToUser(user_id, organization_id, {
					type: "new_message",
					data: {
						messageId: assistantMessageId,
						conversationId: conversation_id,
						role: "assistant",
						message: response,
						metadata: metadata,
						response_group_id: response_group_id,
						userId: user_id,
						createdAt: new Date().toISOString(),
					},
				});

				messageLogger.info(
					{ eventType: "message_update_and_new_message" },
					"SSE events sent to user",
				);
			} catch (sseError) {
				messageLogger.warn(
					{
						error:
							sseError instanceof Error ? sseError.message : String(sseError),
					},
					"Failed to send SSE event",
				);
				// Don't throw here - SSE failure shouldn't prevent message processing
			}
		});

		messageLogger.info(
			{ finalStatus: "completed" },
			"Message processing completed successfully",
		);
	}

	private async storeMessageFailure(message: any, error: Error): Promise<void> {
		try {
			const content = JSON.parse(message.content.toString());
			const { message_id, tenant_id: organization_id } = content;

			// Generate a unique message ID if not present
			const messageId =
				message_id ||
				`failed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
			const tenantId = organization_id || null;

			const client = await pool.connect();
			try {
				await client.query(
					`
          INSERT INTO message_processing_failures (
            tenant_id, message_id, queue_name, message_payload,
            error_message, error_type, processing_status, original_received_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
					[
						tenantId,
						messageId,
						this.queueName,
						JSON.stringify(content),
						error.message,
						error.name || "UnknownError",
						"failed",
						new Date(),
					],
				);

				queueLogger.info(
					{
						messageId,
						tenantId,
						errorType: error.name || "UnknownError",
						queueName: this.queueName,
					},
					"Message failure stored in database",
				);
			} finally {
				client.release();
			}
		} catch (storeError) {
			queueLogger.error(
				{
					error:
						storeError instanceof Error
							? storeError.message
							: String(storeError),
					originalError: error.message,
				},
				"Failed to store message failure in database",
			);
		}
	}

	/**
	 * Get current health status for monitoring
	 */
	getHealthStatus(): HealthStatus {
		let message = "";

		switch (this.state.status) {
			case "connected":
				message = "Connected and processing messages";
				break;
			case "connecting":
				message = "Establishing initial connection";
				break;
			case "reconnecting":
				message = `Connection lost, attempting reconnection (attempt ${this.state.reconnectAttempts}/${this.retryConfig.maxAttempts || "∞"})`;
				break;
			case "disconnected":
				message = "Disconnected - not attempting reconnection";
				break;
			case "circuit_open":
				message = "Circuit breaker open - too many consecutive failures";
				break;
		}

		return {
			status: this.state.status,
			lastConnectedAt: this.state.lastConnectedAt,
			reconnectAttempts: this.state.reconnectAttempts,
			consecutiveFailures: this.state.consecutiveFailures,
			message,
		};
	}

	async close(): Promise<void> {
		// Set shutdown flag to prevent reconnection attempts
		this.isShuttingDown = true;

		// Clear any pending retry timers
		if (this.state.currentRetryTimer) {
			clearTimeout(this.state.currentRetryTimer);
			this.state.currentRetryTimer = null;
		}

		queueLogger.info(
			{
				event: "rabbitmq_shutdown_initiated",
				state: this.state.status,
			},
			"RabbitMQ shutdown initiated",
		);

		try {
			if (this.channel) {
				await this.channel.close();
				queueLogger.info("RabbitMQ channel closed");
			}
			if (this.connection) {
				await this.connection.close();
				queueLogger.info("RabbitMQ connection closed");
			}

			this.state.status = "disconnected";

			queueLogger.info(
				{
					event: "rabbitmq_shutdown_complete",
				},
				"RabbitMQ shutdown complete",
			);
		} catch (error) {
			logError(queueLogger, error as Error, { operation: "rabbitmq-close" });
		}
	}

	async publishMessage(queueName: string, message: any): Promise<void> {
		const timer = new PerformanceTimer(queueLogger, "publish-message");
		try {
			if (!this.channel) {
				throw new Error("RabbitMQ channel not initialized");
			}

			await this.channel.assertQueue(queueName, { durable: true });

			const messageBuffer = Buffer.from(JSON.stringify(message));
			this.channel.sendToQueue(queueName, messageBuffer, {
				persistent: true,
			});

			timer.end({
				queueName,
				messageSize: messageBuffer.length,
				success: true,
			});
			queueLogger.info(
				{
					queueName,
					messageId: message.message_id,
					messageSize: messageBuffer.length,
				},
				"Message published to queue",
			);
		} catch (error) {
			timer.end({ success: false });
			logError(queueLogger, error as Error, {
				operation: "publish-message",
				queueName,
			});
			throw error;
		}
	}
}

// Singleton instance
let rabbitmqService: RabbitMQService | null = null;

export const getRabbitMQService = (): RabbitMQService => {
	if (!rabbitmqService) {
		rabbitmqService = new RabbitMQService();
	}
	return rabbitmqService;
};
