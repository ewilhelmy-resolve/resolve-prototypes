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
