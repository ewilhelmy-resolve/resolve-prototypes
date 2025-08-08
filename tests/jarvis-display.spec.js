const { test, expect } = require('@playwright/test');

test.describe('Jarvis AI Display Test', () => {
  test('should display Jarvis AI chat in the success page', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:8082/');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Navigate directly to success step
    await page.evaluate(() => {
      if (window.app) {
        window.app.currentStep = 7;
        window.app.showStep(7);
      }
    });
    
    // Wait for step to be visible
    await page.waitForSelector('#step7.active', { state: 'visible' });
    
    // Step 7 now directly shows the iframe, no button needed
    // Wait for iframe to be present
    await page.waitForSelector('#baristaChat', { state: 'attached', timeout: 5000 });
    
    // Check if iframe exists
    const iframeExists = await page.locator('#baristaChat').count() > 0;
    console.log('✅ Iframe exists:', iframeExists);
    
    // Check if container exists
    const containerExists = await page.locator('#baristaChatContainer').count() > 0;
    console.log('✅ Container exists:', containerExists);
    
    // Get iframe src
    const iframeSrc = await page.evaluate(() => {
      const iframe = document.getElementById('baristaChat');
      return iframe ? iframe.src : null;
    });
    console.log('✅ Iframe src:', iframeSrc);
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/jarvis-after-launch.png', fullPage: true });
    
    // Simple assertions
    expect(iframeExists).toBe(true);
    expect(containerExists).toBe(true);
    expect(iframeSrc).toBeTruthy();
    expect(iframeSrc).toContain('resolvejarvisdev.espressive.com');
  });
});