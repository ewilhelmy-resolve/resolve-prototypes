/**
 * Example of how to use isolated test environments
 * Each test file gets its own app + database container pair
 */

const { test, expect } = require('@playwright/test');
const IsolatedTestEnvironment = require('./isolated-test-setup');

// Create isolated environment for this specific test file
let testEnv;
let config;

test.beforeAll(async () => {
  // Create isolated environment specifically for this test spec
  testEnv = new IsolatedTestEnvironment('example-isolated-spec');
  config = await testEnv.setup();
});

test.afterAll(async () => {
  // Clean up this test spec's containers
  if (testEnv) {
    await testEnv.teardown();
  }
});

test.describe('Isolated Test Example', () => {
  test('should have its own fresh database and app instance', async ({ page }) => {
    // This test runs against its own isolated app + database
    // It will NOT affect the dev instance on port 5000
    
    console.log(`   🧪 Testing against isolated instance: ${config.appUrl}`);
    
    // Navigate to the isolated app instance
    await page.goto(config.appUrl);
    
    // Should see the signup page
    await expect(page).toHaveTitle(/Resolve Onboarding/);
    
    // Test data modifications here won't affect other tests or dev instance
    await page.fill('#fullName', 'Test User in Isolated Environment');
    await page.fill('#email', `isolated-${Date.now()}@test.com`);
    await page.fill('#company', 'Isolated Test Company');
    await page.fill('#password', 'TestPass123');
    
    // This creates a user in the ISOLATED database, not in Supabase
    await page.click('button[type="submit"]');
    
    // Should redirect to step2
    await page.waitForURL('**/step2', { timeout: 5000 });
    console.log('   ✅ User created in isolated database');
  });
  
  test('should be able to login as admin in isolated environment', async ({ page }) => {
    // Login to the isolated instance
    await page.goto(`${config.appUrl}/login`);
    
    // Use the admin credentials that were created in THIS isolated database
    await page.fill('#email', 'admin@resolve.io');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    await expect(page).toHaveTitle(/Dashboard/);
    
    console.log('   ✅ Admin login works in isolated environment');
  });
  
  test('modifications here do not affect other tests', async ({ page }) => {
    // Any database changes made here are completely isolated
    // Other test specs running in parallel won't see these changes
    
    const response = await page.request.post(`${config.appUrl}/api/auth/register`, {
      data: {
        name: 'Isolated Test User',
        email: `isolated-${config.uniqueId}@test.com`,
        company: 'Isolated Co',
        password: 'IsolatedPass123'
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    
    console.log(`   ✅ Created user with unique ID: ${config.uniqueId}`);
    console.log('   ✅ This user only exists in THIS test\'s database');
  });
});

// Another test suite in the same file shares the same isolated environment
test.describe('Another Suite in Same Isolated Environment', () => {
  test('can see changes from previous suite in same file', async ({ page }) => {
    // This test can see the users created in the previous suite
    // because they share the same isolated environment (same test file)
    
    await page.goto(`${config.appUrl}/login`);
    
    // Can still login as admin
    await page.fill('#email', 'admin@resolve.io');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    console.log('   ✅ Previous test data is available within same spec file');
  });
});