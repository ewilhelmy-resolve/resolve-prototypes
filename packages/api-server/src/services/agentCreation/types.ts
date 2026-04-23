/**
 * Agent Creation Strategy Types
 *
 * Defines the strategy interface for agent creation, supporting two modes:
 * - Direct API: Invokes AgentRitaDeveloper via LLM Service agentic API (default)
 * - Workflow: Delegates to external platform via webhook + RabbitMQ (future)
 *
 * Toggle via AGENT_CREATION_MODE env var ("direct" | "workflow").
 */

// ============================================================================
// Strategy Parameters
// ============================================================================

export interface AgentGenerateParams {
	name: string;
	description: string;
	instructions: string;
	iconId: string;
	iconColorId: string;
	adminType?: string;
	conversationStarters?: string[];
	guardrails?: string[];
	/**
	 * When present, the meta-agent updates the referenced agent instead of
	 * creating a new one. Absent → create-mode (original behavior).
	 */
	targetAgentEid?: string;
	/**
	 * Free-form change request appended to the compiled prompt in update mode.
	 * Ignored when `targetAgentEid` is absent.
	 */
	updatePrompt?: string;
	/**
	 * True when RITA just created the agent shell directly via
	 * `POST /agents/metadata` and is handing it off to the meta-agent in
	 * UPDATE mode. Used by the strategy to (a) skip the post-create safety-net
	 * PUT and (b) roll back the shell via `DELETE /agents/metadata/eid/{eid}`
	 * if the meta-agent fails. False/absent for legacy CREATE and for
	 * user-initiated UPDATE of an already-existing agent.
	 */
	shellAlreadyCreated?: boolean;
	// Auth context
	userId: string;
	userEmail: string;
	organizationId: string;
}

export interface AgentCreationInputParams {
	creationId: string;
	prevExecutionId: string;
	prompt: string;
	/**
	 * Carried from the original create/update call so the meta-agent keeps
	 * the same mode across multi-turn clarifications.
	 */
	targetAgentEid?: string;
	userId: string;
	userEmail: string;
	organizationId: string;
}

export interface AgentCancelParams {
	creationId: string;
	userId: string;
	userEmail: string;
	organizationId: string;
}

// ============================================================================
// Strategy Results — always async
// ============================================================================

export interface AsyncCreationResult {
	mode: "async";
	creationId: string;
}

export type AgentCreationResult = AsyncCreationResult;

// ============================================================================
// Strategy Interface
// ============================================================================

export interface AgentCreationStrategy {
	createAgent(params: AgentGenerateParams): Promise<AgentCreationResult>;
	sendInput(params: AgentCreationInputParams): Promise<{ success: boolean }>;
	cancel(params: AgentCancelParams): Promise<{ success: boolean }>;
}
