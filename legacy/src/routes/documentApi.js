const express = require('express');
const crypto = require('crypto');
const { param, validationResult } = require('express-validator');
const { 
    isValidUUID, 
    sanitizeHtml, 
    containsSqlInjection 
} = require('../utils/validation');
const { requireAuth } = require('../middleware/auth');

// Security validation middleware
const validateDocumentId = [
    param('document_id')
        .isUUID(4)
        .withMessage('Invalid document ID format')
        .custom(async (value) => {
            if (containsSqlInjection(value)) {
                throw new Error('Invalid characters in document ID');
            }
            return true;
        })
];

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(`[SECURITY] Invalid document request: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({ 
            error: 'Invalid request parameters',
            details: errors.array()
        });
    }
    next();
};

function createDocumentRouter(db) {
    const router = express.Router();
    
    // Apply authentication to all document routes
    router.use(requireAuth);
    
    // GET /api/documents/:document_id - Retrieve raw document with security validation
    router.get('/:document_id', validateDocumentId, handleValidationErrors, async (req, res) => {
        try {
            const { document_id } = req.params;
            const userTenantId = req.user?.tenantId;
            
            console.log(`[DOCUMENT RETRIEVAL] User ${req.user?.email} fetching document ${document_id}`);
            
            // Retrieve document with tenant-based access control
            const result = await db.query(
                'SELECT file_data, file_type, original_filename, file_size, tenant_id FROM rag_documents WHERE document_id = $1',
                [document_id]
            );
            
            if (result.rows.length === 0) {
                console.log(`[DOCUMENT RETRIEVAL] Document ${document_id} not found`);
                return res.status(404).json({ error: 'Document not found' });
            }
            
            const doc = result.rows[0];
            
            // Verify tenant access (security check)
            if (doc.tenant_id !== userTenantId) {
                console.log(`[SECURITY] User ${req.user?.email} attempted to access document ${document_id} from different tenant`);
                return res.status(403).json({ error: 'Access denied - insufficient permissions' });
            }
            
            if (!doc.file_data) {
                console.log(`[DOCUMENT RETRIEVAL] Document ${document_id} has no binary data`);
                return res.status(404).json({ error: 'Document has no file data' });
            }
            
            // Set appropriate content type based on file type
            const contentTypeMap = {
                'pdf': 'application/pdf',
                'doc': 'application/msword',
                'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'ppt': 'application/vnd.ms-powerpoint',
                'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'xls': 'application/vnd.ms-excel',
                'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'rtf': 'application/rtf',
                'html': 'text/html',
                'htm': 'text/html',
                'csv': 'text/csv',
                'txt': 'text/plain',
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'gif': 'image/gif',
                'bmp': 'image/bmp',
                'tiff': 'image/tiff',
                'webp': 'image/webp',
                'odt': 'application/vnd.oasis.opendocument.text',
                'ods': 'application/vnd.oasis.opendocument.spreadsheet',
                'odp': 'application/vnd.oasis.opendocument.presentation',
                'epub': 'application/epub+zip',
                'md': 'text/markdown',
                'xml': 'application/xml',
                'json': 'application/json',
                'tex': 'application/x-tex',
                'xps': 'application/vnd.ms-xpsdocument',
                'mobi': 'application/x-mobipocket-ebook',
                'svg': 'image/svg+xml',
                'eml': 'message/rfc822',
                'msg': 'application/vnd.ms-outlook'
            };
            
            const contentType = contentTypeMap[doc.file_type] || 'application/octet-stream';
            
            // Sanitize filename to prevent injection attacks
            const sanitizedFilename = doc.original_filename
                .replace(/[^\w\-_.]/g, '_') // Replace non-safe characters with underscore
                .substring(0, 255); // Limit filename length
            
            // Set security headers for file download
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Length', doc.file_size);
            res.setHeader('Content-Disposition', `inline; filename="${sanitizedFilename}"`);
            
            // Additional security headers for file downloads
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-Download-Options', 'noopen'); // IE security
            
            // CSP for document viewing
            res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'none'; object-src 'none';");
            
            // Send raw binary data
            res.send(doc.file_data);
            
            console.log(`[DOCUMENT RETRIEVAL] Successfully served document ${document_id} (${doc.file_size} bytes)`);
            
        } catch (error) {
            console.error('[DOCUMENT RETRIEVAL] Error:', error);
            res.status(500).json({ error: 'Failed to retrieve document' });
        }
    });
    
    return router;
}

module.exports = createDocumentRouter;