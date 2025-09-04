// Error handling middleware
const db = require('../database/postgres');

// JSON Parsing Error Handler - Capture malformed JSON errors
function handleJsonParsingError(err, req, res, next) {
  // Check if this is a JSON parsing error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('[JSON PARSE ERROR]', err.message);
    console.error('[JSON PARSE ERROR] Raw body:', req.rawBody?.substring(0, 500));
    
    // Check if this is a callback/webhook route
    const isCallbackRoute = req.path.includes('callback') || 
                           req.path.includes('webhook');
    
    if (isCallbackRoute) {
      console.log('[JSON PARSE ERROR] Logging to webhook traffic monitor');
      
      // Log to webhook traffic database
      const saveTrafficLog = async () => {
        try {
          await db.query(`
            INSERT INTO webhook_traffic 
            (request_url, request_method, request_headers, request_body, 
             response_status, response_body, response_headers, error_message, 
             is_webhook, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
          `, [
            req.originalUrl || req.url,
            req.method,
            JSON.stringify(req.headers),
            req.rawBody || 'Unable to capture raw body',
            400,
            JSON.stringify({ error: 'Invalid JSON', details: err.message }),
            JSON.stringify({ 'content-type': 'application/json' }),
            `JSON Parse Error: ${err.message}`,
            true
          ]);
          console.log('[JSON PARSE ERROR] Successfully logged to webhook traffic');
        } catch (dbErr) {
          console.error('[JSON PARSE ERROR] Failed to log to database:', dbErr.message);
        }
      };
      
      // Don't await, just fire and forget
      saveTrafficLog();
    }
    
    // Return proper error response
    return res.status(400).json({
      error: 'Invalid JSON',
      details: err.message,
      hint: 'Check that all placeholders are properly replaced with actual values'
    });
  }
  
  // Check for other errors (like entity too large)
  if (err.status === 413) {
    console.error('[REQUEST TOO LARGE]', err.message);
    return res.status(413).json({
      error: 'Request entity too large',
      details: err.message
    });
  }
  
  // Pass other errors to the next handler
  next(err);
}

// Generic Error Handler for uncaught errors
function handleGenericError(err, req, res, next) {
  console.error('[UNCAUGHT ERROR]', err.stack);
  
  // Log webhook/callback errors to traffic monitor
  const isCallbackRoute = req.path.includes('callback') || req.path.includes('webhook');
  if (isCallbackRoute) {
    const saveTrafficLog = async () => {
      try {
        await db.query(`
          INSERT INTO webhook_traffic 
          (request_url, request_method, request_headers, request_body, 
           response_status, response_body, error_message, is_webhook, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
        `, [
          req.originalUrl || req.url,
          req.method,
          JSON.stringify(req.headers),
          req.rawBody || JSON.stringify(req.body) || 'No body captured',
          500,
          JSON.stringify({ error: 'Internal server error' }),
          err.message,
          true
        ]);
      } catch (dbErr) {
        console.error('[ERROR HANDLER] Failed to log to database:', dbErr.message);
      }
    };
    saveTrafficLog();
  }
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
}

module.exports = {
  handleJsonParsingError,
  handleGenericError
};