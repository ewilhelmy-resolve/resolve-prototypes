/**
 * Agent Creation Strategy Types
 *
 * Defines the strategy interface for agent creation, supporting two modes:
 * - Direct API: Invokes agent-builder agent via LLM Service agentic API (default)
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
	conversationStarters?: string[];
	guardrails?: string[];
	// Auth context
	userId: string;
	userEmail: string;
	organizationId: string;
}

export interface AgentCreationInputParams {
	creationId: string;
	prevExecutionId: string;
	prompt: string;
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
