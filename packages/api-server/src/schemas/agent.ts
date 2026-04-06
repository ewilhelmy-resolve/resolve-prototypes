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
			.object({
				initials: z.string(),
				color: z.string(),
			})
			.nullable()
			.openapi({ description: "Last updated by" }),
		owner: z
			.object({
				initials: z.string(),
				color: z.string(),
			})
			.nullable()
			.openapi({ description: "Agent owner" }),
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

export const AgentDeleteResponseSchema = z
	.object({
		success: z.boolean(),
		message: z.string(),
	})
	.openapi("AgentDeleteResponse");
