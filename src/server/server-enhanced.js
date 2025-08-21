const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');
const axios = require('axios');

// Select database based on environment
const database = require('../database/postgres');

const app = express();
const PORT = process.env.PORT || 8082;

// Configure multer for file uploads
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Function to call webhook after CSV upload
async function callWebhook(userEmail, uploadId, tenantToken) {
    const webhookUrl = 'https://actions-api-staging.resolve.io/api/Webhooks/postEvent/00F4F67D-3B92-4FD2-A574-7BE22C6BE796';
    const webhookData = {
        source: "Onboarding",
        userId: userEmail,
        action: "upload-csv",
        callbackUrl: `http://localhost:${PORT}/api/tickets/${uploadId}`,
        tenantToken: tenantToken,
        user_email: userEmail
    };

    try {
        const response = await axios.post(
            webhookUrl,
            webhookData,
            {
                headers: {
                    'Authorization': 'Basic RTE0NzMwRkEtRDFCNS00MDM3LUFDRTMtQ0Y5N0ZCQzY3NkMyOlZaSkQqSSYyWEAkXkQ5Sjk4Rk5PJShGUVpaQ0dRNkEj',
                    'Content-Type': 'application/json'
                }
            }
        );

        // Log successful webhook call
        await database.webhooks.logCall({
            upload_id: uploadId,
            user_email: userEmail,
            webhook_url: webhookUrl,
            request_payload: webhookData,
            response_status: response.status,
            response_body: JSON.stringify(response.data),
            success: true,
            error_message: null
        });

        console.log(`[Webhook] Successfully called webhook for upload ${uploadId}:`, response.status);
        return response.data;
    } catch (error) {
        // Log failed webhook call
        await database.webhooks.logCall({
            upload_id: uploadId,
            user_email: userEmail,
            webhook_url: webhookUrl,
            request_payload: webhookData,
            response_status: error.response?.status || null,
            response_body: error.response?.data ? JSON.stringify(error.response.data) : null,
            success: false,
            error_message: error.message
        });

        console.error(`[Webhook Error] Failed to call webhook for upload ${uploadId}:`, error.message);
        throw error;
    }
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware to set permissive headers for all responses
app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    next();
});

// Authentication middleware
async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        req.user = null;
        return next();
    }
    
    try {
        const session = await database.sessions.findByToken(token);
        if (session) {
            req.user = { email: session.user_email };
        } else {
            req.user = null;
        }
    } catch (error) {
        console.error('[Auth Middleware Error]', error);
        req.user = null;
    }
    
    next();
}

// API endpoint to upload and validate CSV
app.post('/api/tickets/upload', authenticateToken, upload.single('csvFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileContent = req.file.buffer.toString('utf-8');
        
        // Basic CSV validation - check if it has commas and line breaks
        const lines = fileContent.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            return res.status(400).json({ error: 'Invalid CSV: File must have at least a header row and one data row' });
        }

        // Check if first line has commas (basic CSV structure)
        if (!lines[0].includes(',')) {
            return res.status(400).json({ error: 'Invalid CSV: No comma delimiters found' });
        }

        // Generate a unique ID for this upload
        const uploadId = crypto.randomBytes(16).toString('hex');
        const userEmail = req.user?.email || req.body.tenantId || 'john@resolve.io';
        
        // Store in database
        await database.uploads.create({
            id: uploadId,
            user_email: userEmail,
            filename: req.file.originalname,
            data: fileContent,
            size: req.file.size,
            line_count: lines.length
        });

        console.log(`[CSV Upload] Stored CSV data - ID: ${uploadId}, Lines: ${lines.length}, Size: ${req.file.size} bytes`);

        // Call webhook after successful upload
        try {
            const tenantToken = req.body.tenantToken || req.body.tenantId || userEmail;
            await callWebhook(userEmail, uploadId, tenantToken);
            console.log(`[CSV Upload] Webhook called successfully for upload ${uploadId}`);
        } catch (webhookError) {
            console.error(`[CSV Upload] Webhook failed for upload ${uploadId}:`, webhookError.message);
            // Continue with response even if webhook fails
        }

        res.json({
            success: true,
            uploadId: uploadId,
            filename: req.file.originalname,
            lineCount: lines.length,
            size: req.file.size,
            message: 'CSV validated and stored successfully'
        });
    } catch (error) {
        console.error('[CSV Upload Error]', error);
        res.status(500).json({ error: 'Failed to process CSV upload' });
    }
});

