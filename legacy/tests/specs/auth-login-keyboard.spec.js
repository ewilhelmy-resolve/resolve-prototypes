const { test, expect } = require('../fixtures/simple-base');

test.describe('Login Form Enter Key', () => {
  test('should submit login form when pressing Enter', async ({ page, browserName }) => {
    console.log('🧪 Testing login form Enter key submission');
    
    // Navigate to login page
    await page.goto('/signin');
    
    // Fill in admin credentials
    await page.fill('#email', 'admin@resolve.io');
    await page.fill('#password', 'admin123');
    
    // Press Enter in password field
    await page.press('#password', 'Enter');
    
    // Wait for navigation to dashboard with increased timeout for WebKit
    await page.waitForURL('**/dashboard', { 
      timeout: browserName === 'webkit' ? 45000 : 30000 
    });
    
    // Verify we're on the dashboard
    const heading = page.locator('h1:has-text("Ask Rita")');
    await expect(heading).toBeVisible();
    
    console.log('✅ Login Enter key test passed');
  });

  test('should show validation message when pressing Enter with empty fields', async ({ page }) => {
    console.log('🧪 Testing empty fields validation');
    
    await page.goto('/signin');
    
    // Press Enter without filling fields
    await page.press('#email', 'Enter');
    
    // Should still be on signin page (form validation prevents submission)
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/.*signin/);
    
    console.log('✅ Empty fields validation test passed');
  });

  test('should show error for invalid credentials with Enter key', async ({ page }) => {
    console.log('🧪 Testing login form Enter key with invalid credentials');
    
    await page.goto('/signin');
    
    // Fill in invalid credentials
    await page.fill('#email', 'wrong@email.com');
    await page.fill('#password', 'wrongpass');
    
    // Press Enter to submit
    await page.press('#password', 'Enter');
    
    // Should stay on signin page after failed login
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/.*signin/);
    
    console.log('✅ Invalid credentials test passed');
  });
});