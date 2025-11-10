/**
 * Global application constants
 */

/**
 * Supported file types for Knowledge Article uploads
 *
 * Currently supported document formats:
 * - PDF (.pdf) - Portable Document Format
 * - Word (.doc, .docx) - Microsoft Word documents
 * - Markdown (.md) - Markdown text files
 * - Text (.txt) - Plain text files
 *
 * Note: Image files are NOT supported for knowledge base uploads
 */
export const SUPPORTED_DOCUMENT_TYPES = '.pdf,.doc,.docx,.md,.txt' as const

/**
 * Array version of supported document extensions (without dots)
 * Useful for validation and display purposes
 */
export const SUPPORTED_DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'md', 'txt'] as const

/**
 * File source types for Knowledge Articles
 *
 * Represents where the file originated from:
 * - MANUAL: Files uploaded manually by users
 * - CONFLUENCE: Files synced from Jira Confluence
 */
export const FILE_SOURCE = {
	MANUAL: 'manual',
	CONFLUENCE: 'confluence',
} as const

/**
 * Type definition for file source values
 */
export type FileSourceType = typeof FILE_SOURCE[keyof typeof FILE_SOURCE]

/**
 * Display names for file sources
 * Maps database values to user-friendly display names
 */
export const FILE_SOURCE_DISPLAY_NAMES: Record<FileSourceType, string> = {
	[FILE_SOURCE.MANUAL]: 'Manual',
	[FILE_SOURCE.CONFLUENCE]: 'Jira Confluence',
} as const

/**
 * File status types for Knowledge Articles
 *
 * Represents the processing state of uploaded files:
 * - UPLOADED: File uploaded but not yet processed
 * - PROCESSING: File is currently being processed
 * - PROCESSED: File has been successfully processed
 * - FAILED: File processing failed
 * - PENDING: File is pending processing
 * - SYNCING: File is being synced from external source
 */
export const FILE_STATUS = {
	UPLOADED: 'uploaded',
	PROCESSING: 'processing',
	PROCESSED: 'processed',
	FAILED: 'failed',
	PENDING: 'pending',
	SYNCING: 'syncing',
} as const

/**
 * Type definition for file status values
 */
export type FileStatusType = typeof FILE_STATUS[keyof typeof FILE_STATUS]

export const MAX_FILE_SIZE_MB = 100;