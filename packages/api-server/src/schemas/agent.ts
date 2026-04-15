import { z } from "../docs/openapi.js";

// ============================================================================
// Agent Schemas (for LLM Service proxy)
// ============================================================================

export const AgentListQuerySchema = z
	.object({
		name: z.string().optional().openapi({ description: "Filter by name" }),
		search: z.string().optional().openapi({
			description:
				"Search agents by name or description (server-side OR filter)",
		}),
		active: z
			.enum(["true", "false"])
			.optional()
			.openapi({ description: "Filter by active status" }),
		limit: z.coerce
			.number()
			.int()
			.min(1)
			.max(200)
			.default(50)
			.openapi({ description: "Maximum results to return" }),
		offset: z.coerce
			.number()
			.int()
			.min(0)
			.default(0)
			.openapi({ description: "Number of results to skip" }),
	})
	.openapi("AgentListQuery");

export const AgentTableRowSchema = z
	.object({
		id: z.string().openapi({ description: "Agent EID" }),
		name: z.string().openapi({ description: "Agent name" }),
		description: z.string().openapi({ description: "Agent description" }),
		status: z
			.enum(["published", "draft"])
			.openapi({ description: "Agent status" }),
		skills: z
			.array(z.string())
			.optional()
			.openapi({ description: "Tool names from agent tasks" }),
		updatedBy: z
			.string()
			.nullable()
			.openapi({ description: "Last updated by (email or identifier)" }),
		owner: z
			.string()
			.nullable()
			.openapi({ description: "Agent owner (email or identifier)" }),
		lastUpdated: z.string().openapi({ description: "Last updated timestamp" }),
	})
	.openapi("AgentTableRow");

export const AgentListResponseSchema = z
	.object({
		agents: z.array(AgentTableRowSchema),
		limit: z.number(),
		offset: z.number(),
		hasMore: z.boolean(),
	})
	.openapi("AgentListResponse");

// --- Agent Create/Update/Detail Schemas ---

const AgentCapabilitiesSchema = z
	.object({
		webSearch: z.boolean().optional().default(true),
		imageGeneration: z.boolean().optional().default(false),
		useAllWorkspaceContent: z.boolean().optional().default(false),
	})
	.openapi("AgentCapabilities");

export const AgentCreateBodySchema = z
	.object({
		name: z.string().min(1).openapi({ description: "Agent name (required)" }),
		status: z
			.enum(["published", "draft"])
			.optional()
			.default("draft")
			.openapi({ description: "Agent status" }),
		iconId: z.string().optional().default("bot"),
		iconColorId: z.string().optional().default("slate"),
	})
	.openapi("AgentCreateBody");

export const AgentUpdateBodySchema =
	AgentCreateBodySchema.partial().openapi("AgentUpdateBody");

export const AgentDetailResponseSchema = z
	.object({
		id: z.string().openapi({ description: "Agent EID" }),
		name: z.string(),
		status: z.enum(["published", "draft"]),
		iconId: z.string(),
		iconColorId: z.string(),
		// Local-only fields — returned with defaults for backward compat
		description: z.string().optional().default(""),
		instructions: z.string().optional().default(""),
		role: z.string().optional().default(""),
		agentType: z
			.enum(["answer", "knowledge", "workflow"])
			.nullable()
			.optional()
			.default(null),
		conversationStarters: z.array(z.string()).optional().default([]),
		knowledgeSources: z.array(z.string()).optional().default([]),
		workflows: z.array(z.string()).optional().default([]),
		skills: z.array(z.string()).optional(),
		guardrails: z.array(z.string()).optional().default([]),
		responsibilities: z.string().optional(),
		completionCriteria: z.string().optional(),
		capabilities: AgentCapabilitiesSchema.optional(),
		createdAt: z.string().optional(),
		updatedAt: z.string().optional(),
	})
	.openapi("AgentDetailResponse");

export const AgentCheckNameQuerySchema = z
	.object({
		name: z
			.string()
			.min(1)
			.openapi({ description: "Agent name to check availability" }),
	})
	.openapi("AgentCheckNameQuery");

