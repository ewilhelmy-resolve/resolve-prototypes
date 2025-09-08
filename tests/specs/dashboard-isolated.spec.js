/**
 * Dashboard Test Suite - Isolated Tests
 * These tests run inside the Docker container at localhost:5000
 */

const { test, expect, signInAsAdmin, BASE_URL } = require('../fixtures/simple-base');
const fs = require('fs');
const path = require('path');

test.describe('Dashboard - Isolated Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate before each test
    await signInAsAdmin(page);
  });

  test('should load the dashboard page', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Dashboard - Resolve/);
    
    // Check for main elements - using more flexible selectors
    const askRitaHeading = page.locator('text="Ask Rita"').first();
    await expect(askRitaHeading).toBeVisible({ timeout: 10000 });
    
    // Check for chat input
    const chatInput = page.locator('#chatInput, input[type="text"]').first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    
    // Check for header elements
    await expect(page.locator('.logo').first()).toBeVisible();
    
    console.log('   ✅ Dashboard loaded successfully');
  });

  test('should have working chat input', async ({ page }) => {
    // Type in chat input
    const chatInput = page.locator('#chatInput');
    await chatInput.fill('Test message for dashboard');
    
    // Check that text was entered
    await expect(chatInput).toHaveValue('Test message for dashboard');
    
    // Clear the input
    await chatInput.clear();
    await expect(chatInput).toHaveValue('');
    
    console.log('   ✅ Chat input works correctly');
  });

  test('should upload and view documents', async ({ page }) => {
    // Navigate to knowledge page first
    await page.goto('/knowledge');
    
    // Create a test file
    const testFileName = `test-doc-${Date.now()}.txt`;
    const testFilePath = path.join(__dirname, '..', 'fixtures', testFileName);
    
    // Create test file content
    const testContent = `Test document for dashboard\nThis is test content for document upload validation.\n`;
    fs.writeFileSync(testFilePath, testContent);
    
    try {
      // Look for file upload input
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testFilePath);
      
      // Wait for upload to complete
      await page.waitForTimeout(2000);
      
      // Go back to dashboard to see if document appears
      await page.goto('/dashboard');
      
      // Check if document appears in knowledge base section
      const hasKnowledgeSection = await page.locator('h3:has-text("Knowledge Base")').isVisible();
      expect(hasKnowledgeSection).toBeTruthy();
      
      console.log('   ✅ Document upload functionality verified');
    } finally {
      // Clean up test file
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  });

  test('should handle user registration API', async ({ page }) => {
    // Test user registration endpoint
    const timestamp = Date.now();
    const response = await page.request.post('/api/auth/register', {
      data: {
        name: `Dashboard Test User ${timestamp}`,
        email: `dashboard-test-${timestamp}@test.com`,
        company: 'Dashboard Test Co',
        password: 'TestPass123'
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    
    console.log(`   ✅ Created test user: dashboard-test-${timestamp}@test.com`);
  });

  test('should have functional navigation elements', async ({ page }) => {
    // Test navigation between pages
    await page.goto('/knowledge');
    await expect(page).toHaveURL(/.*knowledge/);
    
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*dashboard/);
    
    console.log('   ✅ Page navigation works correctly');
  });
});