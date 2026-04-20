import { AgenticService } from "../AgenticService.js";
import { getSSEService } from "../sse.js";
import { WebhookService } from "../WebhookService.js";
import { DirectApiStrategy } from "./DirectApiStrategy.js";
import type { AgentCreationStrategy } from "./types.js";
import { WorkflowStrategy } from "./WorkflowStrategy.js";

let strategyInstance: AgentCreationStrategy | null = null;

/**
 * Get the active agent creation strategy.
 *
 * Strategy selected by AGENT_CREATION_MODE env var:
 * - "direct" (default): Invokes AgentRitaDeveloper via LLM Service agentic API
 * - "workflow": Delegates to external platform via webhook + RabbitMQ + SSE
 */
export function getAgentCreationStrategy(): AgentCreationStrategy {
	if (!strategyInstance) {
		const mode = process.env.AGENT_CREATION_MODE || "direct";

		if (mode === "workflow") {
			strategyInstance = new WorkflowStrategy(new WebhookService());
		} else {
			strategyInstance = new DirectApiStrategy(
				new AgenticService(),
				getSSEService(),
			);
		}
	}
	return strategyInstance;
}

/** Reset singleton (for tests) */
export function resetAgentCreationStrategy(): void {
	strategyInstance = null;
}

export { agentConfigToApiData, apiDataToAgentConfig } from "./mappers.js";
export type {
	AgentCancelParams,
	AgentCreationInputParams,
	AgentCreationResult,
	AgentCreationStrategy,
	AgentGenerateParams,
} from "./types.js";
