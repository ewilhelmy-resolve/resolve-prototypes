const puppeteer = require('puppeteer');

(async () => {
  console.log('Starting browser...');
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable console logs
  page.on('console', msg => console.log('Browser console:', msg.text()));
  page.on('pageerror', err => console.log('Page error:', err.message));
  
  console.log('1. Going to http://localhost:8082/');
  await page.goto('http://localhost:8082/', { waitUntil: 'networkidle2', timeout: 10000 });
  
  console.log('2. Waiting for login link...');
  await page.waitForSelector('#loginLink', { timeout: 10000 });
  
  console.log('3. Clicking login link...');
  await page.click('#loginLink');
  
  console.log('4. Waiting for login form...');
  await page.waitForSelector('#loginEmail', { timeout: 5000 });
  
  console.log('5. Filling credentials...');
  await page.type('#loginEmail', 'john@resolve.io');
  await page.type('#loginPassword', '!Password1');
  
  console.log('6. Clicking Log In button...');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
    page.click('button[type="submit"]')
  ]).catch(async (err) => {
    // If navigation doesn't happen, check current URL
    const url = page.url();
    console.log('Current URL after login attempt:', url);
    
    // Take screenshot
    await page.screenshot({ path: 'after-login.png' });
    console.log('Screenshot saved as after-login.png');
    
    // Check for errors on page
    const errorText = await page.$eval('.error-message', el => el.textContent).catch(() => null);
    if (errorText) {
      console.log('Error message on page:', errorText);
    }
    
    throw err;
  });
  
  console.log('7. Checking final URL...');
  const finalUrl = page.url();
  console.log('Final URL:', finalUrl);
  
  if (finalUrl.includes('jarvis.html')) {
    console.log('✅✅✅ SUCCESS: User logged in and redirected to jarvis.html!');
  } else {
    console.log('❌ FAILED: Not redirected to jarvis.html');
    await page.screenshot({ path: 'failed-redirect.png' });
  }
  
  await browser.close();
})().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});