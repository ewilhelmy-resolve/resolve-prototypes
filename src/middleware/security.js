const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const config = require('../config');

function setupSecurity(app) {
  // Compression middleware for better performance
  app.use(compression());

  // Enhanced Content Security Policy
  const cspDirectives = {
    defaultSrc: ["'self'"],
    styleSrc: [
      "'self'", 
      "'unsafe-inline'", // Required for inline styles, consider removing in production
      "https://fonts.googleapis.com",
      "https://cdn.jsdelivr.net"
    ],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'", // Consider using nonces instead of unsafe-inline
      "'unsafe-eval'" // Only if needed for dynamic script evaluation
    ],
    scriptSrcAttr: [
      "'unsafe-inline'" // Required for inline event handlers like onclick
    ],
    fontSrc: [
      "'self'", 
      "https://fonts.gstatic.com",
      "data:" // For base64 encoded fonts
    ],
    imgSrc: [
      "'self'", 
      "data:", 
      "https:",
      "blob:" // For file uploads preview
    ],
    connectSrc: [
      "'self'",
      config.webhooks?.automationUrl ? new URL(config.webhooks.automationUrl).origin : null
    ].filter(Boolean),
    formAction: ["'self'"],
    frameAncestors: ["'none'"], // Equivalent to X-Frame-Options: DENY
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    childSrc: ["'none'"],
    workerSrc: ["'self'"],
    manifestSrc: ["'self'"]
  };

  // Helmet with enhanced security configuration
  app.use(helmet({
    contentSecurityPolicy: {
      directives: cspDirectives,
      reportOnly: config.nodeEnv === 'development' // Only report in dev, enforce in prod
    },
    crossOriginEmbedderPolicy: false, // May cause issues with some resources
    crossOriginResourcePolicy: { policy: 'same-site' },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    noSniff: true, // X-Content-Type-Options: nosniff
    frameguard: { action: 'deny' }, // X-Frame-Options: DENY
    xssFilter: true, // X-XSS-Protection: 1; mode=block
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    expectCt: {
      enforce: true,
      maxAge: 86400 // 24 hours
    },
    permittedCrossDomainPolicies: false,
    hidePoweredBy: true // Remove X-Powered-By header
  }));

  // CORS configuration
  const corsOptions = {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman)
      if (!origin) return callback(null, true);
      
      if (config.security.corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  };

  app.use(cors(corsOptions));

  // Additional custom security headers and middleware
  app.use((req, res, next) => {
    // Custom security headers (some overlap with helmet but kept for redundancy)
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Additional security headers
    res.setHeader('X-Download-Options', 'noopen'); // IE download security
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none'); // Flash/PDF policy
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp'); // COEP
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin'); // COOP
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site'); // CORP
    
    // Feature Policy (Permissions Policy) - Restrict browser features
    res.setHeader('Permissions-Policy', [
      'geolocation=()',
      'microphone=()',
      'camera=()',
      'magnetometer=()',
      'gyroscope=()',
      'fullscreen=(self)',
      'payment=()'
    ].join(', '));
    
    // Server identification removal
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    
    // Security headers for file uploads
    if (req.path.includes('/api/') && req.method === 'POST') {
      res.setHeader('X-Content-Security-Policy', "default-src 'self'");
      res.setHeader('X-WebKit-CSP', "default-src 'self'");
    }
    
    // Log security-sensitive requests in production
    if (config.nodeEnv === 'production' && req.path.includes('/admin')) {
      console.log(`[SECURITY] Admin access attempt: ${req.method} ${req.path} from ${req.ip}`);
    }
    
    next();
  });

  // Rate limiting headers middleware
  app.use((req, res, next) => {
    // Add rate limiting information to response headers
    res.on('finish', () => {
      if (res.locals.rateLimitInfo) {
        res.setHeader('X-RateLimit-Limit', res.locals.rateLimitInfo.limit);
        res.setHeader('X-RateLimit-Remaining', res.locals.rateLimitInfo.remaining);
        res.setHeader('X-RateLimit-Reset', res.locals.rateLimitInfo.resetTime);
      }
    });
    next();
  });
}

module.exports = setupSecurity;