const puppeteer = require('puppeteer');

(async () => {
  console.log('🔐 Testing admin signin with Desktop Commander...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  try {
    // Navigate to signin page
    console.log('1. Navigating to signin page...');
    await page.goto('http://localhost:5000/signin', { waitUntil: 'networkidle2' });
    
    // Enter credentials
    console.log('2. Entering admin credentials...');
    await page.type('input[type="email"]', 'admin@resolve.io');
    await page.type('input[type="password"]', 'admin123');
    
    // Click signin
    console.log('3. Clicking Sign In button...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button[type="submit"]')
    ]);
    
    // Check if redirected to dashboard
    const url = page.url();
    console.log(`\n✅ Current URL: ${url}`);
    
    if (url.includes('dashboard')) {
      console.log('🎉 SUCCESS! Admin login works and redirected to dashboard!');
      
      // Take screenshot
      await page.screenshot({ path: 'dashboard-proof.png', fullPage: true });
      console.log('📸 Screenshot saved as dashboard-proof.png');
      
      // Check for key elements
      const title = await page.title();
      console.log(`📄 Page title: ${title}`);
      
      const hasRita = await page.$('h1');
      if (hasRita) {
        const text = await page.$eval('h1', el => el.textContent);
        console.log(`📝 Found heading: ${text}`);
      }
    } else {
      console.log('❌ Login failed - not on dashboard');
    }
    
    // Keep browser open for 5 seconds
    await new Promise(r => setTimeout(r, 5000));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();