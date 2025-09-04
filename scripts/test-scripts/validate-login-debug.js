const { chromium } = require('@playwright/test');

async function debugLogin() {
  console.log('🔍 DEBUG: Admin Login Test\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000,
    devtools: true
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => console.log('Browser console:', msg.text()));
  page.on('pageerror', err => console.log('Page error:', err.message));
  
  try {
    // Navigate to signin
    console.log('1. Navigating to signin page...');
    await page.goto('http://localhost:5000/signin');
    await page.waitForLoadState('networkidle');
    
    // Check current page
    console.log('   Current URL:', page.url());
    console.log('   Page title:', await page.title());
    
    // Fill credentials with different selectors
    console.log('\n2. Filling credentials...');
    
    // Try different email selectors
    const emailFilled = await page.fill('#email', 'admin@resolve.io').then(() => true).catch(() => false);
    if (!emailFilled) {
      console.log('   Trying alternate email selector...');
      await page.fill('input[type="email"]', 'admin@resolve.io');
    }
    console.log('   ✓ Email filled');
    
    // Try different password selectors
    const passwordFilled = await page.fill('#password', 'admin123').then(() => true).catch(() => false);
    if (!passwordFilled) {
      console.log('   Trying alternate password selector...');
      await page.fill('input[type="password"]', 'admin123');
    }
    console.log('   ✓ Password filled');
    
    // Take screenshot
    await page.screenshot({ path: '.playwright-mcp/debug-form-filled.png' });
    
    // Find and click submit button
    console.log('\n3. Finding submit button...');
    const submitButton = await page.locator('button[type="submit"]');
    const buttonText = await submitButton.textContent();
    console.log('   Button text:', buttonText);
    
    // Set up response listeners
    console.log('\n4. Setting up network listeners...');
    
    // Listen for any response
    const responsePromise = page.waitForResponse(response => {
      console.log(`   Response: ${response.url()} - ${response.status()}`);
      return response.url().includes('/api/') && response.status() !== 0;
    }, { timeout: 10000 }).catch(err => console.log('   No API response received'));
    
    // Listen for navigation
    const navigationPromise = page.waitForNavigation({ timeout: 10000 })
      .then(() => console.log('   ✓ Navigation occurred'))
      .catch(() => console.log('   ✗ No navigation occurred'));
    
    // Click submit
    console.log('\n5. Clicking submit button...');
    await submitButton.click();
    
    // Wait for any response
    console.log('   Waiting for response...');
    await Promise.race([responsePromise, navigationPromise, page.waitForTimeout(5000)]);
    
    // Check final state
    console.log('\n6. Final state:');
    console.log('   Current URL:', page.url());
    console.log('   Page title:', await page.title());
    
    // Check for modal
    const modalVisible = await page.locator('.modal-overlay').isVisible().catch(() => false);
    if (modalVisible) {
      console.log('   ⚠️ Modal is visible');
      const modalMessage = await page.locator('#modalMessage').textContent().catch(() => '');
      console.log('   Modal message:', modalMessage);
    }
    
    // Check cookies
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === 'sessionToken');
    if (sessionCookie) {
      console.log('   ✓ Session cookie found');
    } else {
      console.log('   ✗ No session cookie');
    }
    
    // Take final screenshot
    await page.screenshot({ path: '.playwright-mcp/debug-final-state.png' });
    
    // If on dashboard, test persistence
    if (page.url().includes('/dashboard')) {
      console.log('\n7. Testing session persistence...');
      console.log('   Waiting 5 seconds...');
      await page.waitForTimeout(5000);
      console.log('   Still on dashboard?', page.url().includes('/dashboard'));
      
      console.log('   Refreshing page...');
      await page.reload();
      await page.waitForLoadState('networkidle');
      console.log('   After refresh URL:', page.url());
    }
    
  } catch (error) {
    console.error('\nError:', error.message);
  } finally {
    console.log('\nKeeping browser open for 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

debugLogin().catch(console.error);