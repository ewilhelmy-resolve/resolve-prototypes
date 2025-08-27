const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Verifying mobile admin page fixes...\n');
  
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 },
    isMobile: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
  });
  
  const page = await context.newPage();
  
  // Navigate to admin page
  console.log('📱 Testing admin page on mobile viewport (375x667)...');
  await page.goto('http://localhost:5000/admin');
  
  // Check body background color
  const bodyBgColor = await page.evaluate(() => {
    const body = document.body;
    return window.getComputedStyle(body).backgroundColor;
  });
  console.log(`  Body background: ${bodyBgColor}`);
  
  // Check text color
  const bodyTextColor = await page.evaluate(() => {
    const body = document.body;
    return window.getComputedStyle(body).color;
  });
  console.log(`  Body text color: ${bodyTextColor}`);
  
  // Check admin header
  const headerEl = await page.$('.admin-header');
  if (headerEl) {
    const headerBg = await headerEl.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    console.log(`  Header background: ${headerBg}`);
  }
  
  // Check if it's light or dark theme
  const isLightTheme = bodyBgColor.includes('249') || bodyBgColor.includes('255') || 
                       bodyBgColor.includes('rgb(249') || bodyBgColor.includes('rgb(255');
  const isDarkText = bodyTextColor.includes('31') || bodyTextColor.includes('0, 0, 0') ||
                     bodyTextColor.includes('rgb(31');
  
  console.log('\n📊 Results:');
  console.log(`  Theme: ${isLightTheme ? '✅ Light' : '❌ Dark'} background`);
  console.log(`  Text: ${isDarkText ? '✅ Dark' : '❌ Light'} text`);
  console.log(`  Status: ${isLightTheme && isDarkText ? '✅ FIXED' : '❌ STILL BROKEN'}`);
  
  // Take screenshot
  await page.screenshot({ 
    path: 'mobile-admin-verification.png',
    fullPage: false 
  });
  console.log('\n📸 Screenshot saved as mobile-admin-verification.png');
  
  await browser.close();
  
  process.exit(isLightTheme && isDarkText ? 0 : 1);
})();