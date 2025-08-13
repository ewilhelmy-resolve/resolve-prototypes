const { test, expect } = require('@playwright/test');

test.describe('Admin Portal Link Visibility', () => {
  
  test('Admin user (john@resolve.io) can see admin portal link', async ({ page }) => {
    console.log('Testing admin portal link for admin user...');
    
    // Navigate to login page
    await page.goto('http://localhost:8082/');
    
    // Click login link
    await page.click('button:has-text("Log in here")');
    
    // Login as admin
    await page.fill('input[type="email"]', 'john@resolve.io');
    await page.fill('input[type="password"]', '!Password1');
    await page.click('button:has-text("Log In")');
    
    // Wait for navigation to jarvis page
    await page.waitForURL('**/jarvis.html', { timeout: 10000 });
    
    // Wait a bit for the checkAdminAccess function to run
    await page.waitForTimeout(3000);
    
    // Check if admin portal link exists and is visible
    const adminLink = page.locator('#adminPortalLink, a:has-text("Admin Portal")');
    
    // First check if it exists in the DOM
    const exists = await adminLink.count() > 0;
    console.log(`Admin link exists in DOM: ${exists}`);
    
    if (!exists) {
      // Try to find it another way
      const navLinks = await page.locator('.nav-links a').allTextContents();
      console.log('All nav links:', navLinks);
      
      // Check if admin portal link was added to HTML
      const htmlContent = await page.locator('.nav-links').innerHTML();
      console.log('Nav links HTML contains "adminPortalLink":', htmlContent.includes('adminPortalLink'));
      console.log('Nav links HTML contains "Admin Portal":', htmlContent.includes('Admin Portal'));
    }
    
    // Assert the link should be visible
    await expect(adminLink).toBeVisible({ timeout: 5000 });
    
    // Verify the link points to admin portal
    const href = await adminLink.getAttribute('href');
    expect(href).toBe('/admin-portal');
    
    console.log('✅ Admin can see admin portal link');
  });

  test('Regular user (alice@company1.com) cannot see admin portal link', async ({ page }) => {
    console.log('Testing admin portal link for regular user...');
    
    // Navigate to login page
    await page.goto('http://localhost:8082/');
    
    // Click login link
    await page.click('button:has-text("Log in here")');
    
    // Login as regular user
    await page.fill('input[type="email"]', 'alice@company1.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Log In")');
    
    // Wait for navigation to jarvis page
    await page.waitForURL('**/jarvis.html', { timeout: 10000 });
    
    // Wait a bit for any admin check to run
    await page.waitForTimeout(3000);
    
    // Check that admin portal link does not exist or is hidden
    const adminLink = page.locator('#adminPortalLink, a:has-text("Admin Portal")');
    
    // Check if it exists in DOM
    const exists = await adminLink.count() > 0;
    console.log(`Admin link exists in DOM for regular user: ${exists}`);
    
    if (exists) {
      // If it exists, it should be hidden
      await expect(adminLink).toBeHidden();
      console.log('✅ Admin link is hidden for regular user');
    } else {
      // If it doesn't exist at all, that's also correct
      console.log('✅ Admin link does not exist in DOM for regular user');
    }
    
    // Verify the nav only has standard links
    const navLinks = await page.locator('.nav-links a').allTextContents();
    console.log('Regular user nav links:', navLinks);
    expect(navLinks).not.toContain('Admin Portal');
  });

  test('Admin portal link navigates to correct page', async ({ page }) => {
    console.log('Testing admin portal link navigation...');
    
    // Navigate to login page
    await page.goto('http://localhost:8082/');
    
    // Click login link
    await page.click('button:has-text("Log in here")');
    
    // Login as admin
    await page.fill('input[type="email"]', 'john@resolve.io');
    await page.fill('input[type="password"]', '!Password1');
    await page.click('button:has-text("Log In")');
    
    // Wait for navigation to jarvis page
    await page.waitForURL('**/jarvis.html', { timeout: 10000 });
    
    // Wait for admin link to appear
    await page.waitForTimeout(3000);
    
    // Find and click the admin portal link
    const adminLink = page.locator('#adminPortalLink, a:has-text("Admin Portal")');
    
    // Check if link exists
    const exists = await adminLink.count() > 0;
    
    if (!exists) {
      console.log('Admin link not found, checking HTML...');
      const htmlContent = await page.locator('.nav-links').innerHTML();
      console.log('Navigation HTML:', htmlContent);
      throw new Error('Admin portal link not found in navigation');
    }
    
    // Click the admin portal link
    await adminLink.click();
    
    // Should navigate to admin portal
    await page.waitForURL('**/admin-portal', { timeout: 10000 });
    
    // Verify we're on the admin login page
    await expect(page.locator('h1:has-text("Admin Login")')).toBeVisible();
    
    console.log('✅ Admin portal link navigates correctly');
  });
});