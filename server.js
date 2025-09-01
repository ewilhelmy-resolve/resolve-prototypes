// Load environment variables from .env file if it exists
require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const db = require('./src/database/postgres');
const { createMigrationMiddleware, isValidUUID } = require('./migrate-tenant-ids');
const createRagRouter = require('./src/routes/ragApi');
const createKnowledgeRouter = require('./src/routes/knowledge');
const { processWebhookRetryQueue } = require('./src/workers/webhookRetry');
const { generateCallbackToken } = require('./src/utils/rag');
const ResolveWebhook = require('./src/utils/resolve-webhook');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize ResolveWebhook instance
const resolveWebhook = new ResolveWebhook();

// Body parser middleware with text capture for logging
// Increase limit to 100MB for vector embeddings and document processing
app.use(express.json({
    limit: '100mb',
    verify: (req, res, buf, encoding) => {
        // Store raw body for webhook logging
        req.rawBody = buf.toString('utf8');
    }
}));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Simple session storage with automatic cleanup
const sessions = {};
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Clean up expired sessions every hour
setInterval(() => {
    const now = Date.now();
    Object.keys(sessions).forEach(token => {
        if (sessions[token] && sessions[token].expiresAt && sessions[token].expiresAt < now) {
            const email = sessions[token].email || 'unknown';
            delete sessions[token];
            console.log(`Cleaned up expired session for user: ${email}`);
        }
    });
}, 60 * 60 * 1000); // Run every hour

// Generate session token
function generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Cookie parsing middleware (simple implementation)
function parseCookies(req, res, next) {
    const cookieHeader = req.headers.cookie;
    req.cookies = {};
    
    if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
            const parts = cookie.trim().split('=');
            const name = parts[0];
            const value = parts[1];
            if (name && value) {
                req.cookies[name] = decodeURIComponent(value);
            }
        });
    }
    next();
}

app.use(parseCookies);

// Authentication middleware
function requireAuth(req, res, next) {
    // Check for session token in cookie (secure) or header (for API calls)
    const token = req.cookies?.sessionToken || 
                  req.headers['authorization']?.replace('Bearer ', '') || 
                  req.headers['x-session-token'];
    
    if (!token || !sessions[token]) {
        // For API routes, return 401
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required' 
            });
        }
        // For page routes, redirect to login
        return res.redirect('/login');
    }
    
    req.user = sessions[token];
    next();
}

// Webhook Traffic Capture Middleware - Only captures callback/webhook traffic
async function captureWebhookTraffic(req, res, next) {
    // Only capture callback and webhook endpoints
    const isCallbackRoute = req.path.includes('callback') || 
                           req.path.includes('webhook');
    
    console.log(`[TRAFFIC CAPTURE] Path: ${req.path}, Is Callback: ${isCallbackRoute}`);
    
    // Only capture callback/webhook traffic
    if (isCallbackRoute) {
        console.log(`[TRAFFIC CAPTURE] Capturing: ${req.method} ${req.path}`);
        const captureData = {
            request_url: req.originalUrl || req.url,
            request_method: req.method,
            request_headers: req.headers,
            request_body: req.rawBody || JSON.stringify(req.body),
            request_query: req.query,
            request_params: req.params,
            source_ip: req.ip || req.connection.remoteAddress,
            user_agent: req.headers['user-agent'],
            is_webhook: true,  // Always true since we only capture callbacks/webhooks
            endpoint_category: determineEndpointCategory(req.path)
        };
        
        // Store original res.json and res.send to capture response
        const originalJson = res.json;
        const originalSend = res.send;
        const originalStatus = res.status;
        let responseStatus = 200;
        
        res.status = function(code) {
            responseStatus = code;
            return originalStatus.call(this, code);
        };
        
        res.json = function(body) {
            captureData.response_status = responseStatus;
            // Limit response body size to prevent memory issues
            try {
                const bodyStr = JSON.stringify(body);
                captureData.response_body = bodyStr.length > 10000 
                    ? bodyStr.substring(0, 10000) + '...[truncated]' 
                    : bodyStr;
            } catch (err) {
                captureData.response_body = '[Error stringifying response]';
            }
            saveWebhookTraffic(captureData);
            return originalJson.call(this, body);
        };
        
        res.send = function(body) {
            captureData.response_status = responseStatus;
            // Limit response body size to prevent memory issues
            try {
                const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
                captureData.response_body = bodyStr.length > 10000 
                    ? bodyStr.substring(0, 10000) + '...[truncated]' 
                    : bodyStr;
            } catch (err) {
                captureData.response_body = '[Error stringifying response]';
            }
            saveWebhookTraffic(captureData);
            return originalSend.call(this, body);
        };
    }
    
    next();
}

function determineEndpointCategory(path) {
    if (path.includes('chat-callback')) return 'chat_callback';
    if (path.includes('test-callback')) return 'test_callback';
    if (path.includes('callback')) return 'callback';
    if (path.includes('webhook')) return 'webhook';
    return 'callback';
}

