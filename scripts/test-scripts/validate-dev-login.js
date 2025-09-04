const { chromium } = require('@playwright/test');

async function validateDevLogin() {
  console.log('🔍 Validating admin login on DEV instance (localhost:5000 → Supabase)\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  const page = await browser.newPage();
  
  try {
    // Go to signin page
    console.log('1️⃣ Navigating to http://localhost:5000/signin');
    await page.goto('http://localhost:5000/signin');
    await page.waitForLoadState('networkidle');
    
    // Fill credentials
    console.log('2️⃣ Entering admin@resolve.io / admin123');
    await page.fill('input[type="email"]', 'admin@resolve.io');
    await page.fill('input[type="password"]', 'admin123');
    
    // Click Sign In
    console.log('3️⃣ Clicking Sign In button');
    await page.click('button:has-text("Sign In")');
    
    // Wait for navigation or error
    console.log('4️⃣ Waiting for result...');
    
    try {
      // Wait for dashboard redirect
      await page.waitForURL('**/dashboard', { timeout: 5000 });
      
      console.log('\n✅ SUCCESS! Redirected to dashboard');
      console.log('📍 Current URL:', page.url());
      
      // Take screenshot proof
      await page.screenshot({ 
        path: '.playwright-mcp/dashboard-success.png', 
        fullPage: true 
      });
      console.log('📸 Screenshot saved to .playwright-mcp/dashboard-success.png');
      
      // Verify dashboard elements
      const title = await page.title();
      console.log('📄 Page title:', title);
      
      const hasRita = await page.locator('h1:has-text("Ask Rita")').isVisible();
      if (hasRita) {
        console.log('✅ "Ask Rita" heading found');
      }
      
      console.log('\n🎉 Admin login WORKS on localhost:5000!');
      
    } catch (e) {
      // Check if still on signin page
      const currentUrl = page.url();
      console.log('\n❌ Login failed');
      console.log('📍 Still on:', currentUrl);
      
      // Check for error toast
      const toast = await page.locator('.toast-notification.show').count();
      if (toast > 0) {
        const msg = await page.locator('.toast-message').textContent();
        console.log('⚠️ Error message:', msg);
      }
      
      await page.screenshot({ 
        path: '.playwright-mcp/login-failed.png' 
      });
      console.log('📸 Failure screenshot saved');
    }
    
    // Keep browser open for inspection
    console.log('\n⏳ Keeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
    console.log('🏁 Test complete');
  }
}

validateDevLogin().catch(console.error);