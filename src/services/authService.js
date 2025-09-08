const bcrypt = require('bcrypt');
const crypto = require('crypto');
const dbConnection = require('../database/connection');
const db = require('../database/postgres');
const config = require('../config');

class AuthService {
  constructor() {
    this.sessionTimeout = config.security.sessionTimeout;
    this.failedAttempts = new Map(); // Track failed login attempts
    
    // Initialize session store (Redis or in-memory)
    this.initializeSessionStore();
    
    this.startSessionCleanup();
    this.startFailedAttemptsCleanup();
  }

  async initializeSessionStore() {
    // Check if Redis is enabled and available
    const useRedis = process.env.USE_REDIS_SESSIONS === 'true' && process.env.REDIS_HOST;
    
    if (useRedis) {
      try {
        const RedisSessionService = require('./redisSessionService');
        this.sessionStore = new RedisSessionService();
        console.log('[AUTH] Using Redis-based session storage');
        return;
      } catch (error) {
        console.warn('[AUTH] Redis session store failed to initialize:', error.message);
        console.log('[AUTH] Falling back to in-memory session storage');
      }
    }
    
    // Fallback to in-memory sessions
    this.sessions = new Map();
    this.sessionStore = null;
    console.log('[AUTH] Using in-memory session storage');
  }

