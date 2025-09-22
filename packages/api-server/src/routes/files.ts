import express from 'express';
import multer from 'multer';
import { authenticateUser } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../types/express.js';
import { withOrgContext } from '../config/database.js';
import { WebhookService } from '../services/WebhookService.js';

const router = express.Router();
const webhookService = new WebhookService();

// Configure multer for memory storage (files stored in memory temporarily)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.FILE_SIZE_LIMIT_KB || '50') * 1024, // 50KB default
  },
  fileFilter: (req, file, cb) => {
    // Validate content type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'text/plain', 'text/markdown',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('File type not allowed'));
    }

    cb(null, true);
  }
});

// Upload file directly to database
router.post('/upload', authenticateUser, upload.single('file'), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const file = req.file;
    const { content } = req.body; // Optional text content

    // Store file in database
    const result = await withOrgContext(
      authReq.user.id,
      authReq.user.activeOrganizationId,
      async (client) => {
        const documentResult = await client.query(`
          INSERT INTO documents (
            organization_id, user_id, file_name, file_size, mime_type,
            file_content, content, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'uploaded')
          RETURNING id, file_name, file_size, mime_type, status, created_at
        `, [
          authReq.user.activeOrganizationId,
          authReq.user.id,
          file.originalname,
          file.size,
          file.mimetype,
          file.buffer,
          content || null
        ]);

        return documentResult.rows[0];
      }
    );

    res.json({
      document: {
        id: result.id,
        filename: result.file_name,
        size: result.file_size,
        type: result.mime_type,
        status: result.status,
        created_at: result.created_at
      }
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        const limitKB = parseInt(process.env.FILE_SIZE_LIMIT_KB || '50');
        return res.status(400).json({ error: `File size exceeds ${limitKB}KB limit` });
      }
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Create text content (alternative to file upload)
router.post('/content', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { content, filename, metadata } = req.body;

    if (!content || !filename) {
      return res.status(400).json({ error: 'Content and filename are required' });
    }

    // Store text content in database
    const result = await withOrgContext(
      authReq.user.id,
      authReq.user.activeOrganizationId,
      async (client) => {
        const documentResult = await client.query(`
          INSERT INTO documents (
            organization_id, user_id, file_name, file_size, mime_type,
            content, metadata, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'uploaded')
          RETURNING id, file_name, file_size, mime_type, status, created_at
        `, [
          authReq.user.activeOrganizationId,
          authReq.user.id,
          filename,
          Buffer.byteLength(content, 'utf8'),
          'text/plain',
          content,
          metadata ? JSON.stringify(metadata) : '{}'
        ]);

        return documentResult.rows[0];
      }
    );

    res.json({
      document: {
        id: result.id,
        filename: result.file_name,
        size: result.file_size,
        type: result.mime_type,
        status: result.status,
        created_at: result.created_at
      }
    });

  } catch (error) {
    console.error('Error creating content:', error);
    res.status(500).json({ error: 'Failed to create content' });
  }
});

