// Webhook traffic capture middleware
const db = require('../database/postgres');

function determineEndpointCategory(path) {
  if (path.includes('chat-callback')) return 'chat_callback';
  if (path.includes('test-callback')) return 'test_callback';
  if (path.includes('callback')) return 'callback';
  if (path.includes('webhook')) return 'webhook';
  return 'callback';
}

async function saveWebhookTraffic(data) {
  try {
    console.log('[WEBHOOK TRAFFIC] Saving traffic log for:', data.request_url);
    await db.query(
      `INSERT INTO webhook_traffic 
      (request_url, request_method, request_headers, request_body, request_query, 
       request_params, response_status, response_body, source_ip, user_agent, 
       is_webhook, endpoint_category) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [data.request_url, data.request_method, data.request_headers, data.request_body,
       data.request_query, data.request_params, data.response_status, data.response_body,
       data.source_ip, data.user_agent, data.is_webhook, data.endpoint_category]
    );
    
    // Keep only last 7 days of traffic logs
    await db.query(
      `DELETE FROM webhook_traffic 
       WHERE captured_at < NOW() - INTERVAL '7 days'`
    );
  } catch (error) {
    console.error('[WEBHOOK TRAFFIC] Error saving traffic log:', error.message);
  }
}

// Webhook Traffic Capture Middleware - Only captures callback/webhook traffic
function captureWebhookTraffic(req, res, next) {
  // Only capture callback and webhook endpoints
  const isCallbackRoute = req.path.includes('callback') || 
                         req.path.includes('webhook');
  
  console.log(`[TRAFFIC CAPTURE] Path: ${req.path}, Is Callback: ${isCallbackRoute}`);
  
  // Only capture callback/webhook traffic
  if (isCallbackRoute) {
    console.log(`[TRAFFIC CAPTURE] Capturing: ${req.method} ${req.path}`);
    const captureData = {
      request_url: req.originalUrl || req.url,
      request_method: req.method,
      request_headers: req.headers,
      request_body: req.rawBody || JSON.stringify(req.body),
      request_query: req.query,
      request_params: req.params,
      source_ip: req.ip || req.connection.remoteAddress,
      user_agent: req.headers['user-agent'],
      is_webhook: true,  // Always true since we only capture callbacks/webhooks
      endpoint_category: determineEndpointCategory(req.path)
    };
    
    // Store original res.json and res.send to capture response
    const originalJson = res.json;
    const originalSend = res.send;
    const originalStatus = res.status;
    let responseStatus = 200;
    
    res.status = function(code) {
      responseStatus = code;
      return originalStatus.call(this, code);
    };
    
    res.json = function(body) {
      captureData.response_status = responseStatus;
      // Limit response body size to prevent memory issues
      try {
        const bodyStr = JSON.stringify(body);
        captureData.response_body = bodyStr.length > 10000 
          ? bodyStr.substring(0, 10000) + '...[truncated]' 
          : bodyStr;
      } catch (err) {
        captureData.response_body = '[Error stringifying response]';
      }
      saveWebhookTraffic(captureData);
      return originalJson.call(this, body);
    };
    
    res.send = function(body) {
      captureData.response_status = responseStatus;
      // Limit response body size to prevent memory issues
      try {
        const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
        captureData.response_body = bodyStr.length > 10000 
          ? bodyStr.substring(0, 10000) + '...[truncated]' 
          : bodyStr;
      } catch (err) {
        captureData.response_body = '[Error stringifying response]';
      }
      saveWebhookTraffic(captureData);
      return originalSend.call(this, body);
    };
  }
  
  next();
}

module.exports = {
  captureWebhookTraffic,
  saveWebhookTraffic,
  determineEndpointCategory
};