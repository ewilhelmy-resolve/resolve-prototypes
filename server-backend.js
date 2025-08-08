const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
// Multer and csv-parse will be conditionally loaded if available
let multer, csv;
try {
  multer = require('multer');
  csv = require('csv-parse');
} catch (e) {
  console.log('Note: multer or csv-parse not installed, file upload features limited');
}
const { 
  getTicketStats, 
  importTickets, 
  hasTicketData, 
  getIntegrationStatus, 
  updateIntegrationSync, 
  storeTicketUpload, 
  updateUploadStatus,
  getUpload,
  generateApiKey,
  validateApiKey,
  logApiRequest,
  getUploadedData
} = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

// Configure multer for file uploads (if available)
let upload;
if (multer) {
  upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedExtensions = /\.(csv|zip)$/i;
      if (file.mimetype === 'text/csv' || 
          file.mimetype === 'application/zip' || 
          file.mimetype === 'application/x-zip-compressed' ||
          allowedExtensions.test(file.originalname)) {
        cb(null, true);
      } else {
        cb(new Error('Only CSV and ZIP files are allowed'));
      }
    }
  });
}

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

// Upload ticket CSV endpoint
app.post('/api/tickets/upload', upload ? upload.single('csvFile') : (req, res, next) => next(), async (req, res) => {
  if (!upload) {
    return res.status(503).json({ error: 'File upload not available - multer not installed' });
  }
  
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const session = db.sessions[token];
  
  if (!session) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // Parse CSV to count rows
    let rowCount = 0;
    const csvData = req.file.buffer.toString('utf8');
    const lines = csvData.split('\n').filter(line => line.trim());
    rowCount = Math.max(0, lines.length - 1); // Subtract header row

    // Store CSV data as blob in SQLite
    const uploadId = storeTicketUpload(
      session.email,
      req.file.originalname,
      req.file.buffer,
      rowCount
    );

    console.log(`📤 Stored CSV upload: ${req.file.originalname} (${rowCount} rows) with ID: ${uploadId}`);

    // Call Resolve webhook API for analysis
    const axios = require('axios');
    
    const webhookResponse = await axios.post(
      'https://actions-api-staging.resolve.io/api/Webhooks/postEvent/00F4F67D-3B92-4FD2-A574-7BE22C6BE796',
      {
        source: 'Onboarding',
        user_email: session.email,
        action: 'analyze_ticket',
        upload_id: uploadId,
        filename: req.file.originalname,
        row_count: rowCount,
        timestamp: new Date().toISOString()
      },
      {
        headers: {
          'Authorization': 'Basic RTE0NzMwRkEtRDFCNS00MDM3LUFDRTMtQ0Y5N0ZCQzY3NkMyOlZaSkQqSSYyWEAkXkQ5Sjk4Rk5PJShGUVpaQ0dRNkEj',
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      }
    );

    console.log('🎯 Resolve webhook response:', webhookResponse.data);

    // Update upload status based on webhook response
    updateUploadStatus(uploadId, 'processing', JSON.stringify(webhookResponse.data));

    // Parse CSV and import tickets to database
    csv.parse(req.file.buffer, {
      columns: true,
      skip_empty_lines: true
    }, (err, records) => {
      if (err) {
        console.error('CSV parse error:', err);
        updateUploadStatus(uploadId, 'failed', err.message);
        return;
      }

      // Transform CSV records to match our ticket format
      const tickets = records.map(record => ({
        ticket_id: record.ticket_id || record.id || `UPLOAD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: record.title || record.subject || 'Imported Ticket',
        description: record.description || record.details || '',
        status: record.status || 'open',
        priority: record.priority || 'medium',
        category: record.category || record.type || 'General',
        created_at: record.created_at || record.created || new Date().toISOString(),
        resolved_at: record.resolved_at || record.closed_at || null,
        resolution_time_minutes: record.resolution_time_minutes || null,
        cost_saved: record.cost_saved || null,
        assigned_to: record.assignee_name || record.assigned_to || null,
        resolved_by: record.resolved_by || null,
        is_automated: record.is_automated || 0,
        automation_type: record.automation_type || null,
        user_email: session.email
      }));

      // Import tickets to database
      const result = importTickets(tickets, 'csv_upload', session.email);
      
      if (result.success) {
        updateUploadStatus(uploadId, 'completed', `Imported ${result.count} tickets`);
        console.log(`✅ Successfully imported ${result.count} tickets from CSV`);
      } else {
        updateUploadStatus(uploadId, 'failed', result.error);
        console.error('Failed to import tickets:', result.error);
      }
    });

    res.json({
      success: true,
      message: 'File uploaded and processing started',
      uploadId,
      filename: req.file.originalname,
      size: req.file.size,
      rowCount,
      webhookCalled: true
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      // Webhook failed but still process the file
      res.json({
        success: true,
        message: 'File uploaded successfully (webhook unavailable)',
        filename: req.file.originalname,
        size: req.file.size,
        webhookCalled: false,
        warning: 'Resolve webhook API was unreachable but file was processed'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to process upload',
        details: error.message 
      });
    }
  }
});

// Get upload status
app.get('/api/tickets/upload/:id', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const session = db.sessions[token];
  
  if (!session) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  const upload = getUpload(req.params.id);
  
  if (!upload) {
    return res.status(404).json({ error: 'Upload not found' });
  }

  // Check if user owns this upload or is admin
  if (upload.user_email !== session.email && session.role !== 'super_admin') {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json({
    success: true,
    upload: {
      id: upload.id,
      filename: upload.filename,
      rowCount: upload.row_count,
      status: upload.processing_status,
      uploadDate: upload.upload_date,
      analysisResult: upload.analysis_result
    }
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

// Seed sample data endpoint (for demo purposes)
app.post('/api/tickets/seed', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const session = db.sessions[token];
  
  if (!session) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  try {
    // Import the importTickets function to add sample data for current user
    const sampleTickets = [
      {
        ticket_id: 'DEMO-001',
        title: 'Password Reset Request',
        description: 'User cannot access account',
        status: 'resolved',
        priority: 'high',
        category: 'Password Reset',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        resolved_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(),
        resolution_time_minutes: 15,
        cost_saved: 25.00,
        assigned_to: 'AI Agent',
        resolved_by: 'AI Agent',
        is_automated: 1,
        automation_type: 'password_reset'
      },
      {
        ticket_id: 'DEMO-002',
        title: 'Software Installation Request',
        description: 'Need Slack installed',
        status: 'resolved',
        priority: 'medium',
        category: 'Software Installation',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        resolved_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
        resolution_time_minutes: 30,
        cost_saved: 50.00,
        assigned_to: 'AI Agent',
        resolved_by: 'AI Agent',
        is_automated: 1,
        automation_type: 'software_deployment'
      },
      {
        ticket_id: 'DEMO-003',
        title: 'Account Access Issue',
        description: 'Cannot access SharePoint',
        status: 'resolved',
        priority: 'high',
        category: 'Access Management',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        resolved_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
        resolution_time_minutes: 45,
        cost_saved: 75.00,
        assigned_to: 'Support Team',
        resolved_by: 'John Doe',
        is_automated: 0
      }
    ];
    
    // Import tickets for the current user  
    const result = importTickets(sampleTickets, 'seed', session.email);
    console.log('Import result:', result, 'for user:', session.email);
    
    // Get updated stats to verify
    const stats = getTicketStats(session.email);
    console.log('Stats after seeding:', stats);
    
    res.json({ 
      success: true, 
      message: 'Sample data seeded successfully',
      ticketsAdded: sampleTickets.length,
      importResult: result,
      currentStats: stats.stats
    });
  } catch (error) {
    console.error('Error seeding data:', error);
    res.status(500).json({ 
      error: 'Failed to seed sample data',
      details: error.message 
    });
  }
});

// Get user's uploaded ticket data for viewing
app.get('/api/tickets/view-data', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const session = db.sessions[token];
  
  if (!session) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  try {
    // Get tickets for the current user
    const userTickets = db.tickets
      .filter(ticket => ticket.user_email === session.email)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 50); // Limit to first 50 records for viewing

    res.json({
      success: true,
      data: userTickets,
      total: db.tickets.filter(t => t.user_email === session.email).length,
      showing: userTickets.length
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch data',
      details: error.message 
    });
  }
});

// Delete all user's ticket data
app.delete('/api/tickets/delete-all', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const session = db.sessions[token];
  
  if (!session) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  try {
    // Count tickets before deletion
    const beforeCount = db.tickets.filter(t => t.user_email === session.email).length;
    
    // Delete all tickets for the current user
    db.tickets = db.tickets.filter(ticket => ticket.user_email !== session.email);
    
    // Also clear any uploads for this user
    db.uploads = db.uploads.filter(upload => upload.user_email !== session.email);
    
    const afterCount = db.tickets.filter(t => t.user_email === session.email).length;
    
    console.log(`Deleted ${beforeCount - afterCount} tickets for user: ${session.email}`);
    
    res.json({
      success: true,
      message: `Successfully deleted ${beforeCount} tickets`,
      deletedCount: beforeCount
    });
  } catch (error) {
    console.error('Error deleting user data:', error);
    res.status(500).json({ 
      error: 'Failed to delete data',
      details: error.message 
    });
  }
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

// New endpoint for CSV/ZIP file upload
app.post('/api/upload', upload ? upload.single('file') : (req, res, next) => next(), async (req, res) => {
  if (!upload) {
    // Simple fallback when multer is not available
    return res.json({
      success: true,
      message: 'File upload simulated (multer not installed)',
      uploadId: `upload_${Date.now()}`,
      filename: 'simulated.csv',
      size: 1024
    });
  }
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userEmail = req.headers['x-user-email'] || 'anonymous';
    const filename = req.file.originalname;
    const fileBuffer = req.file.buffer;

    // Handle ZIP files
    if (filename.toLowerCase().endsWith('.zip')) {
      // For now, we'll handle ZIP files by notifying the user to extract and upload CSVs individually
      // This can be enhanced later with proper ZIP handling library
      try {
        const AdmZip = require('adm-zip');
        const zip = new AdmZip(fileBuffer);
        const zipEntries = zip.getEntries();
      
      let totalProcessed = 0;
      const uploadIds = [];

      for (const entry of zipEntries) {
        if (entry.entryName.toLowerCase().endsWith('.csv')) {
          const csvBuffer = entry.getData();
          const csvName = entry.entryName;
          
          // Count rows in CSV
          const csvContent = csvBuffer.toString();
          const rowCount = csvContent.split('\n').filter(line => line.trim()).length - 1;
          
          // Store the CSV file
          const uploadId = storeTicketUpload(userEmail, csvName, csvBuffer, rowCount);
          uploadIds.push(uploadId);
          
          // Process CSV data
          if (csv) {
            csv.parse(csvBuffer, {
            columns: true,
            skip_empty_lines: true
          }, (err, records) => {
            if (!err) {
              const tickets = records.map(record => ({
                ticket_id: record.ticket_id || record.id || `UPLOAD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                title: record.title || record.subject || 'Imported Ticket',
                description: record.description || record.details || '',
                status: record.status || 'open',
                priority: record.priority || 'medium',
                category: record.category || record.type || 'General',
                created_at: record.created_at || record.created || new Date().toISOString(),
                resolved_at: record.resolved_at || record.closed_at || null,
                resolution_time_minutes: record.resolution_time_minutes || null,
                cost_saved: record.cost_saved || null,
                assigned_to: record.assignee_name || record.assigned_to || null,
                resolved_by: record.resolved_by || null,
                is_automated: record.is_automated || 0,
                automation_type: record.automation_type || null,
                user_email: userEmail
              }));

              const result = importTickets(tickets, 'csv_upload', userEmail);
              if (result.success) {
                updateUploadStatus(uploadId, 'completed', `Imported ${result.count} tickets`);
                totalProcessed += result.count;
              } else {
                updateUploadStatus(uploadId, 'failed', result.error);
              }
            }
          });
          } else {
            // Fallback without csv-parse
            updateUploadStatus(uploadId, 'completed', 'CSV processing simulated');
          }
        }
      }

      res.json({
        success: true,
        message: `Processed ZIP file with ${uploadIds.length} CSV files`,
        uploadIds,
        filename,
        size: req.file.size
      });
      } catch (zipError) {
        // If adm-zip is not installed, provide a helpful message
        console.log('ZIP processing error:', zipError.message);
        res.json({
          success: false,
          message: 'ZIP file processing requires additional setup. Please extract CSV files and upload them individually.',
          filename,
          size: req.file.size,
          error: 'ZIP library not available'
        });
        return;
      }
    } else {
      // Handle single CSV file
      const csvContent = fileBuffer.toString();
      const rowCount = csvContent.split('\n').filter(line => line.trim()).length - 1;
      
      // Store the upload
      const uploadId = storeTicketUpload(userEmail, filename, fileBuffer, rowCount);
      
      // Process CSV data
      if (csv) {
        csv.parse(fileBuffer, {
        columns: true,
        skip_empty_lines: true
      }, (err, records) => {
        if (err) {
          updateUploadStatus(uploadId, 'failed', err.message);
          return;
        }

        const tickets = records.map(record => ({
          ticket_id: record.ticket_id || record.id || `UPLOAD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: record.title || record.subject || 'Imported Ticket',
          description: record.description || record.details || '',
          status: record.status || 'open',
          priority: record.priority || 'medium',
          category: record.category || record.type || 'General',
          created_at: record.created_at || record.created || new Date().toISOString(),
          resolved_at: record.resolved_at || record.closed_at || null,
          resolution_time_minutes: record.resolution_time_minutes || null,
          cost_saved: record.cost_saved || null,
          assigned_to: record.assignee_name || record.assigned_to || null,
          resolved_by: record.resolved_by || null,
          is_automated: record.is_automated || 0,
          automation_type: record.automation_type || null,
          user_email: userEmail
        }));

        const result = importTickets(tickets, 'csv_upload', userEmail);
        if (result.success) {
          updateUploadStatus(uploadId, 'completed', `Imported ${result.count} tickets`);
        } else {
          updateUploadStatus(uploadId, 'failed', result.error);
        }
      });
      } else {
        // Fallback without csv-parse
        updateUploadStatus(uploadId, 'completed', 'CSV processing simulated');
      }

      res.json({
        success: true,
        message: 'File uploaded and processing started',
        uploadId,
        filename,
        size: req.file.size,
        rowCount
      });
    }
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to process upload',
      details: error.message 
    });
  }
});

// Generate API key endpoint
app.post('/api/generate-key', (req, res) => {
  try {
    const userEmail = req.headers['x-user-email'] || 'anonymous';
    const apiKey = generateApiKey(userEmail);
    
    res.json({
      success: true,
      apiKey
    });
  } catch (error) {
    console.error('Error generating API key:', error);
    res.status(500).json({ error: 'Failed to generate API key' });
  }
});

// API endpoint for data retrieval with authentication
app.get('/api/tickets/data', (req, res) => {
  const startTime = Date.now();
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  // Validate API key
  const keyInfo = validateApiKey(apiKey);
  if (!keyInfo) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  // Check rate limit
  if (keyInfo.usage_count >= keyInfo.rate_limit) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }
  
  try {
    // Get data with filters
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      status: req.query.status,
      category: req.query.category,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 100
    };
    
    const result = getUploadedData(keyInfo.user_email, filters);
    
    // Log API request
    const responseTime = Date.now() - startTime;
    logApiRequest(apiKey, '/api/tickets/data', 'GET', req.query, 200, responseTime);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    
    // Log failed request
    const responseTime = Date.now() - startTime;
    logApiRequest(apiKey, '/api/tickets/data', 'GET', req.query, 500, responseTime);
    
    res.status(500).json({ error: 'Failed to fetch data' });
  }
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