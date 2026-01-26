import { type Channel, connect } from "amqplib";
import { logError, PerformanceTimer, rabbitLogger } from "../config/logger.js";

// Connection state types
type ConnectionStatus =
	| "disconnected"
	| "connecting"
	| "connected"
	| "reconnecting";

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
	private connection: Awaited<ReturnType<typeof connect>> | null = null;
	private channel: Channel | null = null;
	private readonly rabbitUrl: string;
	private readonly defaultQueueName: string;

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
		this.rabbitUrl =
			process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
		this.defaultQueueName = process.env.QUEUE_NAME || "chat.responses";

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

		rabbitLogger.info(
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
			rabbitLogger.error(
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
			rabbitLogger.warn(
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
			rabbitLogger.warn(
				{
					event: "rabbitmq_connection_blocked",
					reason,
				},
				"RabbitMQ connection blocked - server is low on resources",
			);
		});

		this.connection.on("unblocked", () => {
			rabbitLogger.info(
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

		rabbitLogger.warn(
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
			rabbitLogger.error(
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

		rabbitLogger.info(
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

			rabbitLogger.info(
				{
					event: "rabbitmq_reconnect_attempt",
					attempt: this.state.reconnectAttempts,
					maxAttempts: this.retryConfig.maxAttempts || "infinite",
				},
				"Attempting RabbitMQ reconnection",
			);

			try {
				await this.connect();

				// Reconnection successful
				if (this.state.status === "connected") {
					rabbitLogger.info(
						{
							event: "rabbitmq_reconnect_success",
							attempt: this.state.reconnectAttempts,
							downtimeMs: this.state.lastErrorAt
								? Date.now() - this.state.lastErrorAt.getTime()
								: 0,
						},
						"RabbitMQ reconnection successful",
					);
				}
			} catch (error) {
				rabbitLogger.warn(
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
		const timer = new PerformanceTimer(rabbitLogger, "rabbitmq-connect");

		// Update state to connecting
		const wasReconnecting = this.state.status === "reconnecting";
		this.state.status = "connecting";

		try {
			rabbitLogger.info(
				{
					event: "rabbitmq_connecting",
					url: this.rabbitUrl.replace(/\/\/.*:.*@/, "//***:***@"), // Hide credentials in logs
					attempt: wasReconnecting ? this.state.reconnectAttempts : 1,
				},
				"Connecting to RabbitMQ",
			);

			this.connection = await connect(this.rabbitUrl);
			this.channel = await this.connection.createChannel();

			// Setup event listeners for automatic reconnection
			this.setupEventListeners();

			// Assert default queue exists
			await this.channel.assertQueue(this.defaultQueueName, {
				durable: true,
			});

			// Update state to connected
			this.state.status = "connected";
			this.state.lastConnectedAt = new Date();
			this.state.consecutiveFailures = 0;
			this.state.reconnectAttempts = 0;

			timer.end({
				queueName: this.defaultQueueName,
				success: true,
				wasReconnecting,
			});

			rabbitLogger.info(
				{
					event: "rabbitmq_connected",
					queueName: this.defaultQueueName,
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

			rabbitLogger.error(
				{
					event: "rabbitmq_connection_failed",
					error: (error as Error).message,
					errorCode: (error as any).code,
					attempt: wasReconnecting ? this.state.reconnectAttempts : 1,
					consecutiveFailures: this.state.consecutiveFailures,
				},
				"RabbitMQ connection failed",
			);

			logError(rabbitLogger, error as Error, { operation: "rabbitmq-connect" });
			throw error;
		}
	}

	/**
	 * Publish a message to a queue
	 */
	async publishToQueue(queueName: string, message: any): Promise<void> {
		const timer = new PerformanceTimer(rabbitLogger, "publish-to-queue");

		try {
			if (!this.channel) {
				throw new Error("RabbitMQ channel not initialized");
			}

			// Assert queue exists
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

			rabbitLogger.info(
				{
					queueName,
					messageSize: messageBuffer.length,
				},
				"Published message to queue",
			);
		} catch (error) {
			timer.end({ success: false });
			logError(rabbitLogger, error as Error, {
				operation: "publish-to-queue",
				queueName,
			});
			throw error;
		}
	}

	/**
	 * Get current health status for monitoring/debugging
	 */
	getHealthStatus(): HealthStatus {
		let message = "";

		switch (this.state.status) {
			case "connected":
				message = "Connected and ready to publish messages";
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
		}

		return {
			status: this.state.status,
			lastConnectedAt: this.state.lastConnectedAt,
			reconnectAttempts: this.state.reconnectAttempts,
			consecutiveFailures: this.state.consecutiveFailures,
			message,
		};
	}

	/**
	 * Get the channel for direct access (needed for some existing code patterns)
	 */
	getChannel(): Channel | null {
		return this.channel;
	}

	async close(): Promise<void> {
		// Set shutdown flag to prevent reconnection attempts
		this.isShuttingDown = true;

		// Clear any pending retry timers
		if (this.state.currentRetryTimer) {
			clearTimeout(this.state.currentRetryTimer);
			this.state.currentRetryTimer = null;
		}

		rabbitLogger.info(
			{
				event: "rabbitmq_shutdown_initiated",
				state: this.state.status,
			},
			"RabbitMQ shutdown initiated",
		);

		try {
			if (this.channel) {
				await this.channel.close();
				rabbitLogger.info("RabbitMQ channel closed");
			}
			if (this.connection) {
				await this.connection.close();
				rabbitLogger.info("RabbitMQ connection closed");
			}

			this.state.status = "disconnected";

			rabbitLogger.info(
				{
					event: "rabbitmq_shutdown_complete",
				},
				"RabbitMQ shutdown complete",
			);
		} catch (error) {
			logError(rabbitLogger, error as Error, { operation: "rabbitmq-close" });
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
