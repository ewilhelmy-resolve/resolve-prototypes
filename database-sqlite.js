const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database file in the project directory
const dbPath = path.join(__dirname, 'resolve-onboarding.db');
const db = new sqlite3.Database(dbPath);

// Initialize database schema
db.serialize(() => {
    // Users table for storing signed up accounts
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        company_name TEXT,
        phone TEXT,
        tier TEXT DEFAULT 'standard',
        stripe_customer_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // CSV uploads table for storing ticket data
    db.run(`CREATE TABLE IF NOT EXISTS csv_uploads (
        id TEXT PRIMARY KEY,
        user_email TEXT,
        filename TEXT NOT NULL,
        data TEXT NOT NULL,
        size INTEGER,
        line_count INTEGER,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        processed BOOLEAN DEFAULT 0,
        FOREIGN KEY (user_email) REFERENCES users(email)
    )`);

    // Sessions table for user authentication
    db.run(`CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_email TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_email) REFERENCES users(email)
    )`);

    // API keys table for tenant isolation
    db.run(`CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT NOT NULL,
        key_hash TEXT UNIQUE NOT NULL,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_used DATETIME,
        active BOOLEAN DEFAULT 1,
        FOREIGN KEY (user_email) REFERENCES users(email)
    )`);

    // Integration configurations
    db.run(`CREATE TABLE IF NOT EXISTS integrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT NOT NULL,
        type TEXT NOT NULL,
        config TEXT,
        active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_email) REFERENCES users(email)
    )`);

    // Marketing analytics events table
    db.run(`CREATE TABLE IF NOT EXISTS analytics_events (
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
    )`);

    // Onboarding funnel tracking
    db.run(`CREATE TABLE IF NOT EXISTS onboarding_funnel (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        user_email TEXT,
        step_name TEXT NOT NULL,
        step_number INTEGER,
        time_spent_seconds INTEGER,
        completed BOOLEAN DEFAULT 0,
        abandoned BOOLEAN DEFAULT 0,
        abandoned_reason TEXT,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
    )`);

    // Page views and engagement metrics
    db.run(`CREATE TABLE IF NOT EXISTS page_metrics (
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
    )`);

    // Conversion tracking
    db.run(`CREATE TABLE IF NOT EXISTS conversions (
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
    )`);

    // A/B test tracking
    db.run(`CREATE TABLE IF NOT EXISTS ab_tests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        user_email TEXT,
        test_name TEXT NOT NULL,
        variant TEXT NOT NULL,
        converted BOOLEAN DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Webhook calls tracking
    db.run(`CREATE TABLE IF NOT EXISTS webhook_calls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        upload_id TEXT NOT NULL,
        user_email TEXT NOT NULL,
        webhook_url TEXT NOT NULL,
        request_payload TEXT NOT NULL,
        response_status INTEGER,
        response_body TEXT,
        success BOOLEAN DEFAULT 0,
        error_message TEXT,
        called_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (upload_id) REFERENCES csv_uploads(id),
        FOREIGN KEY (user_email) REFERENCES users(email)
    )`);

    console.log('✅ Database initialized successfully at:', dbPath);
});

// User operations
const userOps = {
    create: (userData) => {
        return new Promise((resolve, reject) => {
            const { email, password, company_name, phone, tier } = userData;
            db.run(
                `INSERT INTO users (email, password, company_name, phone, tier) VALUES (?, ?, ?, ?, ?)`,
                [email, password, company_name, phone, tier || 'standard'],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID, email });
                }
            );
        });
    },

    findByEmail: (email) => {
        return new Promise((resolve, reject) => {
            db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },

    updateTier: (email, tier) => {
        return new Promise((resolve, reject) => {
            db.run(
                `UPDATE users SET tier = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?`,
                [tier, email],
                (err) => {
                    if (err) reject(err);
                    else resolve({ email, tier });
                }
            );
        });
    }
};

// CSV upload operations
const uploadOps = {
    create: (uploadData) => {
        return new Promise((resolve, reject) => {
            const { id, user_email, filename, data, size, line_count } = uploadData;
            db.run(
                `INSERT INTO csv_uploads (id, user_email, filename, data, size, line_count) VALUES (?, ?, ?, ?, ?, ?)`,
                [id, user_email, filename, data, size, line_count],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id, filename });
                }
            );
        });
    },

    findById: (id) => {
        return new Promise((resolve, reject) => {
            db.get(`SELECT * FROM csv_uploads WHERE id = ?`, [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },

    findByUser: (user_email) => {
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT id, filename, size, line_count, uploaded_at, processed FROM csv_uploads WHERE user_email = ? ORDER BY uploaded_at DESC`,
                [user_email],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    },

    delete: (id) => {
        return new Promise((resolve, reject) => {
            db.run(`DELETE FROM csv_uploads WHERE id = ?`, [id], (err) => {
                if (err) reject(err);
                else resolve({ deleted: true });
            });
        });
    },

    deleteByUser: (user_email) => {
        return new Promise((resolve, reject) => {
            db.run(`DELETE FROM csv_uploads WHERE user_email = ?`, [user_email], function(err) {
                if (err) reject(err);
                else resolve({ deleted: this.changes });
            });
        });
    }
};

