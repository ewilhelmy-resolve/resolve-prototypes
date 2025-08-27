const { chromium, devices } = require('playwright');

(async () => {
  console.log('🔍 Validating Dashboard Mobile Fix...\n');
  
  const browser = await chromium.launch({ headless: false });
  const iPhone = devices['iPhone 12'];
  const context = await browser.newContext({
    ...iPhone,
    permissions: ['geolocation'],
  });
  
  const page = await context.newPage();
  
  try {
    // Navigate to dashboard
    console.log('📱 Testing dashboard on iPhone 12 viewport...');
    await page.goto('http://localhost:5000/dashboard');
    await page.waitForTimeout(2000);
    
    // Check if we need to sign in first
    if (page.url().includes('signin')) {
      console.log('📝 Signing in first...');
      await page.fill('input[name="email"]', 'admin@resolve.io');
      await page.fill('input[name="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }
    
    // Check chat area background
    const chatAreaBg = await page.evaluate(() => {
      const chatArea = document.querySelector('.chat-area, .main-content, #quikchat-container');
      if (chatArea) {
        return window.getComputedStyle(chatArea).backgroundColor;
      }
      return 'not found';
    });
    console.log(`\n📊 Chat Area Background: ${chatAreaBg}`);
    
    // Check text colors
    const titleColor = await page.evaluate(() => {
      const title = document.querySelector('.chat-title, h1, h2');
      if (title) {
        return window.getComputedStyle(title).color;
      }
      return 'not found';
    });
    console.log(`📝 Title Text Color: ${titleColor}`);
    
    // Check input field
    const inputBg = await page.evaluate(() => {
      const input = document.querySelector('.quikchat-input-textbox, textarea, input[type="text"]');
      if (input) {
        return window.getComputedStyle(input).backgroundColor;
      }
      return 'not found';
    });
    console.log(`💬 Input Background: ${inputBg}`);
    
    const inputColor = await page.evaluate(() => {
      const input = document.querySelector('.quikchat-input-textbox, textarea, input[type="text"]');
      if (input) {
        return window.getComputedStyle(input).color;
      }
      return 'not found';
    });
    console.log(`✏️ Input Text Color: ${inputColor}`);
    
    // Determine if fix worked
    const isWhiteBg = chatAreaBg.includes('255') || chatAreaBg.includes('white') || chatAreaBg.includes('rgb(255');
    const isDarkText = titleColor.includes('0, 0, 0') || titleColor.includes('26') || titleColor.includes('rgb(26');
    const isInputWhite = inputBg.includes('255') || inputBg.includes('white');
    const isInputDark = inputColor.includes('0, 0, 0') || inputColor.includes('26');
    
    console.log('\n✅ Validation Results:');
    console.log(`  Chat Background: ${isWhiteBg ? '✅ White/Light' : '❌ Dark'}`);
    console.log(`  Title Text: ${isDarkText ? '✅ Dark' : '❌ Light'}`);
    console.log(`  Input Background: ${isInputWhite ? '✅ White' : '❌ Dark'}`);
    console.log(`  Input Text: ${isInputDark ? '✅ Dark' : '❌ Light'}`);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'dashboard-mobile-validation.png',
      fullPage: false 
    });
    console.log('\n📸 Screenshot saved as dashboard-mobile-validation.png');
    
    const success = isWhiteBg && isDarkText && isInputWhite;
    console.log(`\n${success ? '🎉 FIX VALIDATED!' : '❌ FIX FAILED - Still has issues'}`);
    
    // Keep browser open for manual inspection
    console.log('\n👀 Browser left open for manual inspection. Close when done.');
    
  } catch (error) {
    console.error('❌ Error during validation:', error);
    await browser.close();
  }
})();