const { test, expect } = require('@playwright/test');

test.describe('Jarvis AI Display Test', () => {
  test('should display Jarvis AI chat in the success page', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:8081/');
    
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
    
    // Take screenshot before clicking button
    await page.screenshot({ path: 'tests/screenshots/jarvis-before-launch.png' });
    
    // Click Launch Jarvis AI button
    await page.click('button:has-text("Launch Jarvis AI")');
    
    // Wait a bit for iframe to load
    await page.waitForTimeout(3000);
    
    // Check if iframe is visible
    const iframeVisible = await page.locator('#jarvisChat').isVisible();
    console.log('Iframe visible:', iframeVisible);
    
    // Check iframe src
    const iframeSrc = await page.evaluate(() => {
      const iframe = document.getElementById('jarvisChat');
      return iframe ? iframe.src : null;
    });
    console.log('Iframe src:', iframeSrc);
    
    // Check if container is visible
    const containerVisible = await page.locator('#jarvisChatContainer').isVisible();
    console.log('Container visible:', containerVisible);
    
    // Take screenshot after clicking button
    await page.screenshot({ path: 'tests/screenshots/jarvis-after-launch.png', fullPage: true });
    
    // Try to interact with iframe content (if allowed)
    try {
      const frame = page.frameLocator('#jarvisChat');
      await frame.locator('body').waitFor({ timeout: 5000 });
      console.log('✅ Iframe content loaded successfully');
    } catch (e) {
      console.log('⚠️  Could not access iframe content (expected due to cross-origin restrictions)');
    }
    
    // Check computed styles
    const containerStyles = await page.evaluate(() => {
      const container = document.getElementById('jarvisChatContainer');
      if (container) {
        const styles = window.getComputedStyle(container);
        return {
          display: styles.display,
          visibility: styles.visibility,
          height: styles.height,
          width: styles.width
        };
      }
      return null;
    });
    console.log('Container styles:', containerStyles);
    
    // Check if preview is hidden
    const previewHidden = await page.locator('#chatPreview').isHidden();
    console.log('Preview hidden:', previewHidden);
    
    expect(iframeVisible).toBe(true);
    expect(containerVisible).toBe(true);
    expect(previewHidden).toBe(true);
  });
});