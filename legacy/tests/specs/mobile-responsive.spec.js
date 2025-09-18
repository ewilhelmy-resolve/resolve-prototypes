// Simplified Mobile Layout Validation Tests
const { test, expect } = require('../fixtures/simple-base');

test.describe('Mobile Layout Validation', () => {
  const mobileViewports = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 12', width: 390, height: 844 },
    { name: 'iPhone 14 Pro', width: 393, height: 852 },
    { name: 'Pixel 5', width: 393, height: 851 },
    { name: 'Galaxy S9', width: 360, height: 740 },
  ];

  mobileViewports.forEach(({ name, width, height }) => {
    test(`${name} (${width}x${height})`, async ({ page, browser }) => {
      // Set viewport
      await page.setViewportSize({ width, height });
      
      console.log(`\n📱 Testing ${name} - ${width}x${height}px\n`);
      
      // Navigate to landing page
      await page.goto('/', { timeout: 10000 });
      await page.waitForSelector('input[name="email"]', { timeout: 10000 });
      
      // Check viewport meta tag
      const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
      console.log(`   ✅ Viewport meta: ${viewportMeta}`);
      
      // Check if graphic section is hidden on mobile
      const graphicSection = await page.locator('.graphic-section');
      const isGraphicVisible = await graphicSection.isVisible().catch(() => false);
      console.log(`   ${!isGraphicVisible ? '✅' : '❌'} Graphic section: ${isGraphicVisible ? 'visible' : 'hidden'}`);
      
      // Check form inputs have proper size
      const emailInput = await page.locator('input[type="email"]').first();
      if (await emailInput.isVisible()) {
        const inputHeight = await emailInput.evaluate(el => el.offsetHeight);
        const fontSize = await emailInput.evaluate(el => 
          parseInt(window.getComputedStyle(el).fontSize)
        );
        console.log(`   ${inputHeight >= 44 ? '✅' : '❌'} Input height: ${inputHeight}px (min 44px)`);
        console.log(`   ${fontSize >= 16 ? '✅' : '❌'} Font size: ${fontSize}px (prevents zoom)`);
      }
      
      // Take screenshot
      await page.screenshot({ 
        path: `.playwright-mcp/mobile-${name.toLowerCase().replace(/\s+/g, '-')}.png`,
        fullPage: false 
      });
      
      // Test dashboard if we can create a quick account
      const timestamp = Date.now();
      await page.fill('input[name="email"]', `mobile${timestamp}@test.com`);
      await page.fill('input[name="fullName"]', 'Mobile Test');
      await page.fill('input[name="company"]', 'Test Co');
      await page.fill('input[name="password"]', 'Test123!');
      
      await page.click('button[type="submit"]');
      
      // Wait for navigation
      await page.waitForTimeout(2000);
      
      // If we're on step2, skip to dashboard
      if (page.url().includes('step2')) {
        console.log('   📋 On step 2 - checking mobile layout...');
        
        // Check if the layout is mobile-optimized
        const container = await page.locator('.onboarding-container');
        const flexDirection = await container.evaluate(el => 
          window.getComputedStyle(el).flexDirection
        );
        console.log(`   ${flexDirection === 'column' ? '✅' : '❌'} Mobile layout: ${flexDirection}`);
        
        // Try to continue
        const skipBtn = await page.locator('text=/Skip|Continue/i').first();
        if (await skipBtn.isVisible()) {
          await skipBtn.click();
          await page.waitForTimeout(2000);
        }
      }
      
      // Check if we made it to dashboard or completion
      const currentUrl = page.url();
      if (currentUrl.includes('dashboard') || currentUrl.includes('completion')) {
        console.log(`   🎯 On ${currentUrl.includes('dashboard') ? 'dashboard' : 'completion'} page`);
        
        // Check for mobile-specific elements
        const hamburger = await page.locator('.mobile-menu-toggle');
        const isHamburgerVisible = await hamburger.isVisible().catch(() => false);
        console.log(`   ℹ️  Hamburger menu: ${isHamburgerVisible ? 'visible' : 'hidden'}`);
        
        // Check chat input if visible
        const chatInput = await page.locator('textarea, input[placeholder*="Message"], #quikchat-container .quikchat-input-textbox').first();
        if (await chatInput.isVisible().catch(() => false)) {
          const inputBox = await chatInput.boundingBox();
          console.log(`   📝 Chat input found: ${inputBox.width}x${inputBox.height}px`);
          
          // Check send button position
          const sendBtn = await page.locator('.quikchat-input-send-btn, .send-button, button[aria-label*="send"]').first();
          if (await sendBtn.isVisible().catch(() => false)) {
            const btnBox = await sendBtn.boundingBox();
            
            // Check if button is inside or aligned with input
            const verticallyAligned = Math.abs((inputBox.y + inputBox.height/2) - (btnBox.y + btnBox.height/2)) < 10;
            const horizontallyAligned = btnBox.x > inputBox.x && btnBox.x < (inputBox.x + inputBox.width);
            
            console.log(`   ${verticallyAligned ? '✅' : '❌'} Send button vertical alignment`);
            console.log(`   ${horizontallyAligned ? '✅' : '❌'} Send button horizontal position`);
          }
        }
        
        // Take dashboard screenshot
        await page.screenshot({ 
          path: `.playwright-mcp/mobile-${name.toLowerCase().replace(/\s+/g, '-')}-dashboard.png`,
          fullPage: false 
        });
      }
      
      console.log('');
    });
  });

  test('Summary - Check all critical breakpoints', async ({ page }) => {
    console.log('\n📊 MOBILE BREAKPOINT SUMMARY\n');
    
    const breakpoints = [
      { width: 320, name: 'Very small' },
      { width: 375, name: 'Small (iPhone SE)' },
      { width: 414, name: 'Medium (iPhone Plus)' },
      { width: 768, name: 'Tablet' },
      { width: 1024, name: 'Small desktop' }
    ];
    
    for (const { width, name } of breakpoints) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      
      // Check key responsive elements
      const checks = {
        'Viewport meta': await page.locator('meta[name="viewport"]').count() > 0,
        'Mobile layout': await page.locator('.onboarding-container').evaluate(el => {
          const style = window.getComputedStyle(el);
          return width <= 768 ? style.flexDirection === 'column' : true;
        }).catch(() => false),
        'Touch-friendly inputs': await page.locator('input').first().evaluate(el => {
          return el.offsetHeight >= 44 || width > 768;
        }).catch(() => false),
      };
      
      console.log(`${width}px (${name}):`);
      Object.entries(checks).forEach(([check, passed]) => {
        console.log(`  ${passed ? '✅' : '❌'} ${check}`);
      });
    }
  });
});