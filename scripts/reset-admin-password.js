const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function resetAdminPassword() {
    const client = new Client({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        database: process.env.POSTGRES_DB || 'resolve_db',
        user: process.env.POSTGRES_USER || 'resolve_user',
        password: process.env.POSTGRES_PASSWORD || 'resolve123'
    });

    try {
        await client.connect();
        console.log('Connected to database');

        // Generate password hash for admin123
        const password = 'admin123';
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Update admin password and ensure it's admin@example.com
        const result = await client.query(
            'UPDATE users SET password = $1 WHERE email = $2 RETURNING email',
            [hashedPassword, 'admin@example.com']
        );

        if (result.rows.length > 0) {
            console.log('✅ Password successfully reset for admin@example.com');
            console.log('📧 Email: admin@example.com');
            console.log('🔑 Password: admin123');
        } else {
            // Try admin@resolve.io as fallback
            const fallbackResult = await client.query(
                'UPDATE users SET password = $1 WHERE email = $2 RETURNING email',
                [hashedPassword, 'admin@resolve.io']
            );
            if (fallbackResult.rows.length > 0) {
                console.log('✅ Password successfully reset for admin@resolve.io');
                console.log('📧 Email: admin@resolve.io');
                console.log('🔑 Password: admin123');
            } else {
                console.log('❌ No admin user found');
            }
        }

    } catch (error) {
        console.error('Error resetting password:', error);
    } finally {
        await client.end();
    }
}

resetAdminPassword();