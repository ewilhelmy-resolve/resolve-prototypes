// Workflow tracking middleware
const db = require('../database/postgres');
const authService = require('../services/authService');

// Workflow tracking middleware
function trackWorkflow(triggerType, action, metadata = {}) {
  return (req, res, next) => {
    // Get user info
    const token = req.cookies?.sessionToken || 
                  req.headers['authorization']?.replace('Bearer ', '') || 
                  req.headers['x-session-token'];
    const session = token ? authService.getSession(token) : null;
    const userEmail = session?.email || 'anonymous';
    
    // Store original json method
    const originalJson = res.json;
    
    // Override json method to capture response
    res.json = function(data) {
      // Track the workflow trigger
      db.workflows.trackTrigger({
        user_email: userEmail,
        trigger_type: triggerType,
        action: action,
        metadata: {
          ...metadata,
          request_body: req.body,
          response_data: data
        },
        response_status: res.statusCode,
        success: data.success || res.statusCode < 400,
        error_message: data.error || data.message || null
      }).catch(err => {
        console.error('Error tracking workflow:', err);
      });
      
      // Call original json method
      return originalJson.call(this, data);
    };
    
    next();
  };
}

module.exports = {
  trackWorkflow
};