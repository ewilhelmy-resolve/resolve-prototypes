const { test, expect } = require('../fixtures/base-test');

test.describe('Base Test Validation', () => {
  test('should authenticate as admin', async ({ authenticatedPage: page }) => {
    console.log('🧪 Testing base authentication fixture');
    
    // Check we're on dashboard
    const url = page.url();
    expect(url).toContain('/dashboard');
    console.log('✅ Successfully authenticated and on dashboard');
    
    // Check for dashboard elements
    const dashboardElement = page.locator('text="Dashboard"').first();
    await expect(dashboardElement).toBeVisible({ timeout: 5000 });
    console.log('✅ Dashboard elements visible');
  });
  
  test('should create test user', async ({ page, testUser }) => {
    console.log('🧪 Testing test user fixture');
    
    // testUser fixture provides user data
    expect(testUser.email).toContain('@example.com');
    expect(testUser.password).toBe('TestPassword123!');
    console.log(`✅ Test user data generated: ${testUser.email}`);
  });
});