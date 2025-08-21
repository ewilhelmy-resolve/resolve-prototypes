const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

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