const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { getTicketStats, importTickets, hasTicketData, getIntegrationStatus, updateIntegrationSync } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// In-memory database (lightweight for dev, can be replaced with SQLite/PostgreSQL later)
const db = {
  users: {},
  sessions: {}
};

// Initialize with seeded user on startup
function seedDatabase() {
  const superUser = {
    email: 'john@resolve.io',
    password: '!Password1',
    company: 'Resolve',
    role: 'super_admin',
    firstName: 'John',
    lastName: 'Admin',
    createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
    isActive: true,
    isSuperUser: true,
    profile: {
      title: 'Chief Technology Officer',
      department: 'Engineering',
      phone: '+1 (555) 123-4567',
      bio: 'Leading the automation revolution at Resolve'
    },
    permissions: {
      canCreateUsers: true,
      canDeleteUsers: true,
      canModifySettings: true,
      canAccessAllData: true,
      canManageIntegrations: true,
      canViewAnalytics: true,
      canManageBilling: true
    },
    integrations: {
      jira: {
        connected: true,
        url: 'https://resolve.atlassian.net',
        apiKey: 'demo-key-123',
        lastSync: new Date().toISOString()
      },
      slack: {
        connected: true,
        workspace: 'resolve-workspace',
        webhookUrl: 'https://hooks.slack.com/services/demo',
        lastSync: new Date().toISOString()
      }
    },
    subscription: {
      plan: 'premium',
      status: 'active',
      startDate: new Date('2024-01-01').toISOString(),
      endDate: new Date('2025-01-01').toISOString(),
      seats: 100,
      usedSeats: 47,
      billingCycle: 'annual',
      amount: 50000,
      currency: 'USD'
    },
    analytics: {
      ticketsAutomated: 15234,
      timesSaved: '4,320 hours',
      automationRate: 87.5,
      lastWeekTickets: 342,
      topAutomations: [
        'Password Resets',
        'User Provisioning',
        'Software Installation',
        'Access Requests',
        'System Health Checks'
      ]
    }
  };

  db.users['john@resolve.io'] = superUser;
  console.log('✅ Database seeded with john@resolve.io / !Password1');
}

// Seed on startup
seedDatabase();

// Simple session token generator
function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    users: Object.keys(db.users).length,
    seededUser: 'john@resolve.io'
  });
});

// Login endpoint
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const user = db.users[email];
  
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Create session
  const token = generateToken();
  const sessionData = {
    email: user.email,
    company: user.company,
    role: user.role,
    createdAt: new Date().toISOString()
  };
  
  db.sessions[token] = sessionData;
  
  // Update last login
  user.lastLogin = new Date().toISOString();

  // Return user data (exclude password)
  const { password: _, ...userWithoutPassword } = user;
  
  res.json({
    success: true,
    token,
    user: userWithoutPassword
  });
});

// Signup endpoint
app.post('/api/signup', (req, res) => {
  const { email, password, company } = req.body;
  
  if (!email || !password || !company) {
    return res.status(400).json({ error: 'Email, password, and company required' });
  }

  if (db.users[email]) {
    return res.status(409).json({ error: 'User already exists' });
  }

  // Create new user
  const newUser = {
    email,
    password,
    company,
    role: 'user',
    createdAt: new Date().toISOString(),
    isActive: true,
    profile: {},
    permissions: {
      canCreateUsers: false,
      canDeleteUsers: false,
      canModifySettings: false,
      canAccessAllData: false,
      canManageIntegrations: true,
      canViewAnalytics: true,
      canManageBilling: false
    },
    subscription: {
      plan: 'trial',
      status: 'pending', // Changed to 'pending' to allow onboarding flow
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      seats: 5
    }
  };

  db.users[email] = newUser;

  // Create session
  const token = generateToken();
  db.sessions[token] = {
    email: newUser.email,
    company: newUser.company,
    role: newUser.role,
    createdAt: new Date().toISOString()
  };

  const { password: _, ...userWithoutPassword } = newUser;
  
  res.json({
    success: true,
    token,
    user: userWithoutPassword
  });
});

