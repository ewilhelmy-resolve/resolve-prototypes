/**
 * Base Test Fixture for Resolve Onboarding E2E Tests
 * 
 * This fixture provides common authentication and setup functionality
 * for all E2E tests to avoid duplication and ensure consistency.
 */

const { test: base, expect } = require('@playwright/test');

// Default test configuration
// Use dynamic URL from test containers global setup
const BASE_URL = process.env.TEST_BASE_URL || process.env.BASE_URL || 'http://localhost:5000';
const ADMIN_CREDENTIALS = {
  email: 'admin@resolve.io',
  password: 'admin123'  // Using original password for tests
};

/**
 * Extended test fixture with authentication helpers
 */
const test = base.extend({
  // Auto-authenticate for tests that need it
  authenticatedPage: async ({ page }, use) => {
    // Sign in as admin
    await signInAsAdmin(page);
    
    // Use the authenticated page in tests
    await use(page);
    
    // Cleanup if needed (logout is handled by browser context closure)
  },
  
  // Provide test user creation utilities
  testUser: async ({}, use) => {
    const timestamp = Date.now();
    const user = {
      name: `Test User ${timestamp}`,
      email: `user_${timestamp}@example.com`,
      company: `Test Company ${timestamp}`,
      password: 'TestPassword123!'
    };
    await use(user);
  }
});

/**
 * Sign in as admin user
 * @param {Page} page - Playwright page object
 */
async function signInAsAdmin(page) {
  // Fast login - no logging, no waiting
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('#email', ADMIN_CREDENTIALS.email);
  await page.fill('#password', ADMIN_CREDENTIALS.password);
  await page.click('button[type="submit"]');
  
  // Just wait for URL change
  try {
    await page.waitForURL('**/dashboard', { timeout: 2000 });
  } catch {
    // If not on dashboard, we're stuck - fail fast
    throw new Error('Login failed - not redirected to dashboard');
  }
  
  // Done - we're on dashboard
}

/**
 * Sign in with custom credentials
 * @param {Page} page - Playwright page object
 * @param {Object} credentials - { email, password }
 */
async function signIn(page, credentials) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('#email', credentials.email);
  await page.fill('#password', credentials.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 2000 });
}

/**
 * Create a new user account
 * @param {Page} page - Playwright page object
 * @param {Object} userData - User registration data
 * @returns {Object} User data with session info
 */
async function createUser(page, userData) {
  await page.goto(BASE_URL, { timeout: 10000 });
  await page.waitForSelector('input[name="fullName"]', { timeout: 5000 });
  
  // Fill signup form
  await page.fill('input[name="fullName"]', userData.name);
  await page.fill('input[name="email"]', userData.email);
  await page.fill('input[name="company"]', userData.company);
  await page.fill('input[name="password"]', userData.password);
  
  // Submit the form
  await page.click('button[type="submit"]');
  
  try {
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.waitForSelector('#welcomeUser, .welcome-user, h1', { timeout: 5000 });
  } catch (error) {
    console.error('Failed to navigate to dashboard after user creation:', error.message);
    throw error;
  }
  
  // Get session info
  const cookies = await page.context().cookies();
  const sessionToken = cookies.find(c => c.name === 'sessionToken')?.value;
  
  return {
    ...userData,
    sessionToken
  };
}

/**
 * Get the current user's tenant ID
 * @param {Page} page - Playwright page object
 * @returns {string} Tenant ID
 */
async function getTenantId(page) {
  // Try multiple methods to get tenant ID
  const tenantId = await page.evaluate(() => {
    return window.userTenantId || 
           localStorage.getItem('userTenantId') || 
           document.querySelector('[data-tenant-id]')?.dataset.tenantId ||
           'default-tenant';
  });
  return tenantId;
}

/**
 * Wait for element and return it
 * @param {Page} page - Playwright page object
 * @param {string} selector - Element selector
 * @param {Object} options - Wait options
 */
async function waitForElement(page, selector, options = {}) {
  const element = page.locator(selector).first();
  await element.waitFor({ state: 'visible', ...options });
  return element;
}

/**
 * Send a chat message
 * @param {Page} page - Playwright page object
 * @param {string} message - Message to send
 */
async function sendChatMessage(page, message) {
  // Try multiple possible chat input selectors
  const chatInput = await page.locator('textarea, input[type="text"]').last();
  await chatInput.fill(message);
  await chatInput.press('Enter');
  await page.waitForTimeout(2000); // Wait for message to be processed
}

/**
 * Upload a document
 * @param {Page} page - Playwright page object
 * @param {string} filePath - Path to file to upload
 */
async function uploadDocument(page, filePath) {
  const fileInput = await page.locator('input[type="file"]');
  await fileInput.setInputFiles(filePath);
  await page.waitForTimeout(2000); // Wait for upload to process
}

/**
 * Navigate to dashboard section
 * @param {Page} page - Playwright page object
 * @param {string} section - Section name (e.g., 'Knowledge Base', 'Chat History')
 */
async function navigateToDashboardSection(page, section) {
  const sectionElement = await page.locator(`text="${section}"`).first();
  await sectionElement.scrollIntoViewIfNeeded();
  await sectionElement.click();
  await page.waitForTimeout(1000);
}

// Export everything - both the extended test and the original for compatibility
module.exports = {
  test,
  expect,
  
  // Helper functions
  signInAsAdmin,
  signIn,
  createUser,
  getTenantId,
  waitForElement,
  sendChatMessage,
  uploadDocument,
  navigateToDashboardSection,
  
  // Constants
  BASE_URL,
  ADMIN_CREDENTIALS
};

// Also export as named exports for better compatibility
module.exports.default = test;