async function saveWebhookTraffic(data) {
    try {
        console.log('[WEBHOOK TRAFFIC] Saving traffic log for:', data.request_url);
        await db.query(
            `INSERT INTO webhook_traffic 
            (request_url, request_method, request_headers, request_body, request_query, 
             request_params, response_status, response_body, source_ip, user_agent, 
             is_webhook, endpoint_category) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [data.request_url, data.request_method, data.request_headers, data.request_body,
             data.request_query, data.request_params, data.response_status, data.response_body,
             data.source_ip, data.user_agent, data.is_webhook, data.endpoint_category]
        );
        
        // Keep only last 7 days of traffic logs
        await db.query(
            `DELETE FROM webhook_traffic 
             WHERE captured_at < NOW() - INTERVAL '7 days'`
        );
    } catch (error) {
        console.error('[WEBHOOK TRAFFIC] Error saving traffic log:', error.message);
    }
}

// Apply webhook traffic capture middleware
app.use(captureWebhookTraffic);

// Middleware
app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    next();
});

// Serve static files from public directory
app.use(express.static('public'));

// Serve client files
app.use('/styles', express.static(path.join(__dirname, 'src/client/styles')));
app.use('/styles/icons', express.static(path.join(__dirname, 'src/client/styles/icons'))); // Explicit icon route - v2
app.use('/components', express.static(path.join(__dirname, 'src/client/components')));
app.use('/fonts', express.static(path.join(__dirname, 'public/fonts')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Serve pages with authentication check for dashboard
app.use('/pages', (req, res, next) => {
    // If trying to access dashboard.html directly, require auth
    if (req.path.includes('dashboard.html')) {
        return requireAuth(req, res, next);
    }
    next();
}, express.static(path.join(__dirname, 'src/client/pages')));

// List of admin emails
const ADMIN_EMAILS = ['admin@resolve.io', 'john.gorham@resolve.io'];

// Admin middleware - check if user is admin
async function requireAdmin(req, res, next) {
    const token = req.cookies?.sessionToken || 
                  req.headers['authorization']?.replace('Bearer ', '') || 
                  req.headers['x-session-token'];
    
    // First check in-memory sessions
    let user = sessions[token];
    
    // If not in memory, check database
    if (!user && token) {
        try {
            const result = await db.query(
                `SELECT u.* FROM users u 
                 JOIN sessions s ON s.user_id = u.id 
                 WHERE s.token = $1 AND s.expires_at > NOW()`,
                [token]
            );
            
            if (result.rows.length > 0) {
                user = result.rows[0];
                // Cache in memory for performance
                sessions[token] = user;
            }
        } catch (error) {
            console.error('Error checking session:', error);
        }
    }
    
    if (!user) {
        // For HTML pages, redirect to signin
        if (!req.path.startsWith('/api/')) {
            return res.redirect('/signin');
        }
        return res.status(401).json({ 
            success: false, 
            message: 'Authentication required' 
        });
    }
    
    // Check if user is admin (check both email and tier)
    if (!ADMIN_EMAILS.includes(user.email) && user.tier !== 'admin') {
        // For HTML pages, show error
        if (!req.path.startsWith('/api/')) {
            return res.status(403).send(`
                <!DOCTYPE html>
                <html>
                <head><title>Access Denied</title></head>
                <body>
                    <h1>Admin Access Required</h1>
                    <p>You need admin privileges to access this page.</p>
                    <p>Current user: ${user.email}</p>
                    <a href="/dashboard">Return to Dashboard</a>
                </body>
                </html>
            `);
        }
        return res.status(403).json({ 
            success: false, 
            message: 'Admin access required' 
        });
    }
    
    req.user = user;
    next();
}

// Workflow tracking middleware
function trackWorkflow(triggerType, action, metadata = {}) {
    return (req, res, next) => {
        // Get user info
        const token = req.cookies?.sessionToken || 
                      req.headers['authorization']?.replace('Bearer ', '') || 
                      req.headers['x-session-token'];
        const userEmail = sessions[token]?.email || 'anonymous';
        
        // Store original json method
        const originalJson = res.json;
        
        // Override json method to capture response
        res.json = function(data) {
            // Track the workflow trigger
            db.workflows.trackTrigger({
                user_email: userEmail,
                trigger_type: triggerType,
                action: action,
                metadata: {
                    ...metadata,
                    request_body: req.body,
                    response_data: data
                },
                response_status: res.statusCode,
                success: data.success || res.statusCode < 400,
                error_message: data.error || data.message || null
            }).catch(err => {
                console.error('Error tracking workflow:', err);
            });
            
            // Call original json method
            return originalJson.call(this, data);
        };
        
        next();
    };
}

// Page routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/dashboard', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'src/client/pages/dashboard.html'));
});

app.get('/knowledge', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'src/client/pages/knowledge.html'));
});

app.get('/admin', requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'src/client/pages/admin.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/client/pages/login.html'));
});

app.get('/step2', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/client/pages/step2.html'));
});

app.get('/completion', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/client/pages/completion.html'));
});


app.get('/signin', (req, res) => {
    res.sendFile(path.join(__dirname, 'signin.html'));
});

// Simple in-memory storage for demonstration
let users = [];

// Initialize admin users from database on startup
async function initializeAdminUsers() {
    try {
        // Query admin users from database
        const result = await db.query(
            `SELECT id, email, password, full_name, company_name, tier, tenant_id 
             FROM users 
             WHERE tier = 'admin'`
        );
        
        // Add admin users to in-memory array
        for (const dbUser of result.rows) {
            const existingUser = users.find(u => u.email === dbUser.email);
            if (!existingUser) {
                users.push({
                    id: dbUser.id.toString(),
                    tenantId: dbUser.tenant_id,
                    email: dbUser.email,
                    password: dbUser.password,
                    fullName: dbUser.full_name,
                    companyName: dbUser.company_name,
                    tier: dbUser.tier,
                    createdAt: new Date().toISOString()
                });
                console.log(`📌 Admin user loaded: ${dbUser.email} with tenant: ${dbUser.tenant_id}`);
            }
        }
        
        // Ensure john.gorham@resolve.io is always available
        const johnExists = users.find(u => u.email === 'john.gorham@resolve.io');
        if (!johnExists) {
            users.push({
                id: Date.now().toString(),
                tenantId: uuidv4(), // Add tenant ID for admin user
                email: 'john.gorham@resolve.io',
                password: 'ResolveAdmin2024',
                fullName: 'John Gorham',
                companyName: 'Resolve.io',
                tier: 'admin',
                createdAt: new Date().toISOString()
            });
            console.log('📌 Admin user added: john.gorham@resolve.io');
        }
        
        // Migrate any users that don't have valid UUID tenant IDs
        const migrationMiddleware = createMigrationMiddleware();
        users = migrationMiddleware(users);
        
        console.log(`✅ Loaded ${users.length} users into memory`);
    } catch (error) {
        console.error('Error initializing admin users:', error);
        
        // Fallback: ensure at least one admin exists in memory
        users.push({
            id: Date.now().toString(),
            tenantId: uuidv4(), // Add tenant ID for fallback admin user
            email: 'john.gorham@resolve.io',
            password: 'ResolveAdmin2024',
            fullName: 'John Gorham',
            companyName: 'Resolve.io',
            tier: 'admin',
            createdAt: new Date().toISOString()
        });
        console.log('📌 Admin user added (fallback): john.gorham@resolve.io');
    }
}

// Initialize admin users after a short delay to ensure DB is ready
setTimeout(initializeAdminUsers, 2000);

// API Routes
app.post('/api/register', trackWorkflow('onboarding', 'user_registration'), async (req, res) => {
    try {
        const { name, email, company, password, fullName, companyName } = req.body;
        
        // Support both old and new field names
        const userName = name || fullName;
        const userCompany = company || companyName;
        
        // Basic validation
        if (!userName || !email || !userCompany || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }
        
        // Check if user already exists
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'User already exists' 
            });
        }
        
        // Create user with unique UUID tenant ID
        const tenantId = uuidv4();
        
        // Save to database first
        try {
            const result = await db.query(
                `INSERT INTO users (email, password, full_name, company_name, tenant_id) 
                 VALUES ($1, $2, $3, $4, $5) 
                 RETURNING id, email, tenant_id`,
                [email, password, userName, userCompany, tenantId]
            );
            
            const dbUser = result.rows[0];
            
            // Create user object for in-memory storage
            const user = {
                id: dbUser.id.toString(),
                tenantId: dbUser.tenant_id,
                fullName: userName,
                email,
                companyName: userCompany,
                password, // In production, this should be hashed
                createdAt: new Date().toISOString()
            };
            
            users.push(user);
            
            // Automatically create session for new user
            const token = generateSessionToken();
            sessions[token] = {
                id: user.id,
                tenantId: user.tenantId,
                fullName: user.fullName,
                email: user.email,
                companyName: user.companyName,
                expiresAt: Date.now() + SESSION_TIMEOUT
            };
            
            console.log(`[SIGNUP] New user registered: ${email} from ${userCompany}`);
            console.log(`[SESSION] Auto-created session for new user: ${email}`);
            console.log(`[DATABASE] User saved with ID: ${user.id}, Tenant ID: ${user.tenantId}`);
            console.log(`[DATABASE] Total users: ${users.length}`);
        
        // Set secure httpOnly cookie for the session
        res.cookie('sessionToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
        
        res.json({ 
            success: true, 
            message: 'User registered successfully',
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                companyName: user.companyName
            }
        });
        
        } catch (dbError) {
            console.error('[SIGNUP ERROR] Database error:', dbError.message);
            
            // If DB save fails, still create user in memory for the session
            const user = {
                id: Date.now().toString(),
                tenantId: tenantId,
                fullName: userName,
                email,
                companyName: userCompany,
                password,
                createdAt: new Date().toISOString()
            };
            
            users.push(user);
            
            // Create session anyway
            const token = generateSessionToken();
            sessions[token] = {
                id: user.id,
                tenantId: user.tenantId,
                fullName: user.fullName,
                email: user.email,
                companyName: user.companyName,
                expiresAt: Date.now() + SESSION_TIMEOUT
            };
            
            res.cookie('sessionToken', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000
            });
            
            res.json({ 
                success: true,
                message: 'Registration successful (temporary)',
                userId: user.id,
                user: {
                    id: user.id,
                    fullName: user.fullName,
                    email: user.email,
                    companyName: user.companyName
                }
            });
        }
    } catch (error) {
        console.error('[SIGNUP ERROR]:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Signin endpoint
app.post('/api/signin', trackWorkflow('authentication', 'user_signin'), async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Basic validation
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password are required' 
            });
        }
        
        // First check in-memory users
        let user = users.find(u => u.email === email && u.password === password);
        
        // If not found in memory, check database
        if (!user) {
            const dbResult = await db.query(
                'SELECT id, tenant_id, email, password, full_name, company_name, tier FROM users WHERE email = $1 AND password = $2',
                [email, password]
            );
            
            if (dbResult.rows.length > 0) {
                const dbUser = dbResult.rows[0];
                user = {
                    id: dbUser.id.toString(),
                    tenantId: dbUser.tenant_id,
                    email: dbUser.email,
                    password: dbUser.password,
                    fullName: dbUser.full_name,
                    companyName: dbUser.company_name,
                    tier: dbUser.tier || 'user'
                };
                
                // Add to in-memory users for faster subsequent access
                users.push(user);
            }
        }
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }
        
        // Create session
        const token = generateSessionToken();
        sessions[token] = {
            id: user.id,
            tenantId: user.tenantId,
            fullName: user.fullName,
            email: user.email,
            companyName: user.companyName,
            expiresAt: Date.now() + SESSION_TIMEOUT
        };
        
        console.log(`[SIGNIN] User signed in: ${email}`);
        console.log(`[SESSION] Created session token for: ${email}`);
        
        // Set secure httpOnly cookie
        res.cookie('sessionToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
        
        res.json({ 
            success: true, 
            message: 'Sign in successful',
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                companyName: user.companyName
            }
        });
        
    } catch (error) {
        console.error('[SIGNIN ERROR]:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Get current user info endpoint
app.get('/api/user/info', (req, res) => {
    const token = req.cookies?.sessionToken ||
                  req.headers['authorization']?.replace('Bearer ', '') || 
                  req.headers['x-session-token'];
    
    if (!token || !sessions[token]) {
        return res.status(401).json({ 
            success: false, 
            message: 'Not authenticated' 
        });
    }
    
    const session = sessions[token];
    
    console.log('[USER INFO] Session details:', {
        email: session.email,
        tenantId: session.tenantId,
        companyName: session.companyName
    });
    const user = users.find(u => u.email === session.email);
    
    if (!user) {
        return res.status(404).json({ 
            success: false, 
            message: 'User not found' 
        });
    }
    
    res.json({
        success: true,
        email: user.email,
        fullName: user.fullName,
        tenantId: user.tenantId || session.tenantId,
        companyName: user.companyName,
        isAdmin: user.email === 'john.gorham@resolve.io'
    });
});

// Admin check endpoint (compatibility)
app.get('/api/admin/check', (req, res) => {
    const token = req.cookies?.sessionToken ||
                  req.headers['authorization']?.replace('Bearer ', '') || 
                  req.headers['x-session-token'];
    
    if (!token || !sessions[token]) {
        return res.status(401).json({ 
            success: false, 
            message: 'Not authenticated' 
        });
    }
    
    const session = sessions[token];
    const user = users.find(u => u.email === session.email);
    
    res.json({
        success: true,
        email: session.email,
        fullName: session.fullName || user?.fullName,
        tenantId: session.tenantId || user?.tenantId,
        isAdmin: session.email === 'john.gorham@resolve.io'
    });
});

// Signout endpoint
app.post('/api/signout', (req, res) => {
    const token = req.cookies?.sessionToken ||
                  req.headers['authorization']?.replace('Bearer ', '') || 
                  req.body.token || 
                  req.headers['x-session-token'];
    
    if (token && sessions[token]) {
        const email = sessions[token].email;
        delete sessions[token];
        console.log(`[SIGNOUT] User signed out: ${email}`);
    }
    
    // Clear the session cookie
    res.clearCookie('sessionToken');
    
    res.json({ 
        success: true, 
        message: 'Signed out successfully' 
    });
});

// Get all users (for demonstration)
app.get('/api/users', (req, res) => {
    const safeUsers = users.map(u => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        companyName: u.companyName,
        createdAt: u.createdAt
    }));
    
    res.json({ 
        success: true, 
        users: safeUsers,
        count: safeUsers.length 
    });
});

// Configure multer for file uploads
const uploadDir = path.join(__dirname, 'uploads', 'knowledge');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
        files: 10 // Max 10 files at once
    },
    fileFilter: (req, file, cb) => {
        // Accept csv, txt, pdf, zip, json files
        const allowedTypes = /csv|txt|pdf|zip|json/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype) || 
                        file.mimetype === 'text/csv' ||
                        file.mimetype === 'application/zip' || 
                        file.mimetype === 'application/x-zip-compressed' ||
                        file.mimetype === 'text/plain' ||
                        file.mimetype === 'application/json' ||
                        file.mimetype === 'application/pdf';
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only CSV, TXT, PDF, ZIP, and JSON files are allowed'));
        }
    }
});

// Store uploaded CSV data in memory (in production, use database)
const csvDataStore = {};

// Knowledge articles upload endpoint
app.post('/api/upload-knowledge', upload.array('files', 10), trackWorkflow('integration', 'csv_upload'), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'No files uploaded' 
            });
        }

        // Get user session info
        const token = req.cookies?.sessionToken || 
                      req.headers['authorization']?.replace('Bearer ', '') || 
                      req.headers['x-session-token'];
        const userSession = sessions[token] || {};
        const userEmail = userSession.email || 'unknown@example.com';
        const userId = userSession.id || null;
        const tenantId = userSession.tenantId || 'default-tenant';

        // Process and validate CSV files
        const uploadedFiles = [];
        let csvContent = [];
        
        for (const file of req.files) {
            const fileInfo = {
                originalName: file.originalname,
                filename: file.filename,
                size: file.size,
                path: file.path,
                type: path.extname(file.originalname).toLowerCase()
            };
            
            // If it's a CSV file, read and validate content
            if (fileInfo.type === '.csv') {
                try {
                    const content = fs.readFileSync(file.path, 'utf8');
                    const lines = content.split('\n').filter(line => line.trim());
                    
                    if (lines.length > 0) {
                        // Basic CSV validation
                        const headers = lines[0].split(',');
                        const rows = lines.slice(1).map(line => {
                            const values = line.split(',');
                            const row = {};
                            headers.forEach((header, index) => {
                                row[header.trim()] = values[index]?.trim() || '';
                            });
                            return row;
                        });
                        
                        csvContent = csvContent.concat(rows);
                        fileInfo.validated = true;
                        fileInfo.rowCount = rows.length;
                        console.log(`[CSV VALIDATION] File ${file.originalname}: ${rows.length} rows validated`);
                    }
                } catch (error) {
                    console.error(`[CSV VALIDATION ERROR] File ${file.originalname}:`, error);
                    fileInfo.validated = false;
                    fileInfo.error = error.message;
                }
            }
            
            uploadedFiles.push(fileInfo);
        }

        // Generate unique callback ID and secure access token
        const callbackId = crypto.randomBytes(16).toString('hex');
        const callbackToken = crypto.randomBytes(32).toString('hex'); // Secure token for accessing callback
        const callbackUrl = `${req.protocol}://${req.get('host')}/api/csv/callback/${callbackId}`;
        
        // Store CSV data for callback retrieval with access token
        csvDataStore[callbackId] = {
            files: uploadedFiles,
            csvContent: csvContent,
            uploadedAt: new Date().toISOString(),
            userEmail: userEmail,
            userId: userId,
            tenantToken: tenantId,
            accessToken: callbackToken // Store the access token
        };

        console.log(`[UPLOAD] Knowledge files uploaded by ${userEmail}:`, uploadedFiles.map(f => f.originalName));

        // Import CSV data as tickets to database first
        let ticketsImported = 0;
        if (csvContent.length > 0) {
            try {
                // Direct database insert matching the actual schema
                const pool = db.pool || db; // Handle both export styles
                
                for (const [index, row] of csvContent.entries()) {
                    try {
                        // Dynamically determine title and description from CSV columns
                        // Priority order for title: title, Title, subject, Subject, name, Name, first column
                        const possibleTitleFields = ['title', 'Title', 'subject', 'Subject', 'name', 'Name', 'question', 'Question'];
                        let title = 'Knowledge Item';
                        for (const field of possibleTitleFields) {
                            if (row[field]) {
                                title = row[field];
                                break;
                            }
                        }
                        // If no standard title field, use first column value
                        if (title === 'Knowledge Item' && Object.keys(row).length > 0) {
                            title = row[Object.keys(row)[0]] || 'Knowledge Item';
                        }
                        
                        // Priority order for description: content, Content, description, Description, answer, Answer, body, Body, second column
                        const possibleDescFields = ['content', 'Content', 'description', 'Description', 'answer', 'Answer', 'body', 'Body', 'details', 'Details'];
                        let description = '';
                        for (const field of possibleDescFields) {
                            if (row[field]) {
                                description = row[field];
                                break;
                            }
                        }
                        // If no standard description field, use second column if it exists
                        if (!description && Object.keys(row).length > 1) {
                            description = row[Object.keys(row)[1]] || '';
                        }
                        
                        // Store ALL CSV data in metadata for full flexibility
                        const metadata = {
                            ...row, // Include all original CSV fields
                            _import_metadata: {
                                source: 'csv_upload',
                                user_email: userEmail,
                                imported_at: new Date().toISOString(),
                                original_row_number: index + 1
                            }
                        };
                        
                        // Determine priority from CSV if available
                        const priority = row.priority || row.Priority || 'low';
                        
                        await pool.query(
                            `INSERT INTO tickets (external_id, title, description, status, priority, metadata) 
                             VALUES ($1, $2, $3, $4, $5, $6)`,
                            [
                                `KB-${Date.now()}-${index}`, // external_id
                                title, // dynamically determined title
                                description, // dynamically determined description
                                'resolved', // status
                                priority, // priority from CSV or default
                                JSON.stringify(metadata) // ALL CSV data stored here
                            ]
                        );
                        ticketsImported++;
                    } catch (insertError) {
                        console.error(`[DATABASE ERROR] Failed to insert ticket ${index}:`, insertError.message);
                    }
                }
                
                console.log(`[DATABASE] Successfully imported ${ticketsImported} tickets from CSV`);
            } catch (dbError) {
                console.error('[DATABASE ERROR] Failed to import tickets:', dbError.message);
            }
        }

        // NOW call Resolve webhook AFTER tickets are saved to database
        if (csvContent.length > 0 && ticketsImported > 0 && process.env.WEBHOOK_ENABLED !== 'false') {
            try {
                console.log(`[WEBHOOK] Calling automation platform after database save...`);
                
                // Use ResolveWebhook class to send CSV upload event
                const webhookResponse = await resolveWebhook.sendCsvUploadEvent({
                    userEmail: userEmail,
                    userId: userId,
                    tenantId: tenantId,
                    callbackUrl: callbackUrl,
                    callbackToken: callbackToken,
                    csvContent: csvContent,
                    ticketsImported: ticketsImported
                });
                
                console.log(`[WEBHOOK] Automation platform response:`, webhookResponse.status);
                if (webhookResponse.data) {
                    console.log(`[WEBHOOK] Response data:`, webhookResponse.data);
                }
                
                // Track the CSV upload action
                await resolveWebhook.trackAction({
                    action: 'csv-upload',
                    source: 'Onboarding_CSV',
                    userEmail: userEmail,
                    tenantId: tenantId,
                    metadata: {
                        rows_imported: ticketsImported,
                        total_rows: csvContent.length
                    }
                });
                
                // Track successful webhook trigger
                await db.workflows.trackTrigger({
                    user_email: userEmail,
                    trigger_type: 'automation',
                    action: 'webhook_triggered',
                    metadata: {
                        upload_id: callbackId,
                        tickets_imported: ticketsImported,
                        csv_row_count: csvContent.length,
                        webhook_url: resolveWebhook.webhookUrl
                    },
                    webhook_id: callbackId,
                    response_status: webhookResponse.status,
                    success: true
                });
            } catch (webhookError) {
                // Log error but don't fail the upload
                console.error('[WEBHOOK ERROR]', webhookError.message);
                if (webhookError.response) {
                    console.error('[WEBHOOK ERROR] Response:', webhookError.response.data);
                }
                
                // Track failed webhook trigger
                await db.workflows.trackTrigger({
                    user_email: userEmail,
                    trigger_type: 'automation',
                    action: 'webhook_failed',
                    metadata: {
                        upload_id: callbackId,
                        tickets_imported: ticketsImported,
                        csv_row_count: csvContent.length,
                        webhook_url: resolveWebhook.webhookUrl
                    },
                    webhook_id: callbackId,
                    response_status: webhookError.response?.status || 0,
                    success: false,
                    error_message: webhookError.message
                });
            }
        }

        res.json({
            success: true,
            message: 'Files uploaded and validated successfully',
            files: uploadedFiles,
            callbackUrl: callbackUrl,
            csvRowCount: csvContent.length,
            ticketsImported: ticketsImported,
            databaseStatus: ticketsImported > 0 ? 'imported' : 'no_tickets',
            webhookStatus: ticketsImported > 0 ? 'triggered' : 'skipped',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[UPLOAD ERROR]', error);
        res.status(500).json({ 
            success: false, 
            message: 'Upload failed', 
            error: error.message 
        });
    }
});

// CSV callback endpoint - serves uploaded CSV data to external systems
app.get('/api/csv/callback/:id', (req, res) => {
    const callbackId = req.params.id;
    const data = csvDataStore[callbackId];
    
    if (!data) {
        return res.status(404).json({
            success: false,
            message: 'Callback data not found or expired'
        });
    }
    
    // Verify bearer token for security
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    if (!token || token !== data.accessToken) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized: Invalid or missing bearer token'
        });
    }
    
    // Support batch retrieval with query parameters
    const batchSize = parseInt(req.query.batch_size) || 100;
    const batchNumber = parseInt(req.query.batch) || 0;
    const startIndex = batchNumber * batchSize;
    const endIndex = startIndex + batchSize;
    
    // Get the batch of data
    const batchData = data.csvContent.slice(startIndex, endIndex);
    const totalBatches = Math.ceil(data.csvContent.length / batchSize);
    
    // Return CSV data in JSON format for API consumption
    res.json({
        success: true,
        id: callbackId,
        status: 'ready',
        tenantToken: data.tenantToken,
        userEmail: data.userEmail,
        userId: data.userId,
        uploadedAt: data.uploadedAt,
        batch_info: {
            batch_number: batchNumber,
            batch_size: batchSize,
            total_batches: totalBatches,
            total_rows: data.csvContent.length,
            rows_in_batch: batchData.length,
            has_more: batchNumber < totalBatches - 1
        },
        files: data.files.map(f => ({
            name: f.originalName,
            size: f.size,
            type: f.type,
            validated: f.validated,
            rowCount: f.rowCount
        })),
        csvData: batchData,
        message: `CSV batch ${batchNumber} of ${totalBatches - 1} ready for processing`
    });
    
    console.log(`[CSV CALLBACK] Batch ${batchNumber} served for callback ${callbackId} (${batchData.length} rows)`);
});