// Session operations
const sessionOps = {
    create: (sessionData) => {
        return new Promise((resolve, reject) => {
            const { id, user_email, token, expires_at } = sessionData;
            db.run(
                `INSERT INTO sessions (id, user_email, token, expires_at) VALUES (?, ?, ?, ?)`,
                [id, user_email, token, expires_at],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id, token });
                }
            );
        });
    },

    findByToken: (token) => {
        return new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')`,
                [token],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    },

    delete: (token) => {
        return new Promise((resolve, reject) => {
            db.run(`DELETE FROM sessions WHERE token = ?`, [token], (err) => {
                if (err) reject(err);
                else resolve({ deleted: true });
            });
        });
    },

    cleanup: () => {
        return new Promise((resolve, reject) => {
            db.run(`DELETE FROM sessions WHERE expires_at <= datetime('now')`, function(err) {
                if (err) reject(err);
                else resolve({ cleaned: this.changes });
            });
        });
    }
};

// API key operations
const apiKeyOps = {
    create: (keyData) => {
        return new Promise((resolve, reject) => {
            const { user_email, key_hash, name } = keyData;
            db.run(
                `INSERT INTO api_keys (user_email, key_hash, name) VALUES (?, ?, ?)`,
                [user_email, key_hash, name],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID });
                }
            );
        });
    },

    findByHash: (key_hash) => {
        return new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM api_keys WHERE key_hash = ? AND active = 1`,
                [key_hash],
                (err, row) => {
                    if (err) reject(err);
                    else {
                        // Update last_used timestamp
                        if (row) {
                            db.run(
                                `UPDATE api_keys SET last_used = CURRENT_TIMESTAMP WHERE id = ?`,
                                [row.id]
                            );
                        }
                        resolve(row);
                    }
                }
            );
        });
    },

    findByUser: (user_email) => {
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT id, name, created_at, last_used, active FROM api_keys WHERE user_email = ?`,
                [user_email],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    },

    revoke: (id) => {
        return new Promise((resolve, reject) => {
            db.run(`UPDATE api_keys SET active = 0 WHERE id = ?`, [id], (err) => {
                if (err) reject(err);
                else resolve({ revoked: true });
            });
        });
    }
};

