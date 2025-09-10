const { test, expect } = require('../fixtures/simple-base');

test.describe('Simple Admin Login Test', () => {
  test('can login as admin@resolve.io', async ({ page }) => {
    console.log('🔍 Testing admin login...');
    
    // Navigate to login page
    await page.goto('/signin');
    console.log('  ✓ Navigated to login page');
    
    // Fill credentials
    await page.fill('#email', 'admin@resolve.io');
    await page.fill('#password', 'admin123');
    console.log('  ✓ Filled credentials');
    
    // Click submit button
    await page.click('button[type="submit"]');
    console.log('  ✓ Clicked submit button');
    
    // Check for error modal first
    const errorModal = page.locator('.modal-overlay.show');
    const modalVisible = await errorModal.isVisible().catch(() => false);
    
    if (modalVisible) {
      const modalMessage = await page.locator('#modalMessage').textContent().catch(() => 'Unknown error');
      console.error('  ❌ Error modal shown:', modalMessage);
      
      // Take screenshot of error
      await page.screenshot({ path: '.playwright-mcp/signin-error.png' });
      
      // Get more details
      const modalTitle = await page.locator('.modal-header h3').textContent().catch(() => '');
      console.error('  Modal title:', modalTitle);
      
      throw new Error(`Login failed with error: ${modalMessage}`);
    }
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    console.log('  ✓ Successfully redirected to dashboard');
    
    // Verify we're on dashboard
    const url = page.url();
    expect(url).toContain('/dashboard');
    console.log('  ✓ URL confirmed:', url);
    
    // Check for Rita heading
    const ritaHeading = await page.locator('h1:has-text("Ask Rita")').isVisible();
    if (ritaHeading) {
      console.log('  ✓ Dashboard loaded - Rita heading visible');
    }
    
    console.log('\n✅ Admin login successful!');
    
    // Test session persistence
    console.log('\n🔍 Testing session persistence...');
    
    // Wait 3 seconds
    await page.waitForTimeout(3000);
    const stillOnDashboard = page.url().includes('/dashboard');
    
    if (stillOnDashboard) {
      console.log('  ✓ Session persisted after 3 seconds');
      console.log('\n✅ Session persistence verified!');
    } else {
      console.error('  ❌ Session lost after 3 seconds, redirected to:', page.url());
      throw new Error('Session lost after waiting');
    }
  });
});