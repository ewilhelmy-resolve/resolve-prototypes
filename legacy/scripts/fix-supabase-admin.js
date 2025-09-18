/**
 * Fix admin user password in Supabase database
 * Sets admin@resolve.io password to admin123
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function fixSupabaseAdmin() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('supabase') 
            ? { rejectUnauthorized: false } 
            : false
    });

    try {
        console.log('🔌 Connecting to Supabase...');
        await client.connect();
        console.log('✅ Connected to Supabase database');

        // First, check if admin@resolve.io exists
        const checkResult = await client.query(
            'SELECT id, email, is_admin FROM users WHERE email = $1',
            ['admin@resolve.io']
        );

        const password = 'admin123';
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        console.log('🔐 Generated password hash for admin123');

        if (checkResult.rows.length > 0) {
            // Update existing admin user
            const updateResult = await client.query(
                'UPDATE users SET password = $1, is_admin = true WHERE email = $2 RETURNING id, email',
                [hashedPassword, 'admin@resolve.io']
            );
            console.log('✅ Updated existing admin user:', updateResult.rows[0]);
        } else {
            // Create new admin user
            const insertResult = await client.query(
                `INSERT INTO users (email, password, company_name, phone, tier, is_admin) 
                 VALUES ($1, $2, $3, $4, $5, true) 
                 RETURNING id, email`,
                ['admin@resolve.io', hashedPassword, 'Resolve', '000-000-0000', 'enterprise']
            );
            console.log('✅ Created new admin user:', insertResult.rows[0]);
        }

        console.log('\n========================================');
        console.log('✅ Admin user is ready!');
        console.log('📧 Email: admin@resolve.io');
        console.log('🔑 Password: admin123');
        console.log('🌐 URL: https://onboarding.resolve.io/');
        console.log('========================================\n');

        // Verify the password works
        const verifyResult = await client.query(
            'SELECT password FROM users WHERE email = $1',
            ['admin@resolve.io']
        );
        
        if (verifyResult.rows.length > 0) {
            const isValid = await bcrypt.compare('admin123', verifyResult.rows[0].password);
            console.log('🔍 Password verification:', isValid ? '✅ PASSED' : '❌ FAILED');
        }

    } catch (error) {
        console.error('❌ Error fixing admin user:', error);
        process.exit(1);
    } finally {
        await client.end();
        console.log('👋 Disconnected from database');
    }
}

// Run the script
fixSupabaseAdmin();