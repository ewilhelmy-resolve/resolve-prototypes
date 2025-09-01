#!/usr/bin/env node

/**
 * Test Supabase Connection
 * Verifies database connectivity and pgvector availability
 */

const { Pool } = require('pg');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL not found in environment');
  console.error('   Make sure you have a .env file with DATABASE_URL set');
  process.exit(1);
}

// Check if password is still placeholder
if (DATABASE_URL.includes('[YOUR-PASSWORD]')) {
  console.error('❌ Error: You need to replace [YOUR-PASSWORD] with your actual Supabase password');
  console.error('   Edit the .env file and add your real password');
  process.exit(1);
}

console.log('🔌 Testing Supabase connection...\n');
console.log('   Host:', DATABASE_URL.match(/@([^:]+)/)?.[1] || 'unknown');
console.log('   Database:', DATABASE_URL.match(/\/([^?]+)/)?.[1] || 'unknown');
console.log();

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false
});

async function testConnection() {
  try {
    // Test basic connectivity
    console.log('1️⃣  Testing basic connection...');
    const timeResult = await pool.query('SELECT NOW() as current_time');
    console.log('   ✅ Connected successfully!');
    console.log('   ⏰ Server time:', timeResult.rows[0].current_time);
    console.log();
    
    // Check pgvector extension
    console.log('2️⃣  Checking pgvector extension...');
    const vectorResult = await pool.query(`
      SELECT 
        extname, 
        extversion 
      FROM pg_extension 
      WHERE extname = 'vector'
    `);
    
    if (vectorResult.rows.length > 0) {
      console.log('   ✅ pgvector is installed!');
      console.log('   📦 Version:', vectorResult.rows[0].extversion);
    } else {
      console.log('   ⚠️  pgvector not found. Installing...');
      await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
      console.log('   ✅ pgvector installed successfully!');
    }
    console.log();
    
    // Test vector operations
    console.log('3️⃣  Testing vector operations...');
    const vectorTest = await pool.query(`
      SELECT '[1,2,3]'::vector AS test_vector,
             '[1,2,3]'::vector <-> '[1,2,4]'::vector AS distance
    `);
    console.log('   ✅ Vector operations working!');
    console.log('   📊 Sample vector:', vectorTest.rows[0].test_vector);
    console.log('   📏 Distance calculation:', vectorTest.rows[0].distance);
    console.log();
    
    // List existing tables
    console.log('4️⃣  Checking existing tables...');
    const tables = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    if (tables.rows.length > 0) {
      console.log('   📋 Found', tables.rows.length, 'tables:');
      tables.rows.forEach(row => {
        console.log('      -', row.tablename);
      });
    } else {
      console.log('   ℹ️  No tables found (fresh database)');
      console.log('   💡 Run migrations: node scripts/migrate-supabase.js');
    }
    console.log();
    
    // Summary
    console.log('✨ Supabase connection test completed successfully!');
    console.log('   Your database is ready for the application.');
    
  } catch (error) {
    console.error('\n❌ Connection test failed!');
    console.error('   Error:', error.message);
    
    if (error.message.includes('password')) {
      console.error('\n💡 Check your Supabase password in the .env file');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('\n💡 Check your internet connection and Supabase URL');
    } else if (error.message.includes('SSL')) {
      console.error('\n💡 SSL connection issue - this script handles it automatically');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();