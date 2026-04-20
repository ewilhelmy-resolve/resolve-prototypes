import { AgenticService } from "../AgenticService.js";
import { getSSEService } from "../sse.js";
import { WebhookService } from "../WebhookService.js";
import { DirectMetaAgentStrategy } from "./DirectMetaAgentStrategy.js";
import type { MetaAgentStrategy } from "./types.js";
import { WorkflowMetaAgentStrategy } from "./WorkflowMetaAgentStrategy.js";

let strategyInstance: MetaAgentStrategy | null = null;

/**
 * Get the active meta-agent execution strategy.
 *
 * Strategy selected by META_AGENT_MODE env var:
 * - "direct" (default): Invokes meta-agent via LLM Service agentic API
 * - "workflow": Delegates to external platform via webhook + RabbitMQ + SSE
 */
export function getMetaAgentStrategy(): MetaAgentStrategy {
	if (!strategyInstance) {
		const mode = process.env.META_AGENT_MODE || "direct";

		if (mode === "workflow") {
			strategyInstance = new WorkflowMetaAgentStrategy(new WebhookService());
		} else {
			strategyInstance = new DirectMetaAgentStrategy(
				new AgenticService(),
				getSSEService(),
			);
		}
	}
	return strategyInstance;
}

/** Reset singleton (for tests) */
export function resetMetaAgentStrategy(): void {
	strategyInstance = null;
}

export {
	parseConversationStarterContent,
	parseInstructionsImproverContent,
} from "./parsers.js";
export type {
	MetaAgentCancelParams,
	MetaAgentExecuteParams,
	MetaAgentExecuteResult,
	MetaAgentStrategy,
} from "./types.js";
