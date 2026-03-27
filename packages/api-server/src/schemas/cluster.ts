import { z } from "../docs/openapi.js";
import { OffsetPaginationInfoSchema } from "./common.js";

// ============================================================================
// Enums and Config
// ============================================================================

export const KBStatusSchema = z
	.enum(["PENDING", "FOUND", "GAP"])
	.openapi("KBStatus", { description: "Knowledge base status for cluster" });

export const RitaStatusSchema = z
	.enum(["NEEDS_RESPONSE", "COMPLETED"])
	.openapi("RitaStatus", { description: "Rita processing status for tickets" });

export const ClusterConfigSchema = z
	.object({
		auto_respond: z
			.boolean()
			.optional()
			.openapi({ description: "Auto-respond enabled" }),
		auto_populate: z
			.boolean()
			.optional()
			.openapi({ description: "Auto-populate KB enabled" }),
	})
	.openapi("ClusterConfig");

// ============================================================================
// Query Schemas
// ============================================================================

export const ClusterListQuerySchema = z
	.object({
		sort: z
			.enum(["volume", "automation", "recent"])
			.optional()
			.openapi({ description: "Sort order", default: "recent" }),
		period: z
			.enum(["last30", "last90", "last6months", "lastyear"])
			.optional()
			.openapi({ description: "Time period filter for ticket counts" }),
		limit: z.coerce
			.number()
			.int()
			.min(1)
			.max(100)
			.optional()
			.openapi({ description: "Results per page", default: 25 }),
		offset: z.coerce
			.number()
			.int()
			.min(0)
			.optional()
			.openapi({ description: "Pagination offset", default: 0 }),
		kb_status: KBStatusSchema.optional().openapi({
			description: "Filter by knowledge base status",
		}),
		search: z
			.string()
			.optional()
			.openapi({ description: "Search in cluster name and subcluster name" }),
	})
	.openapi("ClusterListQuery");

export const ClusterTicketsQuerySchema = z
	.object({
		tab: z
			.enum(["needs_response", "completed"])
			.optional()
			.openapi({ description: "Filter by ticket status" }),
		offset: z.coerce
			.number()
			.int()
			.min(0)
			.optional()
			.openapi({ description: "Pagination offset", default: 0 }),
		limit: z.coerce
			.number()
			.int()
			.min(1)
			.max(100)
			.optional()
			.openapi({ description: "Results per page", default: 20 }),
		search: z
			.string()
			.optional()
			.openapi({ description: "Search in subject and external_id" }),
		sort: z
			.enum(["created_at", "external_id", "subject"])
			.optional()
			.openapi({ description: "Sort field", default: "created_at" }),
		sort_dir: z
			.enum(["asc", "desc"])
			.optional()
			.openapi({ description: "Sort direction", default: "desc" }),
		source: z
			.string()
			.optional()
			.openapi({ description: "Filter by data source" }),
		priority: z
			.string()
			.optional()
			.openapi({ description: "Filter by ticket priority" }),
		external_status: z
			.string()
			.optional()
			.openapi({ description: "Filter by external ticket status" }),
	})
	.openapi("ClusterTicketsQuery");

// ============================================================================
// Entity Schemas
// ============================================================================

export const ClusterListItemSchema = z
	.object({
		id: z
			.string()
			.uuid()
			.openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
		name: z.string().openapi({ example: "Password Reset Issues" }),
		subcluster_name: z.string().nullable().openapi({ example: "MFA Related" }),
		kb_status: KBStatusSchema,
		config: ClusterConfigSchema,
		ticket_count: z
			.number()
			.int()
			.openapi({ description: "Total tickets in cluster", example: 42 }),
		needs_response_count: z
			.number()
			.int()
			.openapi({ description: "Tickets needing response", example: 15 }),
		created_at: z
			.string()
			.datetime()
			.openapi({ example: "2024-01-15T10:30:00.000Z" }),
		updated_at: z
			.string()
			.datetime()
			.openapi({ example: "2024-01-15T10:30:00.000Z" }),
	})
	.openapi("ClusterListItem");

