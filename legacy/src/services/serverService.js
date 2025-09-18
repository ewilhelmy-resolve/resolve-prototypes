// Server startup and initialization service
const db = require('../database/postgres');
const authService = require('./authService');
const { v4: uuidv4 } = require('uuid');
const { createMigrationMiddleware } = require('../../scripts/debug-scripts/migrate-tenant-ids');
const { runPostgreSQLMigrations } = require('../database/migrations');
const { initializePgvector } = require('../database/init-pgvector');
const { generateCallbackToken } = require('../utils/rag');
const { processWebhookRetryQueue } = require('../workers/webhookRetry');

class ServerService {
  constructor() {
    this.users = []; // Legacy in-memory storage
    this.isInitialized = false;
  }

  async initializeDatabase() {
    try {
      console.log('🚀 Running database migrations on startup...');
      await runPostgreSQLMigrations(db);
      console.log('✅ Database migrations completed successfully');
      
      // Initialize pgvector (non-blocking)
      try {
        await initializePgvector();
      } catch (error) {
        console.error('[PGVECTOR INIT] Failed to initialize pgvector:', error.message);
      }
    } catch (error) {
      console.error('[MIGRATION ERROR] Failed to run migrations:', error.message);
      throw error;
    }
  }

  async initializeAdminUsers() {
    try {
      // Query admin users from database
      const result = await db.query(
        `SELECT id, email, password, full_name, company_name, tier, tenant_id 
         FROM users 
         WHERE tier = 'admin'`
      );
      
      // Add admin users to in-memory array
      for (const dbUser of result.rows) {
        const existingUser = this.users.find(u => u.email === dbUser.email);
        if (!existingUser) {
          this.users.push({
            id: dbUser.id.toString(),
            tenantId: dbUser.tenant_id,
            email: dbUser.email,
            password: dbUser.password,
            fullName: dbUser.full_name,
            companyName: dbUser.company_name,
            tier: dbUser.tier,
            createdAt: new Date().toISOString()
          });
          console.log(`📌 Admin user loaded: ${dbUser.email} with tenant: ${dbUser.tenant_id}`);
        }
      }
      
      // Ensure john.gorham@resolve.io is always available
      const johnExists = this.users.find(u => u.email === 'john.gorham@resolve.io');
      if (!johnExists) {
        this.users.push({
          id: Date.now().toString(),
          tenantId: uuidv4(),
          email: 'john.gorham@resolve.io',
          password: 'ResolveAdmin2024',
          fullName: 'John Gorham',
          companyName: 'Resolve.io',
          tier: 'admin',
          createdAt: new Date().toISOString()
        });
        console.log('📌 Admin user added: john.gorham@resolve.io');
      }
      
      // Migrate any users that don't have valid UUID tenant IDs
      const migrationMiddleware = createMigrationMiddleware();
      this.users = migrationMiddleware(this.users);
      
      console.log(`✅ Loaded ${this.users.length} users into memory`);
    } catch (error) {
      console.error('Error initializing admin users:', error);
      
      // Fallback: ensure at least one admin exists in memory
      this.users.push({
        id: Date.now().toString(),
        tenantId: uuidv4(),
        email: 'john.gorham@resolve.io',
        password: 'ResolveAdmin2024',
        fullName: 'John Gorham',
        companyName: 'Resolve.io',
        tier: 'admin',
        createdAt: new Date().toISOString()
      });
      console.log('📌 Admin user added (fallback): john.gorham@resolve.io');
    }
  }

  async generateTenantTokens() {
    try {
      const tenants = await db.query('SELECT DISTINCT tenant_id FROM users WHERE tenant_id IS NOT NULL');
      for (const tenant of tenants.rows) {
        const existingToken = await db.query('SELECT callback_token FROM rag_tenant_tokens WHERE tenant_id = $1', [tenant.tenant_id]);
        if (existingToken.rows.length === 0) {
          await generateCallbackToken(db, tenant.tenant_id);
          console.log(`Generated RAG callback token for tenant: ${tenant.tenant_id}`);
        }
      }
    } catch (error) {
      console.error('Error generating callback tokens:', error);
    }
  }

  startWebhookWorker() {
    // Start webhook retry worker
    setInterval(() => processWebhookRetryQueue(db), 60000); // Run every minute
    console.log('RAG webhook retry worker started');
  }

  printStartupMessage(port) {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  Resolve Onboarding Server                                   ║
║  Server running at: http://localhost:${port}                     ║
║                                                               ║
║  Project Structure:                                           ║
║  • /src/server         - Server-side code                    ║
║  • /src/client         - Client-side code                    ║
║  • /src/database       - Database related files              ║
║  • /public             - Static assets                       ║
║  • /config             - Configuration files                 ║
║  • /tests              - Test files                          ║
║  • /docs               - Documentation                       ║
╚═══════════════════════════════════════════════════════════════╝
    `);
  }

  async initialize() {
    if (this.isInitialized) return;

    await this.initializeDatabase();
    
    // Initialize admin users after a short delay to ensure DB is ready
    setTimeout(() => this.initializeAdminUsers(), 2000);
    
    this.isInitialized = true;
  }

  getUsers() {
    return this.users;
  }

  getUsersCount() {
    return this.users.length;
  }
}

module.exports = new ServerService();