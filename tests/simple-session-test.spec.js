const { test, expect } = require('@playwright/test');

test.describe('Admin Session Persistence', () => {
  test('admin user can login and stay logged in', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:5000/signin');
    
    // Fill in credentials using data-testid
    await page.fill('[data-testid="email-input"]', 'admin@resolve.io');
    await page.fill('[data-testid="password-input"]', 'admin123');
    
    // Click sign in button
    await page.click('[data-testid="signin-button"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Verify we're on the dashboard
    expect(page.url()).toContain('/dashboard');
    
    // Wait a moment to ensure SSE connections are established
    await page.waitForTimeout(2000);
    
    // Reload the page to test session persistence
    await page.reload();
    
    // Should still be on dashboard (not redirected to signin)
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/dashboard');
    expect(page.url()).not.toContain('/signin');
    
    // Test RAG API access
    const response = await page.request.get('http://localhost:5000/api/rag/tenant/84fa1dd3-bdb4-44a1-ac76-2c7453ebc1db/vectors/stats');
    expect(response.ok()).toBeTruthy();
    
    console.log('✅ Admin can login and stays logged in successfully!');
  });
});