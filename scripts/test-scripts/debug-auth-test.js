const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error));
  
  console.log('1. Going to login page...');
  await page.goto('http://localhost:5001/login');
  
  console.log('2. Filling credentials...');
  await page.fill('#email', 'admin@resolve.io');
  await page.fill('#password', 'admin123');
  
  // Take screenshot before submit
  await page.screenshot({ path: 'before-submit.png' });
  
  console.log('3. Clicking submit...');
  
  // Listen for network response
  page.on('response', response => {
    if (response.url().includes('/api/auth/signin')) {
      console.log('Auth response:', response.status(), response.statusText());
      response.json().then(data => console.log('Auth data:', data)).catch(() => {});
    }
  });
  
  await page.click('button[type="submit"]');
  
  console.log('4. Waiting 3 seconds...');
  await page.waitForTimeout(3000);
  
  console.log('Current URL:', page.url());
  
  // Take screenshot after submit
  await page.screenshot({ path: 'after-submit.png' });
  
  // Check localStorage
  const localStorage = await page.evaluate(() => {
    return {
      userSession: localStorage.getItem('userSession'),
      userEmail: localStorage.getItem('userEmail')
    };
  });
  console.log('LocalStorage:', localStorage);
  
  // Check cookies
  const cookies = await page.context().cookies();
  console.log('Cookies:', cookies.map(c => ({ name: c.name, value: c.value ? c.value.substring(0, 20) + '...' : null })));
  
  await browser.close();
})();