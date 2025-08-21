const { execSync } = require('child_process');

module.exports = async () => {
  console.log('Tearing down test containers...');
  
  try {
    // Stop test containers
    execSync('docker-compose -f docker-compose.test.yml down', { stdio: 'inherit' });
    console.log('Test containers stopped');
  } catch (error) {
    console.error('Error during teardown:', error);
  }
};