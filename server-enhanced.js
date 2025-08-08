const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');
const database = require('./database-sqlite');

const app = express();
const PORT = process.env.PORT || 8082;

// Configure multer for file uploads
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

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

// API endpoint to upload and validate CSV
app.post('/api/tickets/upload', upload.single('csvFile'), async (req, res) => {
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
        const userEmail = req.body.tenantId || 'default';
        
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

// Serve static files from current directory
app.use(express.static('.'));

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
        status: 'ok',
        proxy: 'active',
        endpoints: [
            '/jarvis-proxy - Main proxy endpoint',
            '/jarvis-direct - Direct content fetch',
            '/jarvis-wrapper - Iframe wrapper',
            '/jarvis.html - Jarvis AI Dashboard'
        ]
    });
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