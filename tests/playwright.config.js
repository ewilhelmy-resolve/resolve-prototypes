// Playwright config for ISOLATED test containers
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './specs',
  testMatch: '**/*.spec.js',
  timeout: 60000, // Increased timeout for container environment
  fullyParallel: false, // Each spec runs in its own container
  workers: 1, // One worker per container (isolation at container level)
  reporter: 'list',
  retries: 0,
  outputDir: process.env.PLAYWRIGHT_OUTPUT || '/tmp/test-results', // Use /tmp which is writable
  use: {
    baseURL: 'http://localhost:5000', // localhost inside TEST container, not host
    trace: 'off', // Disable traces to avoid permission issues
    screenshot: 'only-on-failure',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        browserName: 'chromium',
      },
    },
  ],
});