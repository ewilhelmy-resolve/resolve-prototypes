const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('Starting test container setup...');
  
  const testPort = process.env.TEST_PORT || 10000;
  console.log(`Using test port: ${testPort}`);
  
  try {
    // Stop any existing test containers
    try {
      execSync('docker-compose -f docker-compose.test.yml down', { stdio: 'inherit' });
    } catch (e) {
      // Ignore errors if container doesn't exist
    }
    
    // Create test database if it doesn't exist
    const testDbPath = path.join(process.cwd(), 'test-database.db');
    if (!fs.existsSync(testDbPath)) {
      fs.writeFileSync(testDbPath, '');
      console.log('Created test database file');
    }
    
    // Start the test container
    console.log('Starting test container...');
    execSync(`TEST_PORT=${testPort} docker-compose -f docker-compose.test.yml up -d --build`, { 
      stdio: 'inherit',
      env: { ...process.env, TEST_PORT: testPort }
    });
    
    // Wait for container to be healthy
    console.log('Waiting for container to be healthy...');
    let retries = 30;
    while (retries > 0) {
      try {
        execSync(`curl -f http://localhost:${testPort}/health`, { stdio: 'ignore' });
        console.log('Test container is healthy!');
        break;
      } catch (e) {
        retries--;
        if (retries === 0) {
          throw new Error('Container failed to become healthy');
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Store the port for tests to use
    process.env.TEST_PORT = testPort;
    
  } catch (error) {
    console.error('Failed to setup test container:', error);
    throw error;
  }
};