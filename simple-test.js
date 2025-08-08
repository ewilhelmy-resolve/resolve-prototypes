const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('1. Going to http://localhost:8082/');
    await page.goto('http://localhost:8082/');
    
    console.log('2. Waiting for page to load...');
    await page.waitForTimeout(2000);
    
    console.log('3. Looking for login link...');
    const loginLink = await page.$('#loginLink');
    if (loginLink) {
      console.log('   Found login link, clicking...');
      await loginLink.click();
    } else {
      console.log('   No login link found by ID, trying by text...');
      const btnLink = await page.$('button:has-text("Log in here")');
      if (btnLink) {
        await btnLink.click();
      } else {
        console.log('   ERROR: No login link found at all!');
        process.exit(1);
      }
    }
    
    console.log('4. Waiting for login form...');
    await page.waitForSelector('#loginEmail', { timeout: 5000 });
    
    console.log('5. Filling credentials...');
    await page.fill('#loginEmail', 'john@resolve.io');
    await page.fill('#loginPassword', '!Password1');
    
    console.log('6. Clicking Log In button...');
    await page.click('button:has-text("Log In")');
    
    console.log('7. Waiting for navigation...');
    await page.waitForTimeout(3000);
    
    const url = page.url();
    console.log(`8. Current URL: ${url}`);
    
    if (url.includes('jarvis.html')) {
      console.log('✅ SUCCESS: Logged in and redirected to jarvis.html');
    } else {
      console.log('❌ FAILED: Not redirected to jarvis.html');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();