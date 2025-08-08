const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// In-memory storage for testing
const tenantData = new Map();
const apiKeys = new Map();
const uploads = new Map();

// Helper to generate API key
function generateApiKey() {
  return 'rslv_' + crypto.randomBytes(32).toString('hex');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'Test server for tenant isolation validation'
  });
});

// File upload endpoint (simulated)
app.post('/api/upload', express.raw({ type: '*/*', limit: '50mb' }), (req, res) => {
  const userEmail = req.headers['x-user-email'] || 'anonymous';
  const uploadId = `upload_${Date.now()}`;
  
  // Store upload info
  uploads.set(uploadId, {
    userEmail,
    timestamp: new Date().toISOString(),
    status: 'completed'
  });
  
  // Parse simulated CSV data from body if present
  if (req.body) {
    try {
      const content = req.body.toString();
      const lines = content.split('\n').filter(line => line.trim());
      
      if (lines.length > 1) {
        const headers = lines[0].split(',');
        const records = [];
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          const record = {};
          headers.forEach((header, index) => {
            record[header.trim()] = values[index] ? values[index].trim() : '';
          });
          records.push(record);
        }
        
        // Store tenant data
        if (!tenantData.has(userEmail)) {
          tenantData.set(userEmail, []);
        }
        tenantData.get(userEmail).push(...records);
        
        console.log(`Stored ${records.length} records for tenant: ${userEmail}`);
      }
    } catch (e) {
      console.log('Error parsing CSV:', e.message);
    }
  }
  
  res.json({
    success: true,
    uploadId,
    message: 'File uploaded successfully',
    filename: 'uploaded.csv',
    size: req.body ? req.body.length : 0
  });
});

// Generate API key endpoint
app.post('/api/generate-key', (req, res) => {
  const userEmail = req.headers['x-user-email'] || req.body.email || 'anonymous';
  
  // Check if user already has a key
  let existingKey = null;
  for (const [key, email] of apiKeys.entries()) {
    if (email === userEmail) {
      existingKey = key;
      break;
    }
  }
  
  if (existingKey) {
    console.log(`Returning existing API key for ${userEmail}: ${existingKey}`);
    res.json({ success: true, apiKey: existingKey });
  } else {
    const newKey = generateApiKey();
    apiKeys.set(newKey, userEmail);
    console.log(`Generated new API key for ${userEmail}: ${newKey}`);
    res.json({ success: true, apiKey: newKey });
  }
});

// Get ticket data with tenant isolation
app.get('/api/tickets/data', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  const userEmail = apiKeys.get(apiKey);
  if (!userEmail) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  // Get only this tenant's data
  const data = tenantData.get(userEmail) || [];
  
  // Apply filters if provided
  let filteredData = [...data];
  
  if (req.query.status) {
    filteredData = filteredData.filter(item => item.status === req.query.status);
  }
  
  if (req.query.category) {
    filteredData = filteredData.filter(item => item.category === req.query.category);
  }
  
  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  const paginatedData = filteredData.slice(startIndex, endIndex);
  
  console.log(`API request from ${userEmail}: returning ${paginatedData.length} of ${data.length} total records`);
  
  res.json({
    success: true,
    data: paginatedData,
    pagination: {
      page,
      limit,
      total: filteredData.length,
      totalPages: Math.ceil(filteredData.length / limit)
    }
  });
});

// Serve test pages
app.get('/test-file-upload.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-file-upload.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║  🧪 TEST SERVER FOR TENANT ISOLATION VALIDATION              ║
║  Server running at: http://localhost:${PORT}                    ║
║                                                               ║
║  This is a simplified server for testing tenant isolation    ║
║  without external dependencies.                              ║
║                                                               ║
║  Endpoints:                                                  ║
║  POST /api/upload        - Upload CSV data                   ║
║  POST /api/generate-key  - Generate API key                  ║
║  GET  /api/tickets/data  - Get tenant data (isolated)        ║
║  GET  /api/health        - Health check                      ║
╚════════════════════════════════════════════════════════════════╝
  `);
  
  console.log('\nReady for tenant isolation testing...\n');
});