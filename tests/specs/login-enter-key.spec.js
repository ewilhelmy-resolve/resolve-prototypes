const { test, expect } = require('../fixtures/base-test');

test.describe('Login Form Enter Key', () => {
  test('should submit login form when pressing Enter', async ({ page, browserName }) => {
    console.log('🧪 Testing login form Enter key submission');
    
    // Navigate to login page
    await page.goto('http://localhost:5000/login');
    
    // Fill in admin credentials
    await page.fill('#email', 'admin@resolve.io');
    await page.fill('#password', 'admin123');
    
    // Press Enter in password field
    await page.press('#password', 'Enter');
    
    // Wait for navigation to dashboard with increased timeout for WebKit
    await page.waitForURL('http://localhost:5000/dashboard', { 
      timeout: browserName === 'webkit' ? 45000 : 30000 
    });
    
    // Verify we're on the dashboard
    const heading = page.locator('h1:has-text("Ask Rita")');
    await expect(heading).toBeVisible();
    
    console.log('✅ Login Enter key test passed');
  });

  test('should show validation message when pressing Enter with empty fields', async ({ page }) => {
    console.log('🧪 Testing login form Enter key validation');
    
    await page.goto('http://localhost:5000/login');
    
    // Press Enter without filling fields
    await page.press('#email', 'Enter');
    
    // Check for validation message
    const modalMessage = page.locator('#modalMessage');
    await expect(modalMessage).toBeVisible();
    await expect(modalMessage).toHaveText('Please enter both email and password to sign in.');
    
    console.log('✅ Validation message test passed');
  });

  test('should show error for invalid credentials with Enter key', async ({ page }) => {
    console.log('🧪 Testing login form Enter key with invalid credentials');
    
    await page.goto('http://localhost:5000/login');
    
    // Fill in invalid credentials
    await page.fill('#email', 'wrong@email.com');
    await page.fill('#password', 'wrongpass');
    
    // Press Enter to submit
    await page.press('#password', 'Enter');
    
    // Check for error message
    const modalMessage = page.locator('#modalMessage');
    await expect(modalMessage).toBeVisible();
    await expect(modalMessage).toHaveText('Invalid email or password');
    
    console.log('✅ Invalid credentials test passed');
  });
});