const db = require('./src/database/postgres');
const bcrypt = require('bcrypt');

async function fixAdminPassword() {
  try {
    // Generate proper hash for admin123
    const properHash = bcrypt.hashSync('admin123', 10);
    console.log('Generated proper hash for admin123:', properHash);
    
    // Update the admin user password  
    const result = await db.query(
      'UPDATE users SET password = $1 WHERE email = $2 RETURNING email',
      [properHash, 'admin@resolve.io']
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Successfully updated password for:', result.rows[0].email);
      
      // Verify it works now
      const verify = await db.query(
        'SELECT password FROM users WHERE email = $1',
        ['admin@resolve.io']
      );
      
      const isValid = bcrypt.compareSync('admin123', verify.rows[0].password);
      console.log('Verification - admin123 is valid:', isValid);
      console.log('Password hash length:', verify.rows[0].password.length);
    } else {
      console.log('❌ No user found to update');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixAdminPassword();