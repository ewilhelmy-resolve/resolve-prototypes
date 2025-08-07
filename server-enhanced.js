const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8081;

// Middleware to set permissive headers for all responses
app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    next();
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
        // Fallback to mock on error
        res.redirect('/jarvis-mock.html');
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
        res.redirect('/jarvis-mock.html');
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
                
                // If iframe fails to load, use mock
                iframe.onerror = function() {
                    this.src = '/jarvis-mock.html';
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
            '/jarvis-mock.html - Mock interface'
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
║  • /jarvis-mock.html - Mock interface (fallback)             ║
║                                                               ║
║  Health check: http://localhost:${PORT}/health                  ║
║                                                               ║
║  The application will automatically use the mock interface   ║
║  if the real Jarvis AI is not accessible.                    ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});