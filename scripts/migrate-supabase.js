#!/usr/bin/env node

/**
 * Database Migration Script for Supabase
 * Runs all SQL migrations in order
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Get database URL from environment or command line
const DATABASE_URL = process.env.DATABASE_URL || process.argv[2];

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL environment variable or argument required');
  console.error('Usage: node migrate-supabase.js <database-url>');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false
});

async function runMigration(filePath) {
  const sql = await fs.readFile(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  
  try {
    // Skip pgvector installation files for Supabase (it's pre-installed)
    if (fileName.includes('pgvector') || fileName.includes('vector')) {
      console.log(`⏭️  Skipping ${fileName} - pgvector is pre-installed in Supabase`);
      
      // But ensure the extension is enabled
      if (fileName === '00-init-pgvector.sql') {
        await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
        console.log('   ✅ Ensured vector extension is enabled');
      }
      return;
    }
    
    console.log(`📝 Running migration: ${fileName}`);
    await pool.query(sql);
    console.log(`   ✅ ${fileName} completed`);
  } catch (error) {
    console.error(`   ❌ Error in ${fileName}:`, error.message);
    
    // Continue on certain errors
    if (error.message.includes('already exists') || 
        error.message.includes('duplicate key')) {
      console.log(`   ⚠️  Continuing despite error (already exists)`);
    } else {
      throw error;
    }
  }
}

async function migrate() {
  console.log('🚀 Starting Supabase database migration...\n');
  
  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to database\n');
    
    // Check if pgvector is available
    const vectorCheck = await pool.query(`
      SELECT * FROM pg_extension WHERE extname = 'vector'
    `);
    
    if (vectorCheck.rows.length === 0) {
      console.log('📦 Enabling pgvector extension...');
      await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
      console.log('✅ pgvector enabled\n');
    } else {
      console.log(`✅ pgvector already enabled (v${vectorCheck.rows[0].extversion})\n`);
    }
    
    // Get all migration files
    const migrationDir = path.join(__dirname, '..', 'src', 'database');
    const files = await fs.readdir(migrationDir);
    const sqlFiles = files
      .filter(f => f.endsWith('.sql'))
      .sort(); // Alphabetical order ensures correct sequence
    
    console.log(`Found ${sqlFiles.length} migration files\n`);
    
    // Run migrations in order
    for (const file of sqlFiles) {
      const filePath = path.join(migrationDir, file);
      await runMigration(filePath);
    }
    
    // Create migration tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        migrated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Record this migration run
    await pool.query(`
      INSERT INTO schema_migrations (version) 
      VALUES ($1) 
      ON CONFLICT (version) DO NOTHING
    `, [new Date().toISOString()]);
    
    console.log('\n✅ All migrations completed successfully!');
    
    // Show table summary
    const tables = await pool.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    console.log('\n📊 Database tables:');
    tables.rows.forEach(row => {
      console.log(`   - ${row.tablename}`);
    });
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations
migrate().catch(console.error);