/**
 * Meta-Agent Execution Strategy Types
 *
 * Defines the strategy interface for running any meta-agent from the catalog
 * (AgentInstructionsImprover, ConversationStarterGenerator, etc.).
 *
 * All meta-agents share the same 3-param contract:
 *   utterance, additional_information, transcript
 * and return the Standard Response Format:
 *   { role, content, need_inputs, success, terminate, error_message }
 *
 * Toggle via META_AGENT_MODE env var ("direct" | "workflow").
 */

// ============================================================================
// Strategy Parameters
// ============================================================================

export interface MetaAgentExecuteParams {
	/** Meta-agent name in the LLM Service (e.g. "AgentInstructionsImprover") */
	agentName: string;
	/** Maps to the {%utterance} parameter */
	utterance: string;
	/** Maps to the {%additional_information} parameter (JSON string) */
	additionalInformation?: string;
	/** Maps to the {%transcript} parameter (JSON string, typically "[]") */
	transcript?: string;
	// Auth context
	userId: string;
	userEmail: string;
	organizationId: string;
}

export interface MetaAgentCancelParams {
	executionRequestId: string;
	userId: string;
	userEmail: string;
	organizationId: string;
}

// ============================================================================
// Strategy Results
// ============================================================================

export interface MetaAgentExecuteResult {
	/** Correlation ID for SSE events */
	executionRequestId: string;
}

// ============================================================================
// Strategy Interface
// ============================================================================

export interface MetaAgentStrategy {
	execute(params: MetaAgentExecuteParams): Promise<MetaAgentExecuteResult>;
	cancel(params: MetaAgentCancelParams): Promise<{ success: boolean }>;
}
