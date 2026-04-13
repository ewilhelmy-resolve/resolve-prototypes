import type { Channel, ConsumeMessage } from "amqplib";
import { logError, PerformanceTimer, queueLogger } from "../config/logger.js";
import { getSSEService } from "../services/sse.js";
import type { AgentEventMessage } from "../types/agent-events.js";

/**
 * RabbitMQ Consumer for Agent Domain Events
 *
 * Consumes from `agent.events` queue with discriminated `type` field.
 * Handles:
 * - `agent_creation_progress`: Step updates during AI agent creation
 * - `agent_creation_input_required`: Agent needs user input
 * - `agent_creation_completed`: Agent created successfully
 * - `agent_creation_failed`: Agent creation failed
 *
 * @see docs/features/agents/agent-creation-workflow-integration.md section 4
 */
export class AgentEventsConsumer {
	private readonly queueName: string;

	constructor() {
		this.queueName = process.env.AGENT_EVENTS_QUEUE || "agent.events";
	}

	async startConsumer(channel: Channel): Promise<void> {
		queueLogger.info(
			{ queueName: this.queueName },
			"Starting Agent Events consumer...",
		);

		await channel.assertQueue(this.queueName, { durable: true });

		await channel.consume(
			this.queueName,
			async (message: ConsumeMessage | null) => {
				if (!message) return;

				const timer = new PerformanceTimer(queueLogger, "agent-events");
				try {
					const content: AgentEventMessage = JSON.parse(
						message.content.toString(),
					);

					queueLogger.info(
						{
							type: content.type,
							creationId: content.creation_id,
							tenantId: content.tenant_id,
						},
						"Received agent event message",
					);

					await this.processEvent(content);

					channel.ack(message);
					timer.end({ type: content.type, success: true });
				} catch (error) {
					timer.end({ success: false });
					logError(queueLogger, error as Error, {
						operation: "agent-events",
					});
					channel.nack(message, false, false);
				}
			},
		);

		queueLogger.info(
			{ queueName: this.queueName },
			"Agent Events consumer started successfully",
		);
	}

	private async processEvent(event: AgentEventMessage): Promise<void> {
		switch (event.type) {
			case "agent_creation_progress":
				await this.handleCreationProgress(event);
				break;
			case "agent_creation_input_required":
				await this.handleInputRequired(event);
				break;
			case "agent_creation_completed":
				await this.handleCreationCompleted(event);
				break;
			case "agent_creation_failed":
				await this.handleCreationFailed(event);
				break;
			default:
				queueLogger.error(
					{ type: (event as any).type },
					"Unknown agent event type",
				);
				throw new Error(`Unknown agent event type: ${(event as any).type}`);
		}
	}

	private async handleCreationProgress(
		event: AgentEventMessage & { type: "agent_creation_progress" },
	): Promise<void> {
		const sseService = getSSEService();
		sseService.sendToUser(event.user_id, event.tenant_id, {
			type: "agent_creation_progress",
			data: {
				creation_id: event.creation_id,
				step_type: event.step_type,
				step_label: event.step_label,
				step_detail: event.step_detail,
				step_index: event.step_index,
				total_steps: event.total_steps,
				final_response: event.final_response,
				timestamp: new Date().toISOString(),
			},
		});
	}

	private async handleInputRequired(
		event: AgentEventMessage & { type: "agent_creation_input_required" },
	): Promise<void> {
		const sseService = getSSEService();
		sseService.sendToUser(event.user_id, event.tenant_id, {
			type: "agent_creation_input_required",
			data: {
				creation_id: event.creation_id,
				execution_id: event.execution_id,
				message: event.message,
				need_inputs: event.need_inputs,
				timestamp: new Date().toISOString(),
			},
		});
	}

	private async handleCreationCompleted(
		event: AgentEventMessage & { type: "agent_creation_completed" },
	): Promise<void> {
		const sseService = getSSEService();
		sseService.sendToUser(event.user_id, event.tenant_id, {
			type: "agent_creation_completed",
			data: {
				creation_id: event.creation_id,
				agent_id: event.agent_id,
				agent_name: event.agent_name,
				timestamp: new Date().toISOString(),
			},
		});
	}

	private async handleCreationFailed(
		event: AgentEventMessage & { type: "agent_creation_failed" },
	): Promise<void> {
		const sseService = getSSEService();
		sseService.sendToUser(event.user_id, event.tenant_id, {
			type: "agent_creation_failed",
			data: {
				creation_id: event.creation_id,
				error: event.error_message || "Agent creation failed",
				timestamp: new Date().toISOString(),
			},
		});
	}
}
