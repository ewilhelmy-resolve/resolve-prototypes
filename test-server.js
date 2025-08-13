const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 8085;

// Disable all caching
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

// Serve static files with no caching
app.use(express.static('.', {
    etag: false,
    lastModified: false,
    cacheControl: false,
    maxAge: 0
}));

// Specifically handle jarvis.html to ensure fresh content
app.get('/jarvis.html', (req, res) => {
    const filePath = path.join(__dirname, 'jarvis.html');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            res.status(404).send('File not found');
            return;
        }
        res.set('Content-Type', 'text/html');
        res.send(data);
        console.log('Served jarvis.html - contains adminPortalLink:', data.includes('adminPortalLink'));
    });
});

// Mock admin check endpoint
app.get('/api/admin/check', (req, res) => {
    // For testing, always return admin for john@resolve.io
    const authHeader = req.headers.authorization;
    res.json({
        isAdmin: true,
        email: 'john@resolve.io'
    });
});

// Mock login endpoint
app.post('/api/auth/login', express.json(), (req, res) => {
    const { email, password } = req.body;
    if (email === 'john@resolve.io' && password === '!Password1') {
        res.json({
            success: true,
            user: { email, company_name: 'Resolve Demo' },
            token: 'test-token-admin'
        });
    } else if (email === 'alice@company1.com' && password === 'password123') {
        res.json({
            success: true,
            user: { email, company_name: 'TechCorp Inc' },
            token: 'test-token-alice'
        });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

app.listen(PORT, () => {
    console.log(`Test server running on http://localhost:${PORT}`);
    console.log('Caching disabled - serving fresh files');
});