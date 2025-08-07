const Database = require('better-sqlite3');
const path = require('path');

// Create or open database
const dbPath = path.join(__dirname, 'tickets.db');
const db = new Database(dbPath);

// Initialize database schema
function initializeDatabase() {
  // Create tickets table
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

    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at);
    CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_email);
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
  seedSampleData
};