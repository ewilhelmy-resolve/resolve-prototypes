const express = require('express');
const router = express.Router();
const { body, validationResult, param, query } = require('express-validator');
const axios = require('axios');
const { requireAdmin } = require('../middleware/auth');
const authService = require('../services/authService');

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
const validateUserEmail = [
  param('email').isEmail().normalizeEmail().withMessage('Valid email required'),
];

const validateUserUpdate = [
  body('company_name').optional().trim().isLength({ min: 1 }).withMessage('Company name cannot be empty'),
  body('phone').optional().trim(),
  body('tier').optional().isIn(['standard', 'premium', 'enterprise']).withMessage('Invalid tier value'),
];

const validateSettingsUpdate = [
  body('app_url').optional().isURL().withMessage('Invalid URL format'),
  body('webhook_enabled').optional().isIn(['true', 'false']).withMessage('webhook_enabled must be true or false'),
  body('max_document_size').optional().isInt({ min: 1 }).withMessage('max_document_size must be positive integer'),
  body('vector_dimension').optional().isInt({ min: 1 }).withMessage('vector_dimension must be positive integer'),
];

// Admin check endpoint (compatibility)
router.get('/check', requireAdmin, (req, res) => {
  res.json({
    success: true,
    email: req.session.email,
    fullName: req.session.fullName,
    tenantId: req.session.tenantId,
    isAdmin: authService.isAdmin(req.session)
  });
});

// Session statistics endpoint (admin only)
router.get('/session-stats', requireAdmin, (req, res) => {
  const stats = authService.getSessionStats();
  res.json({
    success: true,
    stats
  });
});

// Admin API Routes
router.get('/stats', requireAdmin, async (req, res) => {
  const db = req.app.locals.db; // Access db from app locals
  
  try {
    const dateRange = parseInt(req.query.days) || 30;
    const stats = await db.workflows.getAdminStats(dateRange);
    res.json(stats);
  } catch (error) {
    console.error('[ADMIN] Error getting admin stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load statistics' 
    });
  }
});

router.get('/triggers', requireAdmin, async (req, res) => {
  const db = req.app.locals.db; // Access db from app locals
  
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
    console.error('[ADMIN] Error getting triggers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load triggers' 
    });
  }
});

router.get('/user-activity', requireAdmin, async (req, res) => {
  const db = req.app.locals.db; // Access db from app locals
  
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
    console.error('[ADMIN] Error getting user activity:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load user activity' 
    });
  }
});

router.get('/analytics', requireAdmin, async (req, res) => {
  const db = req.app.locals.db; // Access db from app locals
  
  try {
    const days = parseInt(req.query.days) || 30;
    const analytics = await db.workflows.getAdminStats(days);
    res.json(analytics);
  } catch (error) {
    console.error('[ADMIN] Error getting analytics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load analytics' 
    });
  }
});

router.get('/webhooks', requireAdmin, async (req, res) => {
  const db = req.app.locals.db; // Access db from app locals
  
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
    console.error('[ADMIN] Error getting webhooks:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load webhook logs' 
    });
  }
});

// Webhook Traffic Routes
router.get('/webhook-traffic', requireAdmin, async (req, res) => {
  const db = req.app.locals.db; // Access db from app locals
  
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
    console.error('[ADMIN] Error fetching webhook traffic:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch webhook traffic' 
    });
  }
});

router.get('/webhook-traffic/:id', requireAdmin, param('id').isInt().withMessage('Invalid ID'), handleValidationErrors, async (req, res) => {
  const db = req.app.locals.db; // Access db from app locals
  
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
    console.error('[ADMIN] Error fetching traffic log:', error);
    res.status(500).json({ error: 'Failed to fetch traffic log' });
  }
});

router.delete('/webhook-traffic/clear', requireAdmin, async (req, res) => {
  const db = req.app.locals.db; // Access db from app locals
  
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
    console.error('[ADMIN] Error clearing traffic logs:', error);
    res.status(500).json({ error: 'Failed to clear traffic logs' });
  }
});

// Diagnostics Routes
router.get('/diagnostics', requireAdmin, async (req, res) => {
  const db = req.app.locals.db; // Access db from app locals
  
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
    let dbStatus = { connected: false, error: null, connectionUrl: null };
    try {
      const result = await db.query('SELECT NOW()');
      dbStatus.connected = true;
      dbStatus.timestamp = result.rows[0].now;
      // Add connection URL (mask password for security)
      const dbUrl = process.env.DATABASE_URL;
      if (dbUrl) {
        dbStatus.connectionUrl = dbUrl.replace(/:([^@]+)@/, ':****@'); // Mask password
      } else {
        dbStatus.connectionUrl = 'No DATABASE_URL configured';
      }
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
    console.error('[ADMIN] Diagnostics error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
});

router.get('/logs', requireAdmin, async (req, res) => {
  const db = req.app.locals.db; // Access db from app locals
  
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
    console.error('[ADMIN] Logs fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// System Settings Routes
router.get('/settings', requireAdmin, async (req, res) => {
  const db = req.app.locals.db; // Access db from app locals
  
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
    console.error('[ADMIN] Error loading settings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load settings' 
    });
  }
});

router.post('/settings', requireAdmin, validateSettingsUpdate, handleValidationErrors, async (req, res) => {
  const db = req.app.locals.db; // Access db from app locals
  
  try {
    const settings = req.body;
    
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
    console.error('[ADMIN] Error saving settings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save settings' 
    });
  }
});

router.post('/settings/reset', requireAdmin, async (req, res) => {
  const db = req.app.locals.db; // Access db from app locals
  
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
    console.error('[ADMIN] Error resetting settings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reset settings' 
    });
  }
});

router.post('/test-callback', requireAdmin, async (req, res) => {
  const db = req.app.locals.db; // Access db from app locals
  
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
    console.error('[ADMIN] Error testing callback URL:', error);
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
router.get('/users', requireAdmin, async (req, res) => {
  const db = req.app.locals.db; // Access db from app locals
  
  try {
    const { search, tier, sort = 'created_at', order = 'desc' } = req.query;
    
    let query = 'SELECT email, company_name, phone, tier, created_at, updated_at FROM users WHERE 1=1';
    const params = [];
    let paramCount = 0;
    
    if (search) {
      params.push(`%${search}%`);
      paramCount++;
      query += ` AND (email ILIKE $${paramCount} OR company_name ILIKE $${paramCount})`;
    }
    
    if (tier) {
      params.push(tier);
      query += ` AND tier = $${++paramCount}`;
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
    console.error('[ADMIN] Error getting users:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load users' 
    });
  }
});

router.put('/users/:email', requireAdmin, validateUserEmail, validateUserUpdate, handleValidationErrors, async (req, res) => {
  const db = req.app.locals.db; // Access db from app locals
  
  try {
    const { email } = req.params;
    const { company_name, phone, tier } = req.body;
    
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
    console.error('[ADMIN] Error updating user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update user' 
    });
  }
});

router.delete('/users/:email', requireAdmin, validateUserEmail, handleValidationErrors, async (req, res) => {
  const db = req.app.locals.db; // Access db from app locals
  
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
    
    // Try to delete from other tables that might exist
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
    console.error('[ADMIN] Error deleting user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete user' 
    });
  }
});

module.exports = router;