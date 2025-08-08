const { test, expect } = require('@playwright/test');

test('Login as john@resolve.io on the actual page', async ({ page }) => {
  // Go to the REAL page
  await page.goto('http://localhost:8082/');
  
  // Wait for the page to fully load
  await page.waitForLoadState('networkidle');
  
  // The signup form should be visible - look for the login link
  await page.waitForTimeout(2000); // Give JS time to render
  
  // Click "Log in here" link - it should be in the signup form
  const loginLink = await page.locator('#loginLink').first();
  await loginLink.click();
  console.log('✅ Clicked login link');
  
  // Wait for login form to appear
  await page.waitForSelector('#loginEmail', { timeout: 5000 });
  
  // Fill in john@resolve.io credentials
  await page.fill('#loginEmail', 'john@resolve.io');
  await page.fill('#loginPassword', '!Password1');
  console.log('✅ Filled credentials');
  
  // Click Log In button
  await page.click('button:has-text("Log In")');
  console.log('✅ Clicked Log In');
  
  // Wait for navigation
  await page.waitForTimeout(3000);
  
  // Check if we're on jarvis.html
  const url = page.url();
  expect(url).toContain('jarvis.html');
  console.log('✅ Successfully redirected to jarvis.html');
});