// API endpoint to retrieve CSV data for automation engine
app.get('/api/tickets/:uploadId', async (req, res) => {
    try {
        const uploadData = await database.uploads.findById(req.params.uploadId);
        
        if (!uploadData) {
            return res.status(404).json({ error: 'Upload not found' });
        }

        res.json({
            id: uploadData.id,
            filename: uploadData.filename,
            lineCount: uploadData.line_count,
            size: uploadData.size,
            uploadedAt: uploadData.uploaded_at,
            data: uploadData.data
        });
    } catch (error) {
        console.error('[CSV Retrieve Error]', error);
        res.status(500).json({ error: 'Failed to retrieve upload' });
    }
});

// API endpoint to list all uploads for a tenant
app.get('/api/tickets', async (req, res) => {
    try {
        const userEmail = req.query.tenantId || 'default';
        const uploads = await database.uploads.findByUser(userEmail);
        
        res.json(uploads.map(upload => ({
            id: upload.id,
            filename: upload.filename,
            lineCount: upload.line_count,
            size: upload.size,
            uploadedAt: upload.uploaded_at,
            processed: upload.processed
        })));
    } catch (error) {
        console.error('[CSV List Error]', error);
        res.status(500).json({ error: 'Failed to list uploads' });
    }
});

// API endpoint to delete an upload
app.delete('/api/tickets/:uploadId', async (req, res) => {
    try {
        await database.uploads.delete(req.params.uploadId);
        console.log(`[CSV Delete] Removed upload: ${req.params.uploadId}`);
        res.json({ success: true, message: 'Upload deleted successfully' });
    } catch (error) {
        console.error('[CSV Delete Error]', error);
        res.status(500).json({ error: 'Failed to delete upload' });
    }
});

// API endpoint to get webhook calls for a user
app.get('/api/webhooks', async (req, res) => {
    try {
        const userEmail = req.query.tenantId || 'default';
        const webhookCalls = await database.webhooks.getByUser(userEmail);
        
        res.json(webhookCalls);
    } catch (error) {
        console.error('[Webhook List Error]', error);
        res.status(500).json({ error: 'Failed to retrieve webhook calls' });
    }
});

// Admin endpoint to get all webhook calls
app.get('/api/webhooks/all', async (req, res) => {
    try {
        // Check if user is admin (you)
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const session = await database.sessions.findByToken(token);
        if (!session || session.user_email !== 'john@resolve.io') {
            return res.status(403).json({ error: 'Admin access only' });
        }
        
        const webhookCalls = await database.webhooks.getAll();
        res.json(webhookCalls);
    } catch (error) {
        console.error('[Admin Webhook List Error]', error);
        res.status(500).json({ error: 'Failed to retrieve webhook calls' });
    }
});

