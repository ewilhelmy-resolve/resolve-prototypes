import type { NextFunction, Request, Response } from 'express';
import pinoHttp from 'pino-http';
import { createContextLogger, generateCorrelationId, logger } from '../config/logger.js';

// Custom request logging middleware with correlation ID
export const requestLoggingMiddleware = pinoHttp({
  logger,
  // Generate correlation ID for each request
  genReqId: () => generateCorrelationId(),

  // Customize request logging
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 400 && res.statusCode < 500) {
      return 'warn';
    } else if (res.statusCode >= 500 || err) {
      return 'error';
    } else if (res.statusCode >= 300 && res.statusCode < 400) {
      return 'info';
    }
    return 'info';
  },

  // Custom request logging format
  customReceivedMessage: (req) => {
    return `${req.method} ${req.url}`;
  },

  // Custom response logging format
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} - ${res.statusCode}`;
  },

  // Custom error message format
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} - ${res.statusCode} - ${err.message}`;
  },

  // Serialize request details
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      path: req.route?.path,
      params: req.params,
      query: req.query,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
        'authorization': req.headers.authorization ? '[REDACTED]' : undefined,
        'x-forwarded-for': req.headers['x-forwarded-for'],
      },
      ip: req.ip,
      // Don't log request body by default for security
      // body: req.body
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      headers: {
        'content-type': typeof res.getHeader === 'function' ? res.getHeader('content-type') : undefined,
        'content-length': typeof res.getHeader === 'function' ? res.getHeader('content-length') : undefined,
      }
    })
  }
});

// Middleware to add user context to logs
export const addUserContextToLogs = (req: Request, _res: Response, next: NextFunction) => {
  // This runs after authentication middleware
  if (req.log && (req as any).user) {
    const user = (req as any).user;

    // Create a new logger with user context
    req.log = createContextLogger(req.log, req.log.bindings().reqId, {
      userId: user.id,
      organizationId: user.activeOrganizationId,
      email: user.email
    });

    // Log successful authentication
    req.log.info({
      userId: user.id,
      organizationId: user.activeOrganizationId,
      userEmail: user.email
    }, 'User authenticated');
  }

  next();
};

// Middleware for API operation logging
export const logApiOperation = (operation: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.log) {
      req.log.info({ operation }, `Starting ${operation}`);

      // Store original end function
      const originalEnd = res.end;

      // Override end function to log completion
      res.end = function(chunk?: any, encoding?: any, cb?: any) {
        req.log?.info({
          operation,
          statusCode: res.statusCode,
          success: res.statusCode < 400
        }, `Completed ${operation}`);

        // Call original end function and return its result
        return originalEnd.call(this, chunk, encoding, cb);
      };
    }

    next();
  };
};

// Express error handler with structured logging
export const errorLoggingMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Log error with full context
  const errorContext = {
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack
    },
    request: {
      method: req.method,
      url: req.url,
      params: req.params,
      query: req.query,
      body: req.method !== 'GET' ? req.body : undefined,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
        'referer': req.headers.referer
      }
    },
    user: (req as any).user ? {
      userId: (req as any).user.id,
      organizationId: (req as any).user.activeOrganizationId,
      userEmail: (req as any).user.email
    } : undefined
  };

  if (req.log) {
    req.log.error(errorContext, 'Unhandled error in request');
  } else {
    logger.error(errorContext, 'Unhandled error in request (no request logger)');
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({
      error: 'Internal server error',
      correlationId: req.log?.bindings()?.reqId
    });
  } else {
    res.status(500).json({
      error: err.message,
      correlationId: req.log?.bindings()?.reqId,
      stack: err.stack
    });
  }
};

// Health check logging (minimal logging for health checks)
export const healthCheckLoggingMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  // Skip detailed logging for health checks
  if (req.path === '/health') {
    req.log = logger.child({
      reqId: generateCorrelationId(),
      minimal: true
    });
  }
  next();
};