// API endpoint to fetch tickets for knowledge base display
app.get('/api/tickets', requireAuth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;
        
        // Fetch tickets from database
        const result = await db.query(
            `SELECT id, title, description, priority, status, metadata, created_at 
             FROM tickets 
             ORDER BY created_at DESC 
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        
        // Get total count
        const countResult = await db.query('SELECT COUNT(*) as total FROM tickets');
        const total = parseInt(countResult.rows[0].total);
        
        res.json({
            success: true,
            tickets: result.rows,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + limit < total
            }
        });
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch tickets' 
        });
    }
});

// CSV callback endpoint - download as raw CSV
app.get('/api/csv/callback/:id/download', (req, res) => {
    const callbackId = req.params.id;
    const data = csvDataStore[callbackId];
    
    if (!data || !data.csvContent || data.csvContent.length === 0) {
        return res.status(404).send('CSV data not found');
    }
    
    // Convert JSON back to CSV format
    const csvRows = [];
    const headers = Object.keys(data.csvContent[0]);
    csvRows.push(headers.join(','));
    
    for (const row of data.csvContent) {
        const values = headers.map(header => {
            const value = row[header] || '';
            // Escape values containing commas or quotes
            if (value.includes(',') || value.includes('"')) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        csvRows.push(values.join(','));
    }
    
    const csvString = csvRows.join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="knowledge-${callbackId}.csv"`);
    res.send(csvString);
    
    console.log(`[CSV DOWNLOAD] CSV file downloaded for callback ${callbackId}`);
});

// Admin API Routes
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
        const dateRange = parseInt(req.query.days) || 30;
        const stats = await db.workflows.getAdminStats(dateRange);
        res.json(stats);
    } catch (error) {
        console.error('Error getting admin stats:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to load statistics' 
        });
    }
});

app.get('/api/admin/triggers', requireAdmin, async (req, res) => {
    try {
        const filters = {
            type: req.query.type,
            status: req.query.status,
            date: req.query.date
        };
        
        // For now, return recent triggers
        const stats = await db.workflows.getAdminStats(30);
        res.json(stats.recentTriggers || []);
    } catch (error) {
        console.error('Error getting triggers:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to load triggers' 
        });
    }
});

app.get('/api/admin/user-activity', requireAdmin, async (req, res) => {
    try {
        const userEmail = req.query.email;
        if (!userEmail) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email parameter required' 
            });
        }
        
        const activity = await db.workflows.getUserActivity(userEmail);
        res.json(activity);
    } catch (error) {
        console.error('Error getting user activity:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to load user activity' 
        });
    }
});

app.get('/api/admin/analytics', requireAdmin, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const analytics = await db.workflows.getAdminStats(days);
        res.json(analytics);
    } catch (error) {
        console.error('Error getting analytics:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to load analytics' 
        });
    }
});

