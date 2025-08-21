const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8000;  // Docker will set PORT=8080

// Middleware to set permissive headers
app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    next();
});

// Serve static files from current directory
app.use(express.static('.', {
    extensions: ['html', 'htm'],
    index: 'index.html'
}));

// Serve pages directory
app.use('/pages', express.static(path.join(__dirname, 'pages')));

// Serve fonts directory
app.use('/fonts', express.static(path.join(__dirname, 'fonts')));

// Serve styles directory
app.use('/styles', express.static(path.join(__dirname, 'styles')));

// Serve components directory
app.use('/components', express.static(path.join(__dirname, 'components')));

// Specific route handlers for known pages
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'dashboard.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'admin.html'));
});

app.get('/jarvis', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'jarvis.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        port: PORT,
        timestamp: new Date().toISOString()
    });
});

// Catch-all route - redirect any unmatched routes to index.html
// This should be the last route defined
app.get('*', (req, res) => {
    // Don't redirect API routes or static assets
    if (req.path.startsWith('/api/') || 
        req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|otf|map|json)$/)) {
        return res.status(404).send('Not found');
    }
    
    // Check if index.html exists
    const indexPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        // If no index.html, try to serve dashboard as the default
        const dashboardPath = path.join(__dirname, 'pages', 'dashboard.html');
        if (fs.existsSync(dashboardPath)) {
            res.sendFile(dashboardPath);
        } else {
            res.status(404).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>404 - Page Not Found</title>
                    <style>
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro', sans-serif;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            margin: 0;
                            background: #f5f5f5;
                        }
                        .error-container {
                            text-align: center;
                            padding: 2rem;
                        }
                        h1 { color: #333; }
                        p { color: #666; }
                        a { 
                            color: #0066ff; 
                            text-decoration: none;
                            font-weight: 500;
                        }
                        a:hover { text-decoration: underline; }
                    </style>
                </head>
                <body>
                    <div class="error-container">
                        <h1>404 - Page Not Found</h1>
                        <p>The page you're looking for doesn't exist.</p>
                        <p><a href="/">Go to Home</a> | <a href="/pages/dashboard.html">Go to Dashboard</a></p>
                    </div>
                </body>
                </html>
            `);
        }
    }
});

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  Resolve Static Server                                       ║
║  Server running at: http://localhost:${PORT}                     ║
║                                                               ║
║  Available routes:                                            ║
║  • /                     - Index page                        ║
║  • /dashboard            - Dashboard page                    ║
║  • /admin                - Admin page                        ║
║  • /jarvis               - Jarvis page                       ║
║  • /pages/*.html         - All pages                         ║
║  • /*                    - Any other route → index.html      ║
║                                                               ║
║  Static directories:                                         ║
║  • /fonts                - Font files                        ║
║  • /styles               - CSS files                         ║
║  • /components           - JavaScript components             ║
║                                                               ║
║  Unknown routes like /sdf will redirect to index.html        ║
╚═══════════════════════════════════════════════════════════════╝
    `);
});