const bcrypt = require('bcrypt');

async function test() {
  const password = 'admin123';
  
  // Hash from SQL file
  const oldHash = '$2b$10$D.uCFMXDzXT47Ej1mM.4R.R6PzGg47rNZBWLaoy/40i3UadhnI2JW';
  
  // Test if password matches old hash
  const matchesOld = await bcrypt.compare(password, oldHash);
  console.log('Password matches old hash:', matchesOld);
  
  // Generate new hash
  const newHash = await bcrypt.hash(password, 10);
  console.log('New hash:', newHash);
  
  // Verify new hash works
  const matchesNew = await bcrypt.compare(password, newHash);
  console.log('Password matches new hash:', matchesNew);
}

test();