app.get('/api/admin/webhooks', requireAdmin, async (req, res) => {
    try {
        // Get recent webhook traffic
        const result = await db.query(
            `SELECT 
                id,
                request_url,
                request_method,
                request_headers,
                request_body,
                response_status,
                response_body,
                source_ip,
                user_agent,
                captured_at,
                is_webhook,
                endpoint_category
            FROM webhook_traffic 
            WHERE is_webhook = true
            ORDER BY captured_at DESC 
            LIMIT 100`
        );
        
        res.json({
            success: true,
            webhooks: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('Error getting webhooks:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to load webhook logs' 
        });
    }
});

// Webhook Traffic Routes
app.get('/api/admin/webhook-traffic', requireAdmin, async (req, res) => {
    try {
        const { 
            limit = 100, 
            offset = 0, 
            category,
            method,
            status,
            is_webhook,
            search,
            start_date,
            end_date
        } = req.query;
        
        let query = `
            SELECT * FROM webhook_traffic 
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 0;
        
        if (category && category !== 'all') {
            params.push(category);
            query += ` AND endpoint_category = $${++paramCount}`;
        }
        
        if (method && method !== 'all') {
            params.push(method);
            query += ` AND request_method = $${++paramCount}`;
        }
        
        if (status) {
            params.push(parseInt(status));
            query += ` AND response_status = $${++paramCount}`;
        }
        
        if (is_webhook === 'true') {
            query += ` AND is_webhook = true`;
        }
        
        if (search) {
            params.push(`%${search}%`);
            const searchParam = `$${++paramCount}`;
            query += ` AND (request_url ILIKE ${searchParam} OR request_body::text ILIKE ${searchParam} OR response_body::text ILIKE ${searchParam})`;
        }
        
        if (start_date) {
            params.push(start_date);
            query += ` AND captured_at >= $${++paramCount}`;
        }
        
        if (end_date) {
            params.push(end_date);
            query += ` AND captured_at <= $${++paramCount}`;
        }
        
        // Get total count for pagination
        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
        const countResult = await db.query(countQuery, params);
        const totalCount = parseInt(countResult.rows[0].count);
        
        // Add ordering and pagination
        query += ` ORDER BY captured_at DESC`;
        params.push(parseInt(limit));
        query += ` LIMIT $${++paramCount}`;
        params.push(parseInt(offset));
        query += ` OFFSET $${++paramCount}`;
        
        const result = await db.query(query, params);
        
        // Limit response body sizes to prevent memory issues
        const sanitizedRows = result.rows.map(row => {
            if (row.request_body && typeof row.request_body === 'string' && row.request_body.length > 5000) {
                row.request_body = row.request_body.substring(0, 5000) + '...[truncated]';
            }
            if (row.response_body && typeof row.response_body === 'string' && row.response_body.length > 5000) {
                row.response_body = row.response_body.substring(0, 5000) + '...[truncated]';
            }
            return row;
        });
        
        res.json({
            traffic: sanitizedRows,
            total: totalCount,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Error fetching webhook traffic:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch webhook traffic' 
        });
    }
});

app.get('/api/admin/webhook-traffic/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            'SELECT * FROM webhook_traffic WHERE id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Traffic log not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching traffic log:', error);
        res.status(500).json({ error: 'Failed to fetch traffic log' });
    }
});

app.delete('/api/admin/webhook-traffic/clear', requireAdmin, async (req, res) => {
    try {
        const { category, older_than_days = 0 } = req.body;
        
        let query = 'DELETE FROM webhook_traffic WHERE 1=1';
        const params = [];
        
        if (category && category !== 'all') {
            params.push(category);
            query += ` AND endpoint_category = $${params.length}`;
        }
        
        if (older_than_days > 0) {
            params.push(older_than_days);
            query += ` AND captured_at < NOW() - INTERVAL '${older_than_days} days'`;
        }
        
        const result = await db.query(query, params);
        
        res.json({ 
            success: true, 
            deleted: result.rowCount,
            message: `Deleted ${result.rowCount} traffic logs` 
        });
    } catch (error) {
        console.error('Error clearing traffic logs:', error);
        res.status(500).json({ error: 'Failed to clear traffic logs' });
    }
});

// Admin Diagnostics Routes
app.get('/api/admin/diagnostics', requireAdmin, async (req, res) => {
    try {
        // Check environment variables
        const envStatus = {
            DATABASE_URL: !!process.env.DATABASE_URL,
            JWT_SECRET: !!process.env.JWT_SECRET,
            AUTOMATION_WEBHOOK_URL: !!process.env.AUTOMATION_WEBHOOK_URL,
            AUTOMATION_AUTH: !!process.env.AUTOMATION_AUTH,
            NODE_ENV: process.env.NODE_ENV || 'not set',
            APP_URL: process.env.APP_URL || 'not set',
            WEBHOOK_ENABLED: process.env.WEBHOOK_ENABLED || 'not set'
        };

        // Test database connection
        let dbStatus = { connected: false, error: null };
        try {
            const result = await db.query('SELECT NOW()');
            dbStatus.connected = true;
            dbStatus.timestamp = result.rows[0].now;
        } catch (error) {
            dbStatus.error = error.message;
        }

        // Check RAG tables
        let ragStatus = { 
            hasDocumentsTable: false, 
            hasVectorsTable: false,
            hasPgVector: false,
            documentCount: 0,
            vectorCount: 0
        };
        
        try {
            // Check pgvector extension
            const extResult = await db.query("SELECT COUNT(*) FROM pg_extension WHERE extname = 'vector'");
            ragStatus.hasPgVector = extResult.rows[0].count > 0;

            // Check tables exist
            const tablesResult = await db.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('rag_documents', 'rag_vectors')
            `);
            
            tablesResult.rows.forEach(row => {
                if (row.table_name === 'rag_documents') ragStatus.hasDocumentsTable = true;
                if (row.table_name === 'rag_vectors') ragStatus.hasVectorsTable = true;
            });

            // Get counts if tables exist
            if (ragStatus.hasDocumentsTable) {
                const docCount = await db.query('SELECT COUNT(*) FROM rag_documents');
                ragStatus.documentCount = parseInt(docCount.rows[0].count);
            }
            
            if (ragStatus.hasVectorsTable) {
                const vecCount = await db.query('SELECT COUNT(*) FROM rag_vectors');
                ragStatus.vectorCount = parseInt(vecCount.rows[0].count);
            }
        } catch (error) {
            ragStatus.error = error.message;
        }

        res.json({
            success: true,
            env: envStatus,
            database: dbStatus,
            rag: ragStatus,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Diagnostics error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
        });
    }
});

