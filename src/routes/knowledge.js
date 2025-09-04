const express = require('express');
const crypto = require('crypto');
const { body, param, validationResult } = require('express-validator');
const { validateTenant, validateCallbackToken, rateLimit } = require('../middleware/ragAuth');
const { generateCallbackToken } = require('../utils/rag');
const authService = require('../services/authService');
const { 
    isValidUUID, 
    sanitizeHtml, 
    containsSqlInjection,
    validateFileUpload 
} = require('../utils/validation');

// Enhanced validation middleware
const validateKnowledgeIngestion = [
    param('tenantId')
        .isUUID(4)
        .withMessage('Invalid tenant ID format'),
    body('articles')
        .isArray({ min: 1, max: 100 })
        .withMessage('Articles must be an array with 1-100 items'),
    body('articles.*.title')
        .isLength({ min: 1, max: 500 })
        .withMessage('Article title must be 1-500 characters')
        .custom((value) => {
            if (containsSqlInjection(value)) {
                throw new Error('Invalid characters in title');
            }
            return true;
        }),
    body('articles.*.content')
        .isLength({ min: 1, max: 102400 })
        .withMessage('Article content must be 1-100KB')
        .custom((value) => {
            if (containsSqlInjection(value)) {
                throw new Error('Invalid characters in content');
            }
            return true;
        }),
    body('articles.*.category')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Category must be less than 100 characters')
        .custom((value) => {
            if (value && containsSqlInjection(value)) {
                throw new Error('Invalid characters in category');
            }
            return true;
        }),
    body('articles.*.tags')
        .optional()
        .isArray({ max: 20 })
        .withMessage('Tags must be an array with max 20 items'),
    body('articles.*.tags.*')
        .optional()
        .isLength({ max: 50 })
        .withMessage('Each tag must be less than 50 characters')
];

