#!/usr/bin/env node

/**
 * Create Admin User Script
 * Creates or updates the admin@resolve.io user
 */

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL environment variable required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false
});

async function createAdminUser() {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Ensure is_admin column exists
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE
    `).catch(() => {
      // Column might already exist
    });
    
    // Create or update admin user
    const result = await pool.query(`
      INSERT INTO users (email, password, full_name, is_admin, created_at) 
      VALUES ($1, $2, $3, true, NOW()) 
      ON CONFLICT (email) DO UPDATE 
      SET is_admin = true, full_name = $3, password = $2
      RETURNING id, email
    `, ['admin@resolve.io', hashedPassword, 'Admin User']);
    
    console.log('✅ Admin user created/updated:', result.rows[0].email);
    console.log('   Password: admin123');
    console.log('   User ID:', result.rows[0].id);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createAdminUser();