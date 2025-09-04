#!/usr/bin/env node

/**
 * Restore test admin password for backward compatibility
 */

const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10');

async function restoreTestPassword() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false
  });

  try {
    // Original test password
    const testPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(testPassword, BCRYPT_ROUNDS);

    // Update admin@resolve.io password
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2',
      [hashedPassword, 'admin@resolve.io']
    );

    if (result.rowCount > 0) {
      console.log('✅ Successfully restored admin@resolve.io password');
      console.log('   Password: admin123 (test environment only)');
    } else {
      console.log('⚠️  User admin@resolve.io not found');
      console.log('   Creating admin user with test password...');
      
      // Create the admin user if it doesn't exist
      await pool.query(
        `INSERT INTO users (email, password, name, company, created_at, is_admin, tenant_id)
         VALUES ($1, $2, $3, $4, NOW(), true, $5)
         ON CONFLICT (email) DO UPDATE SET password = $2`,
        ['admin@resolve.io', hashedPassword, 'Admin User', 'Resolve', 'default']
      );
      
      console.log('✅ Admin user created/updated with test password');
    }

  } catch (error) {
    console.error('❌ Error restoring test password:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the update
restoreTestPassword().catch(console.error);