/**
 * Re-export of @playwright/test with custom fixtures
 * This ensures Playwright can discover tests properly
 */

// Re-export everything from @playwright/test first
module.exports = require('@playwright/test');

// Then override with our extended test
const baseTest = require('./base-test');
module.exports.test = baseTest.test;

// Export helper functions
module.exports.helpers = {
  signInAsAdmin: baseTest.signInAsAdmin,
  signIn: baseTest.signIn,
  createUser: baseTest.createUser,
  getTenantId: baseTest.getTenantId,
  waitForElement: baseTest.waitForElement,
  sendChatMessage: baseTest.sendChatMessage,
  uploadDocument: baseTest.uploadDocument,
  navigateToDashboardSection: baseTest.navigateToDashboardSection,
  BASE_URL: baseTest.BASE_URL,
  ADMIN_CREDENTIALS: baseTest.ADMIN_CREDENTIALS
};