const authService = require('../services/authService');
const config = require('../config');

/**
 * Core authentication middleware
 * Supports multiple token sources: cookies, Authorization header, and x-session-token header
 */
async function authenticate(req, res, next) {
  // Check multiple auth methods in order of preference
  let token = null;

  // 1. Check cookie (most secure for web apps)
  if (req.cookies?.sessionToken) {
    token = req.cookies.sessionToken;
  }
  
  // 2. Check Authorization header (standard for APIs)
  if (!token && req.headers.authorization) {
    const bearer = req.headers.authorization.split(' ');
    if (bearer[0] === 'Bearer' && bearer[1]) {
      token = bearer[1];
    }
  }
  
  // 3. Check custom header (backward compatibility)
  if (!token && req.headers['x-session-token']) {
    token = req.headers['x-session-token'];
  }

  if (!token) {
    // For API routes, return JSON error
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }
    // For page routes, redirect to login
    return res.redirect('/login');
  }

  const session = await authService.getSession(token);
  
  if (!session) {
    // For API routes, return JSON error
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid or expired session' 
      });
    }
    // For page routes, redirect to login
    return res.redirect('/login');
  }

  // Add session information to request object
  req.session = session;
  req.user = session; // Alias for backward compatibility
  req.userId = session.userId;
  req.tenantId = session.tenantId;
  req.userEmail = session.email;
  
  next();
}

/**
 * Admin-only authentication middleware
 * Must be used after authenticate() or as a standalone that includes auth check
 */
function requireAdmin(req, res, next) {
  // If no session exists, run authentication first
  if (!req.session) {
    return authenticate(req, res, (authError) => {
      if (authError) return next(authError);
      // After authentication, check admin status
      return checkAdminStatus(req, res, next);
    });
  }
  
  return checkAdminStatus(req, res, next);
}

/**
 * Helper function to check admin status
 */
function checkAdminStatus(req, res, next) {
  if (!authService.isAdmin(req.session)) {
    // For API routes, return JSON error
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({ 
        success: false,
        error: 'Admin access required' 
      });
    }
    // For HTML pages, redirect to signin with error message
    return res.redirect('/signin?error=admin_required');
  }

  next();
}

/**
 * Optional authentication middleware
 * Adds session info if available but doesn't fail if not authenticated
 * Useful for routes that have different behavior for authenticated vs anonymous users
 */
async function optionalAuth(req, res, next) {
  // Same token extraction logic as authenticate()
  let token = req.cookies?.sessionToken || 
              req.headers.authorization?.split(' ')[1] ||
              req.headers['x-session-token'];

  if (token) {
    const session = await authService.getSession(token);
    if (session) {
      req.session = session;
      req.user = session; // Alias for backward compatibility
      req.userId = session.userId;
      req.tenantId = session.tenantId;
      req.userEmail = session.email;
    }
  }

  // Always continue, even if no valid session
  next();
}

/**
 * Middleware to require authentication for specific file access
 * Redirects to login if not authenticated when accessing protected files
 */
function requireAuthForFiles(req, res, next) {
  // Check if trying to access dashboard.html directly
  if (req.path.includes('dashboard.html') || 
      req.path.includes('knowledge.html') || 
      req.path.includes('admin.html')) {
    return authenticate(req, res, next);
  }
  
  next();
}

/**
 * Legacy compatibility function
 * Maintains the same signature as the original requireAuth in server.js
 */
function requireAuth(req, res, next) {
  return authenticate(req, res, next);
}

/**
 * Extract user information from request for logging/analytics
 * Can be used after authentication middleware
 */
function extractUserInfo(req) {
  if (req.session) {
    return {
      userId: req.session.userId,
      email: req.session.email,
      tenantId: req.session.tenantId,
      isAdmin: authService.isAdmin(req.session)
    };
  }
  return {
    userId: null,
    email: 'anonymous',
    tenantId: null,
    isAdmin: false
  };
}

module.exports = {
  authenticate,
  requireAdmin,
  optionalAuth,
  requireAuthForFiles,
  requireAuth, // Legacy compatibility
  extractUserInfo
};