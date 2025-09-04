/**
 * Playwright Global Setup with Test Containers
 * 
 * This file manages the lifecycle of test containers for E2E tests.
 * It starts PostgreSQL and the app in isolated containers for each test run.
 */

const { PostgreSqlContainer } = require('@testcontainers/postgresql');
const { GenericContainer, Network, Wait } = require('testcontainers');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

async function globalSetup() {
  console.log('🚀 Starting test containers...');

  try {
    // Create a docker network for containers to communicate
    const network = await new Network().start();
    
    // Start PostgreSQL container with pgvector
    console.log('📦 Starting PostgreSQL with pgvector...');
    const postgresContainer = await new PostgreSqlContainer('pgvector/pgvector:pg15')
      .withDatabase('resolve_test')
      .withUsername('postgres')
      .withPassword('test_password')
      .withNetwork(network)
      .withNetworkAliases('test-postgres')
      .withExposedPorts(5432)
      .withStartupTimeout(30000) // 30 seconds max for postgres
      .start();

    const postgresPort = postgresContainer.getMappedPort(5432);
    const postgresHost = postgresContainer.getHost();
    
    console.log(`✅ PostgreSQL running on ${postgresHost}:${postgresPort}`);

    // Build the app image (using existing Dockerfile)
    console.log('🔨 Building app image...');
    execSync('docker build -t resolve-test-app:latest --target production .', {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit'
    });

    // Prepare test environment variables
    const testEnv = {
      NODE_ENV: 'test',
      DATABASE_URL: `postgresql://postgres:test_password@test-postgres:5432/resolve_test?sslmode=disable`,
      JWT_SECRET: 'test-jwt-secret-for-testing-only',
      SESSION_SECRET: 'test-session-secret-for-testing-only',
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

    // Start the app container
    console.log('🚀 Starting app container...');
    const appContainer = await new GenericContainer('resolve-test-app:latest')
      .withNetwork(network)
      .withNetworkAliases('test-app')
      .withExposedPorts(5000)
      .withEnvironment(testEnv)
      .withCommand(['node', 'server.js'])
      .withStartupTimeout(30000) // 30 seconds max
      .withWaitStrategy(
        Wait.forHttp('/health', 5000)
          .forStatusCode(200)
          .withStartupTimeout(20000) // 20 seconds max
      )
      .start();
    
    // Wait for the app to be ready by checking health endpoint
    console.log('⏳ Waiting for app to be healthy...');
    const appPort = appContainer.getMappedPort(5000);
    const appHost = appContainer.getHost();
    const maxRetries = 10; // Reduced from 30
    let retries = 0;
    let isHealthy = false;
    
    while (retries < maxRetries && !isHealthy) {
      try {
        const response = await fetch(`http://${appHost}:${appPort}/health`);
        if (response.ok) {
          isHealthy = true;
          console.log('✅ App is healthy!');
        }
      } catch (error) {
        // Ignore connection errors during startup
      }
      
      if (!isHealthy) {
        retries++;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Reduced from 2000
      }
    }
    
    if (!isHealthy) {
      throw new Error('App failed to become healthy in time');
    }
    
    console.log(`✅ App running on ${appHost}:${appPort}`);
    
    // Initialize admin user for tests
    console.log('👤 Setting up admin user...');
    try {
      const { Pool } = require('pg');
      const bcrypt = require('bcrypt');
      
      const pool = new Pool({
        connectionString: `postgresql://postgres:test_password@${postgresHost}:${postgresPort}/resolve_test`
      });
      
      // Wait a bit for migrations to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if admin user exists and update password
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(`
        INSERT INTO users (email, password, is_admin, created_at, tenant_id)
        VALUES ('admin@resolve.io', $1, true, NOW(), gen_random_uuid())
        ON CONFLICT (email) DO UPDATE
        SET password = $1, is_admin = true
      `, [hashedPassword]);
      
      await pool.end();
      console.log('✅ Admin user ready');
    } catch (error) {
      console.error('Warning: Could not set up admin user:', error.message);
      // Don't fail setup if this doesn't work - migrations might handle it
    }

    // Save container info for tests and teardown
    const testConfig = {
      postgresContainer: {
        id: postgresContainer.getId(),
        host: postgresHost,
        port: postgresPort,
        connectionString: `postgresql://postgres:test_password@${postgresHost}:${postgresPort}/resolve_test`
      },
      appContainer: {
        id: appContainer.getId(),
        host: appHost,
        port: appPort,
        url: `http://${appHost}:${appPort}`
      },
      networkId: network.getId()
    };

    // Write config to file for tests to use
    fs.writeFileSync(
      path.join(__dirname, '.test-containers.json'),
      JSON.stringify(testConfig, null, 2)
    );

    // Set environment variables for Playwright
    process.env.TEST_BASE_URL = testConfig.appContainer.url;
    process.env.TEST_DB_URL = testConfig.postgresContainer.connectionString;

    console.log('✅ Test environment ready!');
    console.log(`   App URL: ${testConfig.appContainer.url}`);
    console.log(`   Database: ${testConfig.postgresContainer.connectionString}`);

    // Return a teardown function
    return async () => {
      console.log('🧹 Cleaning up test containers...');
      
      try {
        // Stop containers
        if (appContainer) {
          await appContainer.stop();
          console.log('✅ App container stopped');
        }
        
        if (postgresContainer) {
          await postgresContainer.stop();
          console.log('✅ PostgreSQL container stopped');
        }

        if (network) {
          await network.stop();
          console.log('✅ Network removed');
        }

        // Remove config file
        const configPath = path.join(__dirname, '.test-containers.json');
        if (fs.existsSync(configPath)) {
          fs.unlinkSync(configPath);
        }
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    };
  } catch (error) {
    console.error('❌ Failed to start test containers:', error);
    throw error;
  }
}

module.exports = globalSetup;