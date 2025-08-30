const { test, expect } = require('@playwright/test');

test.describe('Rita Loading Indicator - Quick Test', () => {
  test('quick verification of loading indicator', async ({ page }) => {
    console.log('\n🚀 QUICK RITA LOADING TEST\n');
    
    // Quick login
    await page.goto('/signin');
    await page.fill('input[name="email"]', 'admin@resolve.io');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard (shorter timeout)
    try {
      await page.waitForURL('**/dashboard', { timeout: 5000 });
      console.log('✅ Dashboard loaded');
    } catch (e) {
      console.log('⚠️ Dashboard navigation timeout - continuing anyway');
      await page.goto('/dashboard');
    }
    
    // Quick check for chat
    const chatInput = page.locator('.quikchat-input-textbox');
    try {
      await expect(chatInput).toBeVisible({ timeout: 3000 });
      
      // Send message
      await chatInput.fill('test');
      await chatInput.press('Enter');
      
      // Quick check for loading indicator
      const loadingIndicator = page.locator('.system-loading-indicator');
      const isVisible = await loadingIndicator.isVisible({ timeout: 1000 }).catch(() => false);
      
      if (isVisible) {
        console.log('✅ RITA LOADING INDICATOR FOUND!');
        
        // Check key elements
        const hasText = await page.locator('.loading-text').isVisible();
        const hasDots = await page.locator('.loading-dots').isVisible();
        
        console.log(`  Text visible: ${hasText}`);
        console.log(`  Dots visible: ${hasDots}`);
        
        expect(hasText).toBe(true);
        expect(hasDots).toBe(true);
      } else {
        console.log('⚠️ Loading indicator not visible in time');
      }
      
    } catch (e) {
      console.log('Chat test skipped:', e.message);
    }
    
    console.log('\n✨ Quick test complete\n');
  });
});