#!/usr/bin/env node

/**
 * Set up test admin user for E2E tests
 */

const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// Test database configuration
const TEST_DATABASE_URL = 'postgresql://postgres:testpass123@localhost:5433/resolve_test?sslmode=disable';
const BCRYPT_ROUNDS = 10;

async function setupTestAdmin() {
  const pool = new Pool({
    connectionString: TEST_DATABASE_URL,
    ssl: false
  });

  try {
    // Test credentials for E2E tests
    const testPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(testPassword, BCRYPT_ROUNDS);

    // Create or update test admin user
    // Note: The schema has been migrated - use a valid UUID for tenant_id
    const tenantId = '00000000-0000-0000-0000-000000000000'; // Default test tenant
    
    await pool.query(
      `INSERT INTO users (email, password, created_at, is_admin, tenant_id)
       VALUES ($1, $2, NOW(), true, $3)
       ON CONFLICT (email) DO UPDATE 
       SET password = $2, is_admin = true`,
      ['admin@resolve.io', hashedPassword, tenantId]
    );

    console.log('   ✅ Test admin user configured: admin@resolve.io / admin123');

  } catch (error) {
    console.error('   ⚠️  Error setting up test admin:', error.message);
    // Don't fail - the migrations might create the user
  } finally {
    await pool.end();
  }
}

// Only run if called directly
if (require.main === module) {
  setupTestAdmin().catch(console.error);
}

module.exports = setupTestAdmin;