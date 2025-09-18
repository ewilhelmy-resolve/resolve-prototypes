#!/usr/bin/env node

/**
 * Fix admin password for local development
 */

const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

// Use the main database URL from environment
const DATABASE_URL = process.env.DATABASE_URL;
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10');

async function fixLocalAdmin() {
  console.log('🔧 Fixing admin@resolve.io password for local instance...');
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL && DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false
  });

  try {
    // Set the password to 'admin123'
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // First, check if the user exists
    const checkUser = await pool.query(
      'SELECT email, is_admin FROM users WHERE email = $1',
      ['admin@resolve.io']
    );

    if (checkUser.rows.length > 0) {
      // Update existing user
      await pool.query(
        'UPDATE users SET password = $1, is_admin = true WHERE email = $2',
        [hashedPassword, 'admin@resolve.io']
      );
      console.log('✅ Updated admin@resolve.io password to: admin123');
    } else {
      // Create new admin user
      // Check which columns exist
      const tableInfo = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name IN ('name', 'company')
      `);
      
      const hasNameColumn = tableInfo.rows.some(r => r.column_name === 'name');
      const hasCompanyColumn = tableInfo.rows.some(r => r.column_name === 'company');
      
      if (hasNameColumn && hasCompanyColumn) {
        // Old schema with name and company
        await pool.query(
          `INSERT INTO users (email, password, name, company, created_at, is_admin, tenant_id)
           VALUES ($1, $2, $3, $4, NOW(), true, $5)`,
          ['admin@resolve.io', hashedPassword, 'Admin User', 'Resolve', 'default']
        );
      } else {
        // New schema without name and company
        await pool.query(
          `INSERT INTO users (email, password, created_at, is_admin, tenant_id)
           VALUES ($1, $2, NOW(), true, gen_random_uuid())`,
          ['admin@resolve.io', hashedPassword]
        );
      }
      console.log('✅ Created admin@resolve.io with password: admin123');
    }

    // Verify the password works
    const verifyUser = await pool.query(
      'SELECT password FROM users WHERE email = $1',
      ['admin@resolve.io']
    );

    if (verifyUser.rows.length > 0) {
      const isValid = await bcrypt.compare('admin123', verifyUser.rows[0].password);
      if (isValid) {
        console.log('✅ Password verification successful!');
        console.log('\n📝 You can now login with:');
        console.log('   Email: admin@resolve.io');
        console.log('   Password: admin123');
      } else {
        console.log('⚠️ Password verification failed - there may be an issue');
      }
    }

  } catch (error) {
    console.error('❌ Error fixing admin password:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the fix
fixLocalAdmin().catch(console.error);