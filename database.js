const Database = require('better-sqlite3');
const path = require('path');

// Create or open database
const dbPath = path.join(__dirname, 'tickets.db');
const db = new Database(dbPath);

// Initialize database schema
function initializeDatabase() {
  const { runSQLiteMigrations } = require('./database-migrations');
  runSQLiteMigrations(db);
  return; // Early return - migrations handle everything
  
  // Legacy code below (kept for reference but not executed)
  db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL,
      priority TEXT,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      resolution_time_minutes INTEGER,
      cost_saved REAL,
      assigned_to TEXT,
      resolved_by TEXT,
      is_automated BOOLEAN DEFAULT 0,
      automation_type TEXT,
      source TEXT DEFAULT 'manual',
      user_email TEXT
    );

    CREATE TABLE IF NOT EXISTS ticket_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE DEFAULT CURRENT_DATE,
      total_tickets INTEGER DEFAULT 0,
      automated_tickets INTEGER DEFAULT 0,
      manual_tickets INTEGER DEFAULT 0,
      avg_resolution_time REAL DEFAULT 0,
      total_cost_saved REAL DEFAULT 0,
      automation_rate REAL DEFAULT 0,
      top_categories TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS integrations_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      integration_type TEXT NOT NULL,
      last_sync DATETIME,
      tickets_imported INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS integrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT NOT NULL,
      type TEXT NOT NULL,
      config TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pending_validations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      webhook_id TEXT UNIQUE NOT NULL,
      user_email TEXT NOT NULL,
      integration_type TEXT NOT NULL,
      config TEXT,
      status TEXT DEFAULT 'pending',
      result TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS ticket_uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT NOT NULL,
      filename TEXT NOT NULL,
      csv_data BLOB NOT NULL,
      row_count INTEGER,
      upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      processing_status TEXT DEFAULT 'pending',
      analysis_result TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT NOT NULL,
      api_key TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_used DATETIME,
      is_active BOOLEAN DEFAULT 1,
      usage_count INTEGER DEFAULT 0,
      rate_limit INTEGER DEFAULT 1000
    );

    CREATE TABLE IF NOT EXISTS api_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      api_key TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      query_params TEXT,
      response_status INTEGER,
      request_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      response_time_ms INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at);
    CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_email);
    CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(api_key);
    CREATE INDEX IF NOT EXISTS idx_api_keys_email ON api_keys(user_email);
  `);

  console.log('✅ Database initialized successfully');
}

// Get ticket statistics
function getTicketStats(userEmail = null) {
  try {
    let query = `
      SELECT 
        COUNT(*) as total_tickets,
        SUM(CASE WHEN is_automated = 1 THEN 1 ELSE 0 END) as automated_tickets,
        SUM(CASE WHEN is_automated = 0 THEN 1 ELSE 0 END) as manual_tickets,
        AVG(resolution_time_minutes) as avg_resolution_time,
        SUM(cost_saved) as total_cost_saved,
        COUNT(DISTINCT category) as unique_categories,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_tickets,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tickets
      FROM tickets
    `;
    
    const params = [];
    if (userEmail) {
      query += ' WHERE user_email = ?';
      params.push(userEmail);
    }

    const stats = db.prepare(query).get(...params);

    // Get category distribution
    let categoryQuery = `
      SELECT category, COUNT(*) as count
      FROM tickets
      ${userEmail ? 'WHERE user_email = ?' : ''}
      GROUP BY category
      ORDER BY count DESC
      LIMIT 5
    `;
    const categories = db.prepare(categoryQuery).all(...params);

    // Get recent tickets
    let recentQuery = `
      SELECT ticket_id, title, status, priority, created_at, resolution_time_minutes
      FROM tickets
      ${userEmail ? 'WHERE user_email = ?' : ''}
      ORDER BY created_at DESC
      LIMIT 10
    `;
    const recentTickets = db.prepare(recentQuery).all(...params);

    // Get automation performance over time
    let trendQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN is_automated = 1 THEN 1 ELSE 0 END) as automated,
        AVG(resolution_time_minutes) as avg_time
      FROM tickets
      WHERE created_at >= date('now', '-30 days')
      ${userEmail ? 'AND user_email = ?' : ''}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;
    const trends = db.prepare(trendQuery).all(...params);

    return {
      stats: {
        ...stats,
        automation_rate: stats.total_tickets > 0 
          ? (stats.automated_tickets / stats.total_tickets * 100).toFixed(1)
          : 0
      },
      categories,
      recentTickets,
      trends,
      hasData: stats.total_tickets > 0
    };
  } catch (error) {
    console.error('Error getting ticket stats:', error);
    return {
      stats: {
        total_tickets: 0,
        automated_tickets: 0,
        manual_tickets: 0,
        avg_resolution_time: 0,
        total_cost_saved: 0,
        automation_rate: 0
      },
      categories: [],
      recentTickets: [],
      trends: [],
      hasData: false
    };
  }
}

// Import tickets from integration
function importTickets(tickets, source = 'manual', userEmail = null) {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO tickets (
      ticket_id, title, description, status, priority, category,
      created_at, resolved_at, resolution_time_minutes, cost_saved,
      assigned_to, resolved_by, is_automated, automation_type, source, user_email
    ) VALUES (
      @ticket_id, @title, @description, @status, @priority, @category,
      @created_at, @resolved_at, @resolution_time_minutes, @cost_saved,
      @assigned_to, @resolved_by, @is_automated, @automation_type, @source, @user_email
    )
  `);

  const insertMany = db.transaction((tickets) => {
    for (const ticket of tickets) {
      insert.run({
        ticket_id: ticket.ticket_id,
        title: ticket.title,
        description: ticket.description || null,
        status: ticket.status || 'open',
        priority: ticket.priority || 'medium',
        category: ticket.category || 'General',
        created_at: ticket.created_at || new Date().toISOString(),
        resolved_at: ticket.resolved_at || null,
        resolution_time_minutes: ticket.resolution_time_minutes || null,
        cost_saved: ticket.cost_saved || null,
        assigned_to: ticket.assigned_to || null,
        resolved_by: ticket.resolved_by || null,
        is_automated: ticket.is_automated || 0,
        automation_type: ticket.automation_type || null,
        source: source,
        user_email: userEmail || ticket.user_email || null
      });
    }
  });

  try {
    insertMany(tickets);
    return { success: true, count: tickets.length };
  } catch (error) {
    console.error('Error importing tickets:', error);
    return { success: false, error: error.message };
  }
}