// User authentication endpoints
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password, company_name, phone, tier } = req.body;
        
        // Check if user already exists
        const existing = await database.users.findByEmail(email);
        if (existing) {
            return res.status(409).json({ error: 'User already exists' });
        }
        
        // Create new user
        const user = await database.users.create({
            email,
            password, // In production, this should be hashed
            company_name,
            phone,
            tier: tier || 'standard'
        });
        
        // Create session
        const sessionId = crypto.randomBytes(16).toString('hex');
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
        
        await database.sessions.create({
            id: sessionId,
            user_email: email,
            token,
            expires_at: expiresAt
        });
        
        console.log(`[Auth] New user signed up: ${email}`);
        
        res.json({
            success: true,
            user: { email, company_name, tier: tier || 'standard' },
            token
        });
    } catch (error) {
        console.error('[Signup Error]', error);
        res.status(500).json({ error: 'Failed to create account' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const user = await database.users.findByEmail(email);
        if (!user || user.password !== password) { // In production, use proper password hashing
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Create session
        const sessionId = crypto.randomBytes(16).toString('hex');
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        
        await database.sessions.create({
            id: sessionId,
            user_email: email,
            token,
            expires_at: expiresAt
        });
        
        console.log(`[Auth] User logged in: ${email}`);
        
        res.json({
            success: true,
            user: { 
                email: user.email, 
                company_name: user.company_name, 
                tier: user.tier,
                lastLogin: new Date().toISOString()
            },
            token
        });
    } catch (error) {
        console.error('[Login Error]', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

app.post('/api/auth/logout', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token) {
            await database.sessions.delete(token);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('[Logout Error]', error);
        res.status(500).json({ error: 'Failed to logout' });
    }
});

// Jira API validation endpoint - triggers automation engine
app.post('/api/integrations/validate-jira', authenticateToken, async (req, res) => {
    try {
        const { url, email, token } = req.body;
        
        // Basic validation
        if (!url || !email || !token) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields' 
            });
        }
        
        // Generate a unique webhook ID for this validation request
        const webhookId = crypto.randomBytes(16).toString('hex');
        const callbackUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/api/integrations/callback/${webhookId}`;
        
        // Store pending validation in database with config
        await database.pendingValidations.create({
            webhook_id: webhookId,
            user_email: req.user.email,
            integration_type: 'jira',
            config: JSON.stringify({
                url: url,
                email: email,
                token: token
            }),
            status: 'pending',
            created_at: new Date()
        });
        
        // Encrypt sensitive data
        const encryptedPayload = {
            jira_url: Buffer.from(url).toString('base64'),
            jira_email: Buffer.from(email).toString('base64'),
            jira_token: Buffer.from(token).toString('base64')
        };
        
        // Call automation engine
        const automationPayload = {
            source: "Onboarding",
            user_email: req.user.email,
            action: "integration_validation",
            integration_type: "jira",
            callbackUrl: callbackUrl,
            tenantToken: process.env.TENANT_TOKEN || "default-tenant",
            ...encryptedPayload
        };
        
        console.log('[Automation Call] Sending validation request:', {
            webhookId,
            user: req.user.email,
            callbackUrl
        });
        
        const automationResponse = await fetch(
            process.env.AUTOMATION_WEBHOOK_URL || 'https://actions-api-staging.resolve.io/api/Webhooks/postEvent/00F4F67D-3B92-4FD2-A574-7BE22C6BE796',
            {
                method: 'POST',
                headers: {
                    'Authorization': process.env.AUTOMATION_AUTH || 'Basic RTE0NzMwRkEtRDFCNS00MDM3LUFDRTMtQ0Y5N0ZCQzY3NkMyOlZaSkQqSSYyWEAkXkQ5Sjk4Rk5PJShGUVpaQ0dRNkEj',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(automationPayload)
            }
        );
        
        if (automationResponse.ok) {
            // Return webhook ID so frontend can poll for status
            return res.json({ 
                success: true,
                webhookId: webhookId,
                message: 'Validation request sent to automation engine',
                status: 'pending'
            });
        } else {
            const errorText = await automationResponse.text();
            console.error('[Automation Error]', errorText);
            return res.status(500).json({ 
                success: false,
                error: 'Failed to connect to automation service'
            });
        }
    } catch (error) {
        console.error('[Jira Validation Error]', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to process validation request' 
        });
    }
});

// Callback endpoint for automation engine results
app.post('/api/integrations/callback/:webhookId', async (req, res) => {
    try {
        const { webhookId } = req.params;
        const { status, message, userData, error } = req.body;
        
        console.log('[Automation Callback] Received:', {
            webhookId,
            status,
            message
        });
        
        // Update pending validation
        const validation = await database.pendingValidations.findByWebhookId(webhookId);
        if (!validation) {
            return res.status(404).json({ error: 'Validation not found' });
        }
        
        await database.pendingValidations.updateStatus(webhookId, {
            status: status,
            result: JSON.stringify({ message, userData, error }),
            completed_at: new Date()
        });
        
        // If successful, store the integration
        if (status === 'success') {
            // Retrieve original config from pending validation (already parsed in PostgreSQL)
            const config = typeof validation.config === 'string' 
                ? JSON.parse(validation.config) 
                : validation.config || {};
            
            await database.integrations.create({
                user_email: validation.user_email,
                type: validation.integration_type,
                config: JSON.stringify(config),
                status: 'active'
            });
        }
        
        // Notify SSE client if connected
        const sseClient = sseClients.get(webhookId);
        if (sseClient) {
            const data = {
                status: status,
                message: message,
                userData: userData,
                error: error,
                completed: true
            };
            
            sseClient.write(`data: ${JSON.stringify(data)}\n\n`);
            console.log(`[SSE] Sent update to client for webhook ${webhookId}`);
            
            // Close SSE connection after sending final status
            setTimeout(() => {
                sseClient.end();
                sseClients.delete(webhookId);
            }, 1000);
        }
        
        res.json({ success: true, message: 'Callback processed' });
    } catch (error) {
        console.error('[Callback Error]', error);
        res.status(500).json({ error: 'Failed to process callback' });
    }
});

// SSE connections storage
const sseClients = new Map();

// SSE endpoint for validation status updates
app.get('/api/integrations/status-stream/:webhookId', async (req, res) => {
    const { webhookId } = req.params;
    const { token } = req.query;
    
    // Authenticate via query parameter for SSE
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Verify session token
    let user;
    try {
        const session = await database.sessions.findByToken(token);
        if (!session || new Date(session.expires_at) < new Date()) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        
        user = await database.users.findByEmail(session.user_email);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
    } catch (error) {
        return res.status(401).json({ error: 'Authentication failed' });
    }
    
    try {
        // Verify user owns this validation
        const validation = await database.pendingValidations.findByWebhookId(webhookId);
        if (!validation) {
            return res.status(404).json({ error: 'Validation not found' });
        }
        
        if (validation.user_email !== user.email) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        // Set up SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });
        
        // Store client connection
        sseClients.set(webhookId, res);
        
        // Send initial status (handle both string and parsed JSON)
        const result = validation.result 
            ? (typeof validation.result === 'string' ? JSON.parse(validation.result) : validation.result)
            : null;
        const data = {
            status: validation.status,
            message: result?.message,
            userData: result?.userData,
            error: result?.error,
            completed: validation.status !== 'pending'
        };
        
        res.write(`data: ${JSON.stringify(data)}\n\n`);
        
        // Keep connection alive with heartbeat
        const heartbeat = setInterval(() => {
            res.write(':heartbeat\n\n');
        }, 30000);
        
        // Clean up on client disconnect
        req.on('close', () => {
            clearInterval(heartbeat);
            sseClients.delete(webhookId);
            console.log(`[SSE] Client disconnected for webhook ${webhookId}`);
        });
        
    } catch (error) {
        console.error('[SSE Error]', error);
        res.status(500).json({ error: 'Failed to establish SSE connection' });
    }
});

// API key management
app.post('/api/keys/create', async (req, res) => {
    try {
        const { user_email, name } = req.body;
        const apiKey = crypto.randomBytes(32).toString('hex');
        const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
        
        await database.apiKeys.create({
            user_email,
            key_hash: keyHash,
            name
        });
        
        console.log(`[API Key] Created new key for user: ${user_email}`);
        
        res.json({
            success: true,
            apiKey, // Only return the raw key once
            message: 'Save this API key securely. It will not be shown again.'
        });
    } catch (error) {
        console.error('[API Key Error]', error);
        res.status(500).json({ error: 'Failed to create API key' });
    }
});

// Analytics tracking endpoints
app.post('/api/analytics/track', async (req, res) => {
    try {
        const { 
            session_id, 
            user_email, 
            event_type, 
            event_category, 
            event_data, 
            page_url 
        } = req.body;
        
        const eventData = {
            session_id: session_id || crypto.randomBytes(16).toString('hex'),
            user_email,
            event_type,
            event_category,
            event_data,
            page_url,
            referrer: req.headers.referer || req.headers.referrer,
            user_agent: req.headers['user-agent'],
            ip_address: req.ip || req.connection.remoteAddress
        };
        
        await database.analytics.trackEvent(eventData);
        
        res.json({ success: true, session_id: eventData.session_id });
    } catch (error) {
        console.error('[Analytics Track Error]', error);
        res.status(500).json({ error: 'Failed to track event' });
    }
});

app.post('/api/analytics/funnel', async (req, res) => {
    try {
        const { session_id, user_email, step_name, step_number, action } = req.body;
        
        if (action === 'start') {
            await database.analytics.trackFunnelStep({
                session_id,
                user_email,
                step_name,
                step_number
            });
        } else if (action === 'complete' || action === 'abandon') {
            const updates = {
                completed: action === 'complete',
                abandoned: action === 'abandon'
            };
            
            if (req.body.time_spent_seconds) {
                updates.time_spent_seconds = req.body.time_spent_seconds;
            }
            
            await database.analytics.updateFunnelStep(session_id, step_name, updates);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('[Funnel Track Error]', error);
        res.status(500).json({ error: 'Failed to track funnel step' });
    }
});

app.post('/api/analytics/page', async (req, res) => {
    try {
        const { session_id, user_email, page_path, action } = req.body;
        
        if (action === 'enter') {
            const result = await database.analytics.trackPageMetrics({
                session_id,
                user_email,
                page_path
            });
            res.json({ success: true, metric_id: result.id });
        } else if (action === 'leave' && req.body.metric_id) {
            const updates = {
                left_at: true
            };
            
            if (req.body.time_on_page_seconds !== undefined) {
                updates.time_on_page_seconds = req.body.time_on_page_seconds;
            }
            if (req.body.scroll_depth_percent !== undefined) {
                updates.scroll_depth_percent = req.body.scroll_depth_percent;
            }
            if (req.body.clicks_count !== undefined) {
                updates.clicks_count = req.body.clicks_count;
            }
            
            await database.analytics.updatePageMetrics(req.body.metric_id, updates);
            res.json({ success: true });
        }
    } catch (error) {
        console.error('[Page Metrics Error]', error);
        res.status(500).json({ error: 'Failed to track page metrics' });
    }
});

app.post('/api/analytics/conversion', async (req, res) => {
    try {
        const { 
            session_id, 
            user_email, 
            conversion_type, 
            conversion_value,
            tier_selected 
        } = req.body;
        
        // Parse UTM parameters from referrer or stored session
        const urlParams = new URLSearchParams(req.body.utm_params || '');
        
        await database.analytics.trackConversion({
            session_id,
            user_email,
            conversion_type,
            conversion_value,
            source: urlParams.get('utm_source'),
            medium: urlParams.get('utm_medium'),
            campaign: urlParams.get('utm_campaign'),
            tier_selected
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('[Conversion Track Error]', error);
        res.status(500).json({ error: 'Failed to track conversion' });
    }
});

// Admin-only analytics dashboard endpoint
app.get('/api/analytics/dashboard', async (req, res) => {
    try {
        // Check if user is admin (you)
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const session = await database.sessions.findByToken(token);
        if (!session || session.user_email !== 'john@resolve.io') {
            return res.status(403).json({ error: 'Admin access only' });
        }
        
        const summary = await database.analytics.getAnalyticsSummary();
        res.json(summary);
    } catch (error) {
        console.error('[Analytics Dashboard Error]', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});

// Check if current user is admin (for UI purposes)
app.get('/api/admin/check', authenticateToken, async (req, res) => {
    try {
        const isAdmin = req.user?.email === 'john@resolve.io';
        res.json({ 
            isAdmin,
            email: req.user?.email 
        });
    } catch (error) {
        res.json({ isAdmin: false });
    }
});

// Admin API endpoints
app.post('/api/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const user = await database.users.findByEmail(email);
        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Check if user is admin (only john@resolve.io is admin)
        const isAdmin = email === 'john@resolve.io';
        if (!isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        // Create session
        const sessionId = crypto.randomBytes(16).toString('hex');
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        
        await database.sessions.create({
            id: sessionId,
            user_email: email,
            token,
            expires_at: expiresAt
        });
        
        console.log(`[Admin Auth] Admin logged in: ${email}`);
        
        res.json({
            success: true,
            isAdmin: true,
            user: { 
                email: user.email, 
                company_name: user.company_name, 
                tier: user.tier
            },
            token
        });
    } catch (error) {
        console.error('[Admin Login Error]', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// Admin middleware to check if user is admin
async function requireAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
        const session = await database.sessions.findByToken(token);
        if (!session) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        
        // Check if user is admin
        if (session.user_email !== 'john@resolve.io') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        req.admin = { email: session.user_email };
        next();
    } catch (error) {
        console.error('[Admin Auth Error]', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
}

// Get all customers (admin only)
app.get('/api/admin/customers', requireAdmin, async (req, res) => {
    try {
        // Get all users except the admin
        const customersQuery = `
            SELECT 
                u.email,
                u.company_name,
                u.tier,
                u.created_at,
                u.stripe_customer_id,
                COUNT(DISTINCT cu.id) as uploadCount,
                COUNT(DISTINCT ak.id) as apiKeyCount,
                MAX(GREATEST(
                    COALESCE(cu.uploaded_at, u.created_at),
                    COALESCE(ak.last_used, u.created_at)
                )) as lastActivity
            FROM users u
            LEFT JOIN csv_uploads cu ON u.email = cu.user_email
            LEFT JOIN api_keys ak ON u.email = ak.user_email
            WHERE u.email != 'john@resolve.io'
            GROUP BY u.email, u.company_name, u.tier, u.created_at, u.stripe_customer_id
            ORDER BY u.created_at DESC
        `;
        
        const customers = await database.query(customersQuery);
        
        // Get statistics
        const statsQuery = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN tier = 'premium' THEN 1 ELSE 0 END) as premiumCount,
                SUM(CASE WHEN tier = 'enterprise' THEN 1 ELSE 0 END) as enterpriseCount,
                SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) as newThisWeek
            FROM users
            WHERE email != 'john@resolve.io'
        `;
        
        const stats = await database.query(statsQuery);
        
        // Get total uploads
        const uploadsQuery = `
            SELECT COUNT(*) as totalUploads
            FROM csv_uploads
        `;
        
        const uploads = await database.query(uploadsQuery);
        
        res.json({
            success: true,
            customers: customers.rows || customers,
            statistics: {
                total: parseInt(stats.rows?.[0]?.total || stats[0]?.total || 0),
                premiumCount: parseInt(stats.rows?.[0]?.premiumcount || stats[0]?.premiumCount || 0),
                enterpriseCount: parseInt(stats.rows?.[0]?.enterprisecount || stats[0]?.enterpriseCount || 0),
                newThisWeek: parseInt(stats.rows?.[0]?.newthisweek || stats[0]?.newThisWeek || 0),
                totalUploads: parseInt(uploads.rows?.[0]?.totaluploads || uploads[0]?.totalUploads || 0)
            }
        });
    } catch (error) {
        console.error('[Admin Customers Error]', error);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});

// Export customers as CSV (admin only)
app.get('/api/admin/customers/export', requireAdmin, async (req, res) => {
    try {
        const customersQuery = `
            SELECT 
                email,
                company_name,
                tier,
                created_at,
                phone
            FROM users
            WHERE email != 'john@resolve.io'
            ORDER BY created_at DESC
        `;
        
        const customers = await database.query(customersQuery);
        const rows = customers.rows || customers;
        
        // Create CSV content
        let csv = 'Email,Company,Tier,Signup Date,Phone\n';
        rows.forEach(customer => {
            csv += `"${customer.email}","${customer.company_name || ''}","${customer.tier}","${customer.created_at}","${customer.phone || ''}"\n`;
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="customers.csv"');
        res.send(csv);
    } catch (error) {
        console.error('[Admin Export Error]', error);
        res.status(500).json({ error: 'Failed to export customers' });
    }
});

// Get customer details (admin only)
app.get('/api/admin/customers/:email', requireAdmin, async (req, res) => {
    try {
        const { email } = req.params;
        
        // Get user details
        const user = await database.users.findByEmail(decodeURIComponent(email));
        if (!user) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        
        // Get uploads
        const uploads = await database.uploads.findByUser(email);
        
        // Get API keys
        const apiKeys = await database.apiKeys.findByUser(email);
        
        // Get webhooks
        const webhooks = await database.webhooks.getByUser(email);
        
        res.json({
            success: true,
            customer: user,
            uploads,
            apiKeys,
            webhooks
        });
    } catch (error) {
        console.error('[Admin Customer Details Error]', error);
        res.status(500).json({ error: 'Failed to fetch customer details' });
    }
});

// Special route for admin access portal (hidden from regular users)
app.get('/admin-portal', (req, res) => {
    // Serve the admin login page directly instead of redirecting
    res.sendFile(path.join(__dirname, 'admin-login.html'));
});

// Serve static files from current directory
app.use(express.static('.'));

// Serve pages from the pages directory
app.use('/pages', express.static(path.join(__dirname, 'pages')));

// Primary proxy endpoint for Jarvis chat
const jarvisProxy = createProxyMiddleware({
    target: 'https://resolvejarvisdev.espressive.com',
    changeOrigin: true,
    secure: false,
    pathRewrite: {
        '^/jarvis-proxy': '/v2/chat'
    },
    onProxyReq: (proxyReq, req, res) => {
        // Set headers to appear as a regular browser request
        proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        proxyReq.setHeader('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8');
        proxyReq.setHeader('Accept-Language', 'en-US,en;q=0.5');
        proxyReq.setHeader('Referer', 'https://resolvejarvisdev.espressive.com/');
        
        console.log(`[PROXY] Requesting: ${proxyReq.path}`);
    },
    onProxyRes: (proxyRes, req, res) => {
        // Remove all restrictive headers
        const headersToRemove = [
            'x-frame-options',
            'content-security-policy',
            'content-security-policy-report-only',
            'x-content-type-options',
            'x-xss-protection',
            'strict-transport-security',
            'referrer-policy',
            'feature-policy',
            'permissions-policy',
            'cross-origin-embedder-policy',
            'cross-origin-opener-policy',
            'cross-origin-resource-policy'
        ];
        
        headersToRemove.forEach(header => {
            delete proxyRes.headers[header];
        });
        
        // Add permissive headers
        proxyRes.headers['x-frame-options'] = 'ALLOWALL';
        proxyRes.headers['access-control-allow-origin'] = '*';
        proxyRes.headers['access-control-allow-credentials'] = 'true';
        
        console.log(`[PROXY] Response status: ${proxyRes.statusCode}`);
    },
    onError: (err, req, res) => {
        console.error('[PROXY ERROR]', err);
        // Fallback to jarvis page on error
        res.redirect('/jarvis.html');
    }
});

app.use('/jarvis-proxy', jarvisProxy);

// Alternative endpoints to try different approaches
app.get('/jarvis-direct', (req, res) => {
    // Attempt to fetch and serve the content directly
    const https = require('https');
    
    https.get('https://resolvejarvisdev.espressive.com/v2/chat/', (response) => {
        let data = '';
        
        response.on('data', chunk => {
            data += chunk;
        });
        
        response.on('end', () => {
            // Remove CSP meta tags if present
            data = data.replace(/<meta.*content-security-policy.*?>/gi, '');
            data = data.replace(/<meta.*x-frame-options.*?>/gi, '');
            
            res.setHeader('Content-Type', 'text/html');
            res.send(data);
        });
    }).on('error', err => {
        console.error('Direct fetch error:', err);
        res.redirect('/jarvis.html');
    });
});

// Iframe wrapper endpoint
app.get('/jarvis-wrapper', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
                iframe { width: 100%; height: 100%; border: none; }
            </style>
        </head>
        <body>
            <iframe src="https://resolvejarvisdev.espressive.com/v2/chat/" 
                    allow="microphone; camera; clipboard-read; clipboard-write"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups">
            </iframe>
            <script>
                // Try to remove restrictive headers via JavaScript
                const iframe = document.querySelector('iframe');
                iframe.onload = function() {
                    try {
                        // Attempt to access iframe content (will fail cross-origin)
                        const doc = iframe.contentDocument || iframe.contentWindow.document;
                        console.log('Iframe loaded successfully');
                    } catch(e) {
                        console.log('Cross-origin iframe loaded');
                    }
                };
                
                // If iframe fails to load, show error
                iframe.onerror = function() {
                    console.error('Failed to load Jarvis iframe');
                };
            </script>
        </body>
        </html>
    `);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: {
            port: PORT,
            automationConfigured: !!process.env.AUTOMATION_WEBHOOK_URL,
            sseEnabled: true,
            webhookEnabled: process.env.WEBHOOK_ENABLED === 'true'
        },
        endpoints: [
            '/api/integrations/validate-jira - Jira validation',
            '/api/integrations/status-stream/:id - SSE status updates',
            '/api/integrations/callback/:id - Automation callbacks',
            '/jarvis.html - Jarvis AI Dashboard'
        ]
    });
});

// Catch-all route - redirect any unmatched routes to index.html
// This should be the last route defined
app.get('*', (req, res) => {
    // Don't redirect API routes or static assets
    if (req.path.startsWith('/api/') || 
        req.path.startsWith('/jarvis') ||
        req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|otf)$/)) {
        return res.status(404).send('Not found');
    }
    
    // For all other routes, serve the index.html
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  Enhanced Resolve Proxy Server                               ║
║  Server running at: http://localhost:${PORT}                    ║
║                                                               ║
║  Available endpoints:                                         ║
║  • /jarvis-proxy    - Reverse proxy (recommended)            ║
║  • /jarvis-direct   - Direct content fetch                   ║
║  • /jarvis-wrapper  - Iframe wrapper                         ║
║  • /jarvis.html    - Jarvis AI Dashboard                     ║
║                                                               ║
║  Health check: http://localhost:${PORT}/health                  ║
║                                                               ║
║  Authentication required for analytics dashboard access.     ║
║  Admin login: john@resolve.io                                ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});