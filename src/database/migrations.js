/**
 * Database Migration System
 * Handles idempotent database schema creation and updates
 * Works with both PostgreSQL and SQLite
 */

const fs = require('fs');
const path = require('path');

/**
 * Run migrations for PostgreSQL
 */
async function runPostgreSQLMigrations(pool) {
  console.log('🔄 Running PostgreSQL database migrations...');
  
  try {
    // Read the init.sql file
    const initSQL = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
    
    // Special handling for PostgreSQL statements
    // Functions need special parsing
    const statements = [];
    const lines = initSQL.split('\n');
    let currentStatement = '';
    let inFunction = false;
    
    for (const line of lines) {
      // Skip comments
      if (line.trim().startsWith('--')) continue;
      
      // Check for function start
      if (line.includes('CREATE OR REPLACE FUNCTION') || line.includes('CREATE FUNCTION')) {
        inFunction = true;
      }
      
      currentStatement += line + '\n';
      
      // Check for statement end
      if (inFunction) {
        // Functions end with $$ language
        if (line.includes("$$ language") || line.includes("$$ LANGUAGE")) {
          statements.push(currentStatement.trim());
          currentStatement = '';
          inFunction = false;
        }
      } else {
        // Normal statements end with ;
        if (line.trim().endsWith(';')) {
          statements.push(currentStatement.trim());
          currentStatement = '';
        }
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }
    
    // Filter out empty statements
    const validStatements = statements.filter(s => s.length > 0);
    
    let successCount = 0;
    let skipCount = 0;
    
    for (const statement of validStatements) {
      try {
        // Don't add semicolon - statement already has it
        await pool.query(statement);
        successCount++;
      } catch (error) {
        // Check if it's a "already exists" error - that's OK
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate key')) {
          skipCount++;
        } else if (error.message.includes('extension "vector"') || 
                   error.message.includes('vector.control')) {
          // pgvector extension not installed - skip vector-related operations
          console.warn('⚠️ pgvector extension not available - RAG vector features will be limited');
          skipCount++;
        } else if (error.message.includes('type "vector" does not exist')) {
          // Vector type doesn't exist because pgvector isn't installed
          console.warn('⚠️ Skipping vector table creation - pgvector not installed');
          skipCount++;
        } else if (error.message.includes('access method "ivfflat" does not exist')) {
          // ivfflat index method not available without pgvector
          console.warn('⚠️ Skipping vector index creation - pgvector not installed');
          skipCount++;
        } else {
          console.error(`Migration error on statement: ${statement.substring(0, 50)}...`);
          console.error(error.message);
          throw error;
        }
      }
    }
    
    console.log(`✅ PostgreSQL migrations complete: ${successCount} executed, ${skipCount} skipped`);
    
    // Ensure admin user exists
    await ensureAdminUser(pool, 'postgresql');
    
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL migration failed:', error);
    throw error;
  }
}

/**
 * Run migrations for SQLite
 */