export const ClusterDetailsSchema = z
	.object({
		id: z.string().uuid(),
		organization_id: z.string().uuid(),
		model_id: z.string(),
		name: z.string(),
		subcluster_name: z.string().nullable(),
		config: ClusterConfigSchema,
		kb_status: KBStatusSchema,
		kb_articles_count: z
			.number()
			.int()
			.openapi({ description: "Linked KB articles" }),
		ticket_count: z.number().int(),
		open_count: z
			.number()
			.int()
			.openapi({ description: "Tickets needing response" }),
		created_at: z.string().datetime(),
		updated_at: z.string().datetime(),
	})
	.openapi("ClusterDetails");

export const TicketSchema = z
	.object({
		id: z.string().uuid(),
		organization_id: z.string().uuid(),
		cluster_id: z.string().uuid().nullable(),
		data_source_connection_id: z.string().uuid().nullable(),
		external_id: z
			.string()
			.openapi({ description: "External ticket ID", example: "INC0012345" }),
		subject: z.string().openapi({ example: "Cannot reset password" }),
		description: z
			.string()
			.nullable()
			.openapi({ description: "Human-readable ticket description" }),
		external_status: z
			.string()
			.openapi({ description: "Status in source system", example: "Open" }),
		cluster_text: z
			.string()
			.nullable()
			.openapi({ description: "Text used for clustering" }),
		rita_status: RitaStatusSchema,
		source_metadata: z
			.record(z.string(), z.any())
			.openapi({ description: "Source-specific metadata" }),
		created_at: z.string().datetime(),
		updated_at: z.string().datetime(),
	})
	.openapi("Ticket");

export const KbArticleSchema = z
	.object({
		id: z.string().uuid(),
		filename: z.string().openapi({ example: "password-reset-guide.pdf" }),
		file_size: z
			.number()
			.int()
			.openapi({ description: "Size in bytes", example: 102400 }),
		mime_type: z.string().openapi({ example: "application/pdf" }),
		status: z
			.string()
			.openapi({ description: "Processing status", example: "processed" }),
		created_at: z.string().datetime(),
		updated_at: z.string().datetime(),
	})
	.openapi("KbArticle");

// ============================================================================
// Request Schemas
// ============================================================================

export const GenerateKnowledgeRequestSchema = z
	.object({
		sources: z
			.array(z.string())
			.min(1)
			.openapi({
				description: "Knowledge sources to use for generation",
				example: ["historical-tickets", "web-search"],
			}),
	})
	.openapi("GenerateKnowledgeRequest");

export const GenerateKnowledgeResponseSchema = z
	.object({
		generation_id: z
			.string()
			.uuid()
			.openapi({ description: "Correlation ID for matching SSE response" }),
	})
	.openapi("GenerateKnowledgeResponse");

export const AddKbArticleRequestSchema = z
	.object({
		content: z
			.string()
			.min(1)
			.max(5 * 1024 * 1024)
			.openapi({ description: "Article content (markdown or text)" }),
		filename: z.string().min(1).max(255).openapi({
			description: "Article filename",
			example: "network-troubleshooting-guide.md",
		}),
	})
	.openapi("AddKbArticleRequest");

// ============================================================================
// Response Schemas
// ============================================================================

export const ClusterTotalsSchema = z
	.object({
		total_clusters: z
			.number()
			.int()
			.openapi({ description: "Total clusters matching filters", example: 27 }),
		total_tickets: z.number().int().openapi({
			description: "Total tickets across matching clusters",
			example: 238,
		}),
		total_automated_tickets: z.number().int().openapi({
			description: "Total automated tickets (with agent_end event)",
			example: 42,
		}),
	})
	.openapi("ClusterTotals");

export const ClusterListResponseSchema = z
	.object({
		data: z.array(ClusterListItemSchema),
		pagination: OffsetPaginationInfoSchema,
		totals: ClusterTotalsSchema,
	})
	.openapi("ClusterListResponse");

export const ClusterDetailsResponseSchema = z
	.object({
		data: ClusterDetailsSchema,
	})
	.openapi("ClusterDetailsResponse");

export const ClusterTicketsResponseSchema = z
	.object({
		data: z.array(TicketSchema),
		pagination: OffsetPaginationInfoSchema,
	})
	.openapi("ClusterTicketsResponse");

export const ClusterKbArticlesResponseSchema = z
	.object({
		data: z.array(KbArticleSchema),
	})
	.openapi("ClusterKbArticlesResponse");
