const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const authService = require('../services/authService');
const { 
  authLimiter, 
  passwordResetLimiter 
} = require('../middleware/rateLimiter');
const { 
  isStrongPassword, 
  getPasswordStrengthFeedback,
  sanitizeHtml,
  containsSqlInjection
} = require('../utils/validation');

// Custom password validator
const customPasswordValidator = (password) => {
  if (!isStrongPassword(password)) {
    const feedback = getPasswordStrengthFeedback(password);
    throw new Error(`Password requirements not met: ${feedback.join(', ')}`);
  }
  return true;
};

// Input sanitization and security checks
const securityValidator = (field) => {
  return (value) => {
    if (containsSqlInjection(value)) {
      throw new Error(`Invalid characters detected in ${field}`);
    }
    return true;
  };
};

// Validation middleware
const validateSignup = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required')
    .custom(securityValidator('email')),
  body('password')
    .custom(customPasswordValidator),
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Full name must be 1-100 characters')
    .custom(securityValidator('full name'))
    .customSanitizer(sanitizeHtml),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be 1-100 characters')
    .custom(securityValidator('name'))
    .customSanitizer(sanitizeHtml), // Legacy compatibility
  body('companyName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Company name must be 1-200 characters')
    .custom(securityValidator('company name'))
    .customSanitizer(sanitizeHtml),
  body('company')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Company must be 1-200 characters')
    .custom(securityValidator('company'))
    .customSanitizer(sanitizeHtml), // Legacy compatibility
];

const validateSignin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required')
    .custom(securityValidator('email')),
  body('password')
    .notEmpty()
    .withMessage('Password required')
    .custom(securityValidator('password')),
];

const validatePasswordResetRequest = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required')
    .custom(securityValidator('email')),
];

const validatePasswordReset = [
  body('token')
    .notEmpty()
    .isLength({ min: 1, max: 255 })
    .withMessage('Reset token required')
    .custom(securityValidator('token')),
  body('newPassword')
    .custom(customPasswordValidator),
];

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Register endpoint
router.post('/register', authLimiter, validateSignup, handleValidationErrors, async (req, res) => {
  try {
    const { name, email, company, password, fullName, companyName } = req.body;
    
    // Support both old and new field names
    const userName = name || fullName;
    const userCompany = company || companyName;
    
    // Create user using AuthService
    const user = await authService.createUser({
      email,
      password,
      full_name: userName,
      company_name: userCompany,
      tier: 'standard'
    });
    
    // Create session for new user
    const { token, session } = await authService.createSession(user);
    
    console.log(`[AUTH] New user registered: ${email} from ${userCompany}`);
    console.log(`[AUTH] User saved with ID: ${user.id}, Tenant ID: ${user.tenant_id}`);

    // Set secure httpOnly cookie for the session
    res.cookie('sessionToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    res.json({ 
      success: true, 
      message: 'User registered successfully',
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        companyName: user.company_name
      }
    });
    
  } catch (error) {
    console.error('[AUTH] Registration error:', error.message);
    
    if (error.message === 'User already exists') {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed' 
    });
  }
});

// Signin endpoint  
router.post('/signin', authLimiter, validateSignin, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Authenticate user using AuthService
    const user = await authService.authenticateUser(email, password);
    
    // Create session
    const { token, session } = await authService.createSession(user);
    
    console.log(`[AUTH] User signed in: ${email}`);
    
    // Set secure httpOnly cookie
    res.cookie('sessionToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    res.json({ 
      success: true, 
      message: 'Sign in successful',
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        companyName: user.company_name,
        tenantId: user.tenant_id,
        role: user.role || 'user',
        status: user.status || 'active'
      }
    });
    
  } catch (error) {
    console.log(`[AUTH] Authentication failed for: ${req.body.email}`);
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid email or password' 
    });
  }
});

// Signout endpoint
router.post('/signout', async (req, res) => {
  const token = req.cookies?.sessionToken ||
                req.headers['authorization']?.replace('Bearer ', '') || 
                req.body.token || 
                req.headers['x-session-token'];
  
  if (token) {
    const session = await authService.getSession(token);
    if (session) {
      console.log(`[AUTH] User signed out: ${session.email}`);
    }
    await authService.destroySession(token);
  }
  
  // Clear the session cookie
  res.clearCookie('sessionToken');
  
  res.json({ 
    success: true, 
    message: 'Signed out successfully' 
  });
});

// Password reset request endpoint
router.post('/password-reset-request', passwordResetLimiter, validatePasswordResetRequest, handleValidationErrors, async (req, res) => {
  try {
    const { email } = req.body;
    
    const resetToken = await authService.generatePasswordResetToken(email);
    
    // In a real application, you would send this token via email
    // For this implementation, we'll just return success regardless
    console.log(`[AUTH] Password reset token generated for: ${email}`);
    if (resetToken) {
      console.log(`[AUTH] Token (for testing): ${resetToken}`);
    }
    
    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
    
  } catch (error) {
    console.error('[AUTH] Password reset request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Password reset endpoint
router.post('/password-reset', passwordResetLimiter, validatePasswordReset, handleValidationErrors, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    await authService.resetPassword(token, newPassword);
    
    console.log(`[AUTH] Password reset completed with token: ${token}`);
    
    res.json({
      success: true,
      message: 'Password reset successfully'
    });
    
  } catch (error) {
    console.error('[AUTH] Password reset error:', error);
    
    if (error.message === 'Invalid or expired reset token') {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// New password reset endpoint for user management
router.post('/reset-password', passwordResetLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Token and password are required' 
      });
    }

    // Validate password strength
    if (!isStrongPassword(password)) {
      const feedback = getPasswordStrengthFeedback(password);
      return res.status(400).json({ 
        success: false,
        error: `Password requirements not met: ${feedback.join(', ')}`
      });
    }

    // Get the database connection from app locals
    const db = req.app.locals.db;

    // Find valid reset token
    const tokenResult = await db.query(
      `SELECT user_id FROM password_reset_tokens 
       WHERE token = $1 AND expires_at > NOW() AND used = false`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid or expired reset token' 
      });
    }

    const userId = tokenResult.rows[0].user_id;

    // Hash the new password
    const hashedPassword = await authService.hashPassword(password);

    // Update user password
    await db.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, userId]
    );

    // Mark token as used
    await db.query(
      'UPDATE password_reset_tokens SET used = true WHERE token = $1',
      [token]
    );

    // If user was invited, update status to active
    await db.query(
      `UPDATE users SET status = 'active' 
       WHERE id = $1 AND status = 'invited'`,
      [userId]
    );

    console.log(`[AUTH] Password reset completed for user ID: ${userId}`);

    res.json({ 
      success: true,
      message: 'Password reset successfully' 
    });

  } catch (error) {
    console.error('[AUTH] Password reset error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to reset password' 
    });
  }
});

module.exports = router;