const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 },
    isMobile: true,
  });
  const page = await context.newPage();
  
  // Test home page
  await page.goto('http://localhost:5000');
  const bodyBg = await page.evaluate(() => {
    return window.getComputedStyle(document.body).backgroundColor;
  });
  console.log('Home page body background:', bodyBg);
  
  // Navigate to dashboard
  await page.goto('http://localhost:5000/dashboard');
  const dashBg = await page.evaluate(() => {
    const main = document.querySelector('.main-content, .chat-area, body');
    return main ? window.getComputedStyle(main).backgroundColor : 'not found';
  });
  console.log('Dashboard background:', dashBg);
  
  const isLight = dashBg.includes('255') || dashBg.includes('white');
  console.log('Status:', isLight ? 'LIGHT MODE ✅' : 'DARK MODE ❌');
  
  await browser.close();
  process.exit(isLight ? 0 : 1);
})();