const crypto = require('crypto');
const { runPostgreSQLMigrations } = require('./migrations');
const dbConnection = require('./connection');

// Initialize database with migrations
async function initializeDatabase() {
  try {
    // Connect using the new connection layer
    await dbConnection.connect();
    
    // Don't run migrations here - they're run from server.js startup
    // await runPostgreSQLMigrations(dbConnection.pool);
  } catch (err) {
    console.error('❌ Database initialization failed:', err);
    // Don't exit - let the app try to continue
    // Some queries might still work if tables exist
  }
}

// Initialize on startup
initializeDatabase();

// Helper function to handle database queries - use the connection layer
async function query(text, params) {
  return await dbConnection.query(text, params);
}

// Expose the pool for backward compatibility
const pool = {
  query: dbConnection.query.bind(dbConnection),
  connect: () => dbConnection.pool.connect(),
  end: () => dbConnection.close()
};

// User operations
const userOps = {
  async create(userData) {
    const { email, password, company_name, phone, tier } = userData;
    const result = await query(
      `INSERT INTO users (email, password, company_name, phone, tier) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email`,
      [email, password, company_name, phone, tier || 'standard']
    );
    return result.rows[0];
  },

  async findByEmail(email) {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  },

  async updateTier(email, tier) {
    const result = await query(
      'UPDATE users SET tier = $1 WHERE email = $2 RETURNING email, tier',
      [tier, email]
    );
    return result.rows[0];
  }
};