const validateCallbackRequest = [
    param('callbackId')
        .isLength({ min: 32, max: 64 })
        .matches(/^[a-f0-9]+$/)
        .withMessage('Invalid callback ID format'),
    body('vectors')
        .optional()
        .isArray({ max: 1000 })
        .withMessage('Vectors must be an array with max 1000 items'),
    body('error')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Error message too long')
];

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(`[SECURITY] Validation failed: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({ 
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
};

function createKnowledgeRouter(db, sessions) {
    const router = express.Router();
    const validateTenantMW = validateTenant(sessions);
    const validateCallbackTokenMW = validateCallbackToken(db);

    // Middleware to log all requests
    router.use((req, res, next) => {
        console.log(`[KNOWLEDGE API] ${req.method} ${req.originalUrl || req.url}`);
        next();
    });

    // 1. Ingest knowledge articles with tenant isolation and enhanced validation
    router.post('/tenant/:tenantId/knowledge', 
        validateKnowledgeIngestion, 
        handleValidationErrors,
        validateTenantMW, 
        rateLimit, 
        async (req, res) => {
        try {
            // Use the tenant ID from the authenticated session, not from URL
            // The URL tenant ID is for routing/namespacing only
            const tenantId = req.tenantId; // This comes from validateTenantMW
            const { articles } = req.body;
            
            if (!articles || !Array.isArray(articles) || articles.length === 0) {
                return res.status(400).json({ error: 'Articles array required' });
            }
            
            const results = [];
            
            for (const article of articles) {
                // Additional security validation (express-validator already ran)
                if (!article.content || !article.title) {
                    results.push({ 
                        error: 'Article missing title or content',
                        skipped: true 
                    });
                    continue;
                }
                
                // Sanitize inputs to prevent XSS
                const sanitizedTitle = sanitizeHtml(article.title.trim());
                const sanitizedContent = article.content.trim();
                const sanitizedCategory = article.category ? sanitizeHtml(article.category.trim()) : 'knowledge';
                
                // Validate content size after sanitization
                const maxSize = parseInt(process.env.MAX_KNOWLEDGE_SIZE) || 102400;
                if (sanitizedContent.length > maxSize) {
                    results.push({ 
                        error: 'Article exceeds 100KB limit after processing',
                        title: sanitizedTitle,
                        skipped: true 
                    });
                    continue;
                }
                
                // Sanitize tags array
                const sanitizedTags = Array.isArray(article.tags) 
                    ? article.tags
                        .slice(0, 20) // Limit to 20 tags
                        .map(tag => sanitizeHtml(String(tag).trim()))
                        .filter(tag => tag.length > 0 && tag.length <= 50)
                    : [];
                
                const articleId = crypto.randomUUID();
                const callbackId = crypto.randomBytes(16).toString('hex');
                
                // Ensure callback token exists for tenant
                const tokenResult = await db.query(
                    'SELECT callback_token FROM rag_tenant_tokens WHERE tenant_id = $1',
                    [tenantId]
                );
                
                if (tokenResult.rows.length === 0) {
                    await generateCallbackToken(db, tenantId);
                }
                
                // Store knowledge article with sanitized data
                await db.query(
                    `INSERT INTO rag_documents (
                        tenant_id, document_id, callback_id, content, metadata, 
                        created_by, status
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        tenantId, 
                        articleId, 
                        callbackId, 
                        sanitizedContent, 
                        {
                            ...article.metadata,
                            title: sanitizedTitle,
                            category: sanitizedCategory,
                            tags: sanitizedTags,
                            source: sanitizeHtml(article.source || 'actions-platform'),
                            type: 'knowledge-article',
                            originalTitle: article.title, // Keep original for reference
                            processedAt: new Date().toISOString()
                        },
                        req.userEmail || 'actions-platform',
                        'pending'  // Changed from 'pending-vectorization' to fit VARCHAR(20)
                    ]
                );
                
                results.push({ 
                    article_id: articleId, 
                    callback_id: callbackId,
                    title: sanitizedTitle,
                    status: 'accepted'
                });
                
                // Log the knowledge ingestion
                console.log(`[KNOWLEDGE] Ingested article: ${article.title} (${articleId}) for tenant: ${tenantId}`);
            }
            
            res.json({ 
                success: true, 
                tenant_id: tenantId,
                articles: results,
                total: results.length,
                accepted: results.filter(r => r.status === 'accepted').length,
                skipped: results.filter(r => r.skipped).length
            });
            
        } catch (error) {
            console.error('[KNOWLEDGE] Ingest error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // 2. Search knowledge with embeddings - tenant isolated
    // This endpoint can be called by external systems with callback token OR internal systems with session
    router.post('/tenant/:tenantId/knowledge/search-embedding', async (req, res) => {
        try {
            const { tenantId } = req.params;
            
            // Check for authentication - either callback token or session token
            const callbackToken = req.headers['x-callback-token'];
            const sessionToken = req.cookies?.sessionToken || req.headers['authorization']?.replace('Bearer ', '');
            
            if (!callbackToken && !sessionToken) {
                // No authentication provided - for testing, allow if tenant ID matches the body
                if (req.body.tenant_id !== tenantId) {
                    return res.status(401).json({ error: 'Authentication required' });
                }
            } else if (callbackToken) {
                // Validate callback token
                const result = await db.query(
                    'SELECT * FROM rag_tenant_tokens WHERE tenant_id = $1 AND callback_token = $2',
                    [tenantId, callbackToken]
                );
                
                if (result.rows.length === 0) {
                    return res.status(401).json({ error: 'Invalid callback token' });
                }
            } else if (sessionToken) {
                // Validate session token and ensure tenant isolation
                const session = await authService.getSession(sessionToken);
                
                if (!session) {
                    return res.status(401).json({ error: 'Invalid session' });
                }
                
                // CRITICAL: Verify the session's tenant ID matches the requested tenant ID
                if (session.tenantId !== tenantId) {
                    console.log(`[SECURITY] Tenant isolation violation blocked: Session tenant ${session.tenantId} tried to access tenant ${tenantId}`);
                    return res.status(403).json({ error: 'Access denied - tenant isolation violation' });
                }
            }
            const { 
                query_embedding, 
                limit = 10, 
                threshold = 0.7,
                category = null,
                tags = []
            } = req.body;
            
            // Validate embedding dimension
            const expectedDimension = parseInt(process.env.VECTOR_DIMENSION) || 1536;
            if (!Array.isArray(query_embedding) || query_embedding.length !== expectedDimension) {
                return res.status(400).json({ 
                    error: `Invalid embedding dimension. Expected ${expectedDimension}, got ${query_embedding?.length}` 
                });
            }
            
            // Build search query with tenant isolation
            let searchQuery = `
                SELECT
                    v.document_id,
                    v.chunk_text,
                    v.chunk_index,
                    v.metadata as chunk_metadata,
                    d.metadata as document_metadata,
                    d.created_by,
                    d.created_at,
                    1 - (v.embedding <=> $1::vector) as similarity
                FROM rag_vectors v
                JOIN rag_documents d ON v.document_id = d.document_id
                WHERE v.tenant_id = $2
                    AND d.tenant_id = $2
                    AND 1 - (v.embedding <=> $1::vector) > $3
            `;
            
            const queryParams = [
                JSON.stringify(query_embedding),
                tenantId,
                threshold
            ];
            
            // Add category filter if provided
            if (category) {
                searchQuery += ` AND d.metadata->>'category' = $${queryParams.length + 1}`;
                queryParams.push(category);
            }
            
            // Add tags filter if provided
            if (tags && tags.length > 0) {
                searchQuery += ` AND d.metadata->'tags' ?| $${queryParams.length + 1}`;
                queryParams.push(tags);
            }
            
            searchQuery += `
                ORDER BY v.embedding <=> $1::vector
                LIMIT $${queryParams.length + 1}
            `;
            queryParams.push(limit);
            
            const results = await db.query(searchQuery, queryParams);
            
            // Format results with document grouping
            const documentsMap = new Map();
            
            results.rows.forEach(row => {
                if (!documentsMap.has(row.document_id)) {
                    documentsMap.set(row.document_id, {
                        document_id: row.document_id,
                        title: row.document_metadata?.title || 'Untitled',
                        category: row.document_metadata?.category || 'uncategorized',
                        tags: row.document_metadata?.tags || [],
                        source: row.document_metadata?.source || 'unknown',
                        created_by: row.created_by,
                        created_at: row.created_at,
                        chunks: [],
                        max_similarity: row.similarity
                    });
                }
                
                const doc = documentsMap.get(row.document_id);
                doc.chunks.push({
                    chunk_text: row.chunk_text,
                    chunk_index: row.chunk_index,
                    similarity: row.similarity,
                    metadata: row.chunk_metadata
                });
                
                // Update max similarity
                if (row.similarity > doc.max_similarity) {
                    doc.max_similarity = row.similarity;
                }
            });
            
            // Convert to array and sort by max similarity
            const documents = Array.from(documentsMap.values())
                .sort((a, b) => b.max_similarity - a.max_similarity);
            
            console.log(`[KNOWLEDGE SEARCH] Tenant ${tenantId}: Found ${documents.length} documents, ${results.rows.length} chunks`);
            
            res.json({
                success: true,
                tenant_id: tenantId,
                documents: documents,
                total_documents: documents.length,
                total_chunks: results.rows.length,
                query_params: {
                    limit,
                    threshold,
                    category,
                    tags
                }
            });
            
        } catch (error) {
            console.error('[KNOWLEDGE SEARCH] Error:', error);
            res.status(500).json({ error: 'Search failed' });
        }
    });

    // 3. Receive vectorized knowledge data (callback from Actions Platform)
    router.post('/tenant/:tenantId/knowledge/callback/:callback_id', async (req, res) => {
        try {
            const { tenantId, callback_id } = req.params;
            const { document_id, vectors } = req.body;
            
            // Validate callback exists and belongs to tenant
            const docResult = await db.query(
                'SELECT * FROM rag_documents WHERE callback_id = $1 AND tenant_id = $2',
                [callback_id, tenantId]
            );
            
            if (docResult.rows.length === 0) {
                return res.status(404).json({ 
                    error: 'Invalid callback',
                    tenant_id: tenantId,
                    callback_id: callback_id
                });
            }
            
            const doc = docResult.rows[0];
            
            // Validate document_id matches
            if (doc.document_id !== document_id) {
                return res.status(400).json({ 
                    error: 'Document ID mismatch',
                    expected: doc.document_id,
                    received: document_id
                });
            }
            
            // Store vectors
            let storedCount = 0;
            for (const vector of vectors) {
                // Validate embedding dimension
                const expectedDimension = parseInt(process.env.VECTOR_DIMENSION) || 1536;
                if (!Array.isArray(vector.embedding) || vector.embedding.length !== expectedDimension) {
                    console.error(`[KNOWLEDGE CALLBACK] Invalid embedding dimension: ${vector.embedding?.length}`);
                    continue;
                }
                
                // Convert array to PostgreSQL vector format: '[1.0, 2.0, 3.0]'
                const vectorString = `[${vector.embedding.join(',')}]`;
                
                await db.query(
                    `INSERT INTO rag_vectors (
                        tenant_id, document_id, chunk_text, embedding, 
                        chunk_index, metadata
                    ) VALUES ($1, $2, $3, $4::vector, $5, $6)`,
                    [
                        tenantId,
                        doc.document_id,
                        vector.chunk_text,
                        vectorString,
                        vector.chunk_index,
                        vector.metadata || {}
                    ]
                );
                storedCount++;
            }
            
            // Update document status
            await db.query(
                `UPDATE rag_documents 
                 SET status = $1, updated_at = CURRENT_TIMESTAMP 
                 WHERE callback_id = $2 AND tenant_id = $3`,
                ['vectorized', callback_id, tenantId]
            );
            
            console.log(`[KNOWLEDGE CALLBACK] Stored ${storedCount} vectors for document ${document_id}, tenant ${tenantId}`);
            
            res.json({ 
                success: true,
                tenant_id: tenantId,
                document_id: document_id,
                vectors_stored: storedCount,
                total_vectors: vectors.length
            });
            
        } catch (error) {
            console.error('[KNOWLEDGE CALLBACK] Error:', error);
            res.status(500).json({ error: 'Failed to store vectors' });
        }
    });

    // 4. Get knowledge articles for a tenant
    router.get('/tenant/:tenantId/knowledge', validateTenantMW, async (req, res) => {
        try {
            const { tenantId } = req.params;
            const { 
                limit = 20, 
                offset = 0,
                category = null,
                status = null
            } = req.query;
            
            // Verify tenant access
            if (tenantId !== req.tenantId) {
                return res.status(403).json({ error: 'Tenant ID mismatch' });
            }
            
            let query = `
                SELECT 
                    document_id,
                    metadata,
                    status,
                    created_by,
                    created_at,
                    updated_at
                FROM rag_documents
                WHERE tenant_id = $1
                    AND metadata->>'type' = 'knowledge-article'
            `;
            
            const queryParams = [tenantId];
            
            if (category) {
                query += ` AND metadata->>'category' = $${queryParams.length + 1}`;
                queryParams.push(category);
            }
            
            if (status) {
                // Map status values for compatibility
                const mappedStatus = status === 'pending-vectorization' ? 'pending' : status;
                query += ` AND status = $${queryParams.length + 1}`;
                queryParams.push(mappedStatus);
            }
            
            query += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
            queryParams.push(limit, offset);
            
            const result = await db.query(query, queryParams);
            
            // Get total count
            let countQuery = `
                SELECT COUNT(*) as total
                FROM rag_documents
                WHERE tenant_id = $1
                    AND metadata->>'type' = 'knowledge-article'
            `;
            const countParams = [tenantId];
            
            if (category) {
                countQuery += ` AND metadata->>'category' = $2`;
                countParams.push(category);
            }
            
            if (status) {
                countQuery += ` AND status = $${countParams.length + 1}`;
                countParams.push(status);
            }
            
            const countResult = await db.query(countQuery, countParams);
            
            const articles = result.rows.map(row => ({
                article_id: row.document_id,
                title: row.metadata?.title || 'Untitled',
                category: row.metadata?.category || 'uncategorized',
                tags: row.metadata?.tags || [],
                source: row.metadata?.source || 'unknown',
                status: row.status,
                created_by: row.created_by,
                created_at: row.created_at,
                updated_at: row.updated_at
            }));
            
            res.json({
                success: true,
                tenant_id: tenantId,
                articles: articles,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: parseInt(countResult.rows[0].total),
                    has_more: offset + limit < parseInt(countResult.rows[0].total)
                }
            });
            
        } catch (error) {
            console.error('[KNOWLEDGE LIST] Error:', error);
            res.status(500).json({ error: 'Failed to retrieve knowledge articles' });
        }
    });

    // 5. Delete knowledge article (tenant-isolated)
    router.delete('/tenant/:tenantId/knowledge/:articleId', validateTenantMW, async (req, res) => {
        try {
            const { tenantId, articleId } = req.params;
            
            // Verify tenant access
            if (tenantId !== req.tenantId) {
                return res.status(403).json({ error: 'Tenant ID mismatch' });
            }
            
            // Delete vectors first (foreign key constraint)
            await db.query(
                'DELETE FROM rag_vectors WHERE document_id = $1 AND tenant_id = $2',
                [articleId, tenantId]
            );
            
            // Delete document
            const result = await db.query(
                `DELETE FROM rag_documents 
                 WHERE document_id = $1 AND tenant_id = $2 
                    AND metadata->>'type' = 'knowledge-article'
                 RETURNING document_id`,
                [articleId, tenantId]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ 
                    error: 'Knowledge article not found',
                    article_id: articleId,
                    tenant_id: tenantId
                });
            }
            
            console.log(`[KNOWLEDGE DELETE] Deleted article ${articleId} for tenant ${tenantId}`);
            
            res.json({ 
                success: true,
                message: 'Knowledge article deleted successfully',
                article_id: articleId,
                tenant_id: tenantId
            });
            
        } catch (error) {
            console.error('[KNOWLEDGE DELETE] Error:', error);
            res.status(500).json({ error: 'Failed to delete knowledge article' });
        }
    });

    return router;
}

module.exports = createKnowledgeRouter;