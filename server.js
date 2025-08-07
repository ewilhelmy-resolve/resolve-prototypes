const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8081;

// Serve static files from current directory
app.use(express.static('.', {
  setHeaders: (res, path) => {
    // Allow embedding in iframes
    res.setHeader('X-Frame-Options', 'ALLOWALL');
  }
}));

// Proxy endpoint for Jarvis chat
const jarvisProxy = createProxyMiddleware({
  target: 'https://resolvejarvisdev.espressive.com',
  changeOrigin: true,
  pathRewrite: {
    '^/jarvis-proxy': '/v2/chat'
  },
  onProxyReq: (proxyReq, req, res) => {
    // Log the request
    console.log('Proxying request to:', proxyReq.path);
  },
  onProxyRes: (proxyRes, req, res) => {
    // Remove security headers that prevent iframe embedding
    delete proxyRes.headers['x-frame-options'];
    delete proxyRes.headers['content-security-policy'];
    delete proxyRes.headers['x-content-type-options'];
    
    // Add CORS headers
    proxyRes.headers['access-control-allow-origin'] = '*';
    proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    proxyRes.headers['access-control-allow-headers'] = 'Content-Type, Authorization';
    
    // Allow iframe embedding
    proxyRes.headers['x-frame-options'] = 'ALLOWALL';
    
    console.log('Response headers modified for iframe embedding');
  },
  logLevel: 'debug'
});

app.use('/jarvis-proxy', jarvisProxy);

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  Resolve Onboarding Proxy Server                             ║
║  Server running at: http://localhost:${PORT}                    ║
║                                                               ║
║  Proxy endpoint:                                              ║
║  /jarvis-proxy → resolvejarvisdev.espressive.com/v2/chat     ║
║                                                               ║
║  To test:                                                     ║
║  1. Open http://localhost:${PORT}                               ║
║  2. Navigate to Step 7 (Success)                             ║
║  3. Click "Launch Jarvis AI"                                 ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});