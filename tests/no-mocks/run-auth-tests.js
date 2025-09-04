#!/usr/bin/env node

/**
 * Auth Test Runner - Zero Mocks
 * 
 * This script runs the authentication test suite with proper container management
 * and environment setup.
 * 
 * Usage:
 *   node tests/no-mocks/run-auth-tests.js
 *   npm run test:auth
 */

const { spawn } = require('child_process');
const path = require('path');

async function runAuthTests() {
  console.log('🚀 Starting Authentication Test Suite (Zero Mocks)');
  console.log('📋 Test Coverage:');
  console.log('   - User Registration (all tiers)');
  console.log('   - Password Security & Hashing');
  console.log('   - Session Management (Redis)');
  console.log('   - Login/Logout Flow');
  console.log('   - Password Reset');
  console.log('   - Rate Limiting');
  console.log('   - Security Validations');
  console.log('   - Database Integration');
  console.log('');

  return new Promise((resolve, reject) => {
    const jestPath = path.join(__dirname, '../../node_modules/.bin/jest');
    const configPath = path.join(__dirname, '../../jest.config.js');
    const testPath = path.join(__dirname, 'auth.test.js');

    const args = [
      testPath,
      '--config', configPath,
      '--verbose',
      '--forceExit',
      '--detectOpenHandles',
      '--maxWorkers=1'
    ];

    console.log(`Running: jest ${args.join(' ')}`);
    console.log('');

    const jest = spawn('jest', args, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '../..'),
      env: {
        ...process.env,
        NODE_ENV: 'test',
        JEST_WORKER_ID: '1'
      }
    });

    jest.on('close', (code) => {
      if (code === 0) {
        console.log('');
        console.log('✅ Authentication tests completed successfully!');
        resolve();
      } else {
        console.log('');
        console.log('❌ Authentication tests failed with code:', code);
        reject(new Error(`Tests failed with exit code ${code}`));
      }
    });

    jest.on('error', (error) => {
      console.error('❌ Failed to start test runner:', error);
      reject(error);
    });
  });
}

// Run if called directly
if (require.main === module) {
  runAuthTests()
    .then(() => {
      console.log('🎉 Test run completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test run failed:', error.message);
      process.exit(1);
    });
}

module.exports = { runAuthTests };