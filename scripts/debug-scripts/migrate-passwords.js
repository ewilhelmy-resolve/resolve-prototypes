const authService = require('./src/services/authService');
const db = require('./src/database/connection');

async function migratePasswords() {
  try {
    await db.connect();
    console.log('Connected to database for password migration');
    
    // Get all users with unhashed passwords (assuming they are plain text)
    const result = await db.query('SELECT id, email, password FROM users');
    console.log('Found', result.rows.length, 'users');
    
    for (const user of result.rows) {
      // Check if password is already hashed (bcrypt hashes start with $2b$)
      if (!user.password.startsWith('$2b$')) {
        console.log('Hashing password for user:', user.email);
        const hashedPassword = await authService.hashPassword(user.password);
        await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, user.id]);
        console.log('Updated password for user:', user.email);
      } else {
        console.log('Password already hashed for user:', user.email);
      }
    }
    
    console.log('Password migration completed');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migratePasswords();