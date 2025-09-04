#!/usr/bin/env node

const authService = require('../src/services/authService');
const db = require('../src/database/postgres');
const crypto = require('crypto');

async function createSecureAdminAccounts() {
  console.log('🔒 Starting secure admin account setup...');
  
  try {
    // Generate strong random passwords
    const adminPassword = crypto.randomBytes(16).toString('hex') + 'A1!';
    const johnPassword = crypto.randomBytes(16).toString('hex') + 'B2@';
    
    console.log('📝 Creating admin accounts with strong passwords...');
    
    // Create admin@resolve.io
    try {
      const admin1 = await authService.createUser({
        email: 'admin@resolve.io',
        password: adminPassword,
        full_name: 'Admin User',
        company_name: 'Resolve',
        tier: 'admin'
      });
      console.log('✅ Created admin@resolve.io with ID:', admin1.id);
      console.log('🔑 Password for admin@resolve.io:', adminPassword);
    } catch (error) {
      if (error.message === 'User already exists') {
        console.log('ℹ️  admin@resolve.io already exists');
      } else {
        throw error;
      }
    }
    
    // Create john.gorham@resolve.io
    try {
      const admin2 = await authService.createUser({
        email: 'john.gorham@resolve.io',
        password: johnPassword,
        full_name: 'John Gorham',
        company_name: 'Resolve.io',
        tier: 'admin'
      });
      console.log('✅ Created john.gorham@resolve.io with ID:', admin2.id);
      console.log('🔑 Password for john.gorham@resolve.io:', johnPassword);
    } catch (error) {
      if (error.message === 'User already exists') {
        console.log('ℹ️  john.gorham@resolve.io already exists');
      } else {
        throw error;
      }
    }
    
    console.log('\n📋 IMPORTANT: Save these credentials securely!');
    console.log('================================================');
    console.log('admin@resolve.io        :', adminPassword);
    console.log('john.gorham@resolve.io  :', johnPassword);
    console.log('================================================');
    
  } catch (error) {
    console.error('❌ Failed to create admin accounts:', error);
    process.exit(1);
  }
}

async function migrateExistingPasswords() {
  console.log('\n🔄 Checking for plaintext passwords to migrate...');
  
  try {
    const result = await db.query('SELECT id, email, password FROM users');
    console.log(`📊 Found ${result.rows.length} users to check`);
    
    let migratedCount = 0;
    
    for (const user of result.rows) {
      // Check if password is already hashed (bcrypt hashes start with $2b$)
      if (!user.password.startsWith('$2b$')) {
        console.log(`🔄 Migrating password for user: ${user.email}`);
        const hashedPassword = await authService.hashPassword(user.password);
        await db.query('UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', 
          [hashedPassword, user.id]);
        console.log(`✅ Migrated password for user: ${user.email}`);
        migratedCount++;
      } else {
        console.log(`✅ Password already hashed for user: ${user.email}`);
      }
    }
    
    console.log(`\n📈 Migration complete! ${migratedCount} passwords migrated.`);
    
  } catch (error) {
    console.error('❌ Password migration failed:', error);
    process.exit(1);
  }
}

async function main() {
  console.log('🚀 Starting security migration and admin setup...\n');
  
  try {
    // First migrate any existing plaintext passwords
    await migrateExistingPasswords();
    
    // Then create secure admin accounts
    await createSecureAdminAccounts();
    
    console.log('\n🎉 Security setup complete!');
    console.log('✅ All passwords are now properly hashed');
    console.log('✅ Admin accounts created with strong passwords');
    console.log('\n⚠️  SECURITY REMINDER: Change default passwords after first login!');
    
  } catch (error) {
    console.error('❌ Security setup failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createSecureAdminAccounts,
  migrateExistingPasswords
};