// Get user profile (authenticated)
app.get('/api/user/:email', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const session = db.sessions[token];
  
  if (!session) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  const user = db.users[req.params.email];
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Check permission (users can only view their own profile unless admin)
  if (session.email !== req.params.email && session.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { password: _, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

// Complete onboarding endpoint
app.post('/api/complete-onboarding', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const session = db.sessions[token];
  
  if (!session) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  const user = db.users[session.email];
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Update user's subscription status to active after completing onboarding
  user.subscription.status = 'active';
  user.onboardingComplete = true;
  user.completedAt = new Date().toISOString();
  
  // Store integration and payment data if provided
  const { selectedPlan, premiumConfig, integrationData, paymentMethodId } = req.body;
  
  if (selectedPlan) {
    user.subscription.plan = selectedPlan;
  }
  
  if (integrationData) {
    user.integrations = user.integrations || {};
    user.integrations[integrationData.type] = {
      connected: true,
      ...integrationData,
      lastSync: new Date().toISOString()
    };
  }
  
  if (paymentMethodId) {
    user.paymentMethodId = paymentMethodId;
  }
  
  res.json({ success: true, message: 'Onboarding completed successfully' });
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    delete db.sessions[token];
  }
  
  res.json({ success: true });
});

// Integration webhook endpoint (for testing Resolve integration locally)
app.post('/api/integration/resolve', (req, res) => {
  const { source, user_email, action, ...data } = req.body;
  
  console.log('📡 Resolve Integration Event:', {
    source,
    user_email,
    action,
    timestamp: new Date().toISOString(),
    data
  });
  
  // Log specific actions
  if (action === 'learn_data') {
    console.log('🧠 Learning data from user:', user_email);
  } else if (action === 'automate_workflow') {
    console.log('⚡ Automation requested by:', user_email);
  } else if (action === 'unlock_account') {
    console.log('🔓 Account unlock requested for:', user_email);
  }
  
  res.json({ 
    success: true, 
    message: 'Integration event processed',
    event_id: Date.now().toString()
  });
});

// List all users (admin only)
app.get('/api/users', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const session = db.sessions[token];
  
  if (!session || session.role !== 'super_admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const users = Object.keys(db.users).map(email => {
    const { password: _, ...userWithoutPassword } = db.users[email];
    return userWithoutPassword;
  });
  
  res.json(users);
});

// Get ticket statistics
app.get('/api/tickets/stats', (req, res) => {
  const authHeader = req.headers.authorization;
  let userEmail = null;
  
  // Check if user is authenticated
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const session = db.sessions[token];
    if (session) {
      userEmail = session.email;
    }
  }
  
  // Get stats from database
  const stats = getTicketStats(userEmail);
  
  res.json({
    success: true,
    ...stats,
    userEmail
  });
});

// Import tickets from CSV or integration
app.post('/api/tickets/import', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const session = db.sessions[token];
  
  if (!session) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  const { tickets, source = 'manual' } = req.body;
  
  if (!tickets || !Array.isArray(tickets)) {
    return res.status(400).json({ error: 'Invalid tickets data' });
  }

  const result = importTickets(tickets, source, session.email);
  
  if (result.success) {
    // Update integration sync status if from integration
    if (source !== 'manual') {
      updateIntegrationSync(source, result.count);
    }
    
    res.json({
      success: true,
      message: `Successfully imported ${result.count} tickets`,
      count: result.count
    });
  } else {
    res.status(500).json({ error: result.error });
  }
});

// Get integration status
app.get('/api/integrations/status', (req, res) => {
  const integrations = getIntegrationStatus();
  
  res.json({
    success: true,
    integrations,
    hasJiraConnection: integrations.some(i => i.integration_type === 'jira' && i.status === 'success'),
    hasServiceNowConnection: integrations.some(i => i.integration_type === 'servicenow' && i.status === 'success')
  });
});

// Serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  🚀 Resolve Onboarding Backend                               ║
║  Server running at: http://localhost:${PORT}                    ║
║                                                               ║
║  Seeded User:                                                ║
║  Email: john@resolve.io                                      ║
║  Password: !Password1                                         ║
║                                                               ║
║  API Endpoints:                                              ║
║  POST /api/login     - User login                            ║
║  POST /api/signup    - User registration                     ║
║  POST /api/logout    - User logout                           ║
║  GET  /api/user/:email - Get user profile                    ║
║  GET  /api/users     - List all users (admin)                ║
║  GET  /api/health    - Server health check                   ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});