function runSQLiteMigrations(db) {
  console.log('🔄 Running SQLite database migrations...');
  
  try {
    // Create all tables (idempotent with IF NOT EXISTS)
    const migrations = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        company_name TEXT,
        phone TEXT,
        tier TEXT DEFAULT 'standard',
        stripe_customer_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Sessions table
      `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_email TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Tickets table
      `CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        priority TEXT,
        category TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        resolution_time_minutes INTEGER,
        cost_saved REAL,
        assigned_to TEXT,
        resolved_by TEXT,
        is_automated INTEGER DEFAULT 0,
        automation_type TEXT,
        source TEXT DEFAULT 'manual',
        user_email TEXT
      )`,
      
      // CSV uploads table
      `CREATE TABLE IF NOT EXISTS csv_uploads (
        id TEXT PRIMARY KEY,
        user_email TEXT NOT NULL,
        filename TEXT NOT NULL,
        data TEXT NOT NULL,
        size INTEGER,
        line_count INTEGER,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        processed INTEGER DEFAULT 0
      )`,
      
      // API keys table
      `CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT NOT NULL,
        key_hash TEXT UNIQUE NOT NULL,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_used DATETIME,
        active INTEGER DEFAULT 1,
        usage_count INTEGER DEFAULT 0,
        rate_limit INTEGER DEFAULT 1000
      )`,
      
      // API requests table
      `CREATE TABLE IF NOT EXISTS api_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        api_key TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        method TEXT NOT NULL,
        query_params TEXT,
        response_status INTEGER,
        request_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        response_time_ms INTEGER
      )`,
      
      // Integrations table
      `CREATE TABLE IF NOT EXISTS integrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT NOT NULL,
        type TEXT NOT NULL,
        config TEXT,
        status TEXT DEFAULT 'active',
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_email, type)
      )`,
      
      // Pending validations table
      `CREATE TABLE IF NOT EXISTS pending_validations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        webhook_id TEXT UNIQUE NOT NULL,
        user_email TEXT NOT NULL,
        integration_type TEXT NOT NULL,
        config TEXT,
        status TEXT DEFAULT 'pending',
        result TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
      )`,
      
      // Integrations data table
      `CREATE TABLE IF NOT EXISTS integrations_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        integration_type TEXT NOT NULL,
        last_sync DATETIME,
        tickets_imported INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Analytics events table
      `CREATE TABLE IF NOT EXISTS analytics_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        user_email TEXT,
        event_type TEXT NOT NULL,
        event_category TEXT NOT NULL,
        event_data TEXT,
        page_url TEXT,
        referrer TEXT,
        user_agent TEXT,
        ip_address TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Onboarding funnel table
      `CREATE TABLE IF NOT EXISTS onboarding_funnel (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        user_email TEXT,
        step_name TEXT NOT NULL,
        step_number INTEGER,
        time_spent_seconds INTEGER,
        completed INTEGER DEFAULT 0,
        abandoned INTEGER DEFAULT 0,
        abandoned_reason TEXT,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
      )`,
      
      // Page metrics table
      `CREATE TABLE IF NOT EXISTS page_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        user_email TEXT,
        page_path TEXT NOT NULL,
        time_on_page_seconds INTEGER,
        scroll_depth_percent INTEGER,
        clicks_count INTEGER,
        form_interactions INTEGER,
        entered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        left_at DATETIME
      )`,
      
      // Conversions table
      `CREATE TABLE IF NOT EXISTS conversions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        user_email TEXT,
        conversion_type TEXT NOT NULL,
        conversion_value REAL,
        source TEXT,
        medium TEXT,
        campaign TEXT,
        tier_selected TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Webhook calls table
      `CREATE TABLE IF NOT EXISTS webhook_calls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        upload_id TEXT NOT NULL,
        user_email TEXT NOT NULL,
        webhook_url TEXT NOT NULL,
        request_payload TEXT NOT NULL,
        response_status INTEGER,
        response_body TEXT,
        success INTEGER DEFAULT 0,
        error_message TEXT,
        called_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Ticket analytics table (legacy compatibility)
      `CREATE TABLE IF NOT EXISTS ticket_analytics (
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
      )`,
      
      // Ticket uploads table (legacy compatibility)
      `CREATE TABLE IF NOT EXISTS ticket_uploads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT NOT NULL,
        filename TEXT NOT NULL,
        csv_data BLOB NOT NULL,
        row_count INTEGER,
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        processing_status TEXT DEFAULT 'pending',
        analysis_result TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];
    
    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)',
      'CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_email)',
      'CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key_hash)',
      'CREATE INDEX IF NOT EXISTS idx_api_keys_email ON api_keys(user_email)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events(session_id)',
      'CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_email)',
      'CREATE INDEX IF NOT EXISTS idx_funnel_session ON onboarding_funnel(session_id)',
      'CREATE INDEX IF NOT EXISTS idx_conversions_session ON conversions(session_id)'
    ];
    
    // Execute all migrations
    migrations.forEach(migration => {
      db.exec(migration);
    });
    
    // Create indexes
    indexes.forEach(index => {
      db.exec(index);
    });
    
    console.log(`✅ SQLite migrations complete: ${migrations.length} tables, ${indexes.length} indexes`);
    
    // Ensure admin user exists
    ensureAdminUser(db, 'sqlite');
    
    return true;
  } catch (error) {
    console.error('❌ SQLite migration failed:', error);
    throw error;
  }
}

/**
 * Ensure admin user exists
 */
async function ensureAdminUser(dbConnection, dbType) {
  try {
    // Admin users to ensure exist
    const adminUsers = [
      {
        email: 'john.gorham@resolve.io',
        password: 'ResolveAdmin2024',
        fullName: 'John Gorham',
        company: 'Resolve.io',
        tier: 'admin'
      },
      {
        email: 'admin@resolve.io',
        password: 'admin123',
        fullName: 'Admin User',
        company: 'Resolve',
        tier: 'admin'
      }
    ];
    
    if (dbType === 'postgresql') {
      for (const user of adminUsers) {
        // Check if admin exists
        const result = await dbConnection.query(
          'SELECT id FROM users WHERE email = $1',
          [user.email]
        );
        
        if (result.rows.length === 0) {
          // Create admin user
          await dbConnection.query(
            `INSERT INTO users (email, password, full_name, company_name, tier) 
             VALUES ($1, $2, $3, $4, $5)`,
            [user.email, user.password, user.fullName, user.company, user.tier]
          );
          console.log(`✅ Admin user created: ${user.email}`);
        } else {
          // Update password to ensure it's correct
          await dbConnection.query(
            `UPDATE users SET password = $1, full_name = $2, company_name = $3, tier = $4 
             WHERE email = $5`,
            [user.password, user.fullName, user.company, user.tier, user.email]
          );
          console.log(`✅ Admin user updated: ${user.email}`);
        }
      }
    } else if (dbType === 'sqlite') {
      // For SQLite
      for (const user of adminUsers) {
        const stmt = dbConnection.prepare(
          'SELECT id FROM users WHERE email = ?'
        );
        const existing = stmt.get(user.email);
        
        if (!existing) {
          const insert = dbConnection.prepare(
            `INSERT INTO users (email, password, full_name, company_name, tier) 
             VALUES (?, ?, ?, ?, ?)`
          );
          insert.run(user.email, user.password, user.fullName, user.company, user.tier);
          console.log(`✅ Admin user created: ${user.email}`);
        } else {
          const update = dbConnection.prepare(
            `UPDATE users SET password = ?, full_name = ?, company_name = ?, tier = ? 
             WHERE email = ?`
          );
          update.run(user.password, user.fullName, user.company, user.tier, user.email);
          console.log(`✅ Admin user updated: ${user.email}`);
        }
      }
    }
  } catch (error) {
    console.error('⚠️ Could not ensure admin user:', error.message);
    // Non-fatal error - continue
  }
}

module.exports = {
  runPostgreSQLMigrations,
  runSQLiteMigrations
};