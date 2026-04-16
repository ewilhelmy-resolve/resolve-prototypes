import crypto from "node:crypto";
import { logger } from "../../config/logger.js";
import type { WebhookService } from "../WebhookService.js";
import { buildAgentPrompt } from "./buildPrompt.js";
import type {
	AgentCancelParams,
	AgentCreationInputParams,
	AgentCreationStrategy,
	AgentGenerateParams,
	AsyncCreationResult,
} from "./types.js";

/**
 * Workflow Strategy (placeholder)
 *
 * Delegates agent creation to the external platform via webhook.
 * The platform invokes the agent-builder AI agent, which creates
 * the agent in the LLM Service. Progress is reported via RabbitMQ → SSE.
 *
 * Used when AGENT_CREATION_MODE=workflow.
 *
 * @see docs/features/agents/agent-creation-workflow-integration.md
 */
export class WorkflowStrategy implements AgentCreationStrategy {
	constructor(private readonly webhookService: WebhookService) {}

	async createAgent(params: AgentGenerateParams): Promise<AsyncCreationResult> {
		const creationId = crypto.randomUUID();

		const prompt = buildAgentPrompt(params);

		logger.info(
			{ creationId, name: params.name, userId: params.userId },
			"Creating agent via workflow webhook",
		);

		await this.webhookService.sendGenericEvent({
			organizationId: params.organizationId,
			userId: params.userId,
			userEmail: params.userEmail,
			source: "rita-chat",
			action: "create_agent",
			additionalData: {
				creation_id: creationId,
				prompt,
				icon_id: params.iconId,
				icon_color_id: params.iconColorId,
				conversation_starters: params.conversationStarters || [],
				guardrails: params.guardrails || [],
			},
		});

		return { mode: "async", creationId };
	}

	async sendInput(
		params: AgentCreationInputParams,
	): Promise<{ success: boolean }> {
		logger.info(
			{ creationId: params.creationId, userId: params.userId },
			"Sending agent creation input via webhook",
		);

		await this.webhookService.sendGenericEvent({
			organizationId: params.organizationId,
			userId: params.userId,
			userEmail: params.userEmail,
			source: "rita-chat",
			action: "agent_creation_input",
			additionalData: {
				creation_id: params.creationId,
				prev_execution_id: params.prevExecutionId,
				prompt: params.prompt,
			},
		});

		return { success: true };
	}

	async cancel(params: AgentCancelParams): Promise<{ success: boolean }> {
		logger.info(
			{ creationId: params.creationId, userId: params.userId },
			"Cancelling agent creation via webhook",
		);

		await this.webhookService.sendGenericEvent({
			organizationId: params.organizationId,
			userId: params.userId,
			userEmail: params.userEmail,
			source: "rita-chat",
			action: "cancel_agent_creation",
			additionalData: {
				creation_id: params.creationId,
			},
		});

		return { success: true };
	}
}
