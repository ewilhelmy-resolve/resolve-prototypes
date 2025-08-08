const { test, expect } = require('@playwright/test');

test('Simple login test', async ({ page }) => {
  // Go to page
  await page.goto('http://localhost:8082/');
  await page.waitForTimeout(2000);
  
  // Click the login link we just added
  await page.click('a:has-text("Log in here")');
  console.log('Clicked login link');
  
  // Wait a bit
  await page.waitForTimeout(1000);
  
  // Fill login form
  await page.fill('#loginEmail', 'john@resolve.io');
  await page.fill('#loginPassword', '!Password1');
  console.log('Filled credentials');
  
  // Submit
  await page.click('button:has-text("Log In")');
  console.log('Submitted');
  
  // Wait for navigation
  await page.waitForTimeout(3000);
  
  // Check URL
  const url = page.url();
  console.log('Final URL:', url);
  
  if (url.includes('jarvis.html')) {
    console.log('SUCCESS: Logged in and redirected to jarvis.html');
  } else {
    console.log('FAILED: Not redirected to jarvis.html');
  }
});