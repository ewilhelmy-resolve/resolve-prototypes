import type { Channel, ConsumeMessage } from "amqplib";
import { logError, PerformanceTimer, queueLogger } from "../config/logger.js";
import { getSSEService } from "../services/sse.js";
import type { ClusterEventMessage } from "../types/cluster.js";

/**
 * RabbitMQ Consumer for Cluster Domain Events
 *
 * Consumes from `cluster.events` queue with discriminated `type` field.
 * Currently handles:
 * - `knowledge_generated`: AI-generated knowledge article from external platform
 *
 * Future event types can be added by extending the ClusterEventMessage union.
 */
export class ClusterEventsConsumer {
	private readonly queueName: string;

	constructor() {
		this.queueName = process.env.CLUSTER_EVENTS_QUEUE || "cluster.events";
	}

	async startConsumer(channel: Channel): Promise<void> {
		queueLogger.info(
			{ queueName: this.queueName },
			"Starting Cluster Events consumer...",
		);

		await channel.assertQueue(this.queueName, { durable: true });

		await channel.consume(
			this.queueName,
			async (message: ConsumeMessage | null) => {
				if (!message) return;

				const timer = new PerformanceTimer(queueLogger, "cluster-events");
				try {
					const content: ClusterEventMessage = JSON.parse(
						message.content.toString(),
					);

					queueLogger.info(
						{
							type: content.type,
							clusterId: content.cluster_id,
							tenantId: content.tenant_id,
						},
						"Received cluster event message",
					);

					await this.processEvent(content);

					channel.ack(message);
					timer.end({ type: content.type, success: true });
				} catch (error) {
					timer.end({ success: false });
					logError(queueLogger, error as Error, {
						operation: "cluster-events",
					});
					channel.nack(message, false, false);
				}
			},
		);

		queueLogger.info(
			{ queueName: this.queueName },
			"Cluster Events consumer started successfully",
		);
	}

	private async processEvent(event: ClusterEventMessage): Promise<void> {
		switch (event.type) {
			case "knowledge_generated":
				await this.handleKnowledgeGenerated(event);
				break;
			default:
				queueLogger.error(
					{ type: (event as any).type },
					"Unknown cluster event type",
				);
				throw new Error(`Unknown cluster event type: ${(event as any).type}`);
		}
	}

	private async handleKnowledgeGenerated(
		event: ClusterEventMessage & { type: "knowledge_generated" },
	): Promise<void> {
		const { tenant_id, user_id, cluster_id, generation_id, status } = event;

		if (!generation_id || !tenant_id || !user_id || !cluster_id) {
			throw new Error(
				"Invalid knowledge_generated payload: missing required fields",
			);
		}

		const messageLogger = queueLogger.child({
			generationId: generation_id,
			clusterId: cluster_id,
			tenantId: tenant_id,
			status,
		});

		try {
			const sseService = getSSEService();

			if (status === "success") {
				messageLogger.info("Knowledge article generated successfully");
				sseService.sendToUser(user_id, tenant_id, {
					type: "cluster_knowledge_generated",
					data: {
						generation_id,
						cluster_id,
						content: event.content,
						filename: event.filename,
						format: event.format,
						timestamp: new Date().toISOString(),
					},
				});
			} else {
				messageLogger.warn(
					{ errorMessage: event.error_message },
					"Knowledge article generation failed",
				);
				sseService.sendToUser(user_id, tenant_id, {
					type: "cluster_knowledge_generated",
					data: {
						generation_id,
						cluster_id,
						error: event.error_message || "Generation failed",
						timestamp: new Date().toISOString(),
					},
				});
			}

			messageLogger.info(
				{ eventType: "cluster_knowledge_generated" },
				"SSE event sent",
			);
		} catch (sseError) {
			messageLogger.warn(
				{
					error:
						sseError instanceof Error ? sseError.message : String(sseError),
				},
				"Failed to send SSE event",
			);
		}
	}
}