// Integration operations
const integrationOps = {
    upsert: (integrationData) => {
        return new Promise((resolve, reject) => {
            const { user_email, type, config } = integrationData;
            db.run(
                `INSERT INTO integrations (user_email, type, config) VALUES (?, ?, ?)
                 ON CONFLICT(user_email, type) DO UPDATE SET 
                 config = excluded.config, 
                 updated_at = CURRENT_TIMESTAMP`,
                [user_email, type, JSON.stringify(config)],
                function(err) {
                    if (err) {
                        // SQLite doesn't support ON CONFLICT, so we'll handle it manually
                        db.run(
                            `UPDATE integrations SET config = ?, updated_at = CURRENT_TIMESTAMP 
                             WHERE user_email = ? AND type = ?`,
                            [JSON.stringify(config), user_email, type],
                            function(updateErr) {
                                if (updateErr || this.changes === 0) {
                                    // If update didn't affect any rows, insert new
                                    db.run(
                                        `INSERT INTO integrations (user_email, type, config) VALUES (?, ?, ?)`,
                                        [user_email, type, JSON.stringify(config)],
                                        function(insertErr) {
                                            if (insertErr) reject(insertErr);
                                            else resolve({ id: this.lastID });
                                        }
                                    );
                                } else {
                                    resolve({ updated: true });
                                }
                            }
                        );
                    } else {
                        resolve({ id: this.lastID });
                    }
                }
            );
        });
    },

    findByUser: (user_email) => {
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM integrations WHERE user_email = ? AND active = 1`,
                [user_email],
                (err, rows) => {
                    if (err) reject(err);
                    else {
                        // Parse JSON config for each row
                        const parsed = rows.map(row => ({
                            ...row,
                            config: JSON.parse(row.config || '{}')
                        }));
                        resolve(parsed);
                    }
                }
            );
        });
    }
};

// Analytics operations
const analyticsOps = {
    trackEvent: (eventData) => {
        return new Promise((resolve, reject) => {
            const { session_id, user_email, event_type, event_category, event_data, page_url, referrer, user_agent, ip_address } = eventData;
            db.run(
                `INSERT INTO analytics_events (session_id, user_email, event_type, event_category, event_data, page_url, referrer, user_agent, ip_address) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [session_id, user_email, event_type, event_category, JSON.stringify(event_data), page_url, referrer, user_agent, ip_address],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID });
                }
            );
        });
    },

    trackFunnelStep: (stepData) => {
        return new Promise((resolve, reject) => {
            const { session_id, user_email, step_name, step_number } = stepData;
            db.run(
                `INSERT INTO onboarding_funnel (session_id, user_email, step_name, step_number) 
                 VALUES (?, ?, ?, ?)`,
                [session_id, user_email, step_name, step_number],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID });
                }
            );
        });
    },

    updateFunnelStep: (session_id, step_name, updates) => {
        return new Promise((resolve, reject) => {
            const fields = [];
            const values = [];
            
            if (updates.completed !== undefined) {
                fields.push('completed = ?');
                values.push(updates.completed ? 1 : 0);
                if (updates.completed) {
                    fields.push('completed_at = CURRENT_TIMESTAMP');
                }
            }
            
            if (updates.abandoned !== undefined) {
                fields.push('abandoned = ?');
                values.push(updates.abandoned ? 1 : 0);
            }
            
            if (updates.time_spent_seconds !== undefined) {
                fields.push('time_spent_seconds = ?');
                values.push(updates.time_spent_seconds);
            }
            
            values.push(session_id, step_name);
            
            db.run(
                `UPDATE onboarding_funnel SET ${fields.join(', ')} 
                 WHERE session_id = ? AND step_name = ?`,
                values,
                (err) => {
                    if (err) reject(err);
                    else resolve({ updated: true });
                }
            );
        });
    },

    trackPageMetrics: (metricsData) => {
        return new Promise((resolve, reject) => {
            const { session_id, user_email, page_path } = metricsData;
            db.run(
                `INSERT INTO page_metrics (session_id, user_email, page_path) 
                 VALUES (?, ?, ?)`,
                [session_id, user_email, page_path],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID });
                }
            );
        });
    },

    updatePageMetrics: (id, updates) => {
        return new Promise((resolve, reject) => {
            const fields = [];
            const values = [];
            
            if (updates.time_on_page_seconds !== undefined) {
                fields.push('time_on_page_seconds = ?');
                values.push(updates.time_on_page_seconds);
            }
            
            if (updates.scroll_depth_percent !== undefined) {
                fields.push('scroll_depth_percent = ?');
                values.push(updates.scroll_depth_percent);
            }
            
            if (updates.clicks_count !== undefined) {
                fields.push('clicks_count = ?');
                values.push(updates.clicks_count);
            }
            
            if (updates.left_at) {
                fields.push('left_at = CURRENT_TIMESTAMP');
            }
            
            values.push(id);
            
            db.run(
                `UPDATE page_metrics SET ${fields.join(', ')} WHERE id = ?`,
                values,
                (err) => {
                    if (err) reject(err);
                    else resolve({ updated: true });
                }
            );
        });
    },

    trackConversion: (conversionData) => {
        return new Promise((resolve, reject) => {
            const { session_id, user_email, conversion_type, conversion_value, source, medium, campaign, tier_selected } = conversionData;
            db.run(
                `INSERT INTO conversions (session_id, user_email, conversion_type, conversion_value, source, medium, campaign, tier_selected) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [session_id, user_email, conversion_type, conversion_value, source, medium, campaign, tier_selected],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID });
                }
            );
        });
    },

    getAnalyticsSummary: () => {
        return new Promise((resolve, reject) => {
            const summary = {};
            
            // Get total events
            db.get(`SELECT COUNT(*) as total_events FROM analytics_events`, (err, row) => {
                if (err) return reject(err);
                summary.total_events = row.total_events;
                
                // Get funnel stats
                db.all(`
                    SELECT 
                        step_name,
                        COUNT(*) as total_users,
                        SUM(completed) as completed_users,
                        AVG(time_spent_seconds) as avg_time_spent
                    FROM onboarding_funnel
                    GROUP BY step_name
                    ORDER BY step_number
                `, (err, rows) => {
                    if (err) return reject(err);
                    summary.funnel_stats = rows;
                    
                    // Get conversion stats
                    db.all(`
                        SELECT 
                            conversion_type,
                            COUNT(*) as total_conversions,
                            SUM(conversion_value) as total_value,
                            tier_selected,
                            COUNT(DISTINCT user_email) as unique_users
                        FROM conversions
                        GROUP BY conversion_type, tier_selected
                    `, (err, rows) => {
                        if (err) return reject(err);
                        summary.conversion_stats = rows;
                        
                        // Get page metrics
                        db.all(`
                            SELECT 
                                page_path,
                                COUNT(*) as views,
                                AVG(time_on_page_seconds) as avg_time,
                                AVG(scroll_depth_percent) as avg_scroll_depth,
                                SUM(clicks_count) as total_clicks
                            FROM page_metrics
                            GROUP BY page_path
                            ORDER BY views DESC
                        `, (err, rows) => {
                            if (err) return reject(err);
                            summary.page_stats = rows;
                            
                            // Get recent events
                            db.all(`
                                SELECT * FROM analytics_events 
                                ORDER BY timestamp DESC 
                                LIMIT 100
                            `, (err, rows) => {
                                if (err) return reject(err);
                                summary.recent_events = rows;
                                
                                resolve(summary);
                            });
                        });
                    });
                });
            });
        });
    }
};

// Webhook operations
const webhookOps = {
    logCall: (callData) => {
        return new Promise((resolve, reject) => {
            const { upload_id, user_email, webhook_url, request_payload, response_status, response_body, success, error_message } = callData;
            db.run(
                `INSERT INTO webhook_calls (upload_id, user_email, webhook_url, request_payload, response_status, response_body, success, error_message) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [upload_id, user_email, webhook_url, JSON.stringify(request_payload), response_status, response_body, success ? 1 : 0, error_message],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID });
                }
            );
        });
    },

    getByUser: (user_email) => {
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT wc.*, cu.filename, cu.line_count 
                 FROM webhook_calls wc 
                 LEFT JOIN csv_uploads cu ON wc.upload_id = cu.id 
                 WHERE wc.user_email = ? 
                 ORDER BY wc.called_at DESC`,
                [user_email],
                (err, rows) => {
                    if (err) reject(err);
                    else {
                        // Parse JSON request_payload for each row
                        const parsed = rows.map(row => ({
                            ...row,
                            request_payload: JSON.parse(row.request_payload || '{}')
                        }));
                        resolve(parsed);
                    }
                }
            );
        });
    },

    getAll: () => {
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT wc.*, cu.filename, cu.line_count 
                 FROM webhook_calls wc 
                 LEFT JOIN csv_uploads cu ON wc.upload_id = cu.id 
                 ORDER BY wc.called_at DESC`,
                [],
                (err, rows) => {
                    if (err) reject(err);
                    else {
                        // Parse JSON request_payload for each row
                        const parsed = rows.map(row => ({
                            ...row,
                            request_payload: JSON.parse(row.request_payload || '{}')
                        }));
                        resolve(parsed);
                    }
                }
            );
        });
    }
};

module.exports = {
    db,
    users: userOps,
    uploads: uploadOps,
    sessions: sessionOps,
    apiKeys: apiKeyOps,
    integrations: integrationOps,
    analytics: analyticsOps,
    webhooks: webhookOps,
    
    // Utility function to close database
    close: () => {
        return new Promise((resolve, reject) => {
            db.close((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
};