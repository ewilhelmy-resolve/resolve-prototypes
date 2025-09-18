// Centralized configuration management
require('dotenv').config();

const config = {
  // Server
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || 'http://localhost:5000',
  
  // Database
  database: {
    url: process.env.DATABASE_URL,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
  },
  
  // Security
  security: {
    jwtSecret: process.env.JWT_SECRET,
    sessionSecret: process.env.SESSION_SECRET,
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || (24 * 60 * 60 * 1000).toString()), // 24 hours
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10'),
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5000'],
    adminEmails: process.env.ADMIN_EMAILS?.split(',') || ['admin@resolve.io', 'john.gorham@resolve.io'],
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    authMaxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5'),
  },
  
  // Storage & File Uploads
  storage: {
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), // 50MB
    maxRequestSize: process.env.MAX_REQUEST_SIZE || '100mb',
    useS3: process.env.USE_S3 === 'true',
    s3Bucket: process.env.S3_BUCKET,
    allowedFileTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['csv', 'txt', 'pdf', 'zip', 'json'],
  },
  
  // Webhooks & Automation
  webhooks: {
    enabled: process.env.WEBHOOK_ENABLED !== 'false',
    automationUrl: process.env.AUTOMATION_WEBHOOK_URL,
    automationAuth: process.env.AUTOMATION_AUTH,
    retryIntervalMs: parseInt(process.env.WEBHOOK_RETRY_INTERVAL || '60000'), // 1 minute
    maxRetries: parseInt(process.env.WEBHOOK_MAX_RETRIES || '3'),
  },
  
  // RAG & Vector Search
  rag: {
    enabled: process.env.RAG_ENABLED !== 'false',
    maxDocumentSize: parseInt(process.env.MAX_DOCUMENT_SIZE || '51200'), // bytes
    vectorDimension: parseInt(process.env.VECTOR_DIMENSION || '1536'),
    embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-ada-002',
    searchResultsLimit: parseInt(process.env.RAG_SEARCH_LIMIT || '10'),
  },
  
  // Monitoring & Logging
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN,
    logLevel: process.env.LOG_LEVEL || 'info',
    webhookTrafficRetentionDays: parseInt(process.env.WEBHOOK_TRAFFIC_RETENTION_DAYS || '7'),
    enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING === 'true',
  },
  
  // Features
  features: {
    webhooksEnabled: process.env.WEBHOOKS_ENABLED !== 'false',
    ragEnabled: process.env.RAG_ENABLED !== 'false',
    adminPanelEnabled: process.env.ADMIN_PANEL_ENABLED !== 'false',
    userRegistrationEnabled: process.env.USER_REGISTRATION_ENABLED !== 'false',
  },
  
  // Session Cleanup
  cleanup: {
    sessionCleanupIntervalMs: parseInt(process.env.SESSION_CLEANUP_INTERVAL || '3600000'), // 1 hour
    expiredSessionsCleanupDays: parseInt(process.env.EXPIRED_SESSIONS_CLEANUP_DAYS || '30'),
  }
};

// Validate required configuration
const requiredVars = [
  'DATABASE_URL', 
  'JWT_SECRET'
];

// Additional required vars for production
const productionRequiredVars = [
  'SESSION_SECRET',
  'AUTOMATION_WEBHOOK_URL',
  'AUTOMATION_AUTH'
];

const missing = requiredVars.filter(key => !process.env[key]);

// Check production-specific requirements
if (config.nodeEnv === 'production') {
  const missingProd = productionRequiredVars.filter(key => !process.env[key]);
  missing.push(...missingProd);
}

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  if (config.nodeEnv === 'production') {
    console.error('Application cannot start in production without required environment variables.');
    process.exit(1);
  } else {
    console.warn('Some required environment variables are missing. Using default values for development.');
  }
}

// Validate configuration values
if (config.security.sessionTimeout < 60000) { // Less than 1 minute
  console.warn('Session timeout is very short (< 1 minute). Consider increasing SESSION_TIMEOUT.');
}

if (config.storage.maxFileSize > 104857600) { // > 100MB
  console.warn('Max file size is very large (> 100MB). This may cause memory issues.');
}

// Validate secret strength
function validateSecretStrength(secret, name, minLength = 32) {
  if (!secret) {
    console.error(`${name} is required but not provided`);
    return false;
  }
  
  if (secret.length < minLength) {
    console.error(`${name} must be at least ${minLength} characters long. Current length: ${secret.length}`);
    return false;
  }
  
  // Check for common weak patterns
  if (/^[a-z]+$/.test(secret) || /^[0-9]+$/.test(secret)) {
    console.error(`${name} appears to be too simple (only lowercase letters or numbers)`);
    return false;
  }
  
  // Check for default/example values
  const weakSecrets = [
    'your-secret-key-change-in-production',
    'your-super-secret-jwt-key-minimum-32-chars',
    'your-super-secret-session-key-minimum-32-chars',
    'secret',
    'password',
    '123456',
    'changeme'
  ];
  
  if (weakSecrets.some(weak => secret.includes(weak))) {
    console.error(`${name} contains a default or weak value. Please generate a strong random secret.`);
    return false;
  }
  
  return true;
}

// Validate critical secrets in production
if (config.nodeEnv === 'production') {
  const secretValidations = [
    { secret: config.security.jwtSecret, name: 'JWT_SECRET' },
    { secret: config.security.sessionSecret, name: 'SESSION_SECRET' }
  ];
  
  let hasWeakSecrets = false;
  
  for (const { secret, name } of secretValidations) {
    if (!validateSecretStrength(secret, name, 32)) {
      hasWeakSecrets = true;
    }
  }
  
  if (hasWeakSecrets) {
    console.error('SECURITY ERROR: Weak or missing secrets detected in production!');
    console.error('Generate strong secrets using: openssl rand -base64 48');
    process.exit(1);
  }
  
  console.log('✅ All security secrets validated successfully');
}

// Log configuration in development
if (config.nodeEnv === 'development') {
  console.log('Configuration loaded:', {
    nodeEnv: config.nodeEnv,
    port: config.port,
    databaseConfigured: !!config.database.url,
    webhooksEnabled: config.webhooks.enabled,
    ragEnabled: config.rag.enabled,
    uploadDir: config.storage.uploadDir,
    maxFileSize: `${Math.round(config.storage.maxFileSize / 1024 / 1024)}MB`,
  });
}

module.exports = config;