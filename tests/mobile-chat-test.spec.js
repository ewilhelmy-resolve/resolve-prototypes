// Mobile Chat Interface Test - Verify Send Button Positioning
const { test, expect } = require('@playwright/test');

test.describe('Mobile Chat Interface', () => {
  test('validates send button is properly positioned', async ({ page }) => {
    // Test on iPhone 12 size
    await page.setViewportSize({ width: 390, height: 844 });
    
    console.log('\n🎯 Testing Chat Interface on Mobile (390x844)\n');
    
    // Create a test account and navigate to dashboard
    await page.goto('/');
    
    const timestamp = Date.now();
    await page.fill('input[name="email"]', `chattest${timestamp}@test.com`);
    await page.fill('input[name="fullName"]', 'Chat Test User');
    await page.fill('input[name="company"]', 'Test Company');
    await page.fill('input[name="password"]', 'TestPassword123!');
    
    console.log('   📝 Creating test account...');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to step 2
    await page.waitForURL('**/step2.html', { timeout: 10000 });
    console.log('   ✅ Account created, on step 2');
    
    // Skip step 2
    const skipButton = await page.locator('button:has-text("Skip"), button:has-text("Continue")').first();
    if (await skipButton.isVisible()) {
      await skipButton.click();
      console.log('   ⏭️ Skipping to dashboard...');
    }
    
    // Wait for completion or dashboard
    await page.waitForTimeout(3000);
    
    // Check if we need to continue from completion page
    if (page.url().includes('completion')) {
      console.log('   🔄 On completion page, waiting for redirect...');
      
      // Wait for the setup to complete
      await page.waitForSelector('text=/Dashboard|Continue|Setup complete/i', { timeout: 15000 });
      
      // Click continue if available
      const continueBtn = await page.locator('button:has-text("Continue"), a:has-text("Dashboard")').first();
      if (await continueBtn.isVisible()) {
        await continueBtn.click();
      }
    }
    
    // Handle signin redirect
    if (page.url().includes('signin')) {
      console.log('   🔐 Redirected to signin, authenticating...');
      await page.fill('input[name="email"]', `chattest${timestamp}@test.com`);
      await page.fill('input[name="password"]', 'TestPassword123!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
    }
    
    // Now check the dashboard/chat interface
    const currentUrl = page.url();
    console.log(`   📍 Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('dashboard')) {
      console.log('\n   🎨 ANALYZING CHAT INTERFACE:\n');
      
      // Check for hamburger menu (should not be visible)
      const hamburger = await page.locator('.mobile-menu-toggle').isVisible().catch(() => false);
      console.log(`   ${!hamburger ? '✅' : '❌'} Hamburger menu: ${hamburger ? 'visible' : 'hidden'}`);
      
      // Find the chat input
      const chatInputSelectors = [
        '#quikchat-container .quikchat-input-textbox',
        'textarea[placeholder*="Message"]',
        'textarea[placeholder*="Type"]',
        '.chat-input',
        'textarea'
      ];
      
      let chatInput = null;
      for (const selector of chatInputSelectors) {
        const element = await page.locator(selector).first();
        if (await element.isVisible().catch(() => false)) {
          chatInput = element;
          break;
        }
      }
      
      if (chatInput) {
        const inputBox = await chatInput.boundingBox();
        console.log(`   ✅ Chat input found: ${Math.round(inputBox.width)}x${Math.round(inputBox.height)}px`);
        
        // Find the send button
        const sendButtonSelectors = [
          '#quikchat-container .quikchat-input-send-btn',
          '.send-button',
          'button[aria-label*="send"]',
          '.chat-input-container button',
          '.quikchat-input-area button'
        ];
        
        let sendButton = null;
        for (const selector of sendButtonSelectors) {
          const element = await page.locator(selector).first();
          if (await element.isVisible().catch(() => false)) {
            sendButton = element;
            break;
          }
        }
        
        if (sendButton) {
          const buttonBox = await sendButton.boundingBox();
          console.log(`   ✅ Send button found: ${Math.round(buttonBox.width)}x${Math.round(buttonBox.height)}px`);
          
          // Calculate positions
          const inputCenter = inputBox.y + (inputBox.height / 2);
          const buttonCenter = buttonBox.y + (buttonBox.height / 2);
          const verticalDiff = Math.abs(inputCenter - buttonCenter);
          
          const buttonRightEdge = buttonBox.x + buttonBox.width;
          const inputRightEdge = inputBox.x + inputBox.width;
          
          console.log('\n   📐 POSITION ANALYSIS:');
          console.log(`   Input position: x=${Math.round(inputBox.x)}, y=${Math.round(inputBox.y)}`);
          console.log(`   Button position: x=${Math.round(buttonBox.x)}, y=${Math.round(buttonBox.y)}`);
          console.log(`   Vertical alignment diff: ${Math.round(verticalDiff)}px`);
          
          // Check if button is inside or properly aligned with input
          const isVerticallyAligned = verticalDiff < 15; // Allow 15px tolerance
          const isInsideHorizontally = buttonBox.x > inputBox.x && buttonRightEdge <= inputRightEdge + 10;
          const isProperlyPositioned = isVerticallyAligned && isInsideHorizontally;
          
          console.log(`\n   ${isVerticallyAligned ? '✅' : '❌'} Vertically aligned: ${isVerticallyAligned}`);
          console.log(`   ${isInsideHorizontally ? '✅' : '❌'} Horizontally inside: ${isInsideHorizontally}`);
          console.log(`   ${isProperlyPositioned ? '✅' : '❌'} Overall positioning: ${isProperlyPositioned ? 'CORRECT' : 'NEEDS FIX'}`);
          
        } else {
          console.log('   ❌ Send button not found!');
        }
      } else {
        console.log('   ❌ Chat input not found!');
      }
      
      // Take screenshot for visual verification
      await page.screenshot({ 
        path: 'test-results/mobile-chat-interface.png',
        fullPage: false 
      });
      console.log('\n   📸 Screenshot saved: test-results/mobile-chat-interface.png');
      
    } else {
      console.log(`   ⚠️ Not on dashboard, current page: ${currentUrl}`);
    }
  });
});