app.get('/api/admin/logs', requireAdmin, async (req, res) => {
    try {
        const { level = 'all', limit = 100 } = req.query;
        
        // In production, you'd fetch from a logging service or database
        // For now, return recent errors from application
        const logs = [];
        
        // Add any recent database errors
        try {
            const errorLogs = await db.query(`
                SELECT 'Database' as source, error_message, created_at 
                FROM rag_webhook_failures 
                ORDER BY created_at DESC 
                LIMIT 20
            `);
            
            errorLogs.rows.forEach(row => {
                logs.push({
                    level: 'error',
                    source: row.source,
                    message: row.error_message,
                    timestamp: row.created_at
                });
            });
        } catch (err) {
            logs.push({
                level: 'error',
                source: 'System',
                message: `Failed to fetch database logs: ${err.message}`,
                timestamp: new Date()
            });
        }

        // Filter by level if specified
        const filteredLogs = level === 'all' 
            ? logs 
            : logs.filter(log => log.level === level);

        res.json({
            success: true,
            logs: filteredLogs.slice(0, limit),
            count: filteredLogs.length
        });
    } catch (error) {
        console.error('Logs fetch error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// System Settings Routes
app.get('/api/admin/settings', requireAdmin, async (req, res) => {
    try {
        // Get all settings from system_config table
        const result = await db.query(
            'SELECT key, value FROM system_config ORDER BY key'
        );
        
        // Convert to key-value object
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });
        
        // If no settings found, use defaults from environment
        if (Object.keys(settings).length === 0) {
            settings.app_url = process.env.APP_URL || 'http://localhost:5000';
            settings.webhook_enabled = process.env.WEBHOOK_ENABLED || 'true';
            settings.max_document_size = process.env.MAX_DOCUMENT_SIZE || '51200';
            settings.vector_dimension = process.env.VECTOR_DIMENSION || '1536';
        }
        
        res.json(settings);
    } catch (error) {
        console.error('Error loading settings:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to load settings' 
        });
    }
});

app.post('/api/admin/settings', requireAdmin, async (req, res) => {
    try {
        const settings = req.body;
        
        // Validate settings
        if (settings.app_url && !settings.app_url.match(/^https?:\/\/.+/)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid URL format' 
            });
        }
        
        // Update each setting
        for (const [key, value] of Object.entries(settings)) {
            await db.query(
                `INSERT INTO system_config (key, value) 
                 VALUES ($1, $2) 
                 ON CONFLICT (key) 
                 DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
                [key, value]
            );
        }
        
        // Also update environment variables for current session
        if (settings.app_url) process.env.APP_URL = settings.app_url;
        if (settings.webhook_enabled) process.env.WEBHOOK_ENABLED = settings.webhook_enabled;
        if (settings.max_document_size) process.env.MAX_DOCUMENT_SIZE = settings.max_document_size;
        if (settings.vector_dimension) process.env.VECTOR_DIMENSION = settings.vector_dimension;
        
        res.json({ success: true, message: 'Settings saved successfully' });
    } catch (error) {
        console.error('Error saving settings:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to save settings' 
        });
    }
});

app.post('/api/admin/settings/reset', requireAdmin, async (req, res) => {
    try {
        // Reset to default values
        const defaults = {
            app_url: 'http://localhost:5000',
            webhook_enabled: 'true',
            max_document_size: '51200',
            vector_dimension: '1536'
        };
        
        for (const [key, value] of Object.entries(defaults)) {
            await db.query(
                `INSERT INTO system_config (key, value, description) 
                 VALUES ($1, $2, $3) 
                 ON CONFLICT (key) 
                 DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
                [key, value, getSettingDescription(key)]
            );
        }
        
        res.json({ success: true, message: 'Settings reset to defaults' });
    } catch (error) {
        console.error('Error resetting settings:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to reset settings' 
        });
    }
});

