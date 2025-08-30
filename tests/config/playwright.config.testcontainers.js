// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const { execSync } = require('child_process');

// Function to get a random port to avoid conflicts
function getRandomPort() {
  return Math.floor(Math.random() * 10000) + 10000;
}

const TEST_PORT = process.env.TEST_PORT || getRandomPort();

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: false, // Set to false for container management
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: 1, // Single worker for container tests
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: `http://localhost:${TEST_PORT}`,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: `TEST_PORT=${TEST_PORT} docker-compose -f docker-compose.test.yml up --build`,
    port: parseInt(TEST_PORT),
    timeout: 180 * 1000, // 3 minutes for container startup
    reuseExistingServer: true,
  },
});