// Download file directly from database
router.get('/:documentId/download', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { documentId } = req.params;

    const result = await withOrgContext(
      authReq.user.id,
      authReq.user.activeOrganizationId,
      async (client) => {
        // Fetch document with file content
        const documentResult = await client.query(`
          SELECT d.id, d.file_name, d.mime_type, d.file_content, d.content, d.status
          FROM documents d
          WHERE d.id = $1 AND d.organization_id = $2 AND d.status = 'uploaded'
        `, [documentId, authReq.user.activeOrganizationId]);

        if (documentResult.rows.length === 0) {
          return null;
        }

        return documentResult.rows[0];
      }
    );

    if (result === null) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Set appropriate headers for file download
    res.setHeader('Content-Type', result.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${result.file_name}"`);

    // Send file content or text content
    if (result.file_content) {
      res.setHeader('Content-Length', result.file_content.length);
      res.send(result.file_content);
    } else if (result.content) {
      const contentBuffer = Buffer.from(result.content, 'utf8');
      res.setHeader('Content-Length', contentBuffer.length);
      res.send(contentBuffer);
    } else {
      return res.status(500).json({ error: 'No content available' });
    }

  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// List user's documents
router.get('/', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await withOrgContext(
      authReq.user.id,
      authReq.user.activeOrganizationId,
      async (client) => {
        const documentsResult = await client.query(`
          SELECT
            d.id,
            d.file_name,
            d.file_size,
            d.mime_type,
            d.status,
            d.metadata,
            d.created_at,
            d.updated_at,
            CASE
              WHEN d.content IS NOT NULL THEN 'text'
              WHEN d.file_content IS NOT NULL THEN 'binary'
              ELSE 'unknown'
            END as content_type
          FROM documents d
          WHERE d.organization_id = $1 AND d.user_id = $2 AND d.status = 'uploaded'
          ORDER BY d.created_at DESC
          LIMIT $3 OFFSET $4
        `, [authReq.user.activeOrganizationId, authReq.user.id, limit, offset]);

        const countResult = await client.query(
          'SELECT COUNT(*) as total FROM documents WHERE organization_id = $1 AND user_id = $2 AND status = $3',
          [authReq.user.activeOrganizationId, authReq.user.id, 'uploaded']
        );

        return {
          documents: documentsResult.rows,
          total: parseInt(countResult.rows[0].total),
          limit,
          offset
        };
      }
    );

    res.json(result);

  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Send document for processing (optional webhook trigger)
router.post('/:documentId/process', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { documentId } = req.params;
    const { enable_processing = false } = req.body;

    if (!enable_processing) {
      return res.status(400).json({
        error: 'Document processing not requested. Set enable_processing: true to trigger processing.'
      });
    }

    // Get document details
    const document = await withOrgContext(
      authReq.user.id,
      authReq.user.activeOrganizationId,
      async (client) => {
        const documentResult = await client.query(`
          SELECT d.id, d.file_name, d.file_size, d.mime_type, d.status
          FROM documents d
          WHERE d.id = $1 AND d.organization_id = $2 AND d.user_id = $3 AND d.status = 'uploaded'
        `, [documentId, authReq.user.activeOrganizationId, authReq.user.id]);

        if (documentResult.rows.length === 0) {
          return null;
        }

        return documentResult.rows[0];
      }
    );

    if (!document) {
      return res.status(404).json({ error: 'Document not found or not uploadable' });
    }

    // Generate document URL for webhook
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const documentUrl = `${baseUrl}/api/files/${documentId}/download`;

    // Send document processing webhook
    const webhookResponse = await webhookService.sendDocumentEvent({
      organizationId: authReq.user.activeOrganizationId,
      userId: authReq.user.id,
      userEmail: authReq.user.email,
      documentId: documentId,
      documentUrl: documentUrl,
      fileType: document.mime_type,
      fileSize: document.file_size,
      originalFilename: document.file_name
    });

    if (webhookResponse.success) {
      // Update document status to processing
      await withOrgContext(
        authReq.user.id,
        authReq.user.activeOrganizationId,
        async (client) => {
          await client.query(
            'UPDATE documents SET status = $1, updated_at = NOW() WHERE id = $2',
            ['processing', documentId]
          );
        }
      );

      res.json({
        success: true,
        message: 'Document sent for processing',
        document_id: documentId
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send document for processing',
        details: webhookResponse.error
      });
    }

  } catch (error) {
    console.error('Error processing document:', error);
    res.status(500).json({ error: 'Failed to process document' });
  }
});

// Delete document
router.delete('/:documentId', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { documentId } = req.params;

    const result = await withOrgContext(
      authReq.user.id,
      authReq.user.activeOrganizationId,
      async (client) => {
        // Delete document (this will also remove from message_documents due to CASCADE)
        const deleteResult = await client.query(
          'DELETE FROM documents WHERE id = $1 AND organization_id = $2 AND user_id = $3 RETURNING id',
          [documentId, authReq.user.activeOrganizationId, authReq.user.id]
        );

        return deleteResult.rows.length > 0;
      }
    );

    if (!result) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ deleted: true });

  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;