app.post('/api/admin/test-callback', requireAdmin, async (req, res) => {
    try {
        // Get the current app_url setting
        const result = await db.query(
            'SELECT value FROM system_config WHERE key = $1',
            ['app_url']
        );
        
        const appUrl = result.rows[0]?.value || process.env.APP_URL || 'http://localhost:5000';
        
        // Try to make a simple test request to the URL
        try {
            const testUrl = `${appUrl}/health`;
            const response = await axios.get(testUrl, { timeout: 5000 });
            
            res.json({ 
                success: true, 
                url: appUrl,
                message: 'Callback URL is accessible'
            });
        } catch (testError) {
            res.json({ 
                success: false, 
                url: appUrl,
                error: `Cannot reach ${appUrl}: ${testError.message}`
            });
        }
    } catch (error) {
        console.error('Error testing callback URL:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to test callback URL' 
        });
    }
});

function getSettingDescription(key) {
    const descriptions = {
        app_url: 'Base URL for the application callbacks',
        webhook_enabled: 'Enable/disable webhook functionality',
        max_document_size: 'Maximum document size for RAG in bytes',
        vector_dimension: 'Vector dimension for embeddings'
    };
    return descriptions[key] || '';
}

// User Management Routes
app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
        const { search, tier, sort = 'created_at', order = 'desc' } = req.query;
        
        let query = 'SELECT email, company_name, phone, tier, created_at, updated_at FROM users WHERE 1=1';
        const params = [];
        
        if (search) {
            query += ' AND (email LIKE ? OR company_name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        
        if (tier) {
            query += ' AND tier = ?';
            params.push(tier);
        }
        
        // Add sorting
        const validSorts = ['email', 'company_name', 'tier', 'created_at', 'updated_at'];
        const sortField = validSorts.includes(sort) ? sort : 'created_at';
        const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${sortField} ${sortOrder}`;
        
        const result = await db.query(query, params);
        const users = result.rows || [];
        
        // Get additional stats for each user
        for (let user of users) {
            // Get ticket count for user
            const ticketResult = await db.query(
                'SELECT COUNT(*) as count FROM tickets t JOIN users u ON t.user_id = u.id WHERE u.email = $1',
                [user.email]
            );
            user.ticket_count = ticketResult.rows[0]?.count || 0;
            
            // Get last login from sessions
            const sessionResult = await db.query(
                'SELECT created_at FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = $1) ORDER BY created_at DESC LIMIT 1',
                [user.email]
            );
            user.last_login = sessionResult.rows[0]?.created_at || null;
        }
        
        res.json(users);
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to load users' 
        });
    }
});

app.put('/api/admin/users/:email', requireAdmin, async (req, res) => {
    try {
        const { email } = req.params;
        const { company_name, phone, tier } = req.body;
        
        // Validate tier
        const validTiers = ['standard', 'premium', 'enterprise'];
        if (tier && !validTiers.includes(tier)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid tier value'
            });
        }
        
        // Build update query for PostgreSQL
        const updates = [];
        const params = [];
        let paramCount = 1;
        
        if (company_name !== undefined) {
            updates.push(`company_name = $${paramCount++}`);
            params.push(company_name);
        }
        
        if (phone !== undefined) {
            updates.push(`phone = $${paramCount++}`);
            params.push(phone);
        }
        
        if (tier !== undefined) {
            updates.push(`tier = $${paramCount++}`);
            params.push(tier);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }
        
        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(email);
        
        const query = `UPDATE users SET ${updates.join(', ')} WHERE email = $${paramCount}`;
        await db.query(query, params);
        
        res.json({ 
            success: true, 
            message: 'User updated successfully' 
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update user' 
        });
    }
});

app.delete('/api/admin/users/:email', requireAdmin, async (req, res) => {
    try {
        const { email } = req.params;
        
        // Don't allow deleting the admin user
        if (email === 'john.gorham@resolve.io') {
            return res.status(403).json({
                success: false,
                message: 'Cannot delete admin user'
            });
        }
        
        // Delete user and related data (PostgreSQL syntax)
        // First get the user ID
        const userResult = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        const userId = userResult.rows[0].id;
        
        // Delete related data using user_id
        await db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
        await db.query('DELETE FROM tickets WHERE user_id = $1', [userId]);
        // For tables that might not have user_id, try using email
        try {
            await db.query('DELETE FROM csv_uploads WHERE user_email = $1', [email]);
        } catch (e) {
            // Table might not exist or might not have user_email column
        }
        try {
            await db.query('DELETE FROM api_keys WHERE user_email = $1', [email]);
        } catch (e) {
            // Table might not exist or might not have user_email column
        }
        try {
            await db.query('DELETE FROM integrations WHERE user_email = $1', [email]);
        } catch (e) {
            // Table might not exist or might not have user_email column
        }
        
        // Finally delete the user
        await db.query('DELETE FROM users WHERE id = $1', [userId]);
        
        res.json({ 
            success: true, 
            message: 'User deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete user' 
        });
    }
});

// Webhook proxy endpoint for client-side integration
app.post('/api/webhook', requireAuth, async (req, res) => {
    try {
        const { source, action, ...additionalData } = req.body;
        
        // Use ResolveWebhook class for proxy event
        const response = await resolveWebhook.sendProxyEvent({
            source: source,
            action: action,
            userEmail: req.user.email,
            tenantId: req.user.tenantId,
            ...additionalData
        });
        
        // Track the proxied action
        await resolveWebhook.trackAction({
            action: action,
            source: source || 'Onboarding',
            userEmail: req.user.email,
            tenantId: req.user.tenantId,
            metadata: additionalData
        });
        
        res.json({ 
            success: true, 
            data: response.data 
        });
        
    } catch (error) {
        console.error('Webhook proxy error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to send event' 
        });
    }
});

// Mount RAG API routes
const ragRouter = createRagRouter(db, sessions);
app.use('/api/rag', ragRouter);

// Document API routes
const createDocumentRouter = require('./src/routes/documentApi');
const documentRouter = createDocumentRouter(db);
app.use('/api/documents', documentRouter);

// Admin Diagnostics routes (for debugging pgvector issues)
const adminDiagnosticsRouter = require('./src/routes/adminDiagnostics');
app.use('/api/admin/diagnostics', adminDiagnosticsRouter);

// Mount Knowledge API routes
const knowledgeRouter = createKnowledgeRouter(db, sessions);
app.use('/api', knowledgeRouter);

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        port: PORT,
        timestamp: new Date().toISOString(),
        usersCount: users.length
    });
});

// Define valid HTML routes
const validHtmlRoutes = [
    '/',
    '/dashboard',
    '/admin',
    '/login',
    '/signin',
    '/step2',
    '/completion'
];

// Catch-all route - properly handle 404s
app.get('*', (req, res) => {
    // Return 404 for API routes and static files
    if (req.path.startsWith('/api/') || 
        req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|otf|map|json)$/)) {
        return res.status(404).send('Not found');
    }
    
    // Check if the path is a valid HTML route
    const requestedPath = req.path.replace(/\/$/, '') || '/'; // Normalize path
    if (validHtmlRoutes.includes(requestedPath)) {
        // Serve the appropriate page for valid routes
        const indexPath = path.join(__dirname, 'index.html');
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            res.sendFile(path.join(__dirname, 'src/client/pages/dashboard.html'));
        }
    } else {
        // Return 404 for any non-existent route
        res.status(404).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>404 - Page Not Found</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "SF Pro", sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                    }
                    .error-container {
                        text-align: center;
                        padding: 2rem;
                    }
                    h1 {
                        font-size: 6rem;
                        margin: 0;
                        font-weight: bold;
                    }
                    h2 {
                        font-size: 2rem;
                        margin: 1rem 0;
                        font-weight: normal;
                    }
                    p {
                        font-size: 1.2rem;
                        opacity: 0.9;
                    }
                    a {
                        display: inline-block;
                        margin-top: 2rem;
                        padding: 0.75rem 2rem;
                        background: white;
                        color: #667eea;
                        text-decoration: none;
                        border-radius: 25px;
                        font-weight: 600;
                        transition: transform 0.2s;
                    }
                    a:hover {
                        transform: scale(1.05);
                    }
                </style>
            </head>
            <body>
                <div class="error-container">
                    <h1>404</h1>
                    <h2>Page Not Found</h2>
                    <p>The page you're looking for doesn't exist.</p>
                    <a href="/">Go to Home</a>
                </div>
            </body>
            </html>
        `);
    }
});

