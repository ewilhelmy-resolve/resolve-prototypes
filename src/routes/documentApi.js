const express = require('express');
const crypto = require('crypto');

function createDocumentRouter(db) {
    const router = express.Router();
    
    // GET /api/documents/:document_id - Retrieve raw document
    router.get('/:document_id', async (req, res) => {
        try {
            const { document_id } = req.params;
            
            console.log(`[DOCUMENT RETRIEVAL] Fetching document ${document_id}`);
            
            // Retrieve document from database
            const result = await db.query(
                'SELECT file_data, file_type, original_filename, file_size FROM rag_documents WHERE document_id = $1',
                [document_id]
            );
            
            if (result.rows.length === 0) {
                console.log(`[DOCUMENT RETRIEVAL] Document ${document_id} not found`);
                return res.status(404).json({ error: 'Document not found' });
            }
            
            const doc = result.rows[0];
            
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
            
            // Set headers for file download
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Length', doc.file_size);
            res.setHeader('Content-Disposition', `inline; filename="${doc.original_filename}"`);
            
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