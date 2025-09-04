// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Test configuration with dynamic test containers
 * Each test run gets fresh, isolated containers
 */
module.exports = defineConfig({
  testDir: './tests/specs',
  testMatch: '**/*.spec.js',
  /* Maximum time one test can run for */
  timeout: 20 * 1000, // 20 seconds per test
  /* Maximum time for the entire test run */
  globalTimeout: 5 * 60 * 1000, // 5 minutes total - HARD LIMIT
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: 0, // No retries to save time
  /* Limit parallel workers for stability */
  workers: 2, // Max 2 workers
  /* Reporter to use */
  reporter: [['html', { outputFolder: 'tests/playwright-report' }]],
  outputDir: 'tests/test-results',
  
  /* Global setup and teardown */
  globalSetup: require.resolve('./tests/global-setup.js'),
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL will be set dynamically by global setup */
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:5000',
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    /* Action timeouts to prevent hanging */
    actionTimeout: 10000, // 10 seconds for any action
    navigationTimeout: 10000, // 10 seconds for navigation
  },

  /* Configure projects for major browsers */
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
    },
  ],

  /* Test containers are managed by global setup */
});