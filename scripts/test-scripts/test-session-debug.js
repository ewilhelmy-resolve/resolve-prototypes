const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('1. Login...');
  await page.goto('http://localhost:5001/login');
  await page.fill('#email', 'admin@resolve.io');
  await page.fill('#password', 'admin123');
  await page.click('button[type="submit"]');
  
  // Wait for response
  await page.waitForTimeout(1000);
  
  // Get the session token from cookie
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find(c => c.name === 'sessionToken');
  console.log('Session token set:', sessionCookie ? 'Yes' : 'No');
  
  if (sessionCookie) {
    // Now try to access dashboard directly with the token
    console.log('\n2. Trying to access dashboard with session token...');
    const response = await page.goto('http://localhost:5001/dashboard', { waitUntil: 'domcontentloaded' });
    console.log('Dashboard response status:', response.status());
    console.log('Dashboard URL after navigation:', page.url());
    
    // Try API call with session
    console.log('\n3. Testing API call with session...');
    const apiResponse = await page.evaluate(async () => {
      const res = await fetch('/api/user/info', {
        credentials: 'include'
      });
      return {
        status: res.status,
        data: await res.text()
      };
    });
    console.log('API Response:', apiResponse);
  }
  
  await browser.close();
})();