  // Password hashing
  async hashPassword(password) {
    return bcrypt.hash(password, config.security.bcryptRounds);
  }

  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  // User management
  async createUser(userData) {
    const { email, password, company_name, phone, tier, full_name } = userData;
    
    // Check if user exists
    const existing = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existing.rows.length > 0) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);
    
    // Create user with transaction using connection layer
    return dbConnection.transaction(async (client) => {
      const result = await client.query(
        `INSERT INTO users (email, password, full_name, company_name, phone, tier, tenant_id) 
         VALUES ($1, $2, $3, $4, $5, $6, gen_random_uuid()) 
         RETURNING id, email, full_name, company_name, tenant_id, tier`,
        [email, hashedPassword, full_name, company_name, phone, tier || 'standard']
      );
      
      // Create initial user settings if the table exists
      try {
        await client.query(
          `INSERT INTO user_settings (user_id, settings) 
           VALUES ($1, $2)`,
          [result.rows[0].id, JSON.stringify({ notifications: true })]
        );
      } catch (settingsError) {
        // Table might not exist, just log and continue
        console.log('User settings table not found, skipping settings creation');
      }
      
      return result.rows[0];
    });
  }

  async authenticateUser(email, password) {
    // Check if account is locked
    if (this.isAccountLocked(email)) {
      throw new Error('Account temporarily locked due to too many failed attempts. Try again later.');
    }
    
    const result = await db.query(
      'SELECT id, email, password, full_name, company_name, tenant_id, tier, role, status FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      this.recordFailedAttempt(email);
      throw new Error('Invalid credentials');
    }
    
    const user = result.rows[0];
    
    // Check if user is disabled
    if (user.status === 'disabled') {
      throw new Error('Account is disabled. Please contact your administrator.');
    }
    
    // Ensure role is set
    user.role = user.role || 'user';
    
    // Log authentication attempt
    console.log('[AUTH] User authentication:', { email: user.email, role: user.role });
    
    const validPassword = await this.verifyPassword(password, user.password);
    
    if (!validPassword) {
      this.recordFailedAttempt(email);
      throw new Error('Invalid credentials');
    }
    
    // Clear failed attempts on successful login
    this.clearFailedAttempts(email);
    
    // Update last login time
    await db.query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );
    
    // Don't return password hash
    delete user.password;
    return user;
  }

  // Session management
  generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  async createSession(user) {
    if (this.sessionStore) {
      // Use Redis session store
      return await this.sessionStore.createSession(user);
    } else {
      // Use in-memory sessions
      const token = this.generateSessionToken();
      const session = {
        userId: user.id,
        email: user.email,
        fullName: user.full_name,
        companyName: user.company_name,
        tenantId: user.tenant_id,
        tier: user.tier,
        role: user.role || 'user',
        status: user.status || 'active',
        createdAt: Date.now(),
        expiresAt: Date.now() + this.sessionTimeout,
      };
      
      this.sessions.set(token, session);
      console.log(`[SESSION] Created session for user: ${user.email} with role: ${session.role}`);
      return { token, session };
    }
  }

  async getSession(token) {
    if (this.sessionStore) {
      // Use Redis session store
      return await this.sessionStore.getSession(token);
    } else {
      // Use in-memory sessions
      const session = this.sessions.get(token);
      
      if (!session) {
        return null;
      }
      
      if (session.expiresAt < Date.now()) {
        this.sessions.delete(token);
        console.log(`[SESSION] Expired session removed for user: ${session.email}`);
        return null;
      }
      
      // Extend session on activity
      session.expiresAt = Date.now() + this.sessionTimeout;
      return session;
    }
  }

  async destroySession(token) {
    if (this.sessionStore) {
      // Use Redis session store
      return await this.sessionStore.destroySession(token);
    } else {
      // Use in-memory sessions
      const session = this.sessions.get(token);
      if (session) {
        console.log(`[SESSION] Destroyed session for user: ${session.email}`);
      }
      return this.sessions.delete(token);
    }
  }

  // Get all sessions for a user (useful for logout from all devices)
  async getUserSessions(userId) {
    if (this.sessionStore) {
      // Use Redis session store
      return await this.sessionStore.getUserSessions(userId);
    } else {
      // Use in-memory sessions
      const userSessions = [];
      for (const [token, session] of this.sessions.entries()) {
        if (session.userId === userId) {
          userSessions.push({ token, session });
        }
      }
      return userSessions;
    }
  }

  // Destroy all sessions for a user
  async destroyAllUserSessions(userId) {
    if (this.sessionStore) {
      // Use Redis session store
      return await this.sessionStore.destroyAllUserSessions(userId);
    } else {
      // Use in-memory sessions
      let destroyedCount = 0;
      for (const [token, session] of this.sessions.entries()) {
        if (session.userId === userId) {
          this.sessions.delete(token);
          destroyedCount++;
        }
      }
      console.log(`[SESSION] Destroyed ${destroyedCount} sessions for user ID: ${userId}`);
      return destroyedCount;
    }
  }

  // Session cleanup
  startSessionCleanup() {
    setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;
      for (const [token, session] of this.sessions.entries()) {
        if (session.expiresAt < now) {
          this.sessions.delete(token);
          cleanedCount++;
        }
      }
      if (cleanedCount > 0) {
        console.log(`[SESSION CLEANUP] Cleaned up ${cleanedCount} expired sessions`);
      }
    }, config.cleanup.sessionCleanupIntervalMs); // Default: Every hour
  }

  // Password reset functionality
  async generatePasswordResetToken(email) {
    const user = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (user.rows.length === 0) {
      // Don't reveal if user exists for security
      return null;
    }
    
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour
    
    // Ensure password_resets table exists
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS password_resets (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(255) UNIQUE NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (createError) {
      console.error('Error creating password_resets table:', createError);
    }
    
    await db.query(
      `INSERT INTO password_resets (user_id, token, expires_at) 
       VALUES ($1, $2, $3)`,
      [user.rows[0].id, token, expires]
    );
    
    console.log(`[PASSWORD RESET] Generated reset token for user: ${email}`);
    return token;
  }

  async resetPassword(token, newPassword) {
    const result = await db.query(
      `SELECT user_id FROM password_resets 
       WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Invalid or expired reset token');
    }
    
    const hashedPassword = await this.hashPassword(newPassword);
    
    await dbConnection.transaction(async (client) => {
      // Update password
      await client.query(
        'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [hashedPassword, result.rows[0].user_id]
      );
      
      // Delete reset token
      await client.query(
        'DELETE FROM password_resets WHERE token = $1',
        [token]
      );
      
      // Destroy all existing sessions for this user for security
      const userSessions = this.getUserSessions(result.rows[0].user_id);
      userSessions.forEach(({ token: sessionToken }) => {
        this.destroySession(sessionToken);
      });
    });
    
    console.log(`[PASSWORD RESET] Password reset completed for user ID: ${result.rows[0].user_id}`);
    return true;
  }

  // Get user by ID (utility method)
  async getUserById(userId) {
    const result = await db.query(
      'SELECT id, email, full_name, company_name, tenant_id, tier, phone, created_at FROM users WHERE id = $1',
      [userId]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // Get user by email (utility method)
  async getUserByEmail(email) {
    const result = await db.query(
      'SELECT id, email, full_name, company_name, tenant_id, tier, phone, created_at FROM users WHERE email = $1',
      [email]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // Check if user is admin
  isAdmin(user) {
    return config.security.adminEmails.includes(user.email) || user.tier === 'admin';
  }

  // Get session statistics
  async getSessionStats() {
    if (this.sessionStore) {
      // Use Redis session store
      return await this.sessionStore.getSessionStats();
    } else {
      // Use in-memory sessions
      const now = Date.now();
      let activeCount = 0;
      let expiredCount = 0;
      
      for (const [token, session] of this.sessions.entries()) {
        if (session.expiresAt > now) {
          activeCount++;
        } else {
          expiredCount++;
        }
      }
      
      return {
        total: this.sessions.size,
        active: activeCount,
        expired: expiredCount,
        sessionTimeout: this.sessionTimeout,
        redisConnected: false,
        fallbackActive: true
      };
    }
  }

  // Account lockout functionality
  recordFailedAttempt(email) {
    const now = Date.now();
    const attempts = this.failedAttempts.get(email) || [];
    
    // Remove attempts older than 1 hour
    const recentAttempts = attempts.filter(attemptTime => now - attemptTime < 3600000);
    recentAttempts.push(now);
    
    this.failedAttempts.set(email, recentAttempts);
    
    console.log(`[AUTH] Failed login attempt for ${email}. Total attempts in last hour: ${recentAttempts.length}`);
    
    if (recentAttempts.length >= 5) {
      console.log(`[AUTH] Account locked for ${email} due to ${recentAttempts.length} failed attempts`);
    }
  }

  isAccountLocked(email) {
    const attempts = this.failedAttempts.get(email) || [];
    const now = Date.now();
    const recentAttempts = attempts.filter(attemptTime => now - attemptTime < 3600000);
    
    // Lock account after 5 failed attempts within 1 hour
    return recentAttempts.length >= 5;
  }

  clearFailedAttempts(email) {
    this.failedAttempts.delete(email);
    console.log(`[AUTH] Cleared failed attempts for ${email}`);
  }

  // Cleanup failed attempts periodically
  startFailedAttemptsCleanup() {
    setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const [email, attempts] of this.failedAttempts.entries()) {
        const recentAttempts = attempts.filter(attemptTime => now - attemptTime < 3600000);
        if (recentAttempts.length === 0) {
          this.failedAttempts.delete(email);
          cleanedCount++;
        } else {
          this.failedAttempts.set(email, recentAttempts);
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`[AUTH CLEANUP] Cleaned up failed attempts for ${cleanedCount} accounts`);
      }
    }, 3600000); // Every hour
  }

  // Get failed attempts statistics
  getFailedAttemptsStats() {
    const now = Date.now();
    let lockedAccounts = 0;
    let totalAttempts = 0;
    
    for (const [email, attempts] of this.failedAttempts.entries()) {
      const recentAttempts = attempts.filter(attemptTime => now - attemptTime < 3600000);
      totalAttempts += recentAttempts.length;
      if (recentAttempts.length >= 5) {
        lockedAccounts++;
      }
    }
    
    return {
      totalAccounts: this.failedAttempts.size,
      lockedAccounts,
      totalAttempts
    };
  }
}

module.exports = new AuthService();