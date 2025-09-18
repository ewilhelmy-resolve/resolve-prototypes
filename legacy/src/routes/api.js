const express = require('express');
const router = express.Router();
const { body, validationResult, param, query } = require('express-validator');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const authService = require('../services/authService');
const { 
  requireAuth, 
  optionalAuth 
} = require('../middleware/auth');
const { 
  uploadLimiter 
} = require('../middleware/rateLimiter');

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Validation middleware
const validatePagination = [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
];

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '../../uploads', 'knowledge');
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

// Get current user info endpoint
router.get('/user/info', requireAuth, (req, res) => {
  console.log('[API] User info request:', {
    email: req.session.email,
    tenantId: req.session.tenantId,
    companyName: req.session.companyName
  });
  
  res.json({
    success: true,
    email: req.session.email,
    fullName: req.session.fullName,
    tenantId: req.session.tenantId,
    companyName: req.session.companyName,
    isAdmin: authService.isAdmin(req.session)
  });
});

// Get all users (for demonstration)
router.get('/users', (req, res) => {
  // This would typically require admin auth in production
  // For now, we'll return empty array as users are managed by authService
  res.json({ 
    success: true, 
    users: [],
    count: 0 
  });
});

// Knowledge articles upload endpoint
router.post('/upload-knowledge', uploadLimiter, upload.array('files', 10), async (req, res) => {
  const db = req.app.locals.db; // Access db from app locals
  const resolveWebhook = req.app.locals.resolveWebhook; // Access webhook from app locals
  
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
    const userSession = token ? authService.getSession(token) : null;
    const userEmail = userSession?.email || 'unknown@example.com';
    const userId = userSession?.userId || null;
    const tenantId = userSession?.tenantId || 'default-tenant';

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
            console.log(`[API] CSV validation - File ${file.originalname}: ${rows.length} rows validated`);
          }
        } catch (error) {
          console.error(`[API] CSV validation error - File ${file.originalname}:`, error);
          fileInfo.validated = false;
          fileInfo.error = error.message;
        }
      }
      
      uploadedFiles.push(fileInfo);
    }

    // Generate unique callback ID and secure access token
    const callbackId = crypto.randomBytes(16).toString('hex');
    const callbackToken = crypto.randomBytes(32).toString('hex'); // Secure token for accessing callback
    
    // Get app_url from database or use environment variable as fallback
    let appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    try {
      const configResult = await db.query(
        'SELECT value FROM system_config WHERE key = $1',
        ['app_url']
      );
      if (configResult.rows.length > 0) {
        appUrl = configResult.rows[0].value;
      }
    } catch (configError) {
      console.log('[API] Using fallback app URL:', appUrl);
    }
    
    const callbackUrl = `${appUrl}/api/csv/callback/${callbackId}`;
    
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

    console.log(`[API] Knowledge files uploaded by ${userEmail}:`, uploadedFiles.map(f => f.originalName));

    // Import CSV data as tickets to database first
    let ticketsImported = 0;
    if (csvContent.length > 0 && db) {
      try {
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
            console.error(`[API] Database error - Failed to insert ticket ${index}:`, insertError.message);
          }
        }
        
        console.log(`[API] Successfully imported ${ticketsImported} tickets from CSV`);
      } catch (dbError) {
        console.error('[API] Database error - Failed to import tickets:', dbError.message);
      }
    }

    // Call Resolve webhook after tickets are saved to database
    if (csvContent.length > 0 && ticketsImported > 0 && process.env.WEBHOOK_ENABLED !== 'false' && resolveWebhook) {
      try {
        console.log(`[API] Calling automation platform after database save...`);
        
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
        
        console.log(`[API] Automation platform response:`, webhookResponse.status);
        
      } catch (webhookError) {
        // Log error but don't fail the upload
        console.error('[API] Webhook error:', webhookError.message);
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
    console.error('[API] Upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Upload failed', 
      error: error.message 
    });
  }
});

// CSV callback endpoint - serves uploaded CSV data to external systems
router.get('/csv/callback/:id', param('id').isAlphanumeric().withMessage('Invalid callback ID'), handleValidationErrors, (req, res) => {
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
  
  console.log(`[API] CSV callback - Batch ${batchNumber} served for callback ${callbackId} (${batchData.length} rows)`);
});

// CSV callback endpoint - download as raw CSV
router.get('/csv/callback/:id/download', param('id').isAlphanumeric().withMessage('Invalid callback ID'), handleValidationErrors, (req, res) => {
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
  
  console.log(`[API] CSV download - CSV file downloaded for callback ${callbackId}`);
});

// API endpoint to fetch tickets for knowledge base display
router.get('/tickets', requireAuth, validatePagination, handleValidationErrors, async (req, res) => {
  const db = req.app.locals.db; // Access db from app locals
  
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
    console.error('[API] Error fetching tickets:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch tickets' 
    });
  }
});

// Webhook proxy endpoint for client-side integration
router.post('/webhook', requireAuth, async (req, res) => {
  const resolveWebhook = req.app.locals.resolveWebhook; // Access webhook from app locals
  
  try {
    const { source, action, ...additionalData } = req.body;
    
    if (!resolveWebhook) {
      return res.status(500).json({ 
        success: false, 
        error: 'Webhook service not available' 
      });
    }
    
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
    console.error('[API] Webhook proxy error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send event' 
    });
  }
});

module.exports = router;