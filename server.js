const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const db = require('./src/database/postgres');
const { createMigrationMiddleware, isValidUUID } = require('./migrate-tenant-ids');

const app = express();
const PORT = process.env.PORT || 5000;

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple session storage (in production, use proper session management)
const sessions = {};

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
        // For page routes, redirect to signin
        return res.redirect('/signin');
    }
    
    req.user = sessions[token];
    next();
}

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
            `SELECT id, email, password, full_name, company_name, tier 
             FROM users 
             WHERE tier = 'admin'`
        );
        
        // Add admin users to in-memory array
        for (const dbUser of result.rows) {
            const existingUser = users.find(u => u.email === dbUser.email);
            if (!existingUser) {
                users.push({
                    id: dbUser.id.toString(),
                    email: dbUser.email,
                    password: dbUser.password,
                    fullName: dbUser.full_name,
                    companyName: dbUser.company_name,
                    tier: dbUser.tier,
                    createdAt: new Date().toISOString()
                });
                console.log(`📌 Admin user loaded: ${dbUser.email}`);
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
app.post('/api/register', trackWorkflow('onboarding', 'user_registration'), (req, res) => {
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
        const user = {
            id: Date.now().toString(),
            tenantId: uuidv4(), // Generate unique UUID for each user's tenant
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
            companyName: user.companyName
        };
        
        console.log(`[SIGNUP] New user registered: ${email} from ${userCompany}`);
        console.log(`[SESSION] Auto-created session for new user: ${email}`);
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
        
    } catch (error) {
        console.error('[SIGNUP ERROR]:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Signin endpoint
app.post('/api/signin', trackWorkflow('authentication', 'user_signin'), (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Basic validation
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password are required' 
            });
        }
        
        // Find user
        const user = users.find(u => u.email === email && u.password === password);
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
            companyName: user.companyName
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
                        file.mimetype === 'application/zip' || 
                        file.mimetype === 'application/x-zip-compressed' ||
                        file.mimetype === 'text/plain' ||
                        file.mimetype === 'application/json';
        
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
                        await pool.query(
                            `INSERT INTO tickets (external_id, title, description, status, priority, metadata) 
                             VALUES ($1, $2, $3, $4, $5, $6)`,
                            [
                                `KB-${Date.now()}-${index}`, // external_id
                                row.title || row.Title || 'Knowledge Item', // title
                                row.content || row.Content || row.description || '', // description
                                'resolved', // status
                                'low', // priority
                                JSON.stringify({ // metadata
                                    category: row.category || row.Category || 'Knowledge Base',
                                    source: 'csv_upload',
                                    user_email: userEmail,
                                    imported_at: new Date().toISOString()
                                })
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
                const webhookUrl = process.env.AUTOMATION_WEBHOOK_URL || 
                    'https://actions-api-staging.resolve.io/api/Webhooks/postEvent/00F4F67D-3B92-4FD2-A574-7BE22C6BE796';
                const authHeader = process.env.AUTOMATION_AUTH || 
                    'Basic RTE0NzMwRkEtRDFCNS00MDM3LUFDRTMtQ0Y5N0ZCQzY3NkMyOlZaSkQqSSYyWEAkXkQ5Sjk4Rk5PJShGUVpaQ0dRNkEj';
                
                // Updated payload with correct action and additional metadata
                const webhookPayload = {
                    source: 'Onboarding',
                    user_email: userEmail,
                    user_id: userId,
                    action: 'uploaded-csv',
                    integration_type: 'csv',
                    callbackUrl: callbackUrl,
                    callbackToken: callbackToken, // Include access token for secure callback access
                    tenantToken: tenantId,
                    // Metadata for batch processing
                    metadata: {
                        total_rows: csvContent.length,
                        batch_size: 100,
                        total_batches: Math.ceil(csvContent.length / 100),
                        tickets_imported: ticketsImported
                    }
                };
                
                console.log(`[WEBHOOK] Calling automation platform after database save...`);
                console.log(`[WEBHOOK] Payload:`, JSON.stringify(webhookPayload, null, 2));
                
                const webhookResponse = await axios.post(webhookUrl, webhookPayload, {
                    headers: {
                        'Authorization': authHeader,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000 // 10 second timeout
                });
                
                console.log(`[WEBHOOK] Automation platform response:`, webhookResponse.status);
                if (webhookResponse.data) {
                    console.log(`[WEBHOOK] Response data:`, webhookResponse.data);
                }
                
                // Track successful webhook trigger
                await db.workflows.trackTrigger({
                    user_email: userEmail,
                    trigger_type: 'automation',
                    action: 'webhook_triggered',
                    metadata: {
                        upload_id: callbackId,
                        tickets_imported: ticketsImported,
                        csv_row_count: csvContent.length,
                        webhook_url: webhookUrl
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
                        webhook_url: webhookUrl
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
        const webhooks = await db.webhooks.getAll();
        res.json(webhooks);
    } catch (error) {
        console.error('Error getting webhooks:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to load webhook logs' 
        });
    }
});

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

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        port: PORT,
        timestamp: new Date().toISOString(),
        usersCount: users.length
    });
});

// Catch-all route for SPA behavior
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/') || 
        req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|otf|map|json)$/)) {
        return res.status(404).send('Not found');
    }
    
    const indexPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.sendFile(path.join(__dirname, 'src/client/pages/dashboard.html'));
    }
});

app.listen(PORT, () => {
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
});