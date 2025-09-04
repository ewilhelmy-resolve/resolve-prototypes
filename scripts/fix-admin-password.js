#!/usr/bin/env node
/**
 * Fix admin user password in Supabase to match the expected hash
 */

require('dotenv').config();
const { Pool } = require('pg');

async function fixAdminPassword() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔌 Connecting to Supabase...');
    
    // The exact hash from 99-create-admin-user.sql that works with "admin123"
    const correctHash = '$2b$10$D.uCFMXDzXT47Ej1mM.4R.R6PzGg47rNZBWLaoy/40i3UadhnI2JW';
    
    // Update admin password to the correct hash
    const result = await pool.query(
      'UPDATE users SET password = $1, is_admin = true WHERE email = $2 RETURNING id, email',
      [correctHash, 'admin@resolve.io']
    );
    
    if (result.rowCount > 0) {
      console.log('✅ Admin password fixed!');
      console.log('   Email: admin@resolve.io');
      console.log('   Password: admin123');
    } else {
      console.log('❌ Admin user not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixAdminPassword();