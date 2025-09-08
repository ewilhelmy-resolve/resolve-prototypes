const { Client } = require('pg');

async function updatePassword() {
  const client = new Client({
    host: process.env.POSTGRES_HOST || 'postgres',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'resolve_app',
    user: process.env.POSTGRES_USER || 'resolve_user',
    password: process.env.POSTGRES_PASSWORD || 'resolve_password'
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    // Use the known working hash for 'admin123'
    const hashedPassword = '$2b$10$D.uCFMXDzXT47Ej1mM.4R.R6PzGg47rNZBWLaoy/40i3UadhnI2JW';
    
    const result = await client.query(
      'UPDATE users SET password = $1 WHERE email = $2',
      [hashedPassword, 'admin@resolve.io']
    );
    
    if (result.rowCount > 0) {
      console.log('✅ Password updated for admin@resolve.io to admin123');
    } else {
      console.log('❌ User admin@resolve.io not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

updatePassword();