// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Isolated Test Configuration
 * Each test spec gets its own app + database container pair
 * Dev instance on port 5000 remains completely untouched
 */
module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  
  // Timeout configuration
  timeout: 30 * 1000, // 30 seconds per test
  globalTimeout: 10 * 60 * 1000, // 10 minutes total
  
  // Parallel execution settings
  fullyParallel: true, // Each spec can run in parallel with its own containers
  workers: process.env.CI ? 2 : 4, // Adjust based on system resources
  
  // No global setup - each test file handles its own setup
  // This ensures complete isolation between test specs
  
  // Reporting
  reporter: [
    ['line'], // Simple line reporter for console
    ['html', { outputFolder: 'tests/isolated-report', open: 'never' }]
  ],
  outputDir: 'tests/isolated-results',
  
  // Default test settings
  use: {
    // No base URL since each test gets its own URL
    // Tests will use config.appUrl from their isolated environment
    
    // Capture traces on failure for debugging
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Timeouts
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  
  // Projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    }
  ],
});