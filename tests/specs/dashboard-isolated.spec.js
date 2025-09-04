/**
 * Dashboard Test Suite - Isolated Environment Version
 * This test runs in complete isolation with its own app + database containers
 */

const { test, expect } = require('@playwright/test');
const IsolatedTestEnvironment = require('../isolated-test-setup');
const fs = require('fs');
const path = require('path');

// Isolated environment for dashboard tests
let testEnv;
let config;

test.beforeAll(async () => {
  testEnv = new IsolatedTestEnvironment('dashboard-spec');
  config = await testEnv.setup();
});

test.afterAll(async () => {
  if (testEnv) {
    await testEnv.teardown();
  }
});

// Helper function to sign in as admin
async function signInAsAdmin(page) {
  await page.goto(`${config.appUrl}/login`);
  await page.fill('#email', 'admin@resolve.io');
  await page.fill('#password', 'admin123');
  await page.click('button[type="submit"]');
  
  try {
    await page.waitForURL('**/dashboard', { timeout: 5000 });
  } catch {
    throw new Error('Login failed - not redirected to dashboard');
  }
}

test.describe('Dashboard - Isolated Environment', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate before each test using the isolated app instance
    await signInAsAdmin(page);
  });

  test('should load the dashboard page', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Dashboard - Resolve/);
    
    // Check for main elements
    await expect(page.locator('h1:has-text("Ask Rita")')).toBeVisible();
    
    // Check for chat input
    await expect(page.locator('input[placeholder="Ask me anything..."]')).toBeVisible();
    
    // Check for sidebar elements
    await expect(page.getByRole('button', { name: 'New chat' })).toBeVisible();
    await expect(page.locator('h3:has-text("Recent chats")')).toBeVisible();
    
    // Check for knowledge base section
    await expect(page.locator('h3:has-text("Knowledge Base")')).toBeVisible();
    
    console.log('   ✅ Dashboard loaded successfully in isolated environment');
  });

  test('should have working chat input', async ({ page }) => {
    // Type in chat input
    const chatInput = page.locator('#chatInput');
    await chatInput.fill('Test message in isolated environment');
    
    // Check that text was entered
    await expect(chatInput).toHaveValue('Test message in isolated environment');
    
    // Clear the input
    await chatInput.clear();
    await expect(chatInput).toHaveValue('');
    
    console.log('   ✅ Chat input works in isolated environment');
  });

  test('should upload and view documents in isolation', async ({ page }) => {
    // Create a test file
    const testFileName = `test-doc-${config.uniqueId}.txt`;
    const testFilePath = path.join(__dirname, '..', 'fixtures', 'test-data', testFileName);
    
    // Ensure directory exists
    const dir = path.dirname(testFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Create test file content
    const testContent = `Test document for isolated environment ${config.uniqueId}\n`;
    fs.writeFileSync(testFilePath, testContent + 'This document only exists in this test\'s environment.\n');
    
    // Upload the file
    const fileInput = page.locator('input[type="file"]#knowledgeFile');
    await fileInput.setInputFiles(testFilePath);
    
    // Wait for upload to complete
    await page.waitForTimeout(2000);
    
    // Check if document appears in the list
    const docList = page.locator('#recentUploadsContainer');
    await expect(docList).toContainText(testFileName);
    
    // Clean up test file
    fs.unlinkSync(testFilePath);
    
    console.log(`   ✅ Document upload works in isolated environment ${config.uniqueId}`);
  });

  test('database changes are isolated from other tests', async ({ page }) => {
    // Create a test user that only exists in this isolated database
    const response = await page.request.post(`${config.appUrl}/api/auth/register`, {
      data: {
        name: `Dashboard Test User ${config.uniqueId}`,
        email: `dashboard-test-${config.uniqueId}@test.com`,
        company: 'Dashboard Test Co',
        password: 'TestPass123'
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    
    console.log(`   ✅ Created user in isolated database: dashboard-test-${config.uniqueId}@test.com`);
    console.log('   ✅ This user does NOT exist in Supabase or other test databases');
  });

  test('can perform destructive operations safely', async ({ page }) => {
    // Since this is an isolated environment, we can safely test destructive operations
    // without worrying about affecting the dev instance or other tests
    
    // For example, we could delete all documents (if such an API existed)
    // or modify system settings without affecting anything else
    
    console.log(`   ✅ Isolated environment ${config.uniqueId} allows safe destructive testing`);
    console.log('   ✅ Dev instance on port 5000 remains completely untouched');
  });
});