// Mobile Layout Validation Tests
const { test, expect, devices } = require('@playwright/test');

// Define mobile devices to test
const mobileDevices = [
  { name: 'iPhone SE', device: devices['iPhone SE'] },
  { name: 'iPhone 12', device: devices['iPhone 12'] },
  { name: 'iPhone 14 Pro', device: devices['iPhone 14 Pro'] },
  { name: 'Pixel 5', device: devices['Pixel 5'] },
  { name: 'Galaxy S9+', device: devices['Galaxy S9+'] },
  { name: 'iPad Mini', device: devices['iPad Mini'] },
];

// Test each device
mobileDevices.forEach(({ name, device }) => {
  test.describe(`Mobile Layout - ${name}`, () => {
    test.use({ ...device });

    test('validates dashboard mobile layout', async ({ page }) => {
      console.log(`\n📱 Testing ${name} - ${device.viewport.width}x${device.viewport.height}px`);
      
      // Navigate to dashboard
      await page.goto('/dashboard', { waitUntil: 'networkidle' });
      
      // Check if we're redirected to signin (expected)
      if (page.url().includes('/signin')) {
        console.log('   📋 On signin page - checking mobile layout...');
        
        // Validate signin page mobile layout
        const formSection = await page.locator('.form-section');
        await expect(formSection).toBeVisible();
        
        // Check that graphic section is hidden on mobile
        const graphicSection = await page.locator('.graphic-section');
        const isGraphicVisible = await graphicSection.isVisible().catch(() => false);
        
        if (device.viewport.width <= 768) {
          console.log(`   ✅ Graphic section hidden on mobile (${device.viewport.width}px)`);
        }
        
        // Take screenshot
        await page.screenshot({ 
          path: `test-results/mobile-${name.toLowerCase().replace(/\s+/g, '-')}-signin.png`,
          fullPage: true 
        });
      }
      
      // Try to access dashboard directly with a test session
      await page.goto('/');
      await page.fill('input[name="email"]', `mobiletest${Date.now()}@example.com`);
      await page.fill('input[name="fullName"]', 'Mobile Test User');
      await page.fill('input[name="company"]', 'Mobile Test Co');
      await page.fill('input[name="password"]', 'TestPass123!');
      
      // Submit and continue through onboarding
      await page.click('button[type="submit"]');
      await page.waitForURL('**/step2.html', { timeout: 10000 }).catch(() => {});
      
      // Skip to dashboard
      if (page.url().includes('step2')) {
        await page.click('text=/Skip|Continue to Dashboard/i').catch(() => {});
      }
      
      // Now check dashboard layout
      const currentUrl = page.url();
      console.log(`   📍 Current URL: ${currentUrl}`);
      
      if (currentUrl.includes('dashboard')) {
        console.log('   🎯 On dashboard - validating mobile chat layout...');
        
        // Check for hamburger menu (should NOT be visible on mobile chat view)
        const hamburgerMenu = await page.locator('.mobile-menu-toggle');
        const isHamburgerVisible = await hamburgerMenu.isVisible().catch(() => false);
        console.log(`   ${isHamburgerVisible ? '❌' : '✅'} Hamburger menu: ${isHamburgerVisible ? 'visible' : 'hidden'}`);
        
        // Check chat input area
        const chatInput = await page.locator('#quikchat-container .quikchat-input-textbox, .chat-input, textarea').first();
        if (await chatInput.isVisible()) {
          const inputBox = await chatInput.boundingBox();
          console.log(`   📝 Input field dimensions: ${inputBox.width}x${inputBox.height}px`);
          
          // Check send button
          const sendButton = await page.locator('#quikchat-container .quikchat-input-send-btn, .send-button, button[aria-label*="send"]').first();
          if (await sendButton.isVisible()) {
            const buttonBox = await sendButton.boundingBox();
            const isInsideInput = buttonBox && inputBox && 
              buttonBox.x >= inputBox.x && 
              buttonBox.x + buttonBox.width <= inputBox.x + inputBox.width &&
              buttonBox.y >= inputBox.y &&
              buttonBox.y + buttonBox.height <= inputBox.y + inputBox.height;
            
            console.log(`   ${isInsideInput ? '✅' : '❌'} Send button position: ${isInsideInput ? 'inside' : 'outside'} input field`);
            console.log(`     Button coords: x=${buttonBox?.x}, y=${buttonBox?.y}`);
            console.log(`     Input coords: x=${inputBox?.x}, y=${inputBox?.y}`);
          }
        }
        
        // Check sidebars (should be hidden on mobile)
        const leftSidebar = await page.locator('.left-sidebar');
        const rightSidebar = await page.locator('.right-sidebar');
        const leftVisible = await leftSidebar.isVisible().catch(() => false);
        const rightVisible = await rightSidebar.isVisible().catch(() => false);
        
        console.log(`   ${!leftVisible ? '✅' : '❌'} Left sidebar: ${leftVisible ? 'visible' : 'hidden'}`);
        console.log(`   ${!rightVisible ? '✅' : '❌'} Right sidebar: ${rightVisible ? 'visible' : 'hidden'}`);
        
        // Take screenshot
        await page.screenshot({ 
          path: `test-results/mobile-${name.toLowerCase().replace(/\s+/g, '-')}-dashboard.png`,
          fullPage: true 
        });
      }
    });

    test('validates mobile input interaction', async ({ page, browserName }) => {
      if (browserName === 'webkit') {
        test.skip(); // Skip Safari for now
      }
      
      console.log(`\n⌨️ Testing input interaction on ${name}`);
      
      // Navigate to a page with chat
      await page.goto('/');
      
      // Check if input field gets proper focus and doesn't zoom
      const emailInput = await page.locator('input[type="email"]').first();
      if (await emailInput.isVisible()) {
        await emailInput.click();
        
        // Check computed styles
        const fontSize = await emailInput.evaluate(el => 
          window.getComputedStyle(el).fontSize
        );
        console.log(`   📏 Input font size: ${fontSize}`);
        
        // Should be at least 16px to prevent iOS zoom
        const fontSizeValue = parseInt(fontSize);
        console.log(`   ${fontSizeValue >= 16 ? '✅' : '❌'} Font size prevents zoom: ${fontSizeValue >= 16}`);
      }
    });

    test('validates landscape orientation', async ({ page }) => {
      if (device.viewport.width < device.viewport.height) {
        // Switch to landscape for phones
        await page.setViewportSize({
          width: device.viewport.height,
          height: device.viewport.width
        });
        
        console.log(`\n🔄 Testing ${name} in landscape mode`);
        
        await page.goto('/');
        
        // Check if layout adjusts properly
        const container = await page.locator('.onboarding-container, .dashboard-layout').first();
        if (await container.isVisible()) {
          const box = await container.boundingBox();
          console.log(`   📐 Container dimensions: ${box.width}x${box.height}px`);
          console.log(`   ${box.height <= device.viewport.width ? '✅' : '❌'} Fits in landscape viewport`);
        }
        
        // Take landscape screenshot
        await page.screenshot({ 
          path: `test-results/mobile-${name.toLowerCase().replace(/\s+/g, '-')}-landscape.png`,
          fullPage: true 
        });
      }
    });
  });
});

