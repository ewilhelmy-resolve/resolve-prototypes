const redis = require('redis');
const crypto = require('crypto');
const config = require('../config');

/**
 * Redis-based Session Service
 * 
 * This replaces the in-memory Map() session storage with Redis,
 * enabling proper horizontal scaling and session persistence
 * across multiple PM2 instances or server restarts.
 */
class RedisSessionService {
  constructor() {
    this.redis = null;
    this.sessionTimeout = config.security.sessionTimeout;
    this.sessionPrefix = 'session:';
    this.failedAttempts = new Map(); // Keep failed attempts in memory for now
    this.isConnected = false;
    
    this.init();
    this.startFailedAttemptsCleanup();
  }

  async init() {
    try {
      // Redis connection configuration
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        db: parseInt(process.env.REDIS_DB || '0'),
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
      };

      // Add password if provided
      if (process.env.REDIS_PASSWORD) {
        redisConfig.password = process.env.REDIS_PASSWORD;
      }

      // Create Redis client
      this.redis = redis.createClient(redisConfig);

      // Handle Redis events
      this.redis.on('connect', () => {
        console.log('[REDIS SESSION] Connected to Redis server');
        this.isConnected = true;
      });

      this.redis.on('error', (err) => {
        console.error('[REDIS SESSION] Redis connection error:', err);
        this.isConnected = false;
        
        // Fall back to in-memory sessions if Redis fails
        if (!this.fallbackSessions) {
          console.log('[REDIS SESSION] Initializing fallback in-memory session store');
          this.fallbackSessions = new Map();
        }
      });

      this.redis.on('ready', () => {
        console.log('[REDIS SESSION] Redis client ready');
        this.isConnected = true;
      });

      this.redis.on('end', () => {
        console.log('[REDIS SESSION] Redis connection ended');
        this.isConnected = false;
      });

      // Connect to Redis
      await this.redis.connect();

    } catch (error) {
      console.error('[REDIS SESSION] Failed to initialize Redis:', error);
      console.log('[REDIS SESSION] Falling back to in-memory session store');
      this.fallbackSessions = new Map();
      this.isConnected = false;
    }
  }

  // Generate secure session token
  generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Create a new session
  async createSession(user) {
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

    try {
      if (this.isConnected) {
        // Store in Redis with expiration
        const sessionKey = this.sessionPrefix + token;
        const sessionData = JSON.stringify(session);
        const ttlSeconds = Math.floor(this.sessionTimeout / 1000);
        
        await this.redis.setEx(sessionKey, ttlSeconds, sessionData);
        console.log(`[REDIS SESSION] Created session for user: ${user.email}`);
      } else {
        // Fallback to in-memory storage
        this.fallbackSessions.set(token, session);
        console.log(`[MEMORY SESSION] Created fallback session for user: ${user.email}`);
      }
      
      return { token, session };
    } catch (error) {
      console.error('[REDIS SESSION] Error creating session:', error);
      // Emergency fallback
      this.fallbackSessions = this.fallbackSessions || new Map();
      this.fallbackSessions.set(token, session);
      console.log(`[MEMORY SESSION] Created emergency fallback session for user: ${user.email}`);
      return { token, session };
    }
  }

  // Retrieve a session
  async getSession(token) {
    if (!token) {
      return null;
    }

    try {
      let session = null;

      if (this.isConnected) {
        // Get from Redis
        const sessionKey = this.sessionPrefix + token;
        const sessionData = await this.redis.get(sessionKey);
        
        if (sessionData) {
          session = JSON.parse(sessionData);
        }
      } else if (this.fallbackSessions) {
        // Get from fallback memory storage
        session = this.fallbackSessions.get(token);
      }

      if (!session) {
        return null;
      }

      // Check expiration
      if (session.expiresAt < Date.now()) {
        await this.destroySession(token);
        console.log(`[SESSION] Expired session removed for user: ${session.email}`);
        return null;
      }

      // Extend session on activity (sliding expiration)
      session.expiresAt = Date.now() + this.sessionTimeout;
      
      if (this.isConnected) {
        // Update expiration in Redis
        const sessionKey = this.sessionPrefix + token;
        const sessionData = JSON.stringify(session);
        const ttlSeconds = Math.floor(this.sessionTimeout / 1000);
        await this.redis.setEx(sessionKey, ttlSeconds, sessionData);
      } else if (this.fallbackSessions) {
        // Update in memory
        this.fallbackSessions.set(token, session);
      }

      return session;
    } catch (error) {
      console.error('[REDIS SESSION] Error retrieving session:', error);
      
      // Try fallback
      if (this.fallbackSessions) {
        const session = this.fallbackSessions.get(token);
        if (session && session.expiresAt > Date.now()) {
          return session;
        }
      }
      
      return null;
    }
  }

  // Destroy a session
  async destroySession(token) {
    if (!token) {
      return false;
    }

    try {
      let sessionFound = false;

      if (this.isConnected) {
        // Remove from Redis
        const sessionKey = this.sessionPrefix + token;
        const result = await this.redis.del(sessionKey);
        sessionFound = result > 0;
      }

      if (this.fallbackSessions) {
        // Remove from fallback memory storage
        const memoryResult = this.fallbackSessions.delete(token);
        sessionFound = sessionFound || memoryResult;
      }

      if (sessionFound) {
        console.log(`[SESSION] Session destroyed`);
      }

      return sessionFound;
    } catch (error) {
      console.error('[REDIS SESSION] Error destroying session:', error);
      
      // Try fallback removal
      if (this.fallbackSessions) {
        return this.fallbackSessions.delete(token);
      }
      
      return false;
    }
  }

  // Get all sessions for a user (useful for logout from all devices)
  async getUserSessions(userId) {
    try {
      const userSessions = [];

      if (this.isConnected) {
        // Scan Redis for user sessions (this is expensive, use sparingly)
        const pattern = this.sessionPrefix + '*';
        const keys = await this.redis.keys(pattern);
        
        for (const key of keys) {
          try {
            const sessionData = await this.redis.get(key);
            if (sessionData) {
              const session = JSON.parse(sessionData);
              if (session.userId === userId) {
                const token = key.replace(this.sessionPrefix, '');
                userSessions.push({ token, session });
              }
            }
          } catch (parseError) {
            console.error('[REDIS SESSION] Error parsing session data:', parseError);
          }
        }
      }

      if (this.fallbackSessions) {
        // Check fallback memory storage
        for (const [token, session] of this.fallbackSessions.entries()) {
          if (session.userId === userId) {
            userSessions.push({ token, session });
          }
        }
      }

      return userSessions;
    } catch (error) {
      console.error('[REDIS SESSION] Error getting user sessions:', error);
      return [];
    }
  }

  // Destroy all sessions for a user
  async destroyAllUserSessions(userId) {
    try {
      const userSessions = await this.getUserSessions(userId);
      let destroyedCount = 0;

      for (const { token } of userSessions) {
        const destroyed = await this.destroySession(token);
        if (destroyed) {
          destroyedCount++;
        }
      }

      console.log(`[SESSION] Destroyed ${destroyedCount} sessions for user ID: ${userId}`);
      return destroyedCount;
    } catch (error) {
      console.error('[REDIS SESSION] Error destroying user sessions:', error);
      return 0;
    }
  }

  // Get session statistics
  async getSessionStats() {
    try {
      let total = 0;
      let active = 0;
      let expired = 0;

      if (this.isConnected) {
        // Count Redis sessions
        const pattern = this.sessionPrefix + '*';
        const keys = await this.redis.keys(pattern);
        total = keys.length;

        // Check each session for expiration status
        const now = Date.now();
        for (const key of keys) {
          try {
            const sessionData = await this.redis.get(key);
            if (sessionData) {
              const session = JSON.parse(sessionData);
              if (session.expiresAt > now) {
                active++;
              } else {
                expired++;
              }
            }
          } catch (parseError) {
            expired++; // Count parsing errors as expired
          }
        }
      }

      if (this.fallbackSessions) {
        // Add fallback memory sessions
        const now = Date.now();
        for (const session of this.fallbackSessions.values()) {
          total++;
          if (session.expiresAt > now) {
            active++;
          } else {
            expired++;
          }
        }
      }

      return {
        total,
        active,
        expired,
        sessionTimeout: this.sessionTimeout,
        redisConnected: this.isConnected,
        fallbackActive: !!this.fallbackSessions
      };
    } catch (error) {
      console.error('[REDIS SESSION] Error getting session stats:', error);
      return {
        total: 0,
        active: 0,
        expired: 0,
        sessionTimeout: this.sessionTimeout,
        redisConnected: this.isConnected,
        fallbackActive: !!this.fallbackSessions,
        error: error.message
      };
    }
  }

  // Clean up expired sessions (should be run periodically)
  async cleanupExpiredSessions() {
    if (!this.isConnected) {
      // Only cleanup memory sessions if Redis is not available
      if (this.fallbackSessions) {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [token, session] of this.fallbackSessions.entries()) {
          if (session.expiresAt < now) {
            this.fallbackSessions.delete(token);
            cleanedCount++;
          }
        }
        
        if (cleanedCount > 0) {
          console.log(`[MEMORY SESSION] Cleaned up ${cleanedCount} expired sessions`);
        }
      }
      return;
    }

    try {
      // Redis automatically handles TTL expiration, but we can manually check
      // This is mainly for monitoring/logging purposes
      const pattern = this.sessionPrefix + '*';
      const keys = await this.redis.keys(pattern);
      let expiredFound = 0;

      for (const key of keys) {
        try {
          const ttl = await this.redis.ttl(key);
          if (ttl === -1) {
            // Session without expiration, clean it up
            await this.redis.del(key);
            expiredFound++;
          }
        } catch (error) {
          console.error('[REDIS SESSION] Error checking TTL for key:', key, error);
        }
      }

      if (expiredFound > 0) {
        console.log(`[REDIS SESSION] Cleaned up ${expiredFound} sessions without proper TTL`);
      }
    } catch (error) {
      console.error('[REDIS SESSION] Error during cleanup:', error);
    }
  }

  // Failed login attempt tracking (kept in memory for simplicity)
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

  // Graceful shutdown
  async close() {
    try {
      if (this.redis && this.isConnected) {
        await this.redis.disconnect();
        console.log('[REDIS SESSION] Connection closed gracefully');
      }
    } catch (error) {
      console.error('[REDIS SESSION] Error during shutdown:', error);
    }
  }
}

module.exports = RedisSessionService;