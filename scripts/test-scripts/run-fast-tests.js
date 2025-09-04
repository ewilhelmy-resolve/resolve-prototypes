#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('Running tests with 5 second timeout per test...\n');

// Kill any hanging processes first
try {
  execSync('pkill -f playwright || true', { stdio: 'ignore' });
} catch {}

// Run tests with aggressive timeout
const cmd = `npx playwright test --config=playwright.config.js --project=chromium --reporter=json --timeout=5000`;

try {
  const output = execSync(cmd, { 
    encoding: 'utf8',
    timeout: 120000 // 2 minute total timeout
  });
  
  const results = JSON.parse(output);
  
  console.log('========================================');
  console.log('TEST RESULTS');
  console.log('========================================');
  console.log(`Total: ${results.stats.total || 0}`);
  console.log(`Passed: ${results.stats.expected || 0}`);
  console.log(`Failed: ${results.stats.unexpected || 0}`);
  console.log(`Skipped: ${results.stats.skipped || 0}`);
  console.log('========================================');
  
  if (results.stats.expected === results.stats.total) {
    console.log('✅ ALL TESTS PASSED!');
  } else {
    console.log('❌ Some tests failed or were skipped');
  }
  
} catch (error) {
  console.error('Tests failed or timed out');
  
  // Try to get partial results
  try {
    const partialResults = execSync('ls tests/test-results -1 | wc -l', { encoding: 'utf8' });
    console.log(`Partial results: ${partialResults.trim()} test runs recorded`);
  } catch {}
}