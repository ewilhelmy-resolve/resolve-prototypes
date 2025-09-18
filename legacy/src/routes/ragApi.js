const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const multer = require('multer');
const { validateTenant, validateCallbackToken, rateLimit } = require('../middleware/ragAuth');
const { generateCallbackToken } = require('../utils/rag');
const ResolveWebhook = require('../utils/resolve-webhook');
const { getRabbitMQInstance } = require('../services/rabbitmq');

// Configure multer for in-memory file storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    }
});

function createRagRouter(db, sessions) {
    const router = express.Router();
    const validateTenantMW = validateTenant(sessions);
    const validateCallbackTokenMW = validateCallbackToken(db);
    const resolveWebhook = new ResolveWebhook();
    
    // Debug middleware to log all incoming requests to RAG API
    router.use((req, res, next) => {
        console.log(`[RAG API] ${req.method} ${req.originalUrl || req.url}`);
        if (req.method === 'POST' && req.originalUrl?.includes('callback')) {
            console.log('[RAG API] Callback request headers:', req.headers);
            console.log('[RAG API] Callback request body preview:', JSON.stringify(req.body).substring(0, 200));
        }
        next();
    });

    // 1a. Document Upload Endpoint (stores binary files)
    router.post('/upload-document', validateTenantMW, rateLimit, upload.single('document'), async (req, res) => {
        try {
            // Check if file was uploaded
            if (!req.file) {
                return res.status(400).json({ error: 'No document uploaded' });
            }
            
            const uploadedFile = req.file;
            
            // Validate file size (100MB max per requirements)
            const maxSize = 100 * 1024 * 1024; // 100MB
            if (uploadedFile.size > maxSize) {
                return res.status(400).json({ error: 'File exceeds 100MB limit' });
            }
            
            // Extract file type from originalname (multer property)
            const fileExt = uploadedFile.originalname.split('.').pop().toLowerCase();
            const supportedTypes = ['pdf','doc','docx','ppt','pptx','xls','xlsx','rtf','html','htm','csv','txt','jpg','jpeg','png','gif','bmp','tiff','webp','odt','ods','odp','epub','md','xml','json','tex','xps','mobi','svg','docm','dotx','pptm','xlsm','xlsb','vsdx','vsd','pub','mht','mhtml','eml','msg'];
            
            if (!supportedTypes.includes(fileExt)) {
                return res.status(400).json({ error: `Unsupported file type: ${fileExt}` });
            }
            
            // Generate IDs and tokens
            const documentId = crypto.randomUUID();
            const callbackId = crypto.randomBytes(16).toString('hex');
            const callbackToken = crypto.randomBytes(32).toString('hex');
            // No expiry - tokens are permanent for document processing
            
            // Store document in database with binary data
            // Note: content column is required, set it to filename for now
            await db.query(
                `INSERT INTO rag_documents (
                    tenant_id, document_id, content, file_data, file_type, file_size, 
                    original_filename, callback_token, token_expires_at, 
                    status, created_by, callback_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                [
                    req.tenantId,
                    documentId,
                    `Document: ${uploadedFile.originalname}`, // Placeholder content
                    uploadedFile.buffer, // Binary data from multer memory storage
                    fileExt,
                    uploadedFile.size,
                    uploadedFile.originalname,
                    callbackToken,
                    null, // No expiry for document tokens
                    'processing',
                    req.userEmail,
                    callbackId
                ]
            );
            
            // Get app URL
            let appUrl = process.env.APP_URL || 'http://localhost:5000';
            try {
                const configResult = await db.query(
                    'SELECT value FROM system_config WHERE key = $1',
                    ['app_url']
                );
                if (configResult.rows.length > 0) {
                    appUrl = configResult.rows[0].value;
                }
            } catch (configError) {
                console.log('Using environment APP_URL:', appUrl);
            }
            
            // Send webhook to actions platform for document processing
            try {
                await resolveWebhook.sendDocumentProcessingEvent({
                    source: 'onboarding',
                    action: 'document-processing',
                    tenant_id: req.tenantId,
                    document_id: documentId,
                    document_url: `${appUrl}/api/documents/${documentId}`,
                    callback_url: `${appUrl}/api/rag/document-callback/${documentId}`, // Legacy
                    markdown_callback_url: `${appUrl}/api/rag/document-callback/${documentId}`,
                    vector_callback_url: `${appUrl}/api/rag/callback/${callbackId}`,
                    callback_token: callbackToken,
                    file_type: fileExt,
                    file_size: uploadedFile.size,
                    original_filename: uploadedFile.originalname
                });
                
                // Track the action
                await resolveWebhook.trackAction({
                    action: 'document-upload',
                    source: 'RAG_Document',
                    userEmail: req.userEmail,
                    tenantId: req.tenantId,
                    metadata: {
                        document_id: documentId,
                        file_type: fileExt,
                        file_size: uploadedFile.size
                    }
                });
            } catch (webhookError) {
                // Add to retry queue
                await db.query(
                    `INSERT INTO rag_webhook_failures (tenant_id, webhook_type, payload, next_retry_at) 
                     VALUES ($1, $2, $3, $4)`,
                    [req.tenantId, 'document-processing', JSON.stringify({
                        source: 'onboarding',
                        action: 'document-processing',
                        document_id: documentId,
                        document_url: `${appUrl}/api/documents/${documentId}`,
                        callback_url: `${appUrl}/api/rag/document-callback/${documentId}`,
                        callback_token: callbackToken
                    }), new Date(Date.now() + 60000)]
                );
                console.error('Document processing webhook failed, added to retry queue:', webhookError.message);
            }
            
            // Emit SSE event for document upload
            if (global.knowledgeSSEClients && global.knowledgeSSEClients[req.tenantId]) {
                const sseMessage = JSON.stringify({
                    type: 'document-uploaded',
                    document_id: documentId,
                    status: 'processing',
                    metadata: {
                        filename: uploadedFile.originalname,
                        file_type: fileExt,
                        file_size: uploadedFile.size,
                        timestamp: new Date().toISOString()
                    }
                });
                
                Object.values(global.knowledgeSSEClients[req.tenantId]).forEach(client => {
                    try {
                        client.write(`data: ${sseMessage}\n\n`);
                        console.log(`[UPLOAD] Sent SSE event for document ${documentId}`);
                    } catch (err) {
                        console.error(`[UPLOAD] Failed to send SSE event:`, err.message);
                    }
                });
            }
            
            res.json({
                success: true,
                document_id: documentId,
                status: 'processing',
                message: 'Document uploaded and sent for processing'
            });
            
        } catch (error) {
            console.error('Document upload error:', error);
            res.status(500).json({ error: 'Failed to upload document' });
        }
    });

    // 1. Ingest Content (Triggers Actions Platform)
    router.post('/ingest', validateTenantMW, rateLimit, async (req, res) => {
        try {
            const { documents } = req.body;
            
            if (!documents || !Array.isArray(documents) || documents.length === 0) {
                return res.status(400).json({ error: 'Documents array required' });
            }
            
            const results = [];
            
            for (const doc of documents) {
                // Validate document size (50KB per document)
                const maxSize = parseInt(process.env.MAX_DOCUMENT_SIZE) || 51200; // Default to 50KB
                if (doc.content && doc.content.length > maxSize) {
                    results.push({ 
                        error: 'Document exceeds 50KB limit',
                        skipped: true 
                    });
                    continue;
                }
                
                // Ensure doc has content
                if (!doc.content) {
                    results.push({ 
                        error: 'Document missing content',
                        skipped: true 
                    });
                    continue;
                }
                
                const docId = crypto.randomUUID();
                const callbackId = crypto.randomBytes(16).toString('hex');
                
                // Get callback token for this tenant
                const tokenResult = await db.query(
                    'SELECT callback_token FROM rag_tenant_tokens WHERE tenant_id = $1',
                    [req.tenantId]
                );
                
                if (tokenResult.rows.length === 0) {
                    // Generate token if doesn't exist
                    await generateCallbackToken(db, req.tenantId);
                }
                
                // Store in database
                await db.query(
                    `INSERT INTO rag_documents (tenant_id, document_id, callback_id, content, metadata, created_by) 
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [req.tenantId, docId, callbackId, doc.content, doc.metadata || {}, req.userEmail]
                );
                
                results.push({ document_id: docId, callback_id: callbackId });
                
                // Get app_url from database or use environment variable as fallback
                let appUrl = process.env.APP_URL || 'http://localhost:5000';
                try {
                    const configResult = await db.query(
                        'SELECT value FROM system_config WHERE key = $1',
                        ['app_url']
                    );
                    if (configResult.rows.length > 0) {
                        appUrl = configResult.rows[0].value;
                    }
                } catch (configError) {
                    console.log('Using environment APP_URL:', appUrl);
                }
                
                // Try to send webhook using ResolveWebhook class
                try {
                    await resolveWebhook.sendRagIngestEvent({
                        tenantId: req.tenantId,
                        documentId: docId,
                        content: doc.content,
                        metadata: doc.metadata,
                        callbackUrl: `${appUrl}/api/rag/callback/${callbackId}`
                    });
                    
                    // Track the action
                    await resolveWebhook.trackAction({
                        action: 'rag-ingest',
                        source: 'RAG_Ingest',
                        userEmail: req.userEmail,
                        tenantId: req.tenantId,
                        metadata: {
                            document_id: docId,
                            content_length: doc.content.length
                        }
                    });
                } catch (webhookError) {
                    // Prepare webhook payload for retry queue
                    const webhookPayload = {
                        source: 'RAG_Ingest',
                        action: 'vectorize-content',
                        tenant_id: req.tenantId,
                        document_id: docId,
                        content: doc.content,
                        metadata: doc.metadata,
                        callback_url: `${appUrl}/api/rag/callback/${callbackId}`,
                        expected_response_format: {
                            vectors: [
                                {
                                    chunk_text: "string",
                                    embedding: "array of 1536 floats",
                                    chunk_index: "number"
                                }
                            ]
                        }
                    };
                    
                    // Add to retry queue
                    await db.query(
                        `INSERT INTO rag_webhook_failures (tenant_id, webhook_type, payload, next_retry_at) 
                         VALUES ($1, $2, $3, $4)`,
                        [req.tenantId, 'ingest', JSON.stringify(webhookPayload), new Date(Date.now() + 60000)]
                    );
                    console.error('Webhook failed, added to retry queue:', webhookError.message);
                }
            }
            
            res.json({ success: true, documents: results });
            
        } catch (error) {
            console.error('Ingest error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // 2. Receive Vectorized Data (Callback from Actions Platform)
    router.post('/callback/:callback_id', async (req, res) => {
        try {
            const { callback_id } = req.params;
            const { document_id, vectors, tenant_id } = req.body;
            
            // Validate callback token from X-Callback-Token header
            const callbackToken = req.headers['x-callback-token'];
            if (!callbackToken) {
                return res.status(401).json({ error: 'Missing X-Callback-Token header' });
            }
            
            console.log(`[VECTOR CALLBACK] Received callback for document ${document_id}, callback_id ${callback_id}`);
            
            // Validate callback exists and token matches
            const docResult = await db.query(
                'SELECT * FROM rag_documents WHERE callback_id = $1 AND tenant_id = $2 AND callback_token = $3',
                [callback_id, tenant_id, callbackToken]
            );
            
            if (docResult.rows.length === 0) {
                // Check if it's a token mismatch or invalid callback
                const checkResult = await db.query(
                    'SELECT callback_token FROM rag_documents WHERE callback_id = $1 AND tenant_id = $2',
                    [callback_id, tenant_id]
                );
                
                if (checkResult.rows.length === 0) {
                    return res.status(404).json({ error: 'Invalid callback ID or tenant' });
                } else {
                    console.warn(`[VECTOR CALLBACK] Token mismatch for callback ${callback_id}`);
                    return res.status(401).json({ error: 'Invalid callback token' });
                }
            }
            
            const doc = docResult.rows[0];
            
            // Store vectors with pgvector
            for (const vector of vectors) {
                // Validate embedding dimension
                const expectedDimension = parseInt(process.env.VECTOR_DIMENSION) || 1536; // Default to OpenAI dimension
                if (!Array.isArray(vector.embedding) || vector.embedding.length !== expectedDimension) {
                    console.error(`Invalid embedding dimension: ${vector.embedding?.length}, expected: ${expectedDimension}`);
                    continue;
                }
                
                // Convert array to PostgreSQL vector format: '[1.0, 2.0, 3.0]'
                const vectorString = `[${vector.embedding.join(',')}]`;
                
                await db.query(
                    `INSERT INTO rag_vectors (tenant_id, document_id, chunk_text, embedding, chunk_index, metadata) 
                     VALUES ($1, $2, $3, $4::vector, $5, $6)`,
                    [
                        doc.tenant_id, 
                        doc.document_id, 
                        vector.chunk_text,
                        vectorString,
                        vector.chunk_index,
                        vector.metadata || {}
                    ]
                );
            }
            
            // Update document status to ready (was vectorized)
            await db.query(
                'UPDATE rag_documents SET status = $1, is_processed = true, updated_at = CURRENT_TIMESTAMP WHERE callback_id = $2',
                ['ready', callback_id]
            );
            
            // Emit SSE event for vectorization complete
            if (global.knowledgeSSEClients && global.knowledgeSSEClients[doc.tenant_id]) {
                // Send two events - one for vectorized, one for ready
                const vectorizedMessage = JSON.stringify({
                    type: 'document-vectorized',
                    document_id: doc.document_id,
                    status: 'vectorized',
                    metadata: {
                        vector_count: vectors.length,
                        timestamp: new Date().toISOString()
                    }
                });
                
                const readyMessage = JSON.stringify({
                    type: 'document-status',
                    document_id: doc.document_id,
                    status: 'ready',
                    metadata: {
                        vector_count: vectors.length,
                        filename: doc.original_filename,
                        timestamp: new Date().toISOString()
                    }
                });
                
                Object.values(global.knowledgeSSEClients[doc.tenant_id]).forEach(client => {
                    try {
                        client.write(`data: ${vectorizedMessage}\n\n`);
                        client.write(`data: ${readyMessage}\n\n`);
                        console.log(`[VECTOR CALLBACK] Sent SSE events for document ${doc.document_id}`);
                    } catch (err) {
                        console.error(`[VECTOR CALLBACK] Failed to send SSE event:`, err.message);
                    }
                });
            }
            
            // Track vectorization callback
            await resolveWebhook.trackAction({
                action: 'vectorization-callback',
                source: 'RAG_Callback',
                userEmail: 'actions-platform',
                tenantId: tenant_id,
                metadata: {
                    document_id: document_id,
                    vectors_stored: vectors.length
                }
            });
            
            res.json({ success: true, vectors_stored: vectors.length });
            
        } catch (error) {
            console.error('Callback error:', error);
            res.status(500).json({ error: 'Failed to store vectors' });
        }
    });

    // 3. Vector Search (For Actions Platform)
    // Can be called with either tenant callback token OR message callback token
    router.post('/vector-search', async (req, res) => {
        const startTime = Date.now();
        const { query_embedding, tenant_id, limit = 5, threshold = 0.7, filters, message_id } = req.body;
        
        try {
            
            // Get token from header
            const authToken = req.headers['x-callback-token'] || req.headers['authorization']?.replace('Bearer ', '');
            
            if (!authToken) {
                return res.status(401).json({ error: 'Missing authentication token' });
            }
            
            // Check if it's a tenant token OR a message callback token
            let validAuth = false;
            
            // First check tenant tokens
            const tenantTokenResult = await db.query(
                'SELECT * FROM rag_tenant_tokens WHERE tenant_id = $1 AND callback_token = $2',
                [tenant_id, authToken]
            );
            
            if (tenantTokenResult.rows.length > 0) {
                validAuth = true;
            } else if (message_id) {
                // Check if it's a valid message callback token
                const messageResult = await db.query(
                    `SELECT * FROM rag_webhook_failures 
                     WHERE webhook_type = 'chat_callback' 
                     AND payload::jsonb->>'message_id' = $1
                     AND payload::jsonb->>'callback_token' = $2`,
                    [message_id, authToken]
                );
                
                if (messageResult.rows.length > 0) {
                    // Verify tenant_id matches
                    const msgTenantId = messageResult.rows[0].tenant_id;
                    if (msgTenantId === tenant_id) {
                        validAuth = true;
                    }
                }
            }
            
            if (!validAuth) {
                return res.status(401).json({ error: 'Invalid authentication token' });
            }
            
            // Validate embedding
            const expectedDimension = parseInt(process.env.VECTOR_DIMENSION) || 1536;
            if (!Array.isArray(query_embedding) || query_embedding.length !== expectedDimension) {
                return res.status(400).json({ 
                    error: `Invalid embedding dimension. Expected ${expectedDimension}, got ${query_embedding?.length}` 
                });
            }
            
            // Perform vector similarity search using pgvector
            // Convert array to PostgreSQL vector format: '[1.0, 2.0, 3.0]'
            const vectorString = `[${query_embedding.join(',')}]`;
            
            const searchQuery = `
                SELECT 
                    document_id,
                    chunk_text,
                    chunk_index,
                    metadata,
                    1 - (embedding <=> $1::vector) as similarity
                FROM rag_vectors
                WHERE tenant_id = $2
                    AND 1 - (embedding <=> $1::vector) > $3
                ORDER BY embedding <=> $1::vector
                LIMIT $4
            `;
            
            const results = await db.query(searchQuery, [
                vectorString,
                tenant_id,
                threshold,
                limit
            ]);
            
            const searchResults = results.rows.map(row => ({
                document_id: row.document_id,
                chunk_text: row.chunk_text,
                chunk_index: row.chunk_index,
                similarity: row.similarity,
                metadata: row.metadata
            }));
            
            const executionTime = Date.now() - startTime;
            
            // Log search to vector_search_logs table
            try {
                await db.query(
                    `INSERT INTO vector_search_logs 
                     (tenant_id, query_vector, result_count, threshold, execution_time_ms, filters_applied)
                     VALUES ($1, $2::vector, $3, $4, $5, $6)`,
                    [
                        tenant_id,
                        vectorString,
                        searchResults.length,
                        threshold,
                        executionTime,
                        filters ? JSON.stringify(filters) : null
                    ]
                );
            } catch (logError) {
                // Don't fail the search if logging fails
                console.error('Failed to log vector search:', logError);
            }
            
            // Track vector search action
            await resolveWebhook.trackAction({
                action: 'vector-search',
                source: 'RAG_VectorSearch',
                userEmail: 'actions-platform',
                tenantId: tenant_id,
                metadata: {
                    results_count: searchResults.length,
                    threshold: threshold,
                    limit: limit,
                    execution_time_ms: executionTime
                }
            });
            
            res.json({
                success: true,
                results: searchResults,
                execution_time_ms: executionTime
            });
            
        } catch (error) {
            console.error('Vector search error:', error);
            console.error('Vector search error details:', {
                message: error.message,
                code: error.code,
                detail: error.detail,
                query: error.query,
                stack: error.stack
            });
            
            // Log detailed error to database for admin review
            try {
                await db.query(
                    `INSERT INTO vector_search_logs 
                     (tenant_id, query_vector, result_count, threshold, execution_time_ms, filters_applied, error_message, error_code)
                     VALUES ($1, NULL, -1, $2, $3, $4, $5, $6)`,
                    [
                        tenant_id,
                        threshold,
                        Date.now() - startTime,
                        filters ? JSON.stringify(filters) : null,
                        JSON.stringify({
                            message: error.message,
                            code: error.code,
                            detail: error.detail,
                            hint: error.hint,
                            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
                        }),
                        error.code || 'UNKNOWN'
                    ]
                );
            } catch (logErr) {
                console.error('Failed to log error:', logErr);
            }
            
            // Provide more informative error response
            const errorResponse = {
                error: 'Search failed',
                message: error.message,
                timestamp: new Date().toISOString(),
                request_id: message_id || crypto.randomUUID()
            };
            
            // Add specific error details for common issues
            if (error.message?.includes('type "vector" does not exist')) {
                errorResponse.hint = 'pgvector extension not installed or enabled in database';
                errorResponse.solution = 'Run: CREATE EXTENSION IF NOT EXISTS vector;';
            } else if (error.message?.includes('vector') || error.message?.includes('operator')) {
                errorResponse.hint = 'Vector type casting issue - please check embedding format';
            } else if (error.code === '22P02') {
                errorResponse.hint = 'Invalid input syntax for vector type';
            } else if (error.code === '42883') {
                errorResponse.hint = 'pgvector extension missing - vector type not recognized';
            }
            
            res.status(500).json(errorResponse);
        }
    });

    // 4. Chat (Fire-and-forget with callback)
    router.post('/chat', validateTenantMW, rateLimit, async (req, res) => {
        try {
            const { message, conversation_id } = req.body;
            
            if (!message || message.length > 1000) {
                return res.status(400).json({ error: 'Valid message required (max 1000 chars)' });
            }
            
            let convId = conversation_id || crypto.randomUUID();
            const messageId = crypto.randomUUID();
            
            // Generate callback token for this message
            const callbackToken = crypto.randomBytes(32).toString('hex');
            
            // Store user message immediately
            try {
                // First ensure conversation exists
                console.log(`[CHAT] Creating conversation: ${convId}, Tenant: ${req.tenantId}, User: ${req.userEmail}`);
                
                const convResult = await db.query(
                    `INSERT INTO rag_conversations (conversation_id, tenant_id, user_email, status) 
                     VALUES ($1, $2, $3, $4) 
                     ON CONFLICT (conversation_id) DO NOTHING
                     RETURNING id`,
                    [convId, req.tenantId, req.userEmail, 'active']
                );
                
                console.log(`[CHAT] Conversation insert result:`, convResult.rows);
                
                // Store user message
                await db.query(
                    'INSERT INTO rag_messages (conversation_id, tenant_id, role, message) VALUES ($1, $2, $3, $4)',
                    [convId, req.tenantId, 'user', message]
                );
                
                // Store pending callback info
                await db.query(
                    `INSERT INTO rag_webhook_failures (tenant_id, webhook_type, payload, status) 
                     VALUES ($1, $2, $3, $4)`,
                    [req.tenantId, 'chat_callback', JSON.stringify({
                        message_id: messageId,
                        conversation_id: convId,
                        callback_token: callbackToken
                    }), 'pending']
                );
            } catch (dbErr) {
                console.log('Database operation:', dbErr.message);
            }
            
            // Get app_url from database or use environment variable as fallback
            let appUrl = process.env.APP_URL || 'http://localhost:5000';
            try {
                const configResult = await db.query(
                    'SELECT value FROM system_config WHERE key = $1',
                    ['app_url']
                );
                if (configResult.rows.length > 0) {
                    appUrl = configResult.rows[0].value;
                }
            } catch (configError) {
                console.log('Using environment APP_URL:', appUrl);
            }
            
            // Prepare message data for both webhook and queue
            const callbackUrl = `${appUrl}/api/rag/chat-callback/${messageId}`;
            const vectorSearchUrl = `${appUrl}/api/rag/vector-search`;
            
            const chatPayload = {
                source: 'onboarding',
                action: 'process-chat-message',
                userEmail: req.userEmail,
                tenantId: req.tenantId,
                conversation_id: convId,
                message_id: messageId,
                customer_message: message,
                callback_url: callbackUrl,
                callback_token: callbackToken,
                vector_search_url: vectorSearchUrl,
                timestamp: new Date().toISOString(),
                queue_name: 'chat.responses',
            };

            // Dual-mode publishing based on RABBITMQ_CHAT_MODE
            const chatMode = process.env.RABBITMQ_CHAT_MODE || 'webhook_only';
            
            try {
                switch(chatMode) {
                    case 'queue_only':
                        console.log(`[CHAT] Queue-only mode: Publishing message ${messageId} to RabbitMQ`);
                        await getRabbitMQInstance().publishChatMessage(chatPayload);
                        break;
                        
                    case 'hybrid':
                        console.log(`[CHAT] Hybrid mode: Publishing message ${messageId} to both webhook and RabbitMQ`);
                        // Send to both webhook and queue
                        const webhookPromise = resolveWebhook.sendProxyEvent(chatPayload).catch(err => {
                            console.error('[CHAT] Webhook failed in hybrid mode:', err);
                            return { success: false, error: err.message };
                        });
                        
                        const queuePromise = getRabbitMQInstance().publishChatMessage(chatPayload).catch(err => {
                            console.error('[CHAT] RabbitMQ failed in hybrid mode:', err);
                            return { success: false, error: err.message };
                        });
                        
                        // Wait for both (don't fail if one fails)
                        await Promise.allSettled([webhookPromise, queuePromise]);
                        break;
                        
                    case 'webhook_only':
                    default:
                        console.log(`[CHAT] Webhook-only mode: Sending message ${messageId} via webhook`);
                        await resolveWebhook.sendProxyEvent(chatPayload).catch(err => {
                            console.error('[CHAT] Webhook failed:', err);
                        });
                        break;
                }
            } catch (error) {
                console.error(`[CHAT] Error in ${chatMode} mode:`, error);
                // Don't fail the request if publishing fails
            }
            
            // Immediately return processing message
            res.json({
                success: true,
                conversation_id: convId,
                message_id: messageId,
                message: 'I\'m processing your message and will respond shortly...',
                status: 'processing',
                response_time_ms: Date.now() - Date.now()
            });
            
        } catch (error) {
            console.error('Chat error:', error);
            res.status(500).json({ error: 'Service temporarily unavailable' });
        }
    });

    // 4b. Document Processing Callback (receives processed markdown from actions platform)
    router.post('/document-callback/:document_id', async (req, res) => {
        try {
            const { document_id } = req.params;
            const { tenant_id, markdown } = req.body;
            
            // Validate callback token from Authorization header
            const authHeader = req.headers['authorization'];
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'Missing or invalid authorization header' });
            }
            
            const providedToken = authHeader.replace('Bearer ', '');
            
            console.log(`[DOCUMENT CALLBACK] Received callback for document ${document_id}`);
            
            // Validate document exists and token matches
            const docResult = await db.query(
                `SELECT callback_token, token_expires_at, tenant_id 
                 FROM rag_documents 
                 WHERE document_id = $1`,
                [document_id]
            );
            
            if (docResult.rows.length === 0) {
                return res.status(404).json({ error: 'Document not found' });
            }
            
            const doc = docResult.rows[0];
            
            // No expiry check - document tokens are permanent
            // This allows external systems to process documents at any time
            
            // Validate token
            if (doc.callback_token !== providedToken) {
                console.warn(`[DOCUMENT CALLBACK] Token mismatch for document ${document_id}`);
                return res.status(401).json({ error: 'Invalid callback token' });
            }
            
            // Validate tenant_id matches
            if (tenant_id && doc.tenant_id !== tenant_id) {
                console.warn(`[DOCUMENT CALLBACK] Tenant mismatch for document ${document_id}`);
                return res.status(403).json({ error: 'Tenant mismatch' });
            }
            
            // Update document with processed markdown
            // Keep the callback token for future reprocessing or external system access
            await db.query(
                `UPDATE rag_documents 
                 SET processed_markdown = $1, 
                     status = $2, 
                     updated_at = CURRENT_TIMESTAMP
                 WHERE document_id = $3`,
                [markdown, 'ready', document_id]
            );
            
            console.log(`[DOCUMENT CALLBACK] Successfully updated document ${document_id} with processed markdown`);
            
            // Emit SSE event for document status update
            if (global.knowledgeSSEClients && global.knowledgeSSEClients[doc.tenant_id]) {
                const sseMessage = JSON.stringify({
                    type: 'document-status',
                    document_id: document_id,
                    status: 'ready',
                    metadata: {
                        markdown_length: markdown?.length || 0,
                        timestamp: new Date().toISOString()
                    }
                });
                
                const clientCount = Object.keys(global.knowledgeSSEClients[doc.tenant_id]).length;
                console.log(`[DOCUMENT CALLBACK] Broadcasting SSE to ${clientCount} clients for tenant ${doc.tenant_id}`);
                
                Object.values(global.knowledgeSSEClients[doc.tenant_id]).forEach(client => {
                    try {
                        client.write(`data: ${sseMessage}\n\n`);
                        console.log(`[DOCUMENT CALLBACK] Successfully sent SSE event for document ${document_id} with status 'ready'`);
                    } catch (err) {
                        console.error(`[DOCUMENT CALLBACK] Failed to send SSE event:`, err.message);
                    }
                });
            } else {
                console.warn(`[DOCUMENT CALLBACK] No SSE clients connected for tenant ${doc.tenant_id} - cannot send update for document ${document_id}`);
            }
            
            // Track the callback
            const ResolveWebhook = require('../utils/resolve-webhook');
            const resolveWebhook = new ResolveWebhook();
            await resolveWebhook.trackAction({
                action: 'document-processing-callback',
                source: 'RAG_DocumentCallback',
                userEmail: 'actions-platform',
                tenantId: doc.tenant_id,
                metadata: {
                    document_id: document_id,
                    markdown_length: markdown?.length || 0
                }
            });
            
            res.json({
                success: true,
                message: 'Document processed successfully',
                document_id: document_id
            });
            
        } catch (error) {
            console.error('[DOCUMENT CALLBACK] Error:', error);
            res.status(500).json({ error: 'Failed to process callback' });
        }
    });
    
    // Add endpoint to view document content
    router.get('/document/:document_id/view', validateTenantMW, async (req, res) => {
        try {
            const { document_id } = req.params;
            
            // Get document with processed markdown or original content
            const result = await db.query(
                `SELECT 
                    document_id,
                    original_filename,
                    COALESCE(processed_markdown, content) as display_content,
                    processed_markdown IS NOT NULL as is_processed,
                    status,
                    file_type,
                    created_at,
                    metadata
                FROM rag_documents 
                WHERE document_id = $1 AND tenant_id = $2`,
                [document_id, req.tenantId]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Document not found' });
            }
            
            res.json({
                success: true,
                document: result.rows[0]
            });
            
        } catch (error) {
            console.error('Error viewing document:', error);
            res.status(500).json({ error: 'Failed to retrieve document' });
        }
    });
    
    // 5. Callback endpoint for Resolve platform to send AI response
    // Support both single ID and double ID patterns
    router.post('/chat-callback/:message_id/:second_id?', async (req, res) => {
        try {
            const { message_id } = req.params;
            const { 
                conversation_id,
                tenant_id,  // IMPORTANT: Resolve must send this back
                ai_response, 
                callback_token,
                processing_time_ms,
                sources = []
            } = req.body;
            
            console.log(`[CHAT CALLBACK] Received response for message ${message_id}`);
            
            // Validate callback token (optional security check)
            // Only validate if we have a record of this callback in webhook_failures
            if (callback_token) {
                const validationResult = await db.query(
                    `SELECT * FROM rag_webhook_failures 
                     WHERE webhook_type = 'chat_callback' 
                     AND payload::jsonb->>'message_id' = $1`,
                    [message_id]
                );
                
                // Only validate token if we have a record of this webhook
                if (validationResult.rows.length > 0) {
                    const expectedToken = validationResult.rows[0].payload?.callback_token;
                    if (expectedToken && expectedToken !== callback_token) {
                        console.warn('[CHAT CALLBACK] Token mismatch');
                        return res.status(401).json({ error: 'Invalid callback token' });
                    }
                    
                    // Mark callback as completed
                    await db.query(
                        `UPDATE rag_webhook_failures 
                         SET status = 'completed', updated_at = CURRENT_TIMESTAMP 
                         WHERE webhook_type = 'chat_callback' 
                         AND payload::jsonb->>'message_id' = $1`,
                        [message_id]
                    );
                } else {
                    // No record of this webhook, allow it through (external system callback)
                    console.log('[CHAT CALLBACK] No webhook record found, processing as external callback');
                }
            } else {
                console.log('[CHAT CALLBACK] No callback token provided, processing without validation');
            }
            
            // Store AI response in messages
            if (conversation_id && ai_response) {
                try {
                    // Validate tenant_id matches conversation
                    const convResult = await db.query(
                        'SELECT tenant_id FROM rag_conversations WHERE conversation_id = $1',
                        [conversation_id]
                    );
                
                if (convResult.rows.length > 0) {
                    const dbTenantId = convResult.rows[0].tenant_id;
                    
                    // SECURITY: Verify tenant_id matches
                    if (tenant_id && dbTenantId !== tenant_id) {
                        console.error(`[CHAT CALLBACK] Tenant mismatch! Expected ${dbTenantId}, got ${tenant_id}`);
                        return res.status(403).json({ error: 'Tenant mismatch' });
                    }
                    
                    // Store assistant response
                    await db.query(
                        'INSERT INTO rag_messages (conversation_id, tenant_id, role, message, response_time_ms) VALUES ($1, $2, $3, $4, $5)',
                        [conversation_id, dbTenantId, 'assistant', ai_response, processing_time_ms || null]
                    );
                    
                    console.log(`[CHAT CALLBACK] Stored AI response for conversation ${conversation_id}`);
                    console.log(`[CHAT CALLBACK] Checking SSE clients for tenant ${dbTenantId}`);
                    console.log(`[CHAT CALLBACK] global.sseClients exists:`, !!global.sseClients);
                    console.log(`[CHAT CALLBACK] Available tenants:`, global.sseClients ? Object.keys(global.sseClients) : 'none');
                    
                    // Trigger SSE event for this tenant/conversation
                    if (global.sseClients && global.sseClients[dbTenantId]) {
                        const sseMessage = JSON.stringify({
                            type: 'chat-response',
                            conversation_id: conversation_id,
                            message_id: message_id,
                            ai_response: ai_response,
                            sources: sources,
                            timestamp: new Date().toISOString()
                        });
                        
                        // Send to all SSE clients for this tenant
                        const clientCount = Object.keys(global.sseClients[dbTenantId]).length;
                        console.log(`[CHAT CALLBACK] Found ${clientCount} SSE clients for tenant ${dbTenantId}`);
                        
                        Object.values(global.sseClients[dbTenantId]).forEach(client => {
                            try {
                                client.write(`data: ${sseMessage}\n\n`);
                                console.log(`[CHAT CALLBACK] Successfully sent SSE event`);
                            } catch (err) {
                                console.error(`[CHAT CALLBACK] Failed to send SSE event:`, err.message);
                            }
                        });
                        
                        console.log(`[CHAT CALLBACK] Sent SSE event to ${clientCount} clients for tenant ${dbTenantId}`);
                    } else {
                        console.log(`[CHAT CALLBACK] No SSE clients connected for tenant ${dbTenantId}`);
                        console.log(`[CHAT CALLBACK] Available tenants:`, global.sseClients ? Object.keys(global.sseClients) : 'none');
                    }
                } else {
                    console.log(`[CHAT CALLBACK] Conversation ${conversation_id} not found in database`);
                }
                } catch (dbError) {
                    console.log(`[CHAT CALLBACK] Database error (non-critical):`, dbError.message);
                    // Continue processing even if we can't store in database
                }
            }
            
            // Send success response back to Resolve
            res.json({ 
                success: true, 
                message: 'Response received and stored',
                message_id: message_id
            });
            
        } catch (error) {
            console.error('[CHAT CALLBACK] Error processing callback:', error);
            res.status(500).json({ error: 'Failed to process callback' });
        }
    });
    
    // 6. Get new messages since last check (for polling)
    router.get('/conversation/:conversation_id/new-messages', validateTenantMW, async (req, res) => {
        try {
            const { conversation_id } = req.params;
            const { since } = req.query; // ISO timestamp of last message received
            
            // Get messages newer than 'since' timestamp
            const query = since 
                ? `SELECT * FROM rag_messages 
                   WHERE conversation_id = $1 AND tenant_id = $2 AND created_at > $3
                   ORDER BY created_at ASC`
                : `SELECT * FROM rag_messages 
                   WHERE conversation_id = $1 AND tenant_id = $2
                   ORDER BY created_at DESC LIMIT 10`;
            
            const params = since 
                ? [conversation_id, req.tenantId, since]
                : [conversation_id, req.tenantId];
                
            const messagesResult = await db.query(query, params);
            
            res.json({
                success: true,
                messages: messagesResult.rows,
                count: messagesResult.rows.length,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Get new messages error:', error);
            res.status(500).json({ error: 'Unable to retrieve messages' });
        }
    });
    
    // 6b. Validate conversation endpoint (must be before general conversation route)
    router.get('/conversation/:conversation_id/validate', validateTenantMW, async (req, res) => {
        const { conversation_id } = req.params;
        const tenantId = req.tenantId;
        
        try {
            const result = await db.query(
                'SELECT conversation_id FROM rag_conversations WHERE conversation_id = $1 AND tenant_id = $2',
                [conversation_id, tenantId]
            );
            
            if (result.rows.length > 0) {
                res.json({ valid: true, conversation_id: conversation_id });
            } else {
                res.status(404).json({ valid: false, error: 'Conversation not found' });
            }
        } catch (error) {
            console.error('Conversation validation error:', error);
            res.status(500).json({ valid: false, error: 'Validation failed' });
        }
    });
    
    // 7. Get Conversation History
    router.get('/conversation/:conversation_id', validateTenantMW, async (req, res) => {
        try {
            const { conversation_id } = req.params;
            
            // Get conversation details
            const convResult = await db.query(
                'SELECT * FROM rag_conversations WHERE conversation_id = $1 AND tenant_id = $2',
                [conversation_id, req.tenantId]
            );
            
            if (convResult.rows.length === 0) {
                return res.status(404).json({ error: 'Conversation not found' });
            }
            
            // Get all messages
            const messagesResult = await db.query(
                'SELECT * FROM rag_messages WHERE conversation_id = $1 ORDER BY created_at ASC',
                [conversation_id]
            );
            
            // Track conversation history retrieval
            await resolveWebhook.trackAction({
                action: 'get-conversation',
                source: 'RAG_History',
                userEmail: req.userEmail,
                tenantId: req.tenantId,
                metadata: {
                    conversation_id: conversation_id,
                    message_count: messagesResult.rows.length
                }
            });
            
            res.json({
                success: true,
                conversation: convResult.rows[0],
                messages: messagesResult.rows
            });
            
        } catch (error) {
            console.error('Get conversation error:', error);
            res.status(500).json({ error: 'Unable to retrieve conversation' });
        }
    });
    
    // 7. Delete Conversation
    router.delete('/conversation/:conversation_id', validateTenantMW, async (req, res) => {
        try {
            const { conversation_id } = req.params;
            
            console.log(`[DELETE CONVERSATION] User ${req.userEmail} deleting conversation ${conversation_id}`);
            
            // Verify the conversation belongs to this user
            const convResult = await db.query(
                'SELECT * FROM rag_conversations WHERE conversation_id = $1 AND tenant_id = $2 AND user_email = $3',
                [conversation_id, req.tenantId, req.userEmail]
            );
            
            if (convResult.rows.length === 0) {
                return res.status(404).json({ error: 'Conversation not found or access denied' });
            }
            
            // Delete all messages first (due to foreign key constraint)
            await db.query(
                'DELETE FROM rag_messages WHERE conversation_id = $1',
                [conversation_id]
            );
            
            // Delete the conversation
            await db.query(
                'DELETE FROM rag_conversations WHERE conversation_id = $1',
                [conversation_id]
            );
            
            console.log(`[DELETE CONVERSATION] Successfully deleted conversation ${conversation_id}`);
            
            res.json({ success: true, message: 'Conversation deleted successfully' });
            
        } catch (error) {
            console.error('Delete conversation error:', error);
            res.status(500).json({ error: 'Unable to delete conversation' });
        }
    });
    
    // 8. SSE endpoint for real-time chat updates
    router.get('/chat-stream/:conversation_id', validateTenantMW, async (req, res) => {
        const { conversation_id } = req.params;
        const tenantId = req.tenantId;
        const clientId = crypto.randomUUID();
        
        console.log(`[SSE] New connection request for conversation: ${conversation_id}, tenant: ${tenantId}`);
        
        // Validate conversation belongs to this tenant
        const convResult = await db.query(
            'SELECT * FROM rag_conversations WHERE conversation_id = $1 AND tenant_id = $2',
            [conversation_id, tenantId]
        );
        
        if (convResult.rows.length === 0) {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        
        // Set SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });
        
        // Initialize global SSE clients storage if not exists
        if (!global.sseClients) {
            global.sseClients = {};
        }
        if (!global.sseClients[tenantId]) {
            global.sseClients[tenantId] = {};
        }
        
        // Store this client connection
        global.sseClients[tenantId][clientId] = res;
        
        console.log(`[SSE] Client ${clientId} connected for tenant ${tenantId}, conversation ${conversation_id}`);
        console.log(`[SSE] Total clients for tenant: ${Object.keys(global.sseClients[tenantId]).length}`);
        console.log(`[SSE] All registered tenants:`, Object.keys(global.sseClients));
        
        // Send initial connection message
        res.write(`data: ${JSON.stringify({
            type: 'connected',
            conversation_id: conversation_id,
            message: 'Connected to chat stream'
        })}\n\n`);
        
        // CRITICAL: Flush the response to trigger browser onopen event
        if (res.flush) {
            res.flush();
        }
        
        // Send heartbeat every 15 seconds to keep connection alive (more aggressive to prevent timeouts)
        const heartbeatInterval = setInterval(() => {
            try {
                res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`);
            } catch (error) {
                console.error(`[SSE] Error sending heartbeat to client ${clientId}:`, error);
                clearInterval(heartbeatInterval);
            }
        }, 15000);
        
        // Handle client disconnect
        req.on('close', () => {
            clearInterval(heartbeatInterval);
            if (global.sseClients[tenantId]) {
                delete global.sseClients[tenantId][clientId];
                console.log(`[SSE] Client ${clientId} disconnected from tenant ${tenantId}`);
            }
        });
    });

    // 9. SSE endpoint for knowledge base updates
    router.get('/knowledge-stream', validateTenantMW, async (req, res) => {
        const tenantId = req.tenantId;
        const clientId = crypto.randomUUID();
        
        console.log(`[KNOWLEDGE SSE] New connection request for tenant: ${tenantId}`);
        
        // Set SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });
        
        // Initialize global knowledge SSE clients storage if not exists
        if (!global.knowledgeSSEClients) {
            global.knowledgeSSEClients = {};
        }
        if (!global.knowledgeSSEClients[tenantId]) {
            global.knowledgeSSEClients[tenantId] = {};
        }
        
        // Store this client connection
        global.knowledgeSSEClients[tenantId][clientId] = res;
        
        console.log(`[KNOWLEDGE SSE] Client ${clientId} connected for tenant ${tenantId}`);
        console.log(`[KNOWLEDGE SSE] Total clients for tenant: ${Object.keys(global.knowledgeSSEClients[tenantId]).length}`);
        
        // Send initial connection message
        res.write(`data: ${JSON.stringify({
            type: 'connected',
            message: 'Connected to knowledge base stream'
        })}\n\n`);
        
        // Send heartbeat every 15 seconds to keep connection alive
        const heartbeatInterval = setInterval(() => {
            try {
                res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`);
            } catch (error) {
                console.error(`[KNOWLEDGE SSE] Error sending heartbeat to client ${clientId}:`, error);
                clearInterval(heartbeatInterval);
            }
        }, 15000);
        
        // Handle client disconnect
        req.on('close', () => {
            clearInterval(heartbeatInterval);
            if (global.knowledgeSSEClients[tenantId]) {
                delete global.knowledgeSSEClients[tenantId][clientId];
                console.log(`[KNOWLEDGE SSE] Client ${clientId} disconnected from tenant ${tenantId}`);
            }
        });
    });

    // 8. TEST ENDPOINT - Removed, using real callbacks only
    /* router.post('/test-sse-message', validateTenantMW, async (req, res) => {
        try {
            const { conversation_id, message, message_type = 'test' } = req.body;
            const tenantId = req.tenantId;
            
            console.log('[TEST SSE] Sending test message to conversation:', conversation_id);
            console.log('[TEST SSE] Tenant ID:', tenantId);
            console.log('[TEST SSE] Message:', message);
            
            // Check if conversation exists
            const conversationResult = await db.query(
                'SELECT id, conversation_id FROM rag_conversations WHERE conversation_id = $1',
                [conversation_id]
            );
            
            if (conversationResult.rows.length === 0) {
                return res.status(404).json({ 
                    error: 'Conversation not found',
                    conversation_id: conversation_id 
                });
            }
            
            // Create a test message ID
            const testMessageId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            // Check if we have SSE clients for this tenant
            if (!global.sseClients || !global.sseClients[tenantId]) {
                return res.status(400).json({ 
                    error: 'No SSE clients connected for this tenant',
                    tenant_id: tenantId,
                    hint: 'Make sure the chat UI is open and connected to SSE stream' 
                });
            }
            
            // Prepare the SSE message
            const sseMessage = JSON.stringify({
                type: message_type === 'test' ? 'test-message' : 'chat-response',
                conversation_id: conversation_id,
                message_id: testMessageId,
                content: message || 'This is a test message sent directly to SSE stream',
                role: 'assistant',
                timestamp: new Date().toISOString(),
                is_test: true
            });
            
            // Send to all SSE clients for this tenant
            let clientCount = 0;
            Object.values(global.sseClients[tenantId]).forEach(client => {
                try {
                    client.write(`data: ${sseMessage}\n\n`);
                    clientCount++;
                } catch (err) {
                    console.error('[TEST SSE] Error sending to client:', err);
                }
            });
            
            console.log(`[TEST SSE] Message sent to ${clientCount} clients`);
            
            // Also optionally store in database if you want to test full flow
            if (req.body.store_in_db) {
                await db.query(
                    `INSERT INTO rag_messages (conversation_id, tenant_id, role, message)
                     VALUES ($1, $2, $3, $4)`,
                    [conversation_id, tenantId, 'assistant', message]
                );
                console.log('[TEST SSE] Message also stored in database');
            }
            
            res.json({ 
                success: true,
                message: `Test message sent to ${clientCount} SSE clients`,
                message_id: testMessageId,
                conversation_id: conversation_id,
                tenant_id: tenantId,
                clients_notified: clientCount
            });
            
        } catch (error) {
            console.error('[TEST SSE] Error:', error);
            res.status(500).json({ 
                error: 'Failed to send test message',
                details: error.message 
            });
        }
    }); */
    
    // Debug route to catch any callback attempts that don't match
    router.post('/chat-callback/*', async (req, res) => {
        console.log('[CHAT CALLBACK DEBUG] Unmatched callback URL:', req.originalUrl);
        console.log('[CHAT CALLBACK DEBUG] URL params:', req.params);
        console.log('[CHAT CALLBACK DEBUG] Body:', JSON.stringify(req.body, null, 2));
        
        // Try to extract message_id from the URL
        const urlParts = req.originalUrl.split('/');
        const messageIdIndex = urlParts.indexOf('chat-callback') + 1;
        const message_id = urlParts[messageIdIndex];
        
        if (message_id) {
            console.log('[CHAT CALLBACK DEBUG] Extracted message_id:', message_id);
            // Process as normal callback
            req.params.message_id = message_id;
            // Continue with normal processing (delegate to the main handler logic)
            res.status(200).json({ 
                success: true, 
                message: 'Callback received (debug route)',
                message_id: message_id
            });
        } else {
            res.status(400).json({ 
                error: 'Invalid callback URL format',
                received_url: req.originalUrl 
            });
        }
    });

    // 8a. List all documents for a tenant
    router.get('/documents', validateTenantMW, async (req, res) => {
        try {
            const { limit = 50, offset = 0 } = req.query;
            
            // Get documents for this tenant
            const result = await db.query(
                `SELECT document_id, original_filename, file_type, file_size, 
                        status, created_at, updated_at,
                        CASE WHEN processed_markdown IS NOT NULL THEN true ELSE false END as has_markdown
                 FROM rag_documents 
                 WHERE tenant_id = $1 
                 AND original_filename IS NOT NULL
                 ORDER BY created_at DESC
                 LIMIT $2 OFFSET $3`,
                [req.tenantId, limit, offset]
            );
            
            res.json({
                success: true,
                documents: result.rows
            });
            
        } catch (error) {
            console.error('List documents error:', error);
            res.status(500).json({ error: 'Failed to list documents' });
        }
    });
    
    // 8b. Get document status
    router.get('/document-status/:document_id', validateTenantMW, async (req, res) => {
        try {
            const { document_id } = req.params;
            
            // Get document status
            const result = await db.query(
                `SELECT document_id, original_filename, file_type, file_size, 
                        status, created_at, updated_at,
                        CASE WHEN processed_markdown IS NOT NULL THEN true ELSE false END as has_markdown
                 FROM rag_documents 
                 WHERE document_id = $1 AND tenant_id = $2`,
                [document_id, req.tenantId]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Document not found' });
            }
            
            const doc = result.rows[0];
            
            // Check for failed webhook retries
            const retryResult = await db.query(
                `SELECT status, retry_count, max_retries, last_error 
                 FROM rag_webhook_failures 
                 WHERE webhook_type = 'document-processing' 
                 AND payload::jsonb->>'document_id' = $1
                 ORDER BY created_at DESC LIMIT 1`,
                [document_id]
            );
            
            if (retryResult.rows.length > 0) {
                doc.webhook_status = retryResult.rows[0];
            }
            
            res.json({
                success: true,
                document: doc
            });
            
        } catch (error) {
            console.error('Get document status error:', error);
            res.status(500).json({ error: 'Failed to get document status' });
        }
    });
    
    // 8c. Retry failed document processing
    router.post('/document-retry/:document_id', validateTenantMW, async (req, res) => {
        try {
            const { document_id } = req.params;
            
            // Verify document exists and belongs to tenant
            const docResult = await db.query(
                'SELECT * FROM rag_documents WHERE document_id = $1 AND tenant_id = $2',
                [document_id, req.tenantId]
            );
            
            if (docResult.rows.length === 0) {
                return res.status(404).json({ error: 'Document not found' });
            }
            
            const doc = docResult.rows[0];
            
            // Generate new callback token
            const newCallbackToken = crypto.randomBytes(32).toString('hex');
            // No expiry - tokens are permanent for document processing
            
            // Update document with new token but keep it permanent
            await db.query(
                `UPDATE rag_documents 
                 SET callback_token = $1, token_expires_at = NULL, status = 'processing' 
                 WHERE document_id = $2`,
                [newCallbackToken, document_id]
            );
            
            // Get app URL
            let appUrl = process.env.APP_URL || 'http://localhost:5000';
            try {
                const configResult = await db.query(
                    'SELECT value FROM system_config WHERE key = $1',
                    ['app_url']
                );
                if (configResult.rows.length > 0) {
                    appUrl = configResult.rows[0].value;
                }
            } catch (configError) {
                console.log('Using environment APP_URL:', appUrl);
            }
            
            // Retry webhook to actions platform
            try {
                await resolveWebhook.sendDocumentProcessingEvent({
                    source: 'onboarding',
                    action: 'document-processing',
                    document_id: document_id,
                    document_url: `${appUrl}/api/documents/${document_id}`,
                    callback_url: `${appUrl}/api/rag/document-callback/${document_id}`,
                    callback_token: newCallbackToken,
                    file_type: doc.file_type,
                    file_size: doc.file_size,
                    original_filename: doc.original_filename
                });
                
                res.json({
                    success: true,
                    message: 'Document resubmitted for processing',
                    document_id: document_id
                });
                
            } catch (webhookError) {
                // Add to retry queue
                await db.query(
                    `INSERT INTO rag_webhook_failures (tenant_id, webhook_type, payload, next_retry_at) 
                     VALUES ($1, $2, $3, $4)`,
                    [req.tenantId, 'document-processing', JSON.stringify({
                        source: 'onboarding',
                        action: 'document-processing',
                        document_id: document_id,
                        document_url: `${appUrl}/api/documents/${document_id}`,
                        callback_url: `${appUrl}/api/rag/document-callback/${document_id}`,
                        callback_token: newCallbackToken
                    }), new Date(Date.now() + 60000)]
                );
                
                res.json({
                    success: true,
                    message: 'Document added to retry queue',
                    document_id: document_id
                });
            }
            
        } catch (error) {
            console.error('Document retry error:', error);
            res.status(500).json({ error: 'Failed to retry document processing' });
        }
    });
    
    // 9. Get recent conversations for the current user
    router.get('/recent-conversations', validateTenantMW, async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const offset = parseInt(req.query.offset) || 0;
            
            console.log('[RECENT CHATS] Request details:', {
                tenantId: req.tenantId,
                userEmail: req.userEmail,
                limit,
                offset
            });

            // Get recent conversations with their latest message
            const query = `
                SELECT DISTINCT
                    c.conversation_id,
                    c.created_at as conversation_created_at,
                    c.updated_at as conversation_updated_at,
                    (
                        SELECT m.message 
                        FROM rag_messages m 
                        WHERE m.conversation_id = c.conversation_id 
                        AND m.role = 'user'
                        ORDER BY m.created_at DESC 
                        LIMIT 1
                    ) as last_user_message,
                    (
                        SELECT m.created_at 
                        FROM rag_messages m 
                        WHERE m.conversation_id = c.conversation_id 
                        ORDER BY m.created_at DESC 
                        LIMIT 1
                    ) as last_message_time,
                    (
                        SELECT COUNT(*) 
                        FROM rag_messages m 
                        WHERE m.conversation_id = c.conversation_id
                    ) as message_count
                FROM rag_conversations c
                WHERE c.tenant_id = $1 
                AND c.user_email = $2
                AND c.status = 'active'
                ORDER BY c.updated_at DESC
                LIMIT $3 OFFSET $4
            `;

            const result = await db.query(query, [req.tenantId, req.userEmail, limit, offset]);
            
            console.log('[RECENT CHATS] Query result rows:', result.rows.length);
            if (result.rows.length > 0) {
                console.log('[RECENT CHATS] Sample conversation:', result.rows[0]);
            }

            // Get total count for pagination
            const countResult = await db.query(
                `SELECT COUNT(*) as total 
                 FROM rag_conversations 
                 WHERE tenant_id = $1 AND user_email = $2 AND status = 'active'`,
                [req.tenantId, req.userEmail]
            );
            
            console.log('[RECENT CHATS] Total conversations:', countResult.rows[0]?.total || 0);

            const conversations = result.rows.map(row => ({
                conversation_id: row.conversation_id,
                created_at: row.conversation_created_at,
                updated_at: row.conversation_updated_at,
                last_user_message: row.last_user_message || 'New conversation',
                last_message_time: row.last_message_time,
                message_count: parseInt(row.message_count) || 0,
                preview: row.last_user_message ? 
                    (row.last_user_message.length > 60 ? 
                        row.last_user_message.substring(0, 60) + '...' : 
                        row.last_user_message) : 
                    'New conversation'
            }));

            res.json({
                success: true,
                conversations: conversations,
                pagination: {
                    limit: limit,
                    offset: offset,
                    total: parseInt(countResult.rows[0].total),
                    has_more: offset + limit < parseInt(countResult.rows[0].total)
                }
            });

        } catch (error) {
            console.error('Error fetching recent conversations:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to fetch conversations' 
            });
        }
    });

    // 10. Delete a conversation
    router.delete('/conversation/:conversationId', validateTenantMW, async (req, res) => {
        try {
            const { conversationId } = req.params;

            // Verify ownership
            const ownerCheck = await db.query(
                'SELECT 1 FROM rag_conversations WHERE conversation_id = $1 AND user_id = $2 AND tenant_id = $3',
                [conversationId, req.user.id, req.tenant.id]
            );

            if (ownerCheck.rows.length === 0) {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Delete messages first (due to foreign key)
            await db.query('DELETE FROM rag_messages WHERE conversation_id = $1', [conversationId]);
            
            // Delete conversation
            await db.query('DELETE FROM rag_conversations WHERE conversation_id = $1', [conversationId]);

            res.json({ success: true, message: 'Conversation deleted successfully' });
        } catch (error) {
            console.error('Error deleting conversation:', error);
            res.status(500).json({ error: 'Failed to delete conversation' });
        }
    });
    
    // Delete document
    router.delete('/document/:documentId', validateTenantMW, async (req, res) => {
        const { documentId } = req.params;
        const { tenantId } = req;
        
        try {
            // Delete the document from database
            const result = await db.query(
                'DELETE FROM rag_documents WHERE document_id = $1 AND tenant_id = $2',
                [documentId, tenantId]
            );
            
            if (result.rowCount > 0) {
                console.log(`Document ${documentId} deleted successfully for tenant ${tenantId}`);
                res.json({ 
                    success: true, 
                    message: 'Document deleted successfully'
                });
            } else {
                res.status(404).json({ 
                    success: false, 
                    error: 'Document not found'
                });
            }
        } catch (error) {
            console.error('Error deleting document:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to delete document' 
            });
        }
    });

    // New endpoint: GET /api/tenant/:tenantId/documents/:documentId/markdown
    // Retrieve processed markdown for viewing
    router.get('/tenant/:tenantId/documents/:documentId/markdown', validateTenantMW, async (req, res) => {
        try {
            const { tenantId, documentId } = req.params;
            
            // Verify tenant access
            if (req.tenantId !== tenantId) {
                return res.status(403).json({ error: 'Access denied' });
            }
            
            // Retrieve processed markdown
            const result = await db.query(
                `SELECT 
                    document_id,
                    processed_markdown,
                    original_filename,
                    file_type,
                    updated_at as processed_at,
                    status
                 FROM rag_documents 
                 WHERE tenant_id = $1 AND document_id = $2`,
                [tenantId, documentId]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Document not found' });
            }
            
            const doc = result.rows[0];
            
            if (!doc.processed_markdown) {
                return res.status(400).json({ 
                    error: 'Document not yet processed',
                    status: doc.status 
                });
            }
            
            res.json({
                document_id: doc.document_id,
                markdown_content: doc.processed_markdown,
                original_filename: doc.original_filename,
                file_type: doc.file_type,
                processed_at: doc.processed_at
            });
            
        } catch (error) {
            console.error('[MARKDOWN ENDPOINT] Error:', error);
            res.status(500).json({ error: 'Failed to retrieve markdown' });
        }
    });

    // New endpoint: GET /api/tenant/:tenantId/vectors/stats
    // Get vector storage statistics
    router.get('/tenant/:tenantId/vectors/stats', validateTenantMW, async (req, res) => {
        try {
            const { tenantId } = req.params;
            
            // Verify tenant access
            if (req.tenantId !== tenantId) {
                return res.status(403).json({ error: 'Access denied' });
            }
            
            // Get document count
            const docCountResult = await db.query(
                'SELECT COUNT(*) as total_documents FROM rag_documents WHERE tenant_id = $1',
                [tenantId]
            );
            
            // Get vector count and stats
            const vectorStatsResult = await db.query(
                `SELECT 
                    COUNT(*) as total_vectors,
                    COUNT(DISTINCT document_id) as documents_with_vectors,
                    AVG(CHAR_LENGTH(chunk_text)) as avg_chunk_size,
                    MAX(created_at) as last_indexed
                 FROM rag_vectors 
                 WHERE tenant_id = $1`,
                [tenantId]
            );
            
            // Get storage size estimate (rough calculation)
            const storageSizeResult = await db.query(
                `SELECT 
                    pg_size_pretty(
                        COALESCE(SUM(pg_column_size(embedding)), 0) + 
                        COALESCE(SUM(pg_column_size(chunk_text)), 0)
                    ) as storage_size
                 FROM rag_vectors 
                 WHERE tenant_id = $1`,
                [tenantId]
            );
            
            const docCount = parseInt(docCountResult.rows[0].total_documents);
            const vectorStats = vectorStatsResult.rows[0];
            const vectorCount = parseInt(vectorStats.total_vectors);
            const docsWithVectors = parseInt(vectorStats.documents_with_vectors);
            
            res.json({
                tenant_id: tenantId,
                total_documents: docCount,
                total_vectors: vectorCount,
                documents_with_vectors: docsWithVectors,
                average_vectors_per_document: docsWithVectors > 0 ? Math.round(vectorCount / docsWithVectors) : 0,
                average_chunk_size: Math.round(vectorStats.avg_chunk_size || 0),
                storage_size: storageSizeResult.rows[0].storage_size,
                index_status: vectorCount > 0 ? 'active' : 'empty',
                last_indexed: vectorStats.last_indexed
            });
            
        } catch (error) {
            console.error('[VECTOR STATS] Error:', error);
            res.status(500).json({ error: 'Failed to retrieve statistics' });
        }
    });

    // New endpoint: DELETE /api/tenant/:tenantId/vectors/document/:documentId
    // Remove all vectors for a specific document
    router.delete('/tenant/:tenantId/vectors/document/:documentId', validateTenantMW, async (req, res) => {
        try {
            const { tenantId, documentId } = req.params;
            
            // Verify tenant access
            if (req.tenantId !== tenantId) {
                return res.status(403).json({ error: 'Access denied' });
            }
            
            // Get count before deletion for reporting
            const countResult = await db.query(
                'SELECT COUNT(*) as vector_count FROM rag_vectors WHERE tenant_id = $1 AND document_id = $2',
                [tenantId, documentId]
            );
            
            const vectorCount = parseInt(countResult.rows[0].vector_count);
            
            if (vectorCount === 0) {
                return res.status(404).json({ 
                    error: 'No vectors found for this document' 
                });
            }
            
            // Get storage size before deletion
            const sizeResult = await db.query(
                `SELECT 
                    pg_size_pretty(
                        COALESCE(SUM(pg_column_size(embedding)), 0) + 
                        COALESCE(SUM(pg_column_size(chunk_text)), 0)
                    ) as storage_size
                 FROM rag_vectors 
                 WHERE tenant_id = $1 AND document_id = $2`,
                [tenantId, documentId]
            );
            
            // Delete vectors
            await db.query(
                'DELETE FROM rag_vectors WHERE tenant_id = $1 AND document_id = $2',
                [tenantId, documentId]
            );
            
            // Update document status
            await db.query(
                `UPDATE rag_documents 
                 SET status = 'vectors_deleted', 
                     updated_at = CURRENT_TIMESTAMP 
                 WHERE tenant_id = $1 AND document_id = $2`,
                [tenantId, documentId]
            );
            
            // Log the deletion
            console.log(`[VECTOR DELETE] Deleted ${vectorCount} vectors for document ${documentId}`);
            
            res.json({
                success: true,
                document_id: documentId,
                vectors_deleted: vectorCount,
                space_freed: sizeResult.rows[0].storage_size
            });
            
        } catch (error) {
            console.error('[VECTOR DELETE] Error:', error);
            res.status(500).json({ error: 'Failed to delete vectors' });
        }
    });
    
    // Test endpoint for inserting test vectors (used by tests)
    router.post('/test-vectors', async (req, res) => {
        try {
            const { tenant_id, document_id, vectors } = req.body;
            
            if (!tenant_id || !document_id || !vectors) {
                return res.status(400).json({ error: 'Missing required fields' });
            }
            
            // Generate and store callback token for this tenant (for testing)
            const testToken = crypto.randomBytes(32).toString('hex');
            await db.query(
                `INSERT INTO rag_tenant_tokens (tenant_id, callback_token, created_at)
                 VALUES ($1, $2, CURRENT_TIMESTAMP)
                 ON CONFLICT (tenant_id) 
                 DO UPDATE SET callback_token = $2, updated_at = CURRENT_TIMESTAMP`,
                [tenant_id, testToken]
            );
            
            // Insert test document if it doesn't exist
            await db.query(
                `INSERT INTO rag_documents (tenant_id, document_id, original_filename, content, created_by, callback_id, status, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
                 ON CONFLICT (tenant_id, document_id) DO NOTHING`,
                [tenant_id, document_id, 'test-document.txt', 'Test content', 'test-user', `test-${document_id}`, 'vectorized']
            );
            
            // Insert test vectors
            for (const vector of vectors) {
                const expectedDimension = parseInt(process.env.VECTOR_DIMENSION) || 1536;
                if (!Array.isArray(vector.embedding) || vector.embedding.length !== expectedDimension) {
                    continue;
                }
                
                // Convert array to PostgreSQL vector format
                const vectorString = `[${vector.embedding.join(',')}]`;
                
                await db.query(
                    `INSERT INTO rag_vectors (tenant_id, document_id, chunk_text, embedding, chunk_index, metadata)
                     VALUES ($1, $2, $3, $4::vector, $5, $6)`,
                    [
                        tenant_id,
                        document_id,
                        vector.chunk_text,
                        vectorString,
                        vector.chunk_index || 0,
                        vector.metadata || {}
                    ]
                );
            }
            
            res.json({ 
                success: true, 
                message: 'Test vectors inserted',
                callback_token: testToken  // Return the token for use in tests
            });
            
        } catch (error) {
            console.error('Test vectors error:', error);
            res.status(500).json({ error: 'Failed to insert test vectors' });
        }
    });
    
    return router;
}

module.exports = createRagRouter;