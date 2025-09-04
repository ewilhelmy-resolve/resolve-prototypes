const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('1. Going to login page...');
  await page.goto('http://localhost:5001/login');
  
  console.log('2. Filling credentials...');
  await page.fill('#email', 'admin@resolve.io');
  await page.fill('#password', 'admin123');
  
  console.log('3. Clicking submit...');
  await page.click('button[type="submit"]');
  
  console.log('4. Waiting for navigation...');
  try {
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✅ Successfully navigated to dashboard!');
    console.log('Current URL:', page.url());
  } catch (error) {
    console.error('❌ Failed to navigate to dashboard');
    console.error('Current URL:', page.url());
    console.error('Page content:', await page.content().substring(0, 500));
  }
  
  await browser.close();
})();