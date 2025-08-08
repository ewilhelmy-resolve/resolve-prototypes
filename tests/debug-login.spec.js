const { test, expect } = require('@playwright/test');

test('Debug login flow for john@resolve.io', async ({ page }) => {
  // Enable console logging
  page.on('console', msg => console.log(`Browser: ${msg.text()}`));
  page.on('pageerror', err => console.log(`Page error: ${err.message}`));
  
  // Step 1: Go to homepage
  console.log('1. Navigating to homepage...');
  await page.goto('http://localhost:8082/');
  await page.waitForLoadState('networkidle');
  
  // Step 2: Check if signup form is visible
  console.log('2. Checking for signup form...');
  const signupFormVisible = await page.locator('#signupFormContainer').isVisible();
  console.log(`   Signup form visible: ${signupFormVisible}`);
  
  // Step 3: Look for login link
  console.log('3. Looking for login link...');
  await page.waitForTimeout(2000); // Give JS time to render
  
  // Try to find login link by ID first
  const loginLinkById = await page.locator('#loginLink').count();
  console.log(`   Found ${loginLinkById} login links by ID`);
  
  // Try to find by text
  const loginLinkByText = await page.locator('button:has-text("Log in here")').count();
  console.log(`   Found ${loginLinkByText} login buttons with text`);
  
  if (loginLinkById > 0) {
    console.log('4. Clicking login link by ID...');
    await page.locator('#loginLink').first().click();
  } else if (loginLinkByText > 0) {
    console.log('4. Clicking login button by text...');
    await page.locator('button:has-text("Log in here")').first().click();
  } else {
    console.log('4. ERROR: No login link found!');
    // Take screenshot
    await page.screenshot({ path: 'debug-no-login-link.png' });
    throw new Error('No login link found');
  }
  
  // Step 5: Wait for login form
  console.log('5. Waiting for login form...');
  try {
    await page.waitForSelector('#loginEmail', { timeout: 5000 });
    console.log('   Login form appeared');
  } catch (e) {
    console.log('   ERROR: Login form did not appear');
    await page.screenshot({ path: 'debug-no-login-form.png' });
    throw e;
  }
  
  // Step 6: Fill credentials
  console.log('6. Filling credentials...');
  await page.fill('#loginEmail', 'john@resolve.io');
  await page.fill('#loginPassword', '!Password1');
  console.log('   Credentials filled');
  
  // Step 7: Submit form
  console.log('7. Submitting login form...');
  
  // Intercept the API call
  const responsePromise = page.waitForResponse(
    response => response.url().includes('/api/auth/login'),
    { timeout: 10000 }
  );
  
  await page.click('button:has-text("Log In")');
  
  try {
    const response = await responsePromise;
    console.log(`   API Response status: ${response.status()}`);
    const body = await response.json();
    console.log('   API Response:', JSON.stringify(body, null, 2));
  } catch (e) {
    console.log('   ERROR: No API response received');
  }
  
  // Step 8: Check navigation
  console.log('8. Checking navigation...');
  await page.waitForTimeout(3000);
  
  const currentUrl = page.url();
  console.log(`   Current URL: ${currentUrl}`);
  
  if (currentUrl.includes('jarvis.html')) {
    console.log('   SUCCESS: Redirected to jarvis.html');
  } else {
    console.log('   FAILURE: Not redirected to jarvis.html');
    await page.screenshot({ path: 'debug-no-redirect.png' });
    
    // Check localStorage
    const token = await page.evaluate(() => localStorage.getItem('token'));
    console.log(`   Token in localStorage: ${token ? 'Present' : 'Missing'}`);
    
    // Check sessionStorage
    const sessionToken = await page.evaluate(() => sessionStorage.getItem('token'));
    console.log(`   Token in sessionStorage: ${sessionToken ? 'Present' : 'Missing'}`);
  }
  
  // Final assertion
  expect(currentUrl).toContain('jarvis.html');
});