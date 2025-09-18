const { test, expect, signInAsAdmin, waitForElement } = require('../fixtures/simple-base');

test.describe('Rita Loading Indicator', () => {
  
  test('displays "Rita is thinking" indicator when sending a message', async ({ page }) => {
    // Quick setup - use existing admin user
    console.log('\n🤖 RITA LOADING INDICATOR TEST\n');
    
    // Login as admin using helper function
    await signInAsAdmin(page);
    console.log('✅ Logged in as admin');
    
    // Wait for chat to be ready
    const chatInput = page.locator('.quikchat-input-textbox');
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    console.log('✅ Chat interface ready');
    
    // Send a message
    const testMessage = `Test message ${Date.now()}`;
    await chatInput.fill(testMessage);
    await chatInput.press('Enter');
    console.log(`📤 Sent message: "${testMessage}"`);
    
    // ============= VERIFY LOADING INDICATOR =============
    console.log('\n🔍 Verifying loading indicator...');
    
    // 1. Check that loading indicator appears
    const loadingIndicator = page.locator('.system-loading-indicator');
    await expect(loadingIndicator).toBeVisible({ timeout: 2000 });
    console.log('  ✅ Loading indicator is visible');
    
    // 2. Verify it shows "Rita is thinking"
    const loadingText = page.locator('.loading-text');
    await expect(loadingText).toHaveText('Rita is thinking');
    console.log('  ✅ Shows "Rita is thinking" text');
    
    // 3. Verify it has 3 animated dots
    const loadingDots = page.locator('.loading-dots .dot');
    await expect(loadingDots).toHaveCount(3);
    console.log('  ✅ Has 3 animated dots');
    
    // 4. Verify it's NOT inside a message card (system-level)
    const notInCard = await page.locator('.quikchat-message .system-loading-indicator').count();
    expect(notInCard).toBe(0);
    console.log('  ✅ Not inside a message card (system-level indicator)');
    
    // 5. Verify it's left-aligned
    const loadingBox = await loadingIndicator.boundingBox();
    const messagesArea = await page.locator('.quikchat-messages-area').boundingBox();
    if (loadingBox && messagesArea) {
      // Check if it's reasonably left-aligned (not centered)
      const centerX = messagesArea.x + (messagesArea.width / 2);
      const isLeftAligned = loadingBox.x < centerX - 50; // Allow some margin
      expect(isLeftAligned).toBe(true);
      console.log('  ✅ Left-aligned positioning');
    }
    
    // 6. Verify spacing from user message (should be ~22px, but allow some variance)
    const userMessage = page.locator('.quikchat-message').last();
    const userMessageBox = await userMessage.boundingBox();
    if (userMessageBox && loadingBox) {
      const spacing = loadingBox.y - (userMessageBox.y + userMessageBox.height);
      // Allow 10-30px range to account for browser differences
      expect(spacing).toBeGreaterThan(10);
      expect(spacing).toBeLessThan(30);
      console.log(`  ✅ Correct spacing from message: ${Math.round(spacing)}px`);
    }
    
    // Wait a bit to see if it stays visible (it should until response arrives)
    await page.waitForTimeout(2000);
    
    // It should still be visible (since no real response will come in test)
    const stillVisible = await loadingIndicator.isVisible();
    if (stillVisible) {
      console.log('  ✅ Indicator persists while waiting for response');
    }
    
    console.log('\n✨ Rita loading indicator test passed!\n');
  });
  
});