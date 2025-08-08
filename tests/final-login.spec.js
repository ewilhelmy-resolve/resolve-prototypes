const { test, expect } = require('@playwright/test');

test('Complete login flow', async ({ page }) => {
  // Step 1: Navigate to homepage
  await page.goto('http://localhost:8082/');
  console.log('✅ Loaded homepage');
  
  // Step 2: Wait for the SignupForm to be initialized
  await page.waitForTimeout(3000);
  
  // Step 3: Click the login link button
  const loginButton = page.locator('#loginLink');
  await expect(loginButton).toBeVisible({ timeout: 10000 });
  await loginButton.click();
  console.log('✅ Clicked login link');
  
  // Step 4: Fill in login form
  await expect(page.locator('#loginEmail')).toBeVisible({ timeout: 5000 });
  await page.fill('#loginEmail', 'john@resolve.io');
  await page.fill('#loginPassword', '!Password1');
  console.log('✅ Filled credentials');
  
  // Step 5: Click Log In button and wait for response
  const [response] = await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/api/auth/login') && resp.status() === 200),
    page.click('button:has-text("Log In")')
  ]);
  
  const responseData = await response.json();
  console.log('✅ API Response:', responseData.success ? 'Success' : 'Failed');
  
  // Step 6: Wait for navigation to jarvis.html
  await page.waitForURL('**/jarvis.html', { timeout: 10000 });
  console.log('✅ Redirected to jarvis.html');
  
  // Verify we're on the right page
  expect(page.url()).toContain('jarvis.html');
  console.log('✅✅✅ LOGIN SUCCESSFUL - User can access Jarvis!');
});