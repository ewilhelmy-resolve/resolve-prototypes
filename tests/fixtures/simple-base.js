/**
 * Simple base test fixture
 * Tests run in ISOLATED containers with fresh database
 */

const { test: base, expect } = require('@playwright/test');

// Base URL - localhost inside the test container
const BASE_URL = 'http://localhost:5000';

// Test admin credentials (created fresh for each test run)
const ADMIN_CREDENTIALS = {
  email: 'admin@test.com',  // Test admin, not production admin
  password: 'admin123'       // Known test password
};

// Custom test that handles relative URLs
const test = base.extend({
  // Override page to fix relative URLs
  page: async ({ page }, use) => {
    // Store original goto
    const originalGoto = page.goto.bind(page);
    
    // Override goto to handle relative URLs
    page.goto = async (url, options) => {
      // Convert relative URLs to absolute
      if (url && url.startsWith('/')) {
        url = BASE_URL + url;
      }
      return originalGoto(url, options);
    };
    
    await use(page);
  },
});

// Helper to sign in as admin
async function signInAsAdmin(page) {
  await page.goto('/signin');
  await page.fill('input[name="email"]', ADMIN_CREDENTIALS.email);
  await page.fill('input[name="password"]', ADMIN_CREDENTIALS.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

// Helper to wait for element
async function waitForElement(page, selector, options = {}) {
  const timeout = options.timeout || 30000;
  const state = options.state || 'visible';
  
  try {
    await page.waitForSelector(selector, { state, timeout });
    return true;
  } catch (error) {
    console.log(`Element ${selector} not found within ${timeout}ms`);
    return false;
  }
}

// Export everything tests need
module.exports = { 
  test,
  expect,
  BASE_URL,
  ADMIN_CREDENTIALS,
  signInAsAdmin,
  waitForElement
};