export const AgentCheckNameResponseSchema = z
	.object({
		available: z
			.boolean()
			.openapi({ description: "Whether the name is available" }),
	})
	.openapi("AgentCheckNameResponse");

export const AgentDeleteResponseSchema = z
	.object({
		success: z.boolean(),
		message: z.string(),
	})
	.openapi("AgentDeleteResponse");

// --- Agent Generation (Create with AI) Schemas ---

export const AgentGenerateBodySchema = z
	.object({
		name: z.string().min(1).openapi({ description: "Agent name (required)" }),
		description: z.string().optional().default(""),
		instructions: z.string().optional().default(""),
		iconId: z.string().optional().default("bot"),
		iconColorId: z.string().optional().default("slate"),
		conversationStarters: z.array(z.string()).optional().default([]),
		guardrails: z.array(z.string()).optional().default([]),
	})
	.openapi("AgentGenerateBody");

export const AgentCreationInputBodySchema = z
	.object({
		creationId: z
			.string()
			.uuid()
			.openapi({ description: "Correlation ID from generate response" }),
		prevExecutionId: z
			.string()
			.openapi({ description: "Execution ID from input_required event" }),
		prompt: z
			.string()
			.min(1)
			.openapi({ description: "User's response to agent's question" }),
	})
	.openapi("AgentCreationInputBody");

export const AgentCancelCreationBodySchema = z
	.object({
		creationId: z
			.string()
			.uuid()
			.openapi({ description: "Correlation ID of creation to cancel" }),
	})
	.openapi("AgentCancelCreationBody");

// --- Meta-Agent: Improve Instructions Schemas ---

const AgentConfigForImprovementSchema = z
	.object({
		name: z.string().optional().default(""),
		role: z.string().optional().default(""),
		description: z.string().optional().default(""),
		agentType: z
			.enum(["answer", "knowledge", "workflow"])
			.nullable()
			.optional()
			.default(null),
		guardrails: z.array(z.string()).optional().default([]),
		conversationStarters: z.array(z.string()).optional().default([]),
		workflows: z.array(z.string()).optional().default([]),
		knowledgeSources: z.array(z.string()).optional().default([]),
		capabilities: z
			.object({
				webSearch: z.boolean().optional().default(true),
				imageGeneration: z.boolean().optional().default(false),
			})
			.optional(),
		responsibilities: z.string().optional().default(""),
		completionCriteria: z.string().optional().default(""),
	})
	.openapi("AgentConfigForImprovement");

export const ImproveInstructionsBodySchema = z
	.object({
		instructions: z.string().min(1).openapi({
			description: "Current agent instructions to improve (maps to utterance)",
		}),
		agentConfig: AgentConfigForImprovementSchema.openapi({
			description:
				"Agent configuration context (maps to additional_information)",
		}),
	})
	.openapi("ImproveInstructionsBody");

// --- Meta-Agent: Generate Conversation Starters Schemas ---

const AgentConfigForStarterGenerationSchema =
	AgentConfigForImprovementSchema.extend({
		instructions: z.string().optional().default(""),
	}).openapi("AgentConfigForStarterGeneration");

export const GenerateConversationStartersBodySchema = z
	.object({
		agentConfig: AgentConfigForStarterGenerationSchema.openapi({
			description:
				"Agent configuration context for generating conversation starters",
		}),
	})
	.openapi("GenerateConversationStartersBody");

export const CancelMetaAgentBodySchema = z
	.object({
		executionRequestId: z.string().uuid().openapi({
			description: "Execution request ID to cancel",
		}),
	})
	.openapi("CancelMetaAgentBody");

// --- Agent Test Execution Schemas ---

export const AgentExecuteBodySchema = z
	.object({
		message: z
			.string()
			.min(1)
			.openapi({ description: "User message to send to the agent" }),
		transcript: z.string().optional().openapi({
			description:
				"Conversation history as JSON array of {role, content} objects",
		}),
	})
	.openapi("AgentExecuteBody");
