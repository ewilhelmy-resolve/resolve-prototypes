/**
 * Isolated Test Setup - Each test spec gets its own app + database container pair
 * 
 * This ensures:
 * - Dev instance on port 5000 remains untouched
 * - Each test spec runs in complete isolation
 * - Tests can run in parallel without interference
 * - Each test gets a fresh database state
 */

const { PostgreSqlContainer } = require('@testcontainers/postgresql');
const { GenericContainer, Network } = require('testcontainers');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

class IsolatedTestEnvironment {
  constructor(specName) {
    this.specName = specName;
    this.uniqueId = crypto.randomBytes(4).toString('hex');
    this.containers = [];
    this.network = null;
    this.config = null;
  }

  async setup() {
    console.log(`\n🚀 Setting up isolated environment for: ${this.specName}`);
    
    try {
      // 1. Create isolated network for this test spec
      this.network = await new Network()
        .withName(`test-network-${this.uniqueId}`)
        .start();
      console.log(`   ✅ Created isolated network: test-network-${this.uniqueId}`);
      
      // 2. Start PostgreSQL container with pgvector
      console.log(`   📦 Starting PostgreSQL for ${this.specName}...`);
      const postgresContainer = await new PostgreSqlContainer('pgvector/pgvector:pg16')
        .withDatabase(`test_db_${this.uniqueId}`)
        .withUsername('postgres')
        .withPassword('test_password')
        .withNetwork(this.network)
        .withNetworkAliases(`postgres-${this.uniqueId}`)
        .withExposedPorts(5432)
        .withStartupTimeout(30000)
        .start();
      
      this.containers.push(postgresContainer);
      const postgresPort = postgresContainer.getMappedPort(5432);
      const postgresHost = postgresContainer.getHost();
      console.log(`   ✅ PostgreSQL running on ${postgresHost}:${postgresPort}`);
      
      // 3. Build app image if not already built
      const imageName = 'resolve-test-app:latest';
      if (!this.imageExists(imageName)) {
        console.log(`   🔨 Building app image...`);
        execSync('docker build -t resolve-test-app:latest -f Dockerfile --target production .', {
          cwd: path.resolve(__dirname, '..'),
          stdio: 'inherit'
        });
      }
      
      // 4. Prepare isolated environment variables
      const testEnv = {
        NODE_ENV: 'test',
        DATABASE_URL: `postgresql://postgres:test_password@postgres-${this.uniqueId}:5432/test_db_${this.uniqueId}?sslmode=disable`,
        JWT_SECRET: `test-jwt-secret-${this.uniqueId}`,
        SESSION_SECRET: `test-session-secret-${this.uniqueId}`,
        PORT: '5000',
        AUTOMATION_WEBHOOK_URL: 'http://mock-webhook/test',
        AUTOMATION_AUTH: 'Basic dGVzdDp0ZXN0',
        AUTH_RATE_LIMIT_MAX: '10000',
        AUTH_RATE_LIMIT_WINDOW: '900000',
        USE_REDIS_SESSIONS: 'false',
        BCRYPT_ROUNDS: '10',
        PASSWORD_MIN_LENGTH: '6',
        SESSION_TIMEOUT_MS: '86400000',
        VECTOR_DIMENSION: '1536',
        MAX_DOCUMENT_SIZE: '51200',
        BYPASS_DB_MIGRATIONS: 'false'
      };
      
      // 5. Start isolated app container
      console.log(`   🚀 Starting app container for ${this.specName}...`);
      const appContainer = await new GenericContainer('resolve-test-app:latest')
        .withName(`app-${this.specName}-${this.uniqueId}`)
        .withNetwork(this.network)
        .withNetworkAliases(`app-${this.uniqueId}`)
        .withExposedPorts(5000)
        .withEnvironment(testEnv)
        .withCommand(['node', 'server.js'])
        .withStartupTimeout(30000)
        .start();
      
      this.containers.push(appContainer);
      const appPort = appContainer.getMappedPort(5000);
      const appHost = appContainer.getHost();
      
      // 6. Wait for app to be healthy
      console.log(`   ⏳ Waiting for app to be healthy...`);
      await this.waitForHealth(`http://${appHost}:${appPort}/health`, 20);
      console.log(`   ✅ App running on ${appHost}:${appPort}`);
      
      // 7. Initialize test data (including admin user)
      await this.initializeTestData(postgresHost, postgresPort);
      
      // 8. Store configuration for test use
      this.config = {
        appUrl: `http://${appHost}:${appPort}`,
        dbUrl: `postgresql://postgres:test_password@${postgresHost}:${postgresPort}/test_db_${this.uniqueId}`,
        appContainer: {
          id: appContainer.getId(),
          host: appHost,
          port: appPort
        },
        postgresContainer: {
          id: postgresContainer.getId(),
          host: postgresHost,
          port: postgresPort
        },
        networkId: this.network.getId(),
        uniqueId: this.uniqueId
      };
      
      console.log(`   ✅ Isolated environment ready for ${this.specName}!`);
      console.log(`      App URL: ${this.config.appUrl}`);
      console.log(`      Unique ID: ${this.uniqueId}`);
      
      return this.config;
      
    } catch (error) {
      console.error(`   ❌ Failed to setup isolated environment for ${this.specName}:`, error);
      await this.teardown();
      throw error;
    }
  }
  
  async teardown() {
    console.log(`\n🧹 Cleaning up isolated environment for: ${this.specName}`);
    
    // Stop all containers
    for (const container of this.containers) {
      try {
        await container.stop();
        console.log(`   ✅ Stopped container ${container.getId().substring(0, 12)}`);
      } catch (error) {
        console.log(`   ⚠️ Could not stop container: ${error.message}`);
      }
    }
    
    // Remove network
    if (this.network) {
      try {
        await this.network.stop();
        console.log(`   ✅ Removed network test-network-${this.uniqueId}`);
      } catch (error) {
        console.log(`   ⚠️ Could not remove network: ${error.message}`);
      }
    }
    
    console.log(`   ✅ Cleanup complete for ${this.specName}`);
  }
  
  async initializeTestData(dbHost, dbPort) {
    console.log(`   📝 Initializing test data...`);
    
    const { Pool } = require('pg');
    const bcrypt = require('bcrypt');
    
    const pool = new Pool({
      host: dbHost,
      port: dbPort,
      database: `test_db_${this.uniqueId}`,
      user: 'postgres',
      password: 'test_password'
    });
    
    try {
      // Wait for database to be ready
      await pool.query('SELECT 1');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create admin user with known password
      const hashedPassword = '$2b$10$D.uCFMXDzXT47Ej1mM.4R.R6PzGg47rNZBWLaoy/40i3UadhnI2JW'; // admin123
      await pool.query(`
        INSERT INTO users (email, password, full_name, is_admin, created_at, tenant_id)
        VALUES ('admin@resolve.io', $1, 'Admin User', true, NOW(), gen_random_uuid())
        ON CONFLICT (email) DO UPDATE
        SET password = $1, is_admin = true
      `, [hashedPassword]);
      
      console.log(`   ✅ Test admin user created`);
      
    } catch (error) {
      console.log(`   ⚠️ Could not initialize test data: ${error.message}`);
    } finally {
      await pool.end();
    }
  }
  
  async waitForHealth(url, maxRetries = 30) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return true;
        }
      } catch (error) {
        // Ignore connection errors during startup
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error(`Health check failed for ${url}`);
  }
  
  imageExists(imageName) {
    try {
      execSync(`docker image inspect ${imageName}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
  
  getConfig() {
    return this.config;
  }
}

module.exports = IsolatedTestEnvironment;