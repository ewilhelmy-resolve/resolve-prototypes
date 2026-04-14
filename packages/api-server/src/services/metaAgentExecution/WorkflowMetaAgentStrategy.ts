import crypto from "node:crypto";
import { logger } from "../../config/logger.js";
import type { WebhookService } from "../WebhookService.js";
import type {
	MetaAgentCancelParams,
	MetaAgentExecuteParams,
	MetaAgentExecuteResult,
	MetaAgentStrategy,
} from "./types.js";

/**
 * Workflow Meta-Agent Strategy (Phase 2 — placeholder)
 *
 * Delegates meta-agent execution to the external platform via webhook.
 * The platform invokes the LLM Service, publishes results to RabbitMQ,
 * and RITA consumes them via AgentEventsConsumer → SSE.
 *
 * Used when META_AGENT_MODE=workflow.
 *
 * Webhook contract:
 *   action: "run_meta_agent"
 *   payload: { agent_name, utterance, additional_information, transcript }
 *
 * See docs/features/agents/meta-agent-workflow-pattern.md for full spec.
 */
export class WorkflowMetaAgentStrategy implements MetaAgentStrategy {
	readonly webhookService: WebhookService;

	constructor(webhookService: WebhookService) {
		this.webhookService = webhookService;
	}

	async execute(
		params: MetaAgentExecuteParams,
	): Promise<MetaAgentExecuteResult> {
		const executionRequestId = crypto.randomUUID();

		logger.info(
			{
				executionRequestId,
				agentName: params.agentName,
				userId: params.userId,
			},
			"Executing meta-agent via workflow webhook",
		);

		// TODO: Phase 2 — send webhook to external platform
		// await this.webhookService.sendEventToUrl({
		// 	organizationId: params.organizationId,
		// 	userId: params.userId,
		// 	userEmail: params.userEmail,
		// 	source: "rita-chat",
		// 	action: "run_meta_agent",
		// 	execution_request_id: executionRequestId,
		// 	agent_name: params.agentName,
		// 	utterance: params.utterance,
		// 	additional_information: params.additionalInformation || "",
		// 	transcript: params.transcript || "[]",
		// });

		throw new Error(
			"Workflow mode for meta-agent execution is not yet implemented. Set META_AGENT_MODE=direct.",
		);
	}

	async cancel(params: MetaAgentCancelParams): Promise<{ success: boolean }> {
		logger.info(
			{ executionRequestId: params.executionRequestId },
			"Cancelling meta-agent via workflow webhook",
		);

		// TODO: Phase 2 — send cancel webhook
		// await this.webhookService.sendEventToUrl({
		// 	organizationId: params.organizationId,
		// 	userId: params.userId,
		// 	userEmail: params.userEmail,
		// 	source: "rita-chat",
		// 	action: "meta_agent_cancel",
		// 	execution_request_id: params.executionRequestId,
		// });

		throw new Error(
			"Workflow mode for meta-agent execution is not yet implemented. Set META_AGENT_MODE=direct.",
		);
	}
}
