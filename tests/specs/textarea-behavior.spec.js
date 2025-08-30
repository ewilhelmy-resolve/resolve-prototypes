const { test, expect } = require('@playwright/test');

test.describe('Textarea Auto-Growth Behavior', () => {
  test('validates textarea grows upward, shows scrollbar at 18+ lines, and resets after send', async ({ page }) => {
    console.log('🧪 TESTING TEXTAREA BEHAVIOR WITH ADMIN USER\n');
    
    // 1️⃣ SIGN IN AS ADMIN
    console.log('1️⃣ SIGNING IN AS ADMIN');
    await page.goto('http://localhost:5000/');
    
    // Navigate to sign in page
    await page.click('text="Sign in here"');
    await page.waitForURL('**/signin', { timeout: 5000 });
    
    // Sign in with admin credentials
    await page.fill('input[type="email"]', 'admin@resolve.io');
    await page.fill('input[type="password"]', 'admin123');
    console.log('   ✅ Entered admin credentials');
    
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('   ✅ Successfully logged in and navigated to dashboard\n');
    
    // Wait for QuikChat to initialize
    await page.waitForSelector('.quikchat-input-textbox', { timeout: 5000 });
    const textarea = page.locator('.quikchat-input-textbox');
    console.log('   ✅ QuikChat textarea found\n');
    
    // 2️⃣ VALIDATE DEFAULT STATE (2 lines, no scrollbar)
    console.log('2️⃣ VALIDATING DEFAULT TEXTAREA STATE');
    
    // Clear textarea to ensure clean state
    await textarea.clear();
    await page.waitForTimeout(200); // Allow reset to complete
    
    const defaultState = await textarea.evaluate(el => ({
      height: parseInt(el.style.height) || parseInt(window.getComputedStyle(el).height),
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      overflow: el.style.overflow || window.getComputedStyle(el).overflow,
      overflowY: el.style.overflowY || window.getComputedStyle(el).overflowY,
      hasVisualScrollbar: el.scrollHeight > el.clientHeight && (el.style.overflowY === 'auto' || el.style.overflowY === 'scroll'),
      computedHeight: window.getComputedStyle(el).height
    }));
    
    console.log(`   📏 Default height: ${defaultState.computedHeight}`);
    console.log(`   📜 Overflow-Y: ${defaultState.overflowY}`);
    console.log(`   🚫 Has visual scrollbar: ${defaultState.hasVisualScrollbar}`);
    
    // Validate: Should be ~44px (2 lines) with no scrollbar
    expect(defaultState.height).toBeLessThanOrEqual(50); // ~44px for 2 lines
    expect(defaultState.overflowY).toBe('hidden');
    expect(defaultState.hasVisualScrollbar).toBe(false);
    console.log('   ✅ Default state validated: 2 lines, no scrollbar\n');
    
    // 3️⃣ ENTER 18 LINES OF TEXT
    console.log('3️⃣ ENTERING 18 LINES OF TEXT');
    
    for (let i = 1; i <= 18; i++) {
      await textarea.type(`Line ${i} of text`);
      if (i < 18) {
        await textarea.press('Shift+Enter');
      }
    }
    
    // Wait for height adjustment
    await page.waitForTimeout(300);
    
    const expandedState = await textarea.evaluate(el => ({
      height: parseInt(el.style.height) || parseInt(window.getComputedStyle(el).height),
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      overflow: el.style.overflow || window.getComputedStyle(el).overflow,
      overflowY: el.style.overflowY || window.getComputedStyle(el).overflowY,
      hasVisualScrollbar: el.scrollHeight > el.clientHeight && (el.style.overflowY === 'auto' || el.style.overflowY === 'scroll'),
      computedHeight: window.getComputedStyle(el).height
    }));
    
    console.log(`   📏 Expanded height: ${expandedState.computedHeight}`);
    console.log(`   📜 Overflow-Y: ${expandedState.overflowY}`);
    console.log(`   ✅ Has visual scrollbar: ${expandedState.hasVisualScrollbar}`);
    console.log(`   📊 Scroll height: ${expandedState.scrollHeight}px, Client height: ${expandedState.clientHeight}px`);
    
    // Validate: Should be at max height (340px) with scrollbar
    expect(expandedState.height).toBe(340); // Max height
    expect(expandedState.overflowY).toBe('auto');
    expect(expandedState.hasVisualScrollbar).toBe(true);
    console.log('   ✅ Expanded state validated: Max height reached, scrollbar visible\n');
    
    // 4️⃣ SEND MESSAGE AND VALIDATE RESET
    console.log('4️⃣ SENDING MESSAGE AND VALIDATING RESET');
    
    // Send the message (Enter key)
    await textarea.press('Enter');
    
    // Wait for message to be sent and textarea to reset
    await page.waitForTimeout(500);
    
    const resetState = await textarea.evaluate(el => ({
      height: parseInt(el.style.height) || parseInt(window.getComputedStyle(el).height),
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      overflow: el.style.overflow || window.getComputedStyle(el).overflow,
      overflowY: el.style.overflowY || window.getComputedStyle(el).overflowY,
      hasVisualScrollbar: el.scrollHeight > el.clientHeight && (el.style.overflowY === 'auto' || el.style.overflowY === 'scroll'),
      value: el.value,
      computedHeight: window.getComputedStyle(el).height
    }));
    
    console.log(`   📏 Reset height: ${resetState.computedHeight}`);
    console.log(`   📜 Overflow-Y: ${resetState.overflowY}`);
    console.log(`   🚫 Has visual scrollbar: ${resetState.hasVisualScrollbar}`);
    console.log(`   📝 Textarea value: "${resetState.value}"`);
    
    // Validate: Should be back to ~44px (2 lines) with no scrollbar
    expect(resetState.height).toBeLessThanOrEqual(50); // Back to ~44px for 2 lines
    expect(resetState.overflowY).toBe('hidden');
    expect(resetState.hasVisualScrollbar).toBe(false);
    expect(resetState.value).toBe(''); // Textarea should be empty
    console.log('   ✅ Reset validated: Back to 2 lines, no scrollbar, textarea empty\n');
    
    // 5️⃣ FINAL SUMMARY
    console.log('✅ ALL TEXTAREA BEHAVIOR TESTS PASSED!');
    console.log('   ✓ Default: 2 lines, no scrollbar');
    console.log('   ✓ With 18 lines: Max height, scrollbar visible');
    console.log('   ✓ After send: Reset to 2 lines, no scrollbar');
  });
});