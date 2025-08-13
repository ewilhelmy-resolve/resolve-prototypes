const { test, expect } = require('@playwright/test');

test.describe('Admin Access from Jarvis Application', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set a longer timeout for this test as it involves multiple steps
    test.setTimeout(60000);
  });

  test('Admin user can see and access admin portal from Jarvis application', async ({ page }) => {
    // Navigate to the main application
    await page.goto('http://localhost:8082');
    
    // Click on login link first
    await page.click('button:has-text("Log in here")');
    
    // Login as admin user (john@resolve.io)
    await page.fill('input[type="email"]', 'john@resolve.io');
    await page.fill('input[type="password"]', '!Password1');
    await page.click('button:has-text("Log In")');
    
    // Wait for navigation to Jarvis page
    await page.waitForURL('**/jarvis.html', { timeout: 10000 });
    
    // Verify we're on the Jarvis page
    const pageTitle = await page.title();
    expect(pageTitle).toContain('Resolve');
    
    // Check that the admin portal link is visible for admin user
    const adminPortalLink = page.locator('#adminPortalLink');
    await expect(adminPortalLink).toBeVisible({ timeout: 10000 });
    
    // Verify the admin portal link has correct text
    await expect(adminPortalLink).toContainText('Admin Portal');
    
    // Verify the user role is displayed as Administrator
    const userRole = page.locator('.user-role');
    await expect(userRole).toHaveText('Administrator');
    
    // Verify the admin portal link has the correct href
    const href = await adminPortalLink.getAttribute('href');
    expect(href).toBe('/admin-dashboard.html');
    
    // Verify admin-specific styling on the link
    const linkText = await adminPortalLink.textContent();
    expect(linkText).toContain('🔐');
    expect(linkText).toContain('Admin Portal');
    
    console.log('✅ Admin can successfully access admin portal from Jarvis application');
  });

  test('Non-admin user cannot see admin portal link in Jarvis', async ({ page }) => {
    // First, create a non-admin user by signing up
    await page.goto('http://localhost:8082');
    
    // Fill out signup form with non-admin user (default form is signup)
    await page.fill('input[type="email"]', 'testuser@example.com');
    await page.fill('input[type="password"]', 'TestPass123!');
    await page.fill('input[placeholder*="company" i], input[placeholder*="Company" i]', 'Test Company');
    
    // Submit signup form
    await page.click('button:has-text("Continue")');
    
    // Wait for navigation to Jarvis or handle any intermediate steps
    await page.waitForTimeout(2000);
    
    // If redirected to login, login with the new user
    if (page.url().includes('login') || page.url().includes('index.html')) {
      await page.fill('input[type="email"]', 'testuser@example.com');
      await page.fill('input[type="password"]', 'testpass123');
      await page.click('button:has-text("Login")');
    }
    
    // Wait for Jarvis page to load
    await page.waitForURL('**/jarvis.html', { timeout: 10000 });
    
    // Verify the admin portal link is NOT visible for non-admin user
    const adminPortalLink = page.locator('#adminPortalLink');
    await expect(adminPortalLink).toBeHidden();
    
    // Verify the user role is NOT Administrator
    const userRole = page.locator('.user-role');
    const roleText = await userRole.textContent();
    expect(roleText).not.toBe('Administrator');
    
    console.log('✅ Non-admin user cannot see admin portal link in Jarvis');
  });

  test('Admin portal link styling and security verification', async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:8082');
    
    // Click on login link first
    await page.click('button:has-text("Log in here")');
    
    await page.fill('input[type="email"]', 'john@resolve.io');
    await page.fill('input[type="password"]', '!Password1');
    await page.click('button:has-text("Log In")');
    
    // Wait for Jarvis page
    await page.waitForURL('**/jarvis.html', { timeout: 10000 });
    
    // Verify admin portal link has correct styling
    const adminPortalLink = page.locator('#adminPortalLink');
    await expect(adminPortalLink).toBeVisible();
    
    // Check that it has the security/admin styling (red gradient background)
    const linkStyles = await adminPortalLink.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        background: styles.background,
        color: styles.color,
        display: styles.display
      };
    });
    
    // Verify it has admin-specific styling
    expect(linkStyles.display).not.toBe('none');
    expect(linkStyles.color).toContain('255'); // White color (rgb contains 255)
    
    // Verify the lock emoji is present
    const linkText = await adminPortalLink.textContent();
    expect(linkText).toContain('🔐');
    
    console.log('✅ Admin portal link has correct security styling and indicators');
  });
});