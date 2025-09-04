const { Pool } = require('pg');
const config = require('../config');

// Create connection pool with retry logic
class DatabasePool {
  constructor() {
    this.pool = null;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.retryDelay = 5000;
  }

  async connect() {
    try {
      this.pool = new Pool({
        connectionString: config.database.url,
        max: config.database.url.includes('supabase') ? 10 : config.database.maxConnections, // Reduced for Supabase pooler
        idleTimeoutMillis: config.database.url.includes('supabase') ? 10000 : config.database.idleTimeout, // Reduced for Supabase
        connectionTimeoutMillis: config.database.connectionTimeout,
        ssl: config.database.url.includes('supabase') 
          ? { rejectUnauthorized: false } 
          : false,
        // Supabase pooler settings
        keepAlive: config.database.url.includes('supabase') ? false : true, // Don't keep connections alive with pooler
        allowExitOnIdle: config.database.url.includes('supabase') ? true : false
      });

      // Test connection
      await this.pool.query('SELECT 1');
      console.log('✅ Database connected successfully');
      
      // Setup error handlers
      this.pool.on('error', this.handlePoolError.bind(this));
      
      return this.pool;
    } catch (error) {
      console.error(`Database connection attempt ${this.retryCount + 1} failed:`, error.message);
      
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`Retrying in ${this.retryDelay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.connect();
      }
      
      throw new Error('Failed to connect to database after maximum retries');
    }
  }

  handlePoolError(err, client) {
    // Handle Supabase-specific pool termination errors gracefully
    if (err.code === 'XX000' && err.message.includes('db_termination')) {
      console.warn('⚠️ Database connection terminated by pooler - this is expected with Supabase');
    } else {
      console.error('Unexpected database pool error:', err);
    }
    // Don't exit the process, try to recover
  }

  async query(text, params) {
    if (!this.pool) {
      await this.connect();
    }
    
    try {
      const start = Date.now();
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      // Log slow queries in development
      if (config.nodeEnv === 'development' && duration > 1000) {
        console.log('Slow query detected:', { text, duration, rows: result.rowCount });
      }
      
      return result;
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}

module.exports = new DatabasePool();