#!/usr/bin/env node
/**
 * Create admin user in Supabase database
 * Run this once to set up admin@resolve.io with password admin123
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function createAdminUser() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔌 Connecting to Supabase...');
    
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to database');
    
    // Check if admin already exists
    const checkResult = await pool.query(
      'SELECT email, is_admin FROM users WHERE email = $1',
      ['admin@resolve.io']
    );
    
    if (checkResult.rows.length > 0) {
      console.log('⚠️  Admin user already exists');
      
      // Update password to ensure it's correct
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        'UPDATE users SET password = $1, is_admin = true WHERE email = $2',
        [hashedPassword, 'admin@resolve.io']
      );
      
      console.log('✅ Admin password updated to: admin123');
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const tenantId = require('crypto').randomUUID();
      
      await pool.query(
        `INSERT INTO users (email, password, full_name, is_admin, created_at, tenant_id) 
         VALUES ($1, $2, $3, true, NOW(), $4)`,
        ['admin@resolve.io', hashedPassword, 'Admin User', tenantId]
      );
      
      console.log('✅ Admin user created successfully');
      console.log('   Email: admin@resolve.io');
      console.log('   Password: admin123');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createAdminUser();