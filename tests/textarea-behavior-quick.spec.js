const { test, expect } = require('@playwright/test');

test('textarea behavior: grows upward, scrollbar at 18 lines, resets on send', async ({ page }) => {
  // Sign in as admin
  await page.goto('http://localhost:5000/');
  await page.click('text="Sign in here"');
  await page.fill('input[type="email"]', 'admin@resolve.io');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  
  // Wait for dashboard
  await page.waitForSelector('.quikchat-input-textbox', { timeout: 10000 });
  const textarea = page.locator('.quikchat-input-textbox');
  
  // TEST 1: Default state (2 lines, no scrollbar)
  await textarea.clear();
  await page.waitForTimeout(200);
  
  const defaultState = await textarea.evaluate(el => ({
    height: parseInt(el.style.height) || 44,
    overflowY: el.style.overflowY || 'hidden'
  }));
  
  console.log('DEFAULT:', defaultState);
  expect(defaultState.height).toBeLessThanOrEqual(50);
  expect(defaultState.overflowY).toBe('hidden');
  
  // TEST 2: Enter 18 lines (should show scrollbar)
  for (let i = 1; i <= 18; i++) {
    await textarea.type(`Line ${i}`);
    if (i < 18) await textarea.press('Shift+Enter');
  }
  await page.waitForTimeout(300);
  
  const expandedState = await textarea.evaluate(el => ({
    height: parseInt(el.style.height),
    overflowY: el.style.overflowY,
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight
  }));
  
  console.log('EXPANDED:', expandedState);
  expect(expandedState.height).toBe(340);
  expect(expandedState.overflowY).toBe('auto');
  expect(expandedState.scrollHeight).toBeGreaterThan(expandedState.clientHeight);
  
  // TEST 3: Send message and verify reset
  await textarea.press('Enter');
  await page.waitForTimeout(500);
  
  const resetState = await textarea.evaluate(el => ({
    height: parseInt(el.style.height) || 44,
    overflowY: el.style.overflowY || 'hidden',
    value: el.value
  }));
  
  console.log('RESET:', resetState);
  expect(resetState.height).toBeLessThanOrEqual(50);
  expect(resetState.overflowY).toBe('hidden');
  expect(resetState.value).toBe('');
  
  console.log('✅ All tests passed!');
});