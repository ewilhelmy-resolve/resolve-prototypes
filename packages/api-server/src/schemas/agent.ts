import { z } from "../docs/openapi.js";

// ============================================================================
// Agent Schemas (for LLM Service proxy)
// ============================================================================

export const AgentListQuerySchema = z
	.object({
		name: z.string().optional().openapi({ description: "Filter by name" }),
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
		ownerEmail: z
			.string()
			.nullable()
			.openapi({ description: "Raw sys_created_by value for owner filtering" }),
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
		description: z.string().optional().default("").openapi({
			description: "Agent description",
		}),
		instructions: z.string().optional().default("").openapi({
			description: "Agent instructions / prompt (maps to markdown_text)",
		}),
		status: z
			.enum(["published", "draft"])
			.optional()
			.default("draft")
			.openapi({ description: "Agent status" }),
		role: z.string().optional().default(""),
		agentType: z
			.enum(["answer", "knowledge", "workflow"])
			.nullable()
			.optional()
			.default(null),
		iconId: z.string().optional().default("bot"),
		iconColorId: z.string().optional().default("slate"),
		conversationStarters: z.array(z.string()).optional().default([]),
		knowledgeSources: z.array(z.string()).optional().default([]),
		workflows: z.array(z.string()).optional().default([]),
		guardrails: z.array(z.string()).optional().default([]),
		responsibilities: z.string().optional(),
		completionCriteria: z.string().optional(),
		capabilities: AgentCapabilitiesSchema.optional(),
	})
	.openapi("AgentCreateBody");

export const AgentUpdateBodySchema =
	AgentCreateBodySchema.partial().openapi("AgentUpdateBody");

export const AgentDetailResponseSchema = z
	.object({
		id: z.string().openapi({ description: "Agent EID" }),
		name: z.string(),
		description: z.string(),
		instructions: z.string(),
		status: z.enum(["published", "draft"]),
		role: z.string(),
		agentType: z.enum(["answer", "knowledge", "workflow"]).nullable(),
		iconId: z.string(),
		iconColorId: z.string(),
		conversationStarters: z.array(z.string()),
		knowledgeSources: z.array(z.string()),
		workflows: z.array(z.string()),
		skills: z.array(z.string()).optional(),
		guardrails: z.array(z.string()),
		responsibilities: z.string().optional(),
		completionCriteria: z.string().optional(),
		capabilities: AgentCapabilitiesSchema,
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
