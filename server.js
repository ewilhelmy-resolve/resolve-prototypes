const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const axios = require('axios');
const db = require('./src/database/postgres');

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

// Page routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/dashboard', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'src/client/pages/dashboard.html'));
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

app.get('/jarvis', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/client/pages/jarvis.html'));
});

app.get('/signin', (req, res) => {
    res.sendFile(path.join(__dirname, 'signin.html'));
});

// Simple in-memory storage for demonstration
let users = [];

// API Routes
app.post('/api/register', (req, res) => {
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
        
        // Create user
        const user = {
            id: Date.now().toString(),
            fullName: userName,
            email,
            companyName: userCompany,
            password, // In production, this should be hashed
            createdAt: new Date().toISOString()
        };
        
        users.push(user);
        
        console.log(`[SIGNUP] New user registered: ${email} from ${userCompany}`);
        console.log(`[DATABASE] Total users: ${users.length}`);
        
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
app.post('/api/signin', (req, res) => {
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
app.post('/api/upload-knowledge', upload.array('files', 10), async (req, res) => {
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

        // Generate unique callback ID and store data
        const callbackId = crypto.randomBytes(16).toString('hex');
        const callbackUrl = `${req.protocol}://${req.get('host')}/api/csv/callback/${callbackId}`;
        
        // Store CSV data for callback retrieval
        csvDataStore[callbackId] = {
            files: uploadedFiles,
            csvContent: csvContent,
            uploadedAt: new Date().toISOString(),
            userEmail: userEmail,
            tenantToken: process.env.TENANT_TOKEN || 'default-tenant'
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
                    action: 'uploaded-csv',  // Changed to match the curl example
                    integration_type: 'jira', // Changed to match expected automation platform
                    callbackUrl: callbackUrl,
                    tenantToken: process.env.TENANT_TOKEN || 'default-tenant',
                    // Additional metadata for automation engine
                    metadata: {
                        tickets_imported: ticketsImported,
                        csv_row_count: csvContent.length,
                        csv_files: uploadedFiles.filter(f => f.type === '.csv').map(f => f.originalName),
                        database_status: 'completed',
                        timestamp: new Date().toISOString()
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
            } catch (webhookError) {
                // Log error but don't fail the upload
                console.error('[WEBHOOK ERROR]', webhookError.message);
                if (webhookError.response) {
                    console.error('[WEBHOOK ERROR] Response:', webhookError.response.data);
                }
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
    
    // Return CSV data in JSON format for API consumption
    res.json({
        success: true,
        id: callbackId,
        status: 'ready',
        tenantToken: data.tenantToken,
        userEmail: data.userEmail,
        uploadedAt: data.uploadedAt,
        files: data.files.map(f => ({
            name: f.originalName,
            size: f.size,
            type: f.type,
            validated: f.validated,
            rowCount: f.rowCount
        })),
        csvData: data.csvContent,
        message: 'CSV data ready for processing'
    });
    
    console.log(`[CSV CALLBACK] Data served for callback ${callbackId}`);
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