// Ticket operations
const ticketOps = {
  async getStats(userEmail = null) {
    let statsQuery = `
      SELECT 
        COUNT(*) as total_tickets,
        SUM(CASE WHEN is_automated = true THEN 1 ELSE 0 END) as automated_tickets,
        SUM(CASE WHEN is_automated = false THEN 1 ELSE 0 END) as manual_tickets,
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
      statsQuery += ' WHERE user_email = $1';
      params.push(userEmail);
    }

    const statsResult = await query(statsQuery, params);
    const stats = statsResult.rows[0];

    // Get category distribution
    let categoryQuery = `
      SELECT category, COUNT(*) as count
      FROM tickets
      ${userEmail ? 'WHERE user_email = $1' : ''}
      GROUP BY category
      ORDER BY count DESC
      LIMIT 5
    `;
    const categoryResult = await query(categoryQuery, params);

    // Get recent tickets
    let recentQuery = `
      SELECT ticket_id, title, status, priority, created_at, resolution_time_minutes
      FROM tickets
      ${userEmail ? 'WHERE user_email = $1' : ''}
      ORDER BY created_at DESC
      LIMIT 10
    `;
    const recentResult = await query(recentQuery, params);

    // Get trends
    let trendQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN is_automated = true THEN 1 ELSE 0 END) as automated,
        AVG(resolution_time_minutes) as avg_time
      FROM tickets
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      ${userEmail ? 'AND user_email = $1' : ''}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;
    const trendResult = await query(trendQuery, params);

    return {
      stats: {
        ...stats,
        automation_rate: stats.total_tickets > 0 
          ? (stats.automated_tickets / stats.total_tickets * 100).toFixed(1)
          : 0
      },
      categories: categoryResult.rows,
      recentTickets: recentResult.rows,
      trends: trendResult.rows,
      hasData: parseInt(stats.total_tickets) > 0
    };
  },

  async importTickets(tickets, source = 'manual', userEmail = null) {
    try {
      return await dbConnection.transaction(async (client) => {
        for (const ticket of tickets) {
          await client.query(
            `INSERT INTO tickets (
              ticket_id, title, description, status, priority, category,
              created_at, resolved_at, resolution_time_minutes, cost_saved,
              assigned_to, resolved_by, is_automated, automation_type, source, user_email
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            ON CONFLICT (ticket_id) DO UPDATE SET
              title = EXCLUDED.title,
              description = EXCLUDED.description,
              status = EXCLUDED.status,
              priority = EXCLUDED.priority,
              category = EXCLUDED.category,
              resolved_at = EXCLUDED.resolved_at,
              resolution_time_minutes = EXCLUDED.resolution_time_minutes,
              cost_saved = EXCLUDED.cost_saved`,
            [
              ticket.ticket_id,
              ticket.title,
              ticket.description || null,
              ticket.status || 'open',
              ticket.priority || 'medium',
              ticket.category || 'General',
              ticket.created_at || new Date(),
              ticket.resolved_at || null,
              ticket.resolution_time_minutes || null,
              ticket.cost_saved || null,
              ticket.assigned_to || null,
              ticket.resolved_by || null,
              ticket.is_automated || false,
              ticket.automation_type || null,
              source,
              userEmail || ticket.user_email || null
            ]
          );
        }
        
        return { success: true, count: tickets.length };
      });
    } catch (error) {
      console.error('Error importing tickets:', error);
      return { success: false, error: error.message };
    }
  },

  async hasTicketData(userEmail = null) {
    const queryText = userEmail 
      ? 'SELECT COUNT(*) as count FROM tickets WHERE user_email = $1'
      : 'SELECT COUNT(*) as count FROM tickets';
    
    const result = await query(queryText, userEmail ? [userEmail] : []);
    return parseInt(result.rows[0].count) > 0;
  }
};

// CSV upload operations
const uploadOps = {
  async create(uploadData) {
    const { id, user_email, filename, data, size, line_count } = uploadData;
    const result = await query(
      `INSERT INTO csv_uploads (id, user_email, filename, data, size, line_count) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, filename`,
      [id, user_email, filename, data, size, line_count]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await query('SELECT * FROM csv_uploads WHERE id = $1', [id]);
    return result.rows[0];
  },

  async findByUser(user_email) {
    const result = await query(
      `SELECT id, filename, size, line_count, uploaded_at, processed 
       FROM csv_uploads 
       WHERE user_email = $1 
       ORDER BY uploaded_at DESC`,
      [user_email]
    );
    return result.rows;
  },

  async delete(id) {
    await query('DELETE FROM csv_uploads WHERE id = $1', [id]);
    return { deleted: true };
  },

  async deleteByUser(user_email) {
    const result = await query('DELETE FROM csv_uploads WHERE user_email = $1', [user_email]);
    return { deleted: result.rowCount };
  }
};

// Session operations
const sessionOps = {
  async create(sessionData) {
    const { id, user_email, token, expires_at } = sessionData;
    const result = await query(
      `INSERT INTO sessions (id, user_email, token, expires_at) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, token`,
      [id, user_email, token, expires_at]
    );
    return result.rows[0];
  },

  async findByToken(token) {
    const result = await query(
      'SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()',
      [token]
    );
    return result.rows[0];
  },

  async delete(token) {
    await query('DELETE FROM sessions WHERE token = $1', [token]);
    return { deleted: true };
  },

  async cleanup() {
    const result = await query('DELETE FROM sessions WHERE expires_at <= NOW()');
    return { cleaned: result.rowCount };
  }
};

// API key operations
const apiKeyOps = {
  async create(keyData) {
    const { user_email, key_hash, name } = keyData;
    const result = await query(
      `INSERT INTO api_keys (user_email, key_hash, name) 
       VALUES ($1, $2, $3) 
       RETURNING id`,
      [user_email, key_hash, name]
    );
    return result.rows[0];
  },

  async findByHash(key_hash) {
    const result = await query(
      'SELECT * FROM api_keys WHERE key_hash = $1 AND active = true',
      [key_hash]
    );
    
    if (result.rows[0]) {
      // Update last_used timestamp
      await query(
        'UPDATE api_keys SET last_used = NOW(), usage_count = usage_count + 1 WHERE id = $1',
        [result.rows[0].id]
      );
    }
    
    return result.rows[0];
  },

  async findByUser(user_email) {
    const result = await query(
      'SELECT id, name, created_at, last_used, active FROM api_keys WHERE user_email = $1',
      [user_email]
    );
    return result.rows;
  },

  async revoke(id) {
    await query('UPDATE api_keys SET active = false WHERE id = $1', [id]);
    return { revoked: true };
  },

  async generateApiKey(userEmail) {
    const apiKey = 'rslv_' + crypto.randomBytes(32).toString('hex');
    
    // Check if user already has an API key
    const existing = await query(
      'SELECT key_hash FROM api_keys WHERE user_email = $1 AND active = true',
      [userEmail]
    );
    
    if (existing.rows[0]) {
      return existing.rows[0].key_hash;
    }
    
    // Create new API key
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    await query(
      'INSERT INTO api_keys (user_email, key_hash, name) VALUES ($1, $2, $3)',
      [userEmail, keyHash, 'Default API Key']
    );
    
    return apiKey;
  },

  async validateApiKey(apiKey) {
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    return await this.findByHash(keyHash);
  }
};

// Integration operations
const integrationOps = {
  async create(data) {
    const { user_email, type, config, status } = data;
    const result = await query(
      `INSERT INTO integrations (user_email, type, config, status) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id`,
      [user_email, type, config, status || 'active']
    );
    return { id: result.rows[0].id, ...data };
  },
  
  async upsert(integrationData) {
    const { user_email, type, config } = integrationData;
    const result = await query(
      `INSERT INTO integrations (user_email, type, config) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (user_email, type) 
       DO UPDATE SET config = $3, updated_at = NOW() 
       RETURNING id`,
      [user_email, type, JSON.stringify(config)]
    );
    return result.rows[0];
  },

  async findByUser(user_email) {
    const result = await query(
      'SELECT * FROM integrations WHERE user_email = $1 AND active = true',
      [user_email]
    );
    return result.rows;
  },
  
  async findByUserAndType(userEmail, type) {
    const result = await query(
      'SELECT * FROM integrations WHERE user_email = $1 AND type = $2 ORDER BY created_at DESC LIMIT 1',
      [userEmail, type]
    );
    return result.rows[0];
  },
  
  async updateStatus(id, status) {
    const result = await query(
      'UPDATE integrations SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, id]
    );
    return { changes: result.rowCount };
  },

  async updateSync(integrationType, ticketsImported) {
    const result = await query(
      `INSERT INTO integrations_data (integration_type, last_sync, tickets_imported, status)
       VALUES ($1, NOW(), $2, 'success')`,
      [integrationType, ticketsImported]
    );
    return result.rows[0];
  },

  async getStatus() {
    const result = await query(
      `SELECT integration_type, last_sync, tickets_imported, status
       FROM integrations_data
       ORDER BY last_sync DESC
       LIMIT 5`
    );
    return result.rows;
  }
};

// Pending validations operations
const pendingValidationsOps = {
  async create(data) {
    const { webhook_id, user_email, integration_type, config, status } = data;
    const result = await query(
      `INSERT INTO pending_validations (webhook_id, user_email, integration_type, config, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [webhook_id, user_email, integration_type, config, status || 'pending']
    );
    return { id: result.rows[0].id, ...data };
  },
  
  async findByWebhookId(webhookId) {
    const result = await query(
      'SELECT * FROM pending_validations WHERE webhook_id = $1',
      [webhookId]
    );
    return result.rows[0];
  },
  
  async updateStatus(webhookId, updates) {
    const setClauses = [];
    const values = [];
    let paramCount = 1;
    
    if (updates.status) {
      setClauses.push(`status = $${paramCount++}`);
      values.push(updates.status);
    }
    if (updates.result) {
      setClauses.push(`result = $${paramCount++}`);
      values.push(updates.result);
    }
    if (updates.completed_at) {
      setClauses.push(`completed_at = $${paramCount++}`);
      values.push(updates.completed_at);
    }
    
    values.push(webhookId);
    
    const result = await query(
      `UPDATE pending_validations SET ${setClauses.join(', ')} WHERE webhook_id = $${paramCount}`,
      values
    );
    return { changes: result.rowCount };
  }
};

// Analytics operations
const analyticsOps = {
  async trackEvent(eventData) {
    const { session_id, user_email, event_type, event_category, event_data, page_url, referrer, user_agent, ip_address } = eventData;
    const result = await query(
      `INSERT INTO analytics_events 
       (session_id, user_email, event_type, event_category, event_data, page_url, referrer, user_agent, ip_address) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING id`,
      [session_id, user_email, event_type, event_category, JSON.stringify(event_data), page_url, referrer, user_agent, ip_address]
    );
    return result.rows[0];
  },

  async trackFunnelStep(stepData) {
    const { session_id, user_email, step_name, step_number } = stepData;
    const result = await query(
      `INSERT INTO onboarding_funnel (session_id, user_email, step_name, step_number) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id`,
      [session_id, user_email, step_name, step_number]
    );
    return result.rows[0];
  },

  async trackConversion(conversionData) {
    const { session_id, user_email, conversion_type, conversion_value, source, medium, campaign, tier_selected } = conversionData;
    const result = await query(
      `INSERT INTO conversions 
       (session_id, user_email, conversion_type, conversion_value, source, medium, campaign, tier_selected) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id`,
      [session_id, user_email, conversion_type, conversion_value, source, medium, campaign, tier_selected]
    );
    return result.rows[0];
  }
};

// Webhook operations
const webhookOps = {
  async logCall(callData) {
    const { upload_id, user_email, webhook_url, request_payload, response_status, response_body, success, error_message } = callData;
    const result = await query(
      `INSERT INTO webhook_calls 
       (upload_id, user_email, webhook_url, request_payload, response_status, response_body, success, error_message) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id`,
      [upload_id, user_email, webhook_url, JSON.stringify(request_payload), response_status, response_body, success, error_message]
    );
    return result.rows[0];
  },

  async getByUser(user_email) {
    const result = await query(
      `SELECT wc.*, cu.filename, cu.line_count 
       FROM webhook_calls wc 
       LEFT JOIN csv_uploads cu ON wc.upload_id = cu.id 
       WHERE wc.user_email = $1 
       ORDER BY wc.called_at DESC`,
      [user_email]
    );
    return result.rows;
  },

  async getAll() {
    const result = await query(
      `SELECT wc.*, cu.filename, cu.line_count 
       FROM webhook_calls wc 
       LEFT JOIN csv_uploads cu ON wc.upload_id = cu.id 
       ORDER BY wc.called_at DESC`
    );
    return result.rows;
  }
};

// Workflow trigger tracking operations
const workflowOps = {
  async trackTrigger(triggerData) {
    const { user_email, trigger_type, action, metadata, webhook_id, response_status, success, error_message } = triggerData;
    const result = await query(
      `INSERT INTO workflow_triggers 
       (user_email, trigger_type, action, metadata, webhook_id, response_status, success, error_message) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id`,
      [user_email, trigger_type, action, JSON.stringify(metadata), webhook_id, response_status, success, error_message]
    );
    
    // Update daily metrics
    await this.updateDailyMetrics();
    
    return result.rows[0];
  },

  async updateDailyMetrics() {
    // Get today's metrics
    const today = new Date().toISOString().split('T')[0];
    
    // Calculate aggregated metrics for today
    const metricsQuery = `
      SELECT 
        COUNT(*) as total_triggers,
        COUNT(DISTINCT user_email) as unique_users,
        SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as successful_triggers,
        SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as failed_triggers,
        json_object_agg(DISTINCT trigger_type, type_count) as triggers_by_type,
        json_object_agg(DISTINCT action, action_count) as triggers_by_action
      FROM (
        SELECT 
          user_email, 
          trigger_type, 
          action, 
          success,
          COUNT(*) OVER (PARTITION BY trigger_type) as type_count,
          COUNT(*) OVER (PARTITION BY action) as action_count
        FROM workflow_triggers
        WHERE DATE(triggered_at) = $1
      ) as daily_data
    `;
    
    try {
      const result = await query(metricsQuery, [today]);
      const metrics = result.rows[0];
      
      // Upsert today's metrics
      await query(
        `INSERT INTO admin_metrics 
         (metric_date, total_triggers, unique_users, successful_triggers, failed_triggers, triggers_by_type, triggers_by_action)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (metric_date) DO UPDATE SET
           total_triggers = $2,
           unique_users = $3,
           successful_triggers = $4,
           failed_triggers = $5,
           triggers_by_type = $6,
           triggers_by_action = $7,
           updated_at = CURRENT_TIMESTAMP`,
        [today, metrics.total_triggers || 0, metrics.unique_users || 0, 
         metrics.successful_triggers || 0, metrics.failed_triggers || 0,
         metrics.triggers_by_type || {}, metrics.triggers_by_action || {}]
      );
    } catch (error) {
      console.error('Error updating daily metrics:', error);
    }
  },

  async getAdminStats(dateRange = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);
    
    // Get overall stats
    const statsQuery = `
      SELECT 
        COUNT(*) as total_triggers,
        COUNT(DISTINCT user_email) as unique_users,
        SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as successful_triggers,
        SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as failed_triggers,
        ROUND(AVG(CASE WHEN success = true THEN 100 ELSE 0 END), 2) as success_rate
      FROM workflow_triggers
      WHERE triggered_at >= $1
    `;
    
    const stats = await query(statsQuery, [startDate]);
    
    // Get triggers by type
    const typeQuery = `
      SELECT trigger_type, COUNT(*) as count
      FROM workflow_triggers
      WHERE triggered_at >= $1
      GROUP BY trigger_type
      ORDER BY count DESC
    `;
    
    const types = await query(typeQuery, [startDate]);
    
    // Get triggers by action
    const actionQuery = `
      SELECT action, COUNT(*) as count, 
             SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as successful
      FROM workflow_triggers
      WHERE triggered_at >= $1
      GROUP BY action
      ORDER BY count DESC
    `;
    
    const actions = await query(actionQuery, [startDate]);
    
    // Get recent triggers
    const recentQuery = `
      SELECT * FROM workflow_triggers
      ORDER BY triggered_at DESC
      LIMIT 50
    `;
    
    const recent = await query(recentQuery);
    
    // Get daily trends
    const trendsQuery = `
      SELECT 
        DATE(triggered_at) as date,
        COUNT(*) as triggers,
        COUNT(DISTINCT user_email) as users,
        SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as successful
      FROM workflow_triggers
      WHERE triggered_at >= $1
      GROUP BY DATE(triggered_at)
      ORDER BY date DESC
    `;
    
    const trends = await query(trendsQuery, [startDate]);
    
    // Get top users
    const usersQuery = `
      SELECT 
        user_email,
        COUNT(*) as trigger_count,
        SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as successful,
        MAX(triggered_at) as last_activity
      FROM workflow_triggers
      WHERE triggered_at >= $1
      GROUP BY user_email
      ORDER BY trigger_count DESC
      LIMIT 10
    `;
    
    const topUsers = await query(usersQuery, [startDate]);
    
    return {
      stats: stats.rows[0],
      triggersByType: types.rows,
      triggersByAction: actions.rows,
      recentTriggers: recent.rows,
      dailyTrends: trends.rows,
      topUsers: topUsers.rows
    };
  },

  async getUserActivity(user_email) {
    const result = await query(
      `SELECT * FROM workflow_triggers
       WHERE user_email = $1
       ORDER BY triggered_at DESC
       LIMIT 100`,
      [user_email]
    );
    return result.rows;
  }
};

// Export all operations
module.exports = {
  pool,
  query,
  users: userOps,
  tickets: ticketOps,
  uploads: uploadOps,
  sessions: sessionOps,
  apiKeys: apiKeyOps,
  integrations: integrationOps,
  pendingValidations: pendingValidationsOps,
  analytics: analyticsOps,
  webhooks: webhookOps,
  workflows: workflowOps,
  
  // Compatibility with existing code
  getTicketStats: ticketOps.getStats,
  importTickets: ticketOps.importTickets,
  hasTicketData: ticketOps.hasTicketData,
  getIntegrationStatus: integrationOps.getStatus,
  updateIntegrationSync: integrationOps.updateSync,
  generateApiKey: apiKeyOps.generateApiKey,
  validateApiKey: apiKeyOps.validateApiKey,
  
  // Utility function to close database
  async close() {
    await dbConnection.close();
  }
};