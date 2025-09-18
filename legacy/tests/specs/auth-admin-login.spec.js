const { test, expect } = require('../fixtures/simple-base');

test.describe('Admin Login and Session Persistence', () => {
  test('admin@resolve.io can login and session persists', async ({ page }) => {
    // 1. Navigate to login page (use /signin like other tests)
    await test.step('Navigate to login page', async () => {
      await page.goto('/signin');
      await expect(page).toHaveURL(/.*signin/);
      await page.screenshot({ path: '.playwright-mcp/1-login-page.png' });
    });

    // 2. Fill in admin credentials - use ID selectors like other tests
    await test.step('Enter admin credentials', async () => {
      await page.fill('#email', 'admin@resolve.io');
      await page.fill('#password', 'admin123');
      await page.screenshot({ path: '.playwright-mcp/2-credentials-filled.png' });
    });

    // 3. Submit login form
    await test.step('Submit login form', async () => {
      await page.click('button[type="submit"]');
      
      // Wait for navigation to dashboard
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      await expect(page).toHaveURL(/.*dashboard/);
      await page.screenshot({ path: '.playwright-mcp/3-dashboard-initial.png' });
    });

    // 4. Verify dashboard elements are visible
    await test.step('Verify dashboard elements', async () => {
      // Check for Rita heading
      const ritaHeading = page.locator('h1:has-text("Ask Rita")');
      await expect(ritaHeading).toBeVisible({ timeout: 5000 });
      
      // Check for chat container
      const chatContainer = page.locator('#quikchat-container');
      await expect(chatContainer).toBeVisible();
      
      // Check for Knowledge Base section
      const knowledgeSection = page.locator('text=Knowledge Base').first();
      await expect(knowledgeSection).toBeVisible();
    });

    // 5. Test session persistence - wait and check if still logged in
    await test.step('Verify session persists after waiting', async () => {
      // Wait 5 seconds to see if we get logged out
      await page.waitForTimeout(5000);
      
      // Should still be on dashboard
      await expect(page).toHaveURL(/.*dashboard/);
      await page.screenshot({ path: '.playwright-mcp/4-still-on-dashboard.png' });
    });

    // 6. Test page refresh - session should persist
    await test.step('Verify session persists after page refresh', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should still be on dashboard after refresh
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Verify dashboard elements still visible
      const ritaHeading = page.locator('h1:has-text("Ask Rita")');
      await expect(ritaHeading).toBeVisible({ timeout: 5000 });
      
      await page.screenshot({ path: '.playwright-mcp/5-after-refresh.png' });
    });

    // 7. Navigate to another page and back
    await test.step('Verify session persists during navigation', async () => {
      // Navigate to knowledge page
      await page.goto('/knowledge');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/.*knowledge/);
      await page.screenshot({ path: '.playwright-mcp/6-knowledge-page.png' });
      
      // Navigate back to dashboard
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Verify still logged in
      const ritaHeading = page.locator('h1:has-text("Ask Rita")');
      await expect(ritaHeading).toBeVisible({ timeout: 5000 });
      
      await page.screenshot({ path: '.playwright-mcp/7-back-to-dashboard.png' });
    });

    // 8. Final verification - check session is still active
    await test.step('Final session verification', async () => {
      // Wait another 3 seconds
      await page.waitForTimeout(3000);
      
      // Should still be on dashboard
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Make sure we haven't been redirected to login
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/signin');
      expect(currentUrl).not.toContain('/signin');
      
      await page.screenshot({ path: '.playwright-mcp/8-final-verification.png' });
    });
  });
});