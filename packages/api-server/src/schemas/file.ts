import { z } from "../docs/openapi.js";

// ============================================================================
// Shared File Schemas
// ============================================================================

export const FileStatusSchema = z
	.enum(["processing", "ready", "failed"])
	.openapi({ description: "File processing status" });

export const FileSourceSchema = z
	.enum(["manual", "confluence", "jira", "sharepoint"])
	.openapi({ description: "Source of the file" });

export const DocumentSchema = z
	.object({
		id: z.string().uuid().openapi({ description: "Document ID" }),
		filename: z
			.string()
			.openapi({ description: "File name", example: "guide.pdf" }),
		size: z
			.number()
			.openapi({ description: "File size in bytes", example: 102400 }),
		type: z
			.string()
			.openapi({ description: "MIME type", example: "application/pdf" }),
		status: FileStatusSchema,
		source: FileSourceSchema.optional(),
		created_at: z
			.string()
			.datetime()
			.openapi({ description: "Creation timestamp" }),
	})
	.openapi("Document");

// ============================================================================
// POST /api/files/upload
// ============================================================================

export const FileUploadResponseSchema = z
	.object({
		document: DocumentSchema,
	})
	.openapi("FileUploadResponse");

export const FileConflictResponseSchema = z
	.object({
		error: z.literal("File already uploaded"),
		existing_filename: z
			.string()
			.openapi({ description: "Name of existing file with same content" }),
	})
	.openapi("FileConflictResponse");

// ============================================================================
// POST /api/files/content
// ============================================================================

export const FileContentRequestSchema = z
	.object({
		content: z.string().openapi({ description: "Text content to store" }),
		filename: z.string().openapi({
			description: "File name for the content",
			example: "notes.txt",
		}),
		metadata: z
			.record(z.string(), z.any())
			.optional()
			.openapi({ description: "Optional metadata" }),
	})
	.openapi("FileContentRequest");

export const FileContentResponseSchema = z
	.object({
		document: z.object({
			id: z.string().uuid(),
			filename: z.string(),
			size: z.number(),
			type: z.string(),
			status: FileStatusSchema,
			created_at: z.string().datetime(),
		}),
	})
	.openapi("FileContentResponse");

// ============================================================================
// GET /api/files/:documentId/metadata
// ============================================================================

export const FileMetadataResponseSchema = z
	.object({
		id: z.string().uuid().openapi({ description: "Document ID" }),
		organization_id: z
			.string()
			.uuid()
			.openapi({ description: "Organization ID" }),
		user_id: z.string().uuid().openapi({ description: "Uploader user ID" }),
		filename: z.string().openapi({ description: "File name" }),
		file_size: z.number().openapi({ description: "File size in bytes" }),
		mime_type: z.string().openapi({ description: "MIME type" }),
		status: FileStatusSchema,
		processed_markdown: z
			.string()
			.nullable()
			.openapi({ description: "Processed content as markdown" }),
		metadata: z
			.record(z.string(), z.any())
			.openapi({ description: "File metadata including content" }),
		created_at: z
			.string()
			.datetime()
			.openapi({ description: "Creation timestamp" }),
		updated_at: z
			.string()
			.datetime()
			.nullable()
			.openapi({ description: "Last update timestamp" }),
		blob_id: z.string().openapi({ description: "Blob storage ID" }),
		_lookup_strategy: z
			.string()
			.optional()
			.openapi({ description: "Debug: lookup method used" }),
	})
	.openapi("FileMetadataResponse");

// ============================================================================
// GET /api/files
// ============================================================================

export const FileListQuerySchema = z
	.object({
		limit: z.coerce
			.number()
			.int()
			.min(1)
			.max(100)
			.default(50)
			.openapi({ description: "Max results", example: 50 }),
		offset: z.coerce
			.number()
			.int()
			.min(0)
			.default(0)
			.openapi({ description: "Pagination offset", example: 0 }),
		sort_by: z
			.enum(["filename", "size", "type", "status", "source", "created_at"])
			.default("created_at")
			.openapi({ description: "Sort field" }),
		sort_order: z
			.enum(["ASC", "DESC", "asc", "desc"])
			.default("DESC")
			.openapi({ description: "Sort direction" }),
		search: z
			.string()
			.optional()
			.openapi({ description: "Search filename (case-insensitive)" }),
		status: z
			.string()
			.optional()
			.openapi({ description: "Filter by status (or 'all')" }),
		source: z
			.string()
			.optional()
			.openapi({ description: "Filter by source (or 'all')" }),
	})
	.openapi("FileListQuery");

export const FileListItemSchema = z
	.object({
		id: z.string().uuid(),
		file_name: z.string(),
		file_size: z.number(),
		mime_type: z.string(),
		status: FileStatusSchema,
		metadata: z.record(z.string(), z.any()).nullable(),
		user_id: z.string().uuid(),
		created_at: z.string().datetime(),
		updated_at: z.string().datetime().nullable(),
		source: FileSourceSchema.nullable(),
		content_type: z.enum(["text", "binary"]),
	})
	.openapi("FileListItem");

export const FileListResponseSchema = z
	.object({
		documents: z.array(FileListItemSchema),
		total: z.number().openapi({ description: "Total count matching filters" }),
		limit: z.number(),
		offset: z.number(),
	})
	.openapi("FileListResponse");

// ============================================================================
// POST /api/files/:documentId/process
// ============================================================================

export const FileProcessRequestSchema = z
	.object({
		enable_processing: z.boolean().openapi({
			description: "Must be true to trigger processing",
			example: true,
		}),
	})
	.openapi("FileProcessRequest");

export const FileProcessResponseSchema = z
	.object({
		success: z.literal(true),
		message: z.string().openapi({ example: "Document sent for processing" }),
		document_id: z.string().uuid(),
	})
	.openapi("FileProcessResponse");

// ============================================================================
// DELETE /api/files/:documentId
// ============================================================================

export const FileDeleteResponseSchema = z
	.object({
		deleted: z.literal(true),
		document_id: z.string().uuid(),
		blob_id: z.string(),
	})
	.openapi("FileDeleteResponse");
