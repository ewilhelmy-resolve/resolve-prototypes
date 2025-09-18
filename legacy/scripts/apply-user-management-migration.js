#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/resolve'
    });

    try {
        console.log('🔄 Applying user management migration...');
        
        // Read the migration file
        const migrationPath = path.join(__dirname, '../src/database/03-user-roles.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Apply the migration
        await pool.query(migrationSQL);
        
        console.log('✅ User management migration applied successfully!');
        
        // Check the results
        const result = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name IN ('role', 'status', 'last_login_at', 'invited_at', 'invited_by')
        `);
        
        console.log('📊 New columns added:');
        result.rows.forEach(row => {
            console.log(`   - ${row.column_name}`);
        });
        
        // Check admin users
        const admins = await pool.query(`
            SELECT email, role, status 
            FROM users 
            WHERE role = 'tenant-admin'
        `);
        
        console.log(`\n👥 Admin users (${admins.rows.length}):`);
        admins.rows.forEach(admin => {
            console.log(`   - ${admin.email} [${admin.role}] - ${admin.status}`);
        });
        
    } catch (error) {
        console.error('❌ Error applying migration:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run if called directly
if (require.main === module) {
    applyMigration();
}

module.exports = applyMigration;