const rateLimit = require('express-rate-limit');
const config = require('../config');

// Store for distributed rate limiting (will use Redis later)
const store = new Map();

// General API rate limiter
const apiLimiter = process.env.DISABLE_RATE_LIMIT === 'true' ? (req, res, next) => next() : rateLimit({
  windowMs: config.rateLimit.windowMs, // 15 minutes
  max: config.rateLimit.maxRequests, // 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.round(config.rateLimit.windowMs / 1000),
    });
  },
});

// Strict auth rate limiter - much more restrictive for login attempts
const authLimiter = process.env.DISABLE_RATE_LIMIT === 'true' ? (req, res, next) => next() : rateLimit({
  windowMs: config.rateLimit.windowMs, // 15 minutes
  max: config.rateLimit.authMaxRequests, // 5 attempts per window
  message: 'Too many authentication attempts.',
  skipSuccessfulRequests: true, // Don't count successful requests
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log(`[RATE LIMIT] Authentication rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Too many login attempts from this IP. Please try again later.',
      retryAfter: Math.round(config.rateLimit.windowMs / 1000),
    });
  },
});

// Upload rate limiter - separate limits for file uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: 'Upload limit exceeded.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log(`[RATE LIMIT] Upload rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Upload limit exceeded',
      message: 'Too many file uploads from this IP. Please try again later.',
      retryAfter: 3600, // 1 hour
    });
  },
});

// Per-tenant rate limiter - custom implementation for multi-tenant scenarios
function tenantLimiter(maxRequests = 100) {
  return (req, res, next) => {
    // Extract tenant ID from session, headers, or body
    const tenantId = req.user?.tenantId || 
                    req.session?.tenantId || 
                    req.headers['x-tenant-id'] || 
                    req.body?.tenant_id ||
                    req.tenantId; // Set by auth middleware

    if (!tenantId) {
      // If no tenant ID, fall back to regular rate limiting
      return next();
    }

    const key = `tenant:${tenantId}`;
    const now = Date.now();
    const windowStart = now - config.rateLimit.windowMs;

    if (!store.has(key)) {
      store.set(key, []);
    }

    // Get requests within the current window
    const requests = store.get(key).filter(time => time > windowStart);
    
    if (requests.length >= maxRequests) {
      console.log(`[RATE LIMIT] Tenant rate limit exceeded for tenant: ${tenantId}`);
      return res.status(429).json({
        error: 'Tenant rate limit exceeded',
        message: 'Your organization has exceeded the rate limit. Please try again later.',
        retryAfter: Math.round((requests[0] + config.rateLimit.windowMs - now) / 1000),
      });
    }

    // Add current request to the store
    requests.push(now);
    store.set(key, requests);
    
    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance to clean up
      cleanupOldEntries();
    }
    
    next();
  };
}

// Create a more restrictive limiter for admin endpoints
const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute for admin endpoints
  message: 'Admin rate limit exceeded.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log(`[RATE LIMIT] Admin rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Admin rate limit exceeded',
      message: 'Too many admin requests. Please slow down.',
      retryAfter: 60,
    });
  },
});

// Create a very restrictive limiter for password reset
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset attempts per hour
  message: 'Password reset limit exceeded.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by email for password reset
    return req.body.email || req.ip;
  },
  handler: (req, res) => {
    console.log(`[RATE LIMIT] Password reset rate limit exceeded for: ${req.body.email || req.ip}`);
    res.status(429).json({
      error: 'Password reset limit exceeded',
      message: 'Too many password reset attempts. Please try again later.',
      retryAfter: 3600,
    });
  },
});

// RAG API specific rate limiter - more generous for knowledge base operations
const ragLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 RAG requests per minute
  message: 'RAG API rate limit exceeded.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log(`[RATE LIMIT] RAG API rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'RAG API rate limit exceeded',
      message: 'Too many knowledge base requests. Please try again later.',
      retryAfter: 60,
    });
  },
});

// Clean up old entries from the in-memory store
function cleanupOldEntries() {
  const now = Date.now();
  const cutoff = now - config.rateLimit.windowMs;
  
  for (const [key, requests] of store.entries()) {
    const validRequests = requests.filter(time => time > cutoff);
    if (validRequests.length === 0) {
      store.delete(key);
    } else {
      store.set(key, validRequests);
    }
  }
}

// Periodically clean up the store every 5 minutes
setInterval(cleanupOldEntries, 5 * 60 * 1000);

// Export all rate limiters and utilities
module.exports = {
  apiLimiter,
  authLimiter,
  uploadLimiter,
  adminLimiter,
  passwordResetLimiter,
  ragLimiter,
  tenantLimiter,
  cleanupOldEntries,
};