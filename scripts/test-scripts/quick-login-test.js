const { chromium } = require('@playwright/test');

async function quickLoginTest() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Navigate to login
    await page.goto('http://localhost:5000/login', { timeout: 5000 });
    console.log('✅ Login page loaded');
    
    // Fill credentials
    await page.fill('#email', 'admin@resolve.io');
    await page.fill('#password', 'admin123');
    console.log('✅ Credentials entered');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Wait for redirect (5 seconds max as you specified)
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    
    const title = await page.title();
    console.log(`✅ Dashboard reached! Title: ${title}`);
    console.log('✅ Admin login WORKS!');
    
  } catch (error) {
    console.log('❌ Login failed:', error.message);
    
    // Check current URL
    console.log('Current URL:', page.url());
    
    // Check for error modal
    const hasModal = await page.locator('.modal-overlay.show').count() > 0;
    if (hasModal) {
      const msg = await page.locator('#modalMessage').textContent();
      console.log('Error modal:', msg);
    }
    
    // Take screenshot for debugging
    await page.screenshot({ path: '.playwright-mcp/debug.png' });
    console.log('Screenshot saved to .playwright-mcp/debug.png');
  } finally {
    await browser.close();
  }
}

quickLoginTest().catch(console.error);