/**
 * Pro Agent Builder Types
 * Types for MCP skills, agents, workflows, and dashboard
 */

/**
 * Variable types supported by MCP skills
 */
export type MCPVariableType =
	| "string"
	| "number"
	| "boolean"
	| "object"
	| "array";

/**
 * Variable definition for an MCP skill
 */
export interface MCPVariable {
	name: string;
	type: MCPVariableType;
	required: boolean;
	description?: string;
	defaultValue?: string;
}

/**
 * Authentication types for MCP skill endpoints
 */
export type MCPAuthType = "none" | "bearer" | "api_key";

/**
 * Authentication methods for dynamic MCP endpoints
 */
export type MCPAuthMethod = "none" | "oauth" | "basic" | "bearer" | "api_key";

/**
 * MCP skill configuration
 */
export interface MCPSkill {
	id: string;
	name: string;
	description: string;
	endpoint: string;
	authType: MCPAuthType;
	variables: MCPVariable[];
	createdAt: string;
	updatedAt: string;
}

/**
 * Agent lifecycle status
 */
export type ProAgentStatus = "draft" | "active" | "disabled";

/**
 * Snapshot of agent config at a point in time
 */
export interface ProAgentVersion {
	version: number;
	name: string;
	description: string;
	endpointSlug: string;
	runbookId: string | null;
	authMethod: MCPAuthMethod;
	skillIds: string[];
	status: ProAgentStatus;
	createdAt: string;
	updatedAt: string;
}

/**
 * Pro agent configuration
 */
export interface ProAgent {
	id: string;
	name: string;
	description: string;
	endpointSlug: string;
	runbookId: string | null;
	authMethod: MCPAuthMethod;
	skillIds: string[];
	status: ProAgentStatus;
	apiKey?: string;
	versions: ProAgentVersion[];
	activeVersion: number;
	createdAt: string;
	updatedAt: string;
}

/**
 * Workflow reference for agent assignment
 */
export interface ProRunbook {
	id: string;
	name: string;
	description: string;
}

/**
 * Dashboard summary statistics
 */
export interface ProDashboardStats {
	totalAgents: number;
	totalSkills: number;
	activeAgents: number;
	totalApiCalls: number;
}
