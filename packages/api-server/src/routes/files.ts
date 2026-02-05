import crypto from "node:crypto";
import express from "express";
import multer from "multer";
import { withOrgContext } from "../config/database.js";
import { logger } from "../config/logger.js";
import { registry, z } from "../docs/openapi.js";
import { authenticateUser, requireRole } from "../middleware/auth.js";
import { ErrorResponseSchema } from "../schemas/common.js";
import {
	FileConflictResponseSchema,
	FileContentRequestSchema,
	FileContentResponseSchema,
	FileDeleteResponseSchema,
	FileListQuerySchema,
	FileListResponseSchema,
	FileMetadataResponseSchema,
	FileProcessRequestSchema,
	FileProcessResponseSchema,
	FileUploadResponseSchema,
} from "../schemas/file.js";
import { WebhookService } from "../services/WebhookService.js";
import type { AuthenticatedRequest } from "../types/express.js";

// ============================================================================
// OpenAPI Documentation Registration
// ============================================================================

registry.registerPath({
	method: "post",
	path: "/api/files/upload",
	tags: ["Files"],
	summary: "Upload file",
	description:
		"Upload a file to the organization knowledge base. Supports images, PDFs, text, and Office documents up to 100MB. Files are deduplicated by content hash.",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		body: {
			content: {
				"multipart/form-data": {
					schema: z.object({
						file: z.any().openapi({ description: "File to upload" }),
						filename: z
							.string()
							.optional()
							.openapi({ description: "Optional explicit filename (UTF-8)" }),
						content: z
							.string()
							.optional()
							.openapi({ description: "Optional text content override" }),
					}),
				},
			},
		},
	},
	responses: {
		200: {
			description: "File uploaded successfully",
			content: { "application/json": { schema: FileUploadResponseSchema } },
		},
		400: {
			description: "No file provided or file type not allowed",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		403: {
			description: "Forbidden - requires owner/admin role",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		409: {
			description: "File already exists (same content hash)",
			content: { "application/json": { schema: FileConflictResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

registry.registerPath({
	method: "post",
	path: "/api/files/content",
	tags: ["Files"],
	summary: "Create text content",
	description:
		"Create text content in the organization knowledge base. Stored as a blob for consistency and deduplication.",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		body: {
			content: { "application/json": { schema: FileContentRequestSchema } },
		},
	},
	responses: {
		200: {
			description: "Content created successfully",
			content: { "application/json": { schema: FileContentResponseSchema } },
		},
		400: {
			description: "Content and filename are required",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		403: {
			description: "Forbidden - requires owner/admin role",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

registry.registerPath({
	method: "get",
	path: "/api/files/{documentId}/metadata",
	tags: ["Files"],
	summary: "Get file metadata",
	description:
		"Get metadata for a document (used for citations). Returns metadata without raw blob content. Supports both new (blob_metadata.id) and legacy (blob_id) formats.",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		params: z.object({
			documentId: z.string().openapi({ description: "Document ID or blob ID" }),
		}),
	},
	responses: {
		200: {
			description: "File metadata",
			content: { "application/json": { schema: FileMetadataResponseSchema } },
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		404: {
			description: "Document not found",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

registry.registerPath({
	method: "get",
	path: "/api/files/{documentId}/download",
	tags: ["Files"],
	summary: "Download file",
	description: "Download a file from the organization knowledge base.",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		params: z.object({
			documentId: z.string().uuid().openapi({ description: "Document ID" }),
		}),
	},
	responses: {
		200: {
			description: "File content (binary)",
			content: { "application/octet-stream": { schema: z.any() } },
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		403: {
			description: "Forbidden - requires owner/admin role",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		404: {
			description: "Document not found",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

registry.registerPath({
	method: "get",
	path: "/api/files",
	tags: ["Files"],
	summary: "List files",
	description:
		"List all files in the organization with pagination, sorting, and filtering.",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		query: FileListQuerySchema,
	},
	responses: {
		200: {
			description: "Paginated file list",
			content: { "application/json": { schema: FileListResponseSchema } },
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

registry.registerPath({
	method: "post",
	path: "/api/files/{documentId}/process",
	tags: ["Files"],
	summary: "Trigger document processing",
	description:
		"Trigger document processing via webhook to external services. Allows reprocessing for any status.",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		params: z.object({
			documentId: z.string().uuid().openapi({ description: "Document ID" }),
		}),
		body: {
			content: { "application/json": { schema: FileProcessRequestSchema } },
		},
	},
	responses: {
		200: {
			description: "Document sent for processing",
			content: { "application/json": { schema: FileProcessResponseSchema } },
		},
		400: {
			description: "enable_processing not set to true",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		403: {
			description: "Forbidden - requires owner/admin role",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		404: {
			description: "Document not found",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error or webhook failed",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

registry.registerPath({
	method: "delete",
	path: "/api/files/{documentId}",
	tags: ["Files"],
	summary: "Delete file",
	description:
		"Delete a file from the organization. Sends webhook to external services for cleanup before database deletion. Blob is preserved if referenced by other metadata.",
	security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	request: {
		params: z.object({
			documentId: z.string().uuid().openapi({ description: "Document ID" }),
		}),
	},
	responses: {
		200: {
			description: "File deleted successfully",
			content: { "application/json": { schema: FileDeleteResponseSchema } },
		},
		401: {
			description: "Unauthorized",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		403: {
			description: "Forbidden - requires owner/admin role",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		404: {
			description: "Document not found",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
		500: {
			description: "Server error or webhook failed",
			content: { "application/json": { schema: ErrorResponseSchema } },
		},
	},
});

const router = express.Router();
const webhookService = new WebhookService();

// Default file size limit: 100MB in KB
const DEFAULT_FILE_SIZE_LIMIT_KB = "102400";

// Configure multer for memory storage (files stored in memory temporarily)
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize:
			parseInt(
				process.env.FILE_SIZE_LIMIT_KB || DEFAULT_FILE_SIZE_LIMIT_KB,
				10,
			) * 1024, // 100MB default
	},
	fileFilter: (_req, file, cb) => {
		// Validate content type
		const allowedTypes = [
			"image/jpeg",
			"image/png",
			"image/gif",
			"image/webp",
			"application/pdf",
			"text/plain",
			"text/markdown",
			"application/msword",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			"application/vnd.ms-excel",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		];

		if (!allowedTypes.includes(file.mimetype)) {
			return cb(new Error("File type not allowed"));
		}

		cb(null, true);
	},
});

// Helper function to format file size limit
const formatFileSize = (sizeKB: number): string => {
	if (sizeKB >= 1024) {
		const sizeMB = sizeKB / 1024;
		return sizeMB % 1 === 0 ? `${sizeMB}MB` : `${sizeMB.toFixed(1)}MB`;
	}
	return `${sizeKB}KB`;
};

// Create a wrapper that catches MulterError
const handleUpload = (
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
) => {
	upload.single("file")(req, res, (err) => {
		if (err instanceof multer.MulterError) {
			if (err.code === "LIMIT_FILE_SIZE") {
				const limitKB = parseInt(
					process.env.FILE_SIZE_LIMIT_KB || DEFAULT_FILE_SIZE_LIMIT_KB,
					10,
				);
				const formattedLimit = formatFileSize(limitKB);
				return res
					.status(400)
					.json({ error: `File size exceeds ${formattedLimit} limit` });
			}
			return res.status(400).json({ error: err.message });
		} else if (err) {
			return res.status(500).json({ error: "Failed to upload file" });
		}
		next();
	});
};

/**
 * POST /api/files/upload
 * Upload a file to organization knowledge base
 * Auth: Required (owner/admin)
 */
router.post(
	"/upload",
	authenticateUser,
	requireRole(["owner", "admin"]),
	handleUpload,
	async (req, res) => {
		const authReq = req as AuthenticatedRequest;
		try {
			if (!req.file) {
				return res.status(400).json({ error: "No file provided" });
			}

			const file = req.file;
			const { content, filename } = req.body; // Optional text content and explicit filename

			// Use the explicitly provided filename (UTF-8 encoded) or fallback to multer's originalname
			const safeFilename = filename || file.originalname;

			// Calculate SHA-256 hash of file content for deduplication
			const digest = crypto
				.createHash("sha256")
				.update(file.buffer)
				.digest("hex");

			// Check if file already exists in organization (by digest)
			const existingFile = await withOrgContext(
				authReq.user.id,
				authReq.user.activeOrganizationId,
				async (client) => {
					const result = await client.query(
						`
          SELECT bm.id, bm.filename
          FROM blob_metadata bm
          JOIN blobs b ON bm.blob_id = b.blob_id
          WHERE b.digest = $1 AND bm.organization_id = $2
          LIMIT 1
        `,
						[digest, authReq.user.activeOrganizationId],
					);

					return result.rows.length > 0 ? result.rows[0] : null;
				},
			);

			if (existingFile) {
				return res.status(409).json({
					error: "File already uploaded",
					existing_filename: existingFile.filename,
				});
			}

			// Store file using new blob storage schema
			const result = await withOrgContext(
				authReq.user.id,
				authReq.user.activeOrganizationId,
				async (client) => {
					// Begin transaction for atomic blob + metadata insert
					await client.query("BEGIN");

					try {
						let blobId: string;

						// Check if blob already exists (deduplication)
						const existingBlob = await client.query(
							"SELECT blob_id FROM blobs WHERE digest = $1",
							[digest],
						);

						if (existingBlob.rows.length > 0) {
							// Blob already exists, reuse it
							blobId = existingBlob.rows[0].blob_id;
						} else {
							// Insert new blob
							const blobResult = await client.query(
								`
              INSERT INTO blobs (data, digest)
              VALUES ($1, $2)
              RETURNING blob_id
            `,
								[file.buffer, digest],
							);

							blobId = blobResult.rows[0].blob_id;
						}

						// Insert metadata record
						const metadataResult = await client.query(
							`
            INSERT INTO blob_metadata (
              blob_id, organization_id, user_id, filename, file_size, mime_type, status, metadata, source
            )
            VALUES ($1, $2, $3, $4, $5, $6, 'processing', $7, 'manual')
            RETURNING id, blob_id, filename, file_size, mime_type, status, source, created_at
          `,
							[
								blobId,
								authReq.user.activeOrganizationId,
								authReq.user.id,
								safeFilename,
								file.size,
								file.mimetype,
								JSON.stringify({ content: content || null }),
							],
						);

						await client.query("COMMIT");
						return metadataResult.rows[0];
					} catch (error) {
						await client.query("ROLLBACK");
						throw error;
					}
				},
			);

			// Generate document URL for webhook
			const baseUrl =
				process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
			const documentUrl = `${baseUrl}/api/files/${result.id}/download`;

			// Send document upload webhook
			try {
				const webhookResponse = await webhookService.sendDocumentEvent({
					organizationId: authReq.user.activeOrganizationId,
					userId: authReq.user.id,
					userEmail: authReq.user.email,
					blobMetadataId: result.id.toString(),
					blobId: result.blob_id.toString(),
					documentUrl: documentUrl,
					fileType: result.mime_type,
					fileSize: result.file_size,
					originalFilename: result.filename,
				});

				if (!webhookResponse.success) {
					logger.error(
						{ webhookError: webhookResponse.error },
						"Webhook failed for uploaded document",
					);
				}
			} catch (webhookError) {
				logger.error({ error: webhookError }, "Error sending upload webhook");
				// Continue with the upload response even if webhook fails
			}

			logger.info(
				{
					organizationId: authReq.user.activeOrganizationId,
					userId: authReq.user.id,
					documentId: result.id,
					filename: result.filename,
					fileSize: result.file_size,
				},
				"File uploaded",
			);

			res.json({
				document: {
					id: result.id,
					filename: result.filename,
					size: result.file_size,
					type: result.mime_type,
					status: result.status,
					source: result.source,
					created_at: result.created_at,
				},
			});
		} catch (error) {
			logger.error(
				{
					error,
					userId: authReq.user.id,
					organizationId: authReq.user.activeOrganizationId,
				},
				"Failed to upload file",
			);
			res.status(500).json({ error: "Failed to upload file" });
		}
	},
);

/**
 * POST /api/files/content
 * Create text content in organization knowledge base
 * Auth: Required (owner/admin)
 */
router.post(
	"/content",
	authenticateUser,
	requireRole(["owner", "admin"]),
	async (req, res) => {
		const authReq = req as AuthenticatedRequest;
		try {
			const { content, filename, metadata } = req.body;

			if (!content || !filename) {
				return res
					.status(400)
					.json({ error: "Content and filename are required" });
			}

			// Store text content as blob for consistency and deduplication
			const result = await withOrgContext(
				authReq.user.id,
				authReq.user.activeOrganizationId,
				async (client) => {
					// Create blob from text content (enables deduplication)
					const textBuffer = Buffer.from(content, "utf8");
					const digest = crypto
						.createHash("sha256")
						.update(textBuffer)
						.digest("hex");

					// Begin transaction for atomic blob + metadata insert
					await client.query("BEGIN");

					try {
						let blobId: string;

						// Check if text blob already exists (deduplication)
						const existingBlob = await client.query(
							"SELECT blob_id FROM blobs WHERE digest = $1",
							[digest],
						);

						if (existingBlob.rows.length > 0) {
							// Text blob already exists, reuse it
							blobId = existingBlob.rows[0].blob_id;
						} else {
							// Insert new text blob
							const blobResult = await client.query(
								`
              INSERT INTO blobs (data, digest)
              VALUES ($1, $2)
              RETURNING blob_id
            `,
								[textBuffer, digest],
							);

							blobId = blobResult.rows[0].blob_id;
						}

						// Insert metadata record
						const metadataResult = await client.query(
							`
            INSERT INTO blob_metadata (
              blob_id, organization_id, user_id, filename, file_size, mime_type, status, metadata
            )
            VALUES ($1, $2, $3, $4, $5, 'text/plain', 'processing', $6)
            RETURNING id, blob_id, filename, file_size, mime_type, status, created_at
          `,
							[
								blobId,
								authReq.user.activeOrganizationId,
								authReq.user.id,
								filename,
								Buffer.byteLength(content, "utf8"),
								JSON.stringify(metadata || {}),
							],
						);

						await client.query("COMMIT");
						return metadataResult.rows[0];
					} catch (error) {
						await client.query("ROLLBACK");
						throw error;
					}
				},
			);

			logger.info(
				{
					organizationId: authReq.user.activeOrganizationId,
					userId: authReq.user.id,
					documentId: result.id,
					filename: result.filename,
				},
				"Content created",
			);

			res.json({
				document: {
					id: result.id,
					filename: result.filename,
					size: result.file_size,
					type: result.mime_type,
					status: result.status,
					created_at: result.created_at,
				},
			});
		} catch (error) {
			logger.error(
				{
					error,
					userId: authReq.user.id,
					organizationId: authReq.user.activeOrganizationId,
				},
				"Failed to create content",
			);
			res.status(500).json({ error: "Failed to create content" });
		}
	},
);

// Get document metadata (for citations - returns metadata without full blob content)
// Supports both new (blob_metadata.id) and legacy (blob_id) formats for backward compatibility
router.get("/:documentId/metadata", authenticateUser, async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	try {
		const { documentId } = req.params;

		const result = await withOrgContext(
			authReq.user.id,
			authReq.user.activeOrganizationId,
			async (client) => {
				// Strategy 1: Try lookup by blob_metadata.id (NEW FORMAT - preferred)
				let metadataResult = await client.query(
					`
          SELECT
            bm.id,
            bm.organization_id,
            bm.user_id,
            bm.filename,
            bm.file_size,
            bm.mime_type,
            bm.status,
            bm.processed_markdown,
            bm.metadata,
            bm.created_at,
            bm.updated_at,
            bm.blob_id
          FROM blob_metadata bm
          WHERE bm.id = $1 AND bm.organization_id = $2
        `,
					[documentId, authReq.user.activeOrganizationId],
				);

				let lookupStrategy = "blob_metadata_id";

				// Strategy 2: Fallback to blob_id lookup (OLD FORMAT - backward compatibility)
				if (metadataResult.rows.length === 0) {
					metadataResult = await client.query(
						`
            SELECT
              bm.id,
              bm.organization_id,
              bm.user_id,
              bm.filename,
              bm.file_size,
              bm.mime_type,
              bm.status,
              bm.processed_markdown,
              bm.metadata,
              bm.created_at,
              bm.updated_at,
              bm.blob_id
            FROM blob_metadata bm
            WHERE bm.blob_id = $1 AND bm.organization_id = $2
          `,
						[documentId, authReq.user.activeOrganizationId],
					);

					lookupStrategy = "blob_id";
				}

				if (metadataResult.rows.length === 0) {
					return { found: false, lookupStrategy: null };
				}

				return { found: true, data: metadataResult.rows[0], lookupStrategy };
			},
		);

		if (!result.found) {
			// Log phantom citation with appropriate ID type
			try {
				await withOrgContext(
					authReq.user.id,
					authReq.user.activeOrganizationId,
					async (client) => {
						// Determine if documentId looks like a UUID (blob_metadata_id) or text (blob_id)
						const isUUID =
							/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
								documentId,
							);

						if (isUUID) {
							// Assume blob_metadata_id format
							await client.query(
								`
                INSERT INTO phantom_citations (blob_metadata_id, user_id, organization_id, first_seen, last_seen, occurrence_count)
                VALUES ($1, $2, $3, NOW(), NOW(), 1)
                ON CONFLICT (blob_metadata_id, user_id, organization_id)
                WHERE blob_metadata_id IS NOT NULL
                DO UPDATE SET
                  last_seen = NOW(),
                  occurrence_count = phantom_citations.occurrence_count + 1,
                  updated_at = NOW()
              `,
								[
									documentId,
									authReq.user.id,
									authReq.user.activeOrganizationId,
								],
							);
						} else {
							// Assume blob_id format (legacy)
							await client.query(
								`
                INSERT INTO phantom_citations (blob_id, user_id, organization_id, first_seen, last_seen, occurrence_count)
                VALUES ($1, $2, $3, NOW(), NOW(), 1)
                ON CONFLICT (blob_id, user_id, organization_id)
                WHERE blob_id IS NOT NULL
                DO UPDATE SET
                  last_seen = NOW(),
                  occurrence_count = phantom_citations.occurrence_count + 1,
                  updated_at = NOW()
              `,
								[
									documentId,
									authReq.user.id,
									authReq.user.activeOrganizationId,
								],
							);
						}
					},
				);
			} catch (logError) {
				// Don't fail the request if logging fails
				console.error("Failed to log phantom citation:", logError);
			}

			return res.status(404).json({ error: "Document not found" });
		}

		// Return metadata with processed content (no raw blob data)
		// Frontend expects article content in metadata.content field
		const metadata = result.data.metadata || {};
		metadata.content = result.data.processed_markdown;

		res.json({
			id: result.data.id,
			organization_id: result.data.organization_id,
			user_id: result.data.user_id,
			filename: result.data.filename,
			file_size: result.data.file_size,
			mime_type: result.data.mime_type,
			status: result.data.status,
			processed_markdown: result.data.processed_markdown,
			metadata: metadata,
			created_at: result.data.created_at,
			updated_at: result.data.updated_at,
			blob_id: result.data.blob_id,
			_lookup_strategy: result.lookupStrategy, // Debug info: which lookup method succeeded
		});
	} catch (error) {
		console.error("Error fetching document metadata:", error);
		res.status(500).json({ error: "Failed to fetch document metadata" });
	}
});

/**
 * GET /api/files/:documentId/download
 * Download a file from organization knowledge base
 * Auth: Required (owner/admin)
 */
router.get(
	"/:documentId/download",
	authenticateUser,
	requireRole(["owner", "admin"]),
	async (req, res) => {
		const authReq = req as AuthenticatedRequest;
		try {
			const { documentId } = req.params;

			const result = await withOrgContext(
				authReq.user.id,
				authReq.user.activeOrganizationId,
				async (client) => {
					// Fetch document metadata and blob data via join
					const documentResult = await client.query(
						`
          SELECT
            bm.id,
            bm.filename as file_name,
            bm.mime_type,
            b.data as file_content,
            bm.status
          FROM blob_metadata bm
          JOIN blobs b ON bm.blob_id = b.blob_id
          WHERE bm.id = $1 AND bm.organization_id = $2
        `,
						[documentId, authReq.user.activeOrganizationId],
					);

					if (documentResult.rows.length === 0) {
						return null;
					}

					return documentResult.rows[0];
				},
			);

			if (result === null) {
				return res.status(404).json({ error: "Document not found" });
			}

			// Set appropriate headers for file download
			res.setHeader("Content-Type", result.mime_type);
			res.setHeader(
				"Content-Disposition",
				`attachment; filename="${result.file_name}"`,
			);

			// Send blob data (works for both binary files and text content)
			if (result.file_content) {
				res.setHeader("Content-Length", result.file_content.length);
				res.send(result.file_content);
			} else {
				return res.status(500).json({ error: "No content available" });
			}
		} catch (error) {
			logger.error(
				{
					error,
					userId: authReq.user.id,
					organizationId: authReq.user.activeOrganizationId,
					documentId: req.params.documentId,
				},
				"Failed to download file",
			);
			res.status(500).json({ error: "Failed to download file" });
		}
	},
);

/**
 * GET /api/files
 * List all files in the organization
 * Auth: Required
 */
router.get("/", authenticateUser, async (req, res) => {
	const authReq = req as AuthenticatedRequest;
	try {
		const limit = parseInt(req.query.limit as string, 10) || 50;
		const offset = parseInt(req.query.offset as string, 10) || 0;
		const sortBy = (req.query.sort_by as string) || "created_at";
		const sortOrder =
			(req.query.sort_order as string)?.toUpperCase() === "ASC"
				? "ASC"
				: "DESC";

		// Filter parameters
		const search = req.query.search as string;
		const status = req.query.status as string;
		const source = req.query.source as string;

		// Validate and map sort fields to database columns
		const sortFieldMap: Record<string, string> = {
			filename: "bm.filename",
			size: "bm.file_size",
			type: "bm.mime_type",
			status: "bm.status",
			source: "bm.source",
			created_at: "bm.created_at",
		};

		const sortField = sortFieldMap[sortBy] || "bm.created_at";

		const result = await withOrgContext(
			authReq.user.id,
			authReq.user.activeOrganizationId,
			async (client) => {
				// Build WHERE clause dynamically
				const whereConditions: string[] = ["bm.organization_id = $1"];
				const queryParams: any[] = [authReq.user.activeOrganizationId];
				let paramIndex = 2;

				// Add search filter (case-insensitive filename search)
				if (search?.trim()) {
					whereConditions.push(`LOWER(bm.filename) LIKE LOWER($${paramIndex})`);
					queryParams.push(`%${search.trim()}%`);
					paramIndex++;
				}

				// Add status filter
				if (status && status.toLowerCase() !== "all") {
					whereConditions.push(`bm.status = $${paramIndex}`);
					queryParams.push(status.toLowerCase());
					paramIndex++;
				}

				// Add source filter
				if (source && source.toLowerCase() !== "all") {
					whereConditions.push(`bm.source = $${paramIndex}`);
					queryParams.push(source);
					paramIndex++;
				}

				const whereClause = whereConditions.join(" AND ");

				const documentsResult = await client.query(
					`
          SELECT
            bm.id,
            bm.filename as file_name,
            bm.file_size,
            bm.mime_type,
            bm.status,
            bm.metadata,
            bm.user_id,
            bm.created_at,
            bm.updated_at,
            bm.source,
            CASE
              WHEN bm.metadata->>'content' IS NOT NULL THEN 'text'
              ELSE 'binary'
            END as content_type
          FROM blob_metadata bm
          WHERE ${whereClause}
          ORDER BY ${sortField} ${sortOrder}
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `,
					[...queryParams, limit, offset],
				);

				const countResult = await client.query(
					`SELECT COUNT(*) as total FROM blob_metadata bm WHERE ${whereClause}`,
					queryParams,
				);

				return {
					documents: documentsResult.rows,
					total: parseInt(countResult.rows[0].total, 10),
					limit,
					offset,
				};
			},
		);

		logger.info(
			{
				organizationId: authReq.user.activeOrganizationId,
				userId: authReq.user.id,
				count: result.documents.length,
				total: result.total,
			},
			"Listed files",
		);

		res.json(result);
	} catch (error) {
		logger.error(
			{
				error,
				userId: authReq.user.id,
				organizationId: authReq.user.activeOrganizationId,
			},
			"Failed to fetch documents",
		);
		res.status(500).json({ error: "Failed to fetch documents" });
	}
});

/**
 * POST /api/files/:documentId/process
 * Trigger document processing (sends webhook to external services)
 * Auth: Required (owner/admin)
 */
router.post(
	"/:documentId/process",
	authenticateUser,
	requireRole(["owner", "admin"]),
	async (req, res) => {
		const authReq = req as AuthenticatedRequest;
		try {
			const { documentId } = req.params;
			const { enable_processing = false } = req.body;

			if (!enable_processing) {
				return res.status(400).json({
					error:
						"Document processing not requested. Set enable_processing: true to trigger processing.",
				});
			}

			// Get document details (allow reprocessing for any status)
			const document = await withOrgContext(
				authReq.user.id,
				authReq.user.activeOrganizationId,
				async (client) => {
					const documentResult = await client.query(
						`
          SELECT bm.id, bm.filename as file_name, bm.file_size, bm.mime_type, bm.status
          FROM blob_metadata bm
          WHERE bm.id = $1 AND bm.organization_id = $2
        `,
						[documentId, authReq.user.activeOrganizationId],
					);

					if (documentResult.rows.length === 0) {
						return null;
					}

					return documentResult.rows[0];
				},
			);

			if (!document) {
				return res.status(404).json({ error: "Document not found" });
			}

			// Generate document URL for webhook
			const baseUrl =
				process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
			const documentUrl = `${baseUrl}/api/files/${documentId}/download`;

			// Get blob_id for the document
			const documentWithBlob = await withOrgContext(
				authReq.user.id,
				authReq.user.activeOrganizationId,
				async (client) => {
					const result = await client.query(
						`
          SELECT bm.blob_id
          FROM blob_metadata bm
          WHERE bm.id = $1 AND bm.organization_id = $2
        `,
						[documentId, authReq.user.activeOrganizationId],
					);

					return result.rows[0]?.blob_id || null;
				},
			);

			if (!documentWithBlob) {
				return res.status(404).json({ error: "Document blob not found" });
			}

			// Send document processing webhook
			const webhookResponse = await webhookService.sendDocumentEvent({
				organizationId: authReq.user.activeOrganizationId,
				userId: authReq.user.id,
				userEmail: authReq.user.email,
				blobMetadataId: documentId,
				blobId: documentWithBlob,
				documentUrl: documentUrl,
				fileType: document.mime_type,
				fileSize: document.file_size,
				originalFilename: document.file_name,
			});

			if (webhookResponse.success) {
				// Update document status to processing
				await withOrgContext(
					authReq.user.id,
					authReq.user.activeOrganizationId,
					async (client) => {
						await client.query(
							"UPDATE blob_metadata SET status = $1, updated_at = NOW() WHERE id = $2",
							["processing", documentId],
						);
					},
				);

				logger.info(
					{
						organizationId: authReq.user.activeOrganizationId,
						userId: authReq.user.id,
						documentId: documentId,
					},
					"Document sent for processing",
				);

				res.json({
					success: true,
					message: "Document sent for processing",
					document_id: documentId,
				});
			} else {
				logger.error(
					{
						webhookError: webhookResponse.error,
						userId: authReq.user.id,
						organizationId: authReq.user.activeOrganizationId,
						documentId: documentId,
					},
					"Failed to send document for processing",
				);

				res.status(500).json({
					success: false,
					error: "Failed to send document for processing",
					details: webhookResponse.error,
				});
			}
		} catch (error) {
			logger.error(
				{
					error,
					userId: authReq.user.id,
					organizationId: authReq.user.activeOrganizationId,
					documentId: req.params.documentId,
				},
				"Failed to process document",
			);
			res.status(500).json({ error: "Failed to process document" });
		}
	},
);

/**
 * DELETE /api/files/:documentId
 * Delete a file from organization (triggers webhook for external cleanup)
 * Auth: Required (owner/admin)
 */
router.delete(
	"/:documentId",
	authenticateUser,
	requireRole(["owner", "admin"]),
	async (req, res) => {
		const authReq = req as AuthenticatedRequest;
		try {
			const { documentId } = req.params;

			// 1. Fetch metadata FIRST (need it for webhook before deletion)
			const metadata = await withOrgContext(
				authReq.user.id,
				authReq.user.activeOrganizationId,
				async (client) => {
					const metadataResult = await client.query(
						"SELECT id, blob_id, filename, organization_id, user_id FROM blob_metadata WHERE id = $1 AND organization_id = $2",
						[documentId, authReq.user.activeOrganizationId],
					);

					if (metadataResult.rows.length === 0) {
						return null; // Not found
					}

					return metadataResult.rows[0];
				},
			);

			if (!metadata) {
				return res.status(404).json({ error: "Document not found" });
			}

			// 2. Send deletion webhook BEFORE database deletion
			// This ensures external services (Barista) clean up vector embeddings first
			try {
				const webhookResponse = await webhookService.sendDocumentDeleteEvent({
					organizationId: authReq.user.activeOrganizationId,
					userId: authReq.user.id,
					userEmail: authReq.user.email,
					blobMetadataId: metadata.id.toString(),
					blobId: metadata.blob_id.toString(),
				});

				if (!webhookResponse.success) {
					logger.error(
						{
							webhookError: webhookResponse.error,
							userId: authReq.user.id,
							organizationId: authReq.user.activeOrganizationId,
							documentId: documentId,
						},
						"FileDelete webhook failed",
					);
					return res.status(500).json({
						error: "Failed to notify external services. Document not deleted.",
						details: webhookResponse.error,
					});
				}

				logger.info(
					{
						organizationId: authReq.user.activeOrganizationId,
						userId: authReq.user.id,
						documentId: documentId,
					},
					"FileDelete webhook succeeded",
				);
			} catch (webhookError) {
				logger.error(
					{
						error: webhookError,
						userId: authReq.user.id,
						organizationId: authReq.user.activeOrganizationId,
						documentId: documentId,
					},
					"FileDelete webhook error",
				);
				return res.status(500).json({
					error: "Failed to notify external services. Document not deleted.",
				});
			}

			// 3. Proceed with database deletion only if webhook succeeded
			const result = await withOrgContext(
				authReq.user.id,
				authReq.user.activeOrganizationId,
				async (client) => {
					await client.query("BEGIN");

					try {
						const blobId = metadata.blob_id;

						// Delete metadata record
						await client.query("DELETE FROM blob_metadata WHERE id = $1", [
							documentId,
						]);

						// Check if blob is still referenced by other metadata
						const blobRefCount = await client.query(
							"SELECT COUNT(*) as count FROM blob_metadata WHERE blob_id = $1",
							[blobId],
						);

						const refCount = parseInt(blobRefCount.rows[0].count, 10);

						// Delete blob only if no other references exist
						if (refCount === 0) {
							await client.query("DELETE FROM blobs WHERE blob_id = $1", [
								blobId,
							]);
							logger.info({ blobId }, "Deleted orphaned blob");
						} else {
							logger.info(
								{ blobId, refCount },
								"Preserved blob (still referenced)",
							);
						}

						await client.query("COMMIT");
						return metadata;
					} catch (error) {
						await client.query("ROLLBACK");
						throw error;
					}
				},
			);

			logger.info(
				{
					organizationId: authReq.user.activeOrganizationId,
					userId: authReq.user.id,
					documentId: result.id,
					blobId: result.blob_id,
				},
				"File deleted",
			);

			// 4. Return success to frontend
			res.json({
				deleted: true,
				document_id: result.id,
				blob_id: result.blob_id,
			});
		} catch (error) {
			logger.error(
				{
					error,
					userId: authReq.user.id,
					organizationId: authReq.user.activeOrganizationId,
					documentId: req.params.documentId,
				},
				"Failed to delete document",
			);
			res.status(500).json({ error: "Failed to delete document" });
		}
	},
);

export default router;
