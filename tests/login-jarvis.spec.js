const { test, expect } = require('@playwright/test');

test.describe('Login to Jarvis Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main page
    await page.goto('http://localhost:8081');
  });

  test('should redirect to /jarvis.html after successful login', async ({ page }) => {
    // Click the login link
    await page.click('text=Log in here');
    
    // Wait for login form to appear
    await page.waitForSelector('#loginEmail');
    
    // Fill in credentials
    await page.fill('#loginEmail', 'john@resolve.io');
    await page.fill('#loginPassword', '!Password1');
    
    // Click login button
    await page.click('button:has-text("Log In")');
    
    // Wait for navigation to complete
    await page.waitForURL('**/jarvis.html', { timeout: 5000 });
    
    // Verify we're on the Jarvis page
    expect(page.url()).toContain('/jarvis.html');
    
    // Verify the page title
    await expect(page).toHaveTitle('Jarvis AI - Resolve');
    
    // Verify user email is displayed
    await expect(page.locator('#userName')).toContainText('john@resolve.io');
    
    // Verify Jarvis AI Assistant text is visible
    await expect(page.locator('text=Jarvis AI Assistant')).toBeVisible();
    
    // Verify logout button exists
    await expect(page.locator('button:has-text("Logout")')).toBeVisible();
  });

  test('should NOT redirect to /chatbot.html', async ({ page }) => {
    // Click the login link
    await page.click('text=Log in here');
    
    // Fill in credentials
    await page.fill('#loginEmail', 'john@resolve.io');
    await page.fill('#loginPassword', '!Password1');
    
    // Click login button
    await page.click('button:has-text("Log In")');
    
    // Wait for any navigation
    await page.waitForTimeout(2000);
    
    // Verify we're NOT on chatbot.html
    expect(page.url()).not.toContain('/chatbot.html');
    
    // Verify we ARE on jarvis.html
    expect(page.url()).toContain('/jarvis.html');
  });

  test('logout should redirect to main page', async ({ page }) => {
    // First login
    await page.click('text=Log in here');
    await page.fill('#loginEmail', 'john@resolve.io');
    await page.fill('#loginPassword', '!Password1');
    await page.click('button:has-text("Log In")');
    
    // Wait for Jarvis page
    await page.waitForURL('**/jarvis.html');
    
    // Click logout
    await page.click('button:has-text("Logout")');
    
    // Should redirect back to main page
    await page.waitForURL('http://localhost:8081/');
    
    // Verify we're back on the login page
    await expect(page.locator('text=Start Your Automation Journey')).toBeVisible();
  });
});

test.describe('Direct Access to Jarvis Page', () => {
  test('should redirect to login if not authenticated', async ({ page }) => {
    // Clear session storage to ensure not logged in
    await page.evaluateHandle(() => {
      sessionStorage.clear();
    });
    
    // Try to access Jarvis page directly
    await page.goto('http://localhost:8081/jarvis.html');
    
    // Should redirect to main page for login
    await page.waitForURL('http://localhost:8081/');
    
    // Verify login form is visible
    await expect(page.locator('text=Already have an account?')).toBeVisible();
  });

  test('should stay on Jarvis page if authenticated', async ({ page }) => {
    // First login to get session
    await page.goto('http://localhost:8081');
    await page.click('text=Log in here');
    await page.fill('#loginEmail', 'john@resolve.io');
    await page.fill('#loginPassword', '!Password1');
    await page.click('button:has-text("Log In")');
    
    // Wait for Jarvis page
    await page.waitForURL('**/jarvis.html');
    
    // Now navigate directly to Jarvis page
    await page.goto('http://localhost:8081/jarvis.html');
    
    // Should stay on Jarvis page
    expect(page.url()).toContain('/jarvis.html');
    await expect(page.locator('text=Jarvis AI Assistant')).toBeVisible();
  });
});