const { test, expect } = require('@playwright/test');

test.describe('Resolve Onboarding Flow', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('http://localhost:8082/');
    
    // Check if the page loads successfully
    await expect(page).toHaveTitle(/Resolve/i);
    
    // Take a screenshot for visual verification
    await page.screenshot({ path: 'tests/screenshots/homepage.png' });
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto('http://localhost:8082/');
    
    // Check for main container elements
    const container = page.locator('.onboarding-container');
    await expect(container).toBeVisible();
    
    // Check that progress bar container exists (even if empty)
    const progressBar = page.locator('#progressBarContainer');
    await expect(progressBar).toBeAttached();
    
    // Take a screenshot of the navigation
    await page.screenshot({ path: 'tests/screenshots/navigation.png' });
  });
});
