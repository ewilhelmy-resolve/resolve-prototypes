import pino from 'pino';
import { randomUUID } from 'crypto';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure logs directory exists
const logsDir = resolve(__dirname, '../../logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

// Determine log level based on environment
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Create transports based on environment
const createTransports = () => {
  const transports = [];

  // Always add console transport in development
  if (process.env.NODE_ENV !== 'production') {
    transports.push({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        messageFormat: '[{correlationId}] {msg}'
      }
    });
  }

  // Add file transport with rotation if possible
  try {
    transports.push({
      target: 'pino-roll',
      options: {
        file: resolve(logsDir, 'mock-service.log'),
        frequency: 'daily',
        size: '10m',
        limit: {
          count: 7  // Keep 7 days of logs
        }
      }
    });
  } catch (error) {
    console.warn('Could not create rotating file transport, using console only:', error instanceof Error ? error.message : String(error));
  }

  return transports;
};

// Create base logger configuration
const loggerConfig: pino.LoggerOptions = {
  level: logLevel,
  // Use multiple transports if available, fallback to console
  ...(createTransports().length > 1
    ? { transport: { targets: createTransports() } }
    : { transport: createTransports()[0] }
  ),
  // Base fields included in every log
  base: {
    service: 'rita-mock-service',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  }
};

// Create root logger
export const logger = pino(loggerConfig);

// Create child loggers for different components
export const createChildLogger = (component: string, context?: Record<string, any>) => {
  return logger.child({
    component,
    ...context
  });
};

// Component-specific loggers
export const webhookLogger = createChildLogger('webhook');
export const rabbitLogger = createChildLogger('rabbitmq');
export const configLogger = createChildLogger('config');

// Correlation ID utilities
export const generateCorrelationId = (): string => randomUUID();

// Create context logger with correlation ID and message context
export const createContextLogger = (
  baseLogger: pino.Logger,
  correlationId: string,
  messageContext?: {
    messageId?: string;
    organizationId?: string;
    organizationName?: string;
    userId?: string;
    tenantId?: string;
    conversationId?: string;
    documentId?: string;
    blobMetadataId?: string;
    blobId?: string;
    email?: string;
    pendingUserId?: string;
    invitationId?: string;
    invitedByEmail?: string;
  }
) => {
  return baseLogger.child({
    correlationId,
    ...messageContext
  });
};

// Performance timing utility
export class PerformanceTimer {
  private startTime: [number, number];
  private logger: pino.Logger;
  private operation: string;

  constructor(logger: pino.Logger, operation: string) {
    this.logger = logger;
    this.operation = operation;
    this.startTime = process.hrtime();
    this.logger.debug({ operation }, 'Operation started');
  }

  end(metadata?: Record<string, any>) {
    const [seconds, nanoseconds] = process.hrtime(this.startTime);
    const duration = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds

    this.logger.info({
      operation: this.operation,
      duration: Math.round(duration * 100) / 100, // Round to 2 decimal places
      ...metadata
    }, `Operation completed in ${duration.toFixed(2)}ms`);

    return duration;
  }
}

// Error logging helper
export const logError = (
  logger: pino.Logger,
  error: Error,
  context?: Record<string, any>
) => {
  logger.error({
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    ...context
  }, 'Error occurred');
};

// Request logging types
export interface RequestContext {
  correlationId: string;
  messageId?: string;
  organizationId?: string;
  userId?: string;
}

// Add request context to Express Request type
declare global {
  namespace Express {
    interface Request {
      log?: pino.Logger;
      correlationId?: string;
    }
  }
}