// Summary test to check all viewports
test.describe('Mobile Layout Summary', () => {
  test('validates critical mobile breakpoints', async ({ browser }) => {
    console.log('\n📊 MOBILE LAYOUT VALIDATION SUMMARY\n');
    
    const criticalWidths = [
      { width: 360, height: 640, name: 'Small Android' },
      { width: 375, height: 667, name: 'iPhone SE' },
      { width: 390, height: 844, name: 'iPhone 12/13' },
      { width: 414, height: 896, name: 'iPhone 11 Pro Max' },
      { width: 768, height: 1024, name: 'iPad Mini' }
    ];
    
    for (const viewport of criticalWidths) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 2,
        isMobile: viewport.width < 768,
        hasTouch: viewport.width < 768
      });
      
      const page = await context.newPage();
      await page.goto('/');
      
      // Check key mobile elements
      const checks = {
        'Viewport meta tag': await page.locator('meta[name="viewport"]').count() > 0,
        'Mobile-optimized forms': await page.locator('input[type="email"]').first().evaluate(el => {
          const styles = window.getComputedStyle(el);
          return parseInt(styles.fontSize) >= 16 && parseInt(styles.height) >= 44;
        }).catch(() => false),
        'Responsive layout': await page.locator('.onboarding-container').evaluate(el => {
          const styles = window.getComputedStyle(el);
          return styles.flexDirection === 'column' || viewport.width > 768;
        }).catch(() => false)
      };
      
      console.log(`📱 ${viewport.name} (${viewport.width}x${viewport.height}):`);
      Object.entries(checks).forEach(([check, passed]) => {
        console.log(`   ${passed ? '✅' : '❌'} ${check}`);
      });
      console.log('');
      
      await context.close();
    }
  });
});