// Seed with sample data for demo
function seedSampleData() {
  const sampleTickets = [
    {
      ticket_id: 'DEMO-001',
      title: 'Password Reset Request',
      description: 'User cannot access account',
      status: 'resolved',
      priority: 'high',
      category: 'Password Reset',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      resolved_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(),
      resolution_time_minutes: 15,
      cost_saved: 25.00,
      assigned_to: 'AI Agent',
      resolved_by: 'AI Agent',
      is_automated: 1,
      automation_type: 'password_reset',
      user_email: 'john@resolve.io'
    },
    {
      ticket_id: 'DEMO-002',
      title: 'Software Installation Request',
      description: 'Need Slack installed',
      status: 'resolved',
      priority: 'medium',
      category: 'Software Installation',
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      resolved_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
      resolution_time_minutes: 30,
      cost_saved: 50.00,
      assigned_to: 'AI Agent',
      resolved_by: 'AI Agent',
      is_automated: 1,
      automation_type: 'software_deployment',
      user_email: 'john@resolve.io'
    },
    {
      ticket_id: 'DEMO-003',
      title: 'Account Access Issue',
      description: 'Cannot access SharePoint',
      status: 'resolved',
      priority: 'high',
      category: 'Access Management',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      resolved_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
      resolution_time_minutes: 45,
      cost_saved: 75.00,
      assigned_to: 'Support Team',
      resolved_by: 'John Doe',
      is_automated: 0,
      user_email: 'john@resolve.io'
    },
    {
      ticket_id: 'DEMO-004',
      title: 'VPN Connection Problems',
      description: 'VPN keeps disconnecting',
      status: 'in_progress',
      priority: 'medium',
      category: 'Network',
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      resolved_at: null,
      resolution_time_minutes: null,
      cost_saved: null,
      assigned_to: 'Network Team',
      resolved_by: null,
      is_automated: 0,
      user_email: 'john@resolve.io'
    },
    {
      ticket_id: 'DEMO-005',
      title: 'Email Configuration',
      description: 'Setup email on mobile device',
      status: 'resolved',
      priority: 'low',
      category: 'Email',
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      resolved_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000).toISOString(),
      resolution_time_minutes: 20,
      cost_saved: 35.00,
      assigned_to: 'AI Agent',
      resolved_by: 'AI Agent',
      is_automated: 1,
      automation_type: 'email_config',
      user_email: 'john@resolve.io'
    }
  ];

  const result = importTickets(sampleTickets, 'demo');
  if (result.success) {
    console.log(`✅ Seeded ${result.count} sample tickets`);
  }
  return result;
}

// Check if we have any data
function hasTicketData(userEmail = null) {
  const query = userEmail 
    ? 'SELECT COUNT(*) as count FROM tickets WHERE user_email = ?'
    : 'SELECT COUNT(*) as count FROM tickets';
  
  const result = db.prepare(query).get(userEmail);
  return result.count > 0;
}

// Get integration status
function getIntegrationStatus() {
  const query = `
    SELECT 
      integration_type,
      last_sync,
      tickets_imported,
      status
    FROM integrations_data
    ORDER BY last_sync DESC
    LIMIT 5
  `;
  
  return db.prepare(query).all();
}

// Update integration sync
function updateIntegrationSync(integrationType, ticketsImported) {
  const stmt = db.prepare(`
    INSERT INTO integrations_data (integration_type, last_sync, tickets_imported, status)
    VALUES (?, CURRENT_TIMESTAMP, ?, 'success')
  `);
  
  return stmt.run(integrationType, ticketsImported);
}

// Initialize on module load
initializeDatabase();

// Don't automatically seed data - let users upload their own
// Store uploaded CSV data as blob
function storeTicketUpload(userEmail, filename, csvBuffer, rowCount = 0) {
  try {
    const stmt = db.prepare(`
      INSERT INTO ticket_uploads (user_email, filename, csv_data, row_count, processing_status)
      VALUES (?, ?, ?, ?, 'pending')
    `);
    
    const result = stmt.run(userEmail, filename, csvBuffer, rowCount);
    return result.lastInsertRowid;
  } catch (error) {
    console.error('Error storing ticket upload:', error);
    throw error;
  }
}

// Update upload processing status
function updateUploadStatus(uploadId, status, analysisResult = null) {
  try {
    const stmt = db.prepare(`
      UPDATE ticket_uploads 
      SET processing_status = ?, analysis_result = ?
      WHERE id = ?
    `);
    
    stmt.run(status, analysisResult, uploadId);
    return true;
  } catch (error) {
    console.error('Error updating upload status:', error);
    return false;
  }
}

// Get upload by ID
function getUpload(uploadId) {
  try {
    const stmt = db.prepare('SELECT * FROM ticket_uploads WHERE id = ?');
    return stmt.get(uploadId);
  } catch (error) {
    console.error('Error getting upload:', error);
    return null;
  }
}

// Generate API key
function generateApiKey(userEmail) {
  const crypto = require('crypto');
  const apiKey = 'rslv_' + crypto.randomBytes(32).toString('hex');
  
  try {
    // Check if user already has an API key
    const existingKey = db.prepare('SELECT api_key FROM api_keys WHERE user_email = ? AND is_active = 1').get(userEmail);
    if (existingKey) {
      return existingKey.api_key;
    }
    
    // Create new API key
    const stmt = db.prepare(`
      INSERT INTO api_keys (user_email, api_key)
      VALUES (?, ?)
    `);
    
    stmt.run(userEmail, apiKey);
    return apiKey;
  } catch (error) {
    console.error('Error generating API key:', error);
    throw error;
  }
}

// Validate API key
function validateApiKey(apiKey) {
  try {
    const stmt = db.prepare(`
      SELECT user_email, is_active, rate_limit, usage_count
      FROM api_keys 
      WHERE api_key = ? AND is_active = 1
    `);
    
    const result = stmt.get(apiKey);
    
    if (result) {
      // Update last used timestamp and usage count
      db.prepare(`
        UPDATE api_keys 
        SET last_used = CURRENT_TIMESTAMP, usage_count = usage_count + 1
        WHERE api_key = ?
      `).run(apiKey);
    }
    
    return result;
  } catch (error) {
    console.error('Error validating API key:', error);
    return null;
  }
}

// Log API request
function logApiRequest(apiKey, endpoint, method, queryParams, responseStatus, responseTimeMs) {
  try {
    const stmt = db.prepare(`
      INSERT INTO api_requests (api_key, endpoint, method, query_params, response_status, response_time_ms)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(apiKey, endpoint, method, JSON.stringify(queryParams), responseStatus, responseTimeMs);
  } catch (error) {
    console.error('Error logging API request:', error);
  }
}

// Get uploaded data for API access
function getUploadedData(userEmail, filters = {}) {
  try {
    let query = `
      SELECT t.*
      FROM tickets t
      WHERE t.user_email = ?
    `;
    
    const params = [userEmail];
    
    if (filters.start_date) {
      query += ' AND DATE(t.created_at) >= ?';
      params.push(filters.start_date);
    }
    
    if (filters.end_date) {
      query += ' AND DATE(t.created_at) <= ?';
      params.push(filters.end_date);
    }
    
    if (filters.status) {
      query += ' AND t.status = ?';
      params.push(filters.status);
    }
    
    if (filters.category) {
      query += ' AND t.category = ?';
      params.push(filters.category);
    }
    
    // Add pagination
    const page = filters.page || 1;
    const limit = filters.limit || 100;
    const offset = (page - 1) * limit;
    
    query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const data = db.prepare(query).all(...params);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM tickets t
      WHERE t.user_email = ?
    `;
    const countParams = [userEmail];
    
    if (filters.start_date) {
      countQuery += ' AND DATE(t.created_at) >= ?';
      countParams.push(filters.start_date);
    }
    
    if (filters.end_date) {
      countQuery += ' AND DATE(t.created_at) <= ?';
      countParams.push(filters.end_date);
    }
    
    if (filters.status) {
      countQuery += ' AND t.status = ?';
      countParams.push(filters.status);
    }
    
    if (filters.category) {
      countQuery += ' AND t.category = ?';
      countParams.push(filters.category);
    }
    
    const count = db.prepare(countQuery).get(...countParams);
    
    return {
      data,
      pagination: {
        page,
        limit,
        total: count.total,
        totalPages: Math.ceil(count.total / limit)
      }
    };
  } catch (error) {
    console.error('Error getting uploaded data:', error);
    throw error;
  }
}

// Pending validations management
const pendingValidations = {
  create: function(data) {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT INTO pending_validations (webhook_id, user_email, integration_type, config, status)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        data.webhook_id,
        data.user_email,
        data.integration_type,
        data.config || null,
        data.status || 'pending',
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...data });
        }
      );
    });
  },
  
  findByWebhookId: function(webhookId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM pending_validations WHERE webhook_id = ?',
        [webhookId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },
  
  updateStatus: function(webhookId, updates) {
    return new Promise((resolve, reject) => {
      const setClause = [];
      const values = [];
      
      if (updates.status) {
        setClause.push('status = ?');
        values.push(updates.status);
      }
      if (updates.result) {
        setClause.push('result = ?');
        values.push(updates.result);
      }
      if (updates.completed_at) {
        setClause.push('completed_at = ?');
        values.push(updates.completed_at);
      }
      
      values.push(webhookId);
      
      db.run(
        `UPDATE pending_validations SET ${setClause.join(', ')} WHERE webhook_id = ?`,
        values,
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }
};

// Integration management functions
const integrations = {
  create: function(data) {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT INTO integrations (user_email, type, config, status)
        VALUES (?, ?, ?, ?)
      `);
      
      stmt.run(
        data.user_email,
        data.type,
        data.config,
        data.status || 'active',
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...data });
        }
      );
    });
  },
  
  findByUserAndType: function(userEmail, type) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM integrations WHERE user_email = ? AND type = ? ORDER BY created_at DESC LIMIT 1',
        [userEmail, type],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },
  
  updateStatus: function(id, status) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE integrations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, id],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }
};

// Commented out for production - uncomment for testing
// if (!hasTicketData('john@resolve.io')) {
//   seedSampleData();
// }

module.exports = {
  db,
  getTicketStats,
  importTickets,
  hasTicketData,
  getIntegrationStatus,
  updateIntegrationSync,
  seedSampleData,
  storeTicketUpload,
  updateUploadStatus,
  getUpload,
  generateApiKey,
  validateApiKey,
  logApiRequest,
  getUploadedData,
  integrations,
  pendingValidations
};