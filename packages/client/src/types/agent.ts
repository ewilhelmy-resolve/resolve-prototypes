/**
 * Unified agent type definitions
 *
 * Single source of truth for all agent-related types used across:
 * - AgentBuilderPage (creation wizard)
 * - AgentTestPage (test & iterate)
 * - Agent components (cards, tables, modals, panels)
 */

// --- Core enums ---

export type AgentType = "answer" | "knowledge" | "workflow";

export type AgentState = "DRAFT" | "PUBLISHED" | "RETIRED" | "TESTING";

// --- Agent configuration ---

export interface AgentCapabilities {
	webSearch: boolean;
	imageGeneration: boolean;
	useAllWorkspaceContent: boolean;
}

/**
 * Full agent configuration used by the builder.
 * Other pages use subsets of this via Pick/Partial.
 */
export interface AgentConfig {
	id?: string;
	name: string;
	description: string;
	instructions: string;
	role: string;
	iconId: string;
	iconColorId: string;
	agentType: AgentType | null;
	adminType?: string;
	state?: AgentState;
	conversationStarters: string[];
	knowledgeSources: string[];
	tools: string[];
	skills?: string[];
	guardrails: string[];
	// Builder-specific fields
	responsibilities?: string;
	completionCriteria?: string;
	hasRequiredConnections?: boolean;
	capabilities: AgentCapabilities;
}

/**
 * Agent row for the agents table/list.
 */
export interface AgentTableRow {
	id: string;
	name: string;
	description: string;
	state: AgentState;
	skills?: string[];
	updatedBy: string | null;
	owner: string | null;
	lastUpdated: string;
}

// --- Message types ---

export interface TestMessage {
	id: string;
	type:
		| "user"
		| "agent"
		| "agent-retry"
		| "system"
		| "user-feedback"
		| "suggestion";
	content: string;
	sourcesUsed?: { type: "knowledge" | "workflow"; name: string }[];
	iterationNumber?: number;
	suggestion?: ConfigSuggestion;
}

export interface ConfigSuggestion {
	message: string;
	updateType: "instructions";
	updateValue: string;
	applied?: boolean;
}

// --- Builder-specific types ---

export type ConversationStep =
	| "start"
	| "intent"
	| "role"
	| "responsibilities"
	| "completion"
	| "select_type"
	| "confirm_type"
	| "trigger_phrases"
	| "guardrails"
	| "select_sources"
	| "confirm"
	| "knowledge_sources"
	| "done";

export interface BuilderMessage {
	id: string;
	role: "assistant" | "user";
	content: string;
}

// --- Debug trace types (test mode) ---

export type DebugStepStatus = "pending" | "running" | "success" | "error";

export interface DebugTraceStep {
	id: string;
	type: "trigger" | "intent" | "knowledge" | "skill" | "guardrail" | "response";
	label: string;
	description: string;
	status: DebugStepStatus;
	duration?: number;
	input?: Record<string, unknown>;
	output?: Record<string, unknown>;
	error?: string;
}

// --- Template types ---

export interface AgentTemplate {
	id: string;
	name: string;
	description: string;
	creator: string;
	creatorIcon?: string;
	prompt: string;
	category: string;
	domain: string;
	skills: string[];
	iconId: string;
	iconBg: string;
	iconColor?: string;
}

// --- Impact types (deletion) ---

export interface AgentImpact {
	skills?: number;
	conversationStarters?: number;
	usersThisWeek?: number;
	linkedWorkflows?: string[];
}

// --- Test panel types ---

export interface AgentTestPanelConfig {
	name: string;
	description: string;
	instructions: string;
	role: string;
	iconId: string;
	iconColorId: string;
	agentType: AgentType | null;
	conversationStarters: string[];
	knowledgeSources: string[];
	tools: string[];
	guardrails: string[];
}