app.listen(PORT, async () => {
    // Run database migrations on startup
    try {
        console.log('🚀 Running database migrations on startup...');
        const { runPostgreSQLMigrations } = require('./src/database/migrations');
        const pool = require('./src/database/postgres');
        await runPostgreSQLMigrations(pool);
        console.log('✅ Database migrations completed successfully');
    } catch (error) {
        console.error('[MIGRATION ERROR] Failed to run migrations:', error.message);
        // Log but don't crash - app might still work with existing schema
    }
    
    // Initialize pgvector on startup (non-blocking)
    try {
        const { initializePgvector } = require('./src/database/init-pgvector');
        await initializePgvector();
    } catch (error) {
        console.error('[PGVECTOR INIT] Failed to initialize pgvector:', error.message);
        // Don't crash the app, just log the error
    }
    
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  Resolve Onboarding Server                                   ║
║  Server running at: http://localhost:${PORT}                     ║
║                                                               ║
║  Project Structure:                                           ║
║  • /src/server         - Server-side code                    ║
║  • /src/client         - Client-side code                    ║
║  • /src/database       - Database related files              ║
║  • /public             - Static assets                       ║
║  • /config             - Configuration files                 ║
║  • /tests              - Test files                          ║
║  • /docs               - Documentation                       ║
╚═══════════════════════════════════════════════════════════════╝
    `);
    
    // Start webhook retry worker
    setInterval(() => processWebhookRetryQueue(db), 60000); // Run every minute
    console.log('RAG webhook retry worker started');
    
    // Generate callback tokens for existing tenants
    try {
        const tenants = await db.query('SELECT DISTINCT tenant_id FROM users WHERE tenant_id IS NOT NULL');
        for (const tenant of tenants.rows) {
            const existingToken = await db.query('SELECT callback_token FROM rag_tenant_tokens WHERE tenant_id = $1', [tenant.tenant_id]);
            if (existingToken.rows.length === 0) {
                await generateCallbackToken(db, tenant.tenant_id);
                console.log(`Generated RAG callback token for tenant: ${tenant.tenant_id}`);
            }
        }
    } catch (error) {
        console.error('Error generating callback tokens:', error);
    }
});