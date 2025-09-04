const { chromium } = require('@playwright/test');

async function manualSigninTest() {
  console.log('📝 Testing admin signin manually...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  const page = await browser.newPage();
  
  try {
    // Navigate to signin
    console.log('1️⃣ Going to signin page...');
    await page.goto('http://localhost:5000/signin');
    await page.waitForTimeout(2000);
    
    // Enter credentials
    console.log('2️⃣ Entering credentials...');
    await page.fill('input[type="email"]', 'admin@resolve.io');
    await page.waitForTimeout(1000);
    await page.fill('input[type="password"]', 'admin123');
    await page.waitForTimeout(1000);
    
    // Take screenshot before signin
    await page.screenshot({ path: '.playwright-mcp/before-signin.png' });
    
    // Click signin button
    console.log('3️⃣ Clicking Sign In button...');
    await page.click('button:has-text("Sign In")');
    
    // Wait for possible redirect
    console.log('4️⃣ Waiting for result...');
    await page.waitForTimeout(5000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`\n📍 Current URL: ${currentUrl}`);
    
    // Take screenshot after
    await page.screenshot({ path: '.playwright-mcp/after-signin.png', fullPage: true });
    
    if (currentUrl.includes('dashboard')) {
      console.log('✅ SUCCESS! Redirected to dashboard!');
      const title = await page.title();
      console.log(`📄 Page title: ${title}`);
    } else {
      console.log('❌ Not on dashboard page');
      
      // Check for error toast
      const toast = await page.locator('.toast-notification.show').count();
      if (toast > 0) {
        const msg = await page.locator('.toast-message').textContent();
        console.log(`⚠️ Error toast: ${msg}`);
      }
    }
    
    console.log('\n⏳ Keeping browser open for 10 seconds to inspect...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

manualSigninTest();