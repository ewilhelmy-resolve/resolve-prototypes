// Load environment variables from .env file if it exists
require('dotenv').config();

// SECURITY NOTE: All secrets must be provided via environment variables
// No hardcoded secrets should be present in the codebase
// Use .env file for local development, secure secrets management for production

const express = require('express');
const path = require('path');

// Load configuration
const config = require('./src/config');
const db = require('./src/database/postgres');

// Import services
const serverService = require('./src/services/serverService');
const routeService = require('./src/services/routeService');
const ResolveWebhook = require('./src/utils/resolve-webhook');

// Import middleware
const setupSecurity = require('./src/middleware/security');
const { parseCookies } = require('./src/middleware/cookieParser');
const { captureWebhookTraffic } = require('./src/middleware/webhookTraffic');
const { trackWorkflow } = require('./src/middleware/workflowTracking');
const { handleJsonParsingError, handleGenericError } = require('./src/middleware/errorHandling');
const { 
  authenticate,
  requireAdmin,
  requireAuth,
  requireAuthForFiles
} = require('./src/middleware/auth');
const { 
  apiLimiter, 
  adminLimiter, 
  ragLimiter 
} = require('./src/middleware/rateLimiter');

// Import route modules
const authRoutes = require('./src/routes/auth');
const apiRoutes = require('./src/routes/api');
const adminRoutes = require('./src/routes/admin');
const createRagRouter = require('./src/routes/ragApi');
const createKnowledgeRouter = require('./src/routes/knowledge');
const createDocumentRouter = require('./src/routes/documentApi');
const adminDiagnosticsRouter = require('./src/routes/adminDiagnostics');

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Initialize ResolveWebhook instance
const resolveWebhook = new ResolveWebhook();

// Make db and resolveWebhook available to routes via app.locals
app.locals.db = db;
app.locals.resolveWebhook = resolveWebhook;

// Legacy session storage for backward compatibility
const sessions = {};

// Setup security middleware
setupSecurity(app);

// Body parser middleware with text capture for logging
app.use(express.json({
  limit: '100mb',
  strict: false,
  verify: (req, res, buf, encoding) => {
    req.rawBody = buf.toString('utf8');
  }
}));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Cookie parsing middleware
app.use(parseCookies);

// Apply webhook traffic capture middleware
app.use(captureWebhookTraffic);

// Apply rate limiting
app.use('/api/', apiLimiter);
app.use('/api/admin/', adminLimiter);

// Serve static files
app.use(express.static('public'));
app.use('/styles', express.static(path.join(__dirname, 'src/client/styles')));
app.use('/styles/icons', express.static(path.join(__dirname, 'src/client/styles/icons')));
app.use('/components', express.static(path.join(__dirname, 'src/client/components')));
app.use('/fonts', express.static(path.join(__dirname, 'public/fonts')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use('/pages', requireAuthForFiles, express.static(path.join(__dirname, 'src/client/pages')));

// Health check endpoint (no auth required)
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await db.query('SELECT 1');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
      version: process.env.npm_package_version || '1.0.0',
      port: PORT,
      usersCount: serverService.getUsersCount()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Database connection failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// Page routes
const pageRoutes = routeService.getPageRoutes();
app.get('/', pageRoutes['/']);
app.get('/dashboard', requireAuth, pageRoutes['/dashboard']);
app.get('/knowledge', requireAuth, pageRoutes['/knowledge']);
app.get('/admin', requireAdmin, pageRoutes['/admin']);
app.get('/login', pageRoutes['/login']);
app.get('/step2', pageRoutes['/step2']);
app.get('/completion', pageRoutes['/completion']);
app.get('/signin', pageRoutes['/signin']);

// Mount organized route modules with workflow tracking
app.use('/api/auth', trackWorkflow('authentication', 'auth_endpoint'), authRoutes);
app.use('/api', trackWorkflow('api', 'general_api'), apiRoutes);
app.use('/api/admin', trackWorkflow('admin', 'admin_endpoint'), adminRoutes);

// Legacy compatibility routes - redirect to new auth endpoints
app.post('/api/register', (req, res) => {
  res.redirect(307, '/api/auth/register');
});
app.post('/api/signin', (req, res) => {
  res.redirect(307, '/api/auth/signin');
});

// Mount specialized API routes
const ragRouter = createRagRouter(db, sessions);
app.use('/api/rag', ragLimiter, ragRouter);

const documentRouter = createDocumentRouter(db);
app.use('/api/documents', documentRouter);

const knowledgeRouter = createKnowledgeRouter(db, sessions);
app.use('/api', knowledgeRouter);

// Admin Diagnostics routes
app.use('/api/admin/diagnostics/pgvector', adminDiagnosticsRouter);

// Error handlers (must be last)
app.use(handleJsonParsingError);
app.use(handleGenericError);

// Catch-all route - properly handle 404s
app.get('*', routeService.handleCatchAll.bind(routeService));

// Graceful shutdown handler
function gracefulShutdown(server) {
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    
    server.close(() => {
      console.log('HTTP server closed');
    });
    
    await db.close?.();
    console.log('Database connections closed');
    
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    
    server.close(() => {
      console.log('HTTP server closed');
    });
    
    await db.close?.();
    console.log('Database connections closed');
    
    process.exit(0);
  });
}

// Start server
async function startServer() {
  try {
    // Initialize server services
    await serverService.initialize();
    
    // Start listening
    const server = app.listen(PORT, () => {
      serverService.printStartupMessage(PORT);
      serverService.startWebhookWorker();
      serverService.generateTenantTokens();
    });

    // Setup graceful shutdown
    gracefulShutdown(server);
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();