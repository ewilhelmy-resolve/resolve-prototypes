// Quick test script to validate mobile dashboard improvements
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Set mobile viewport
  await page.setViewportSize({ width: 393, height: 852 });
  
  console.log('📱 Testing Mobile Dashboard Interface...\n');
  
  try {
    // Navigate to signin
    await page.goto('http://localhost:5000/signin');
    console.log('✅ Loaded signin page');
    
    // Sign in with test account
    await page.fill('input[name="email"]', 'john.doe@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.press('input[name="password"]', 'Enter');
    
    // Wait for dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✅ Logged in to dashboard\n');
    
    // Wait for QuikChat to load
    await page.waitForSelector('#quikchat-container', { timeout: 5000 });
    console.log('✅ QuikChat container loaded');
    
    // Check if mobile CSS is loaded
    const mobileCSS = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      return sheets.some(sheet => {
        try {
          return sheet.href && sheet.href.includes('mobile-chat-complete-fix.css');
        } catch(e) {
          return false;
        }
      });
    });
    console.log(`✅ Mobile CSS loaded: ${mobileCSS}\n`);
    
    // Check chat elements
    const elements = await page.evaluate(() => {
      const container = document.querySelector('#quikchat-container');
      const messagesArea = document.querySelector('.quikchat-messages-area');
      const inputArea = document.querySelector('.quikchat-input-area');
      const textarea = document.querySelector('.quikchat-input-textbox');
      const sendBtn = document.querySelector('.quikchat-input-send-btn');
      
      return {
        container: !!container,
        messagesArea: !!messagesArea,
        inputArea: !!inputArea,
        textarea: !!textarea,
        sendBtn: !!sendBtn
      };
    });
    
    console.log('📋 Chat Elements Status:');
    console.log(`   Container: ${elements.container ? '✅' : '❌'}`);
    console.log(`   Messages Area: ${elements.messagesArea ? '✅' : '❌'}`);
    console.log(`   Input Area: ${elements.inputArea ? '✅' : '❌'}`);
    console.log(`   Textarea: ${elements.textarea ? '✅' : '❌'}`);
    console.log(`   Send Button: ${elements.sendBtn ? '✅' : '❌'}\n`);
    
    // Check input area positioning
    const inputStyles = await page.evaluate(() => {
      const inputArea = document.querySelector('.quikchat-input-area');
      if (!inputArea) return null;
      
      const styles = window.getComputedStyle(inputArea);
      const bbox = inputArea.getBoundingClientRect();
      
      return {
        position: styles.position,
        bottom: styles.bottom,
        borderTop: styles.borderTop,
        background: styles.background,
        zIndex: styles.zIndex,
        boundingBox: {
          y: bbox.y,
          height: bbox.height,
          bottom: bbox.bottom
        }
      };
    });
    
    if (inputStyles) {
      console.log('🎨 Input Area Styles:');
      console.log(`   Position: ${inputStyles.position}`);
      console.log(`   Bottom: ${inputStyles.bottom}`);
      console.log(`   Border Top: ${inputStyles.borderTop}`);
      console.log(`   Z-Index: ${inputStyles.zIndex}`);
      console.log(`   Y Position: ${inputStyles.boundingBox.y}px`);
      console.log(`   Height: ${inputStyles.boundingBox.height}px`);
      
      const isAtBottom = inputStyles.boundingBox.bottom >= (852 - 100);
      console.log(`   At bottom of viewport: ${isAtBottom ? '✅' : '❌'}\n`);
    }
    
    // Check message attribution styles
    const messageStyles = await page.evaluate(() => {
      // Check if ::before pseudo-elements are styled
      const testElement = document.createElement('div');
      testElement.className = 'quikchat-message right';
      document.body.appendChild(testElement);
      
      const styles = window.getComputedStyle(testElement, '::before');
      const content = styles.content;
      
      document.body.removeChild(testElement);
      
      return {
        hasContent: content && content !== 'none',
        content: content
      };
    });
    
    console.log('💬 Message Attribution:');
    console.log(`   Labels configured: ${messageStyles.hasContent ? '✅' : '❌'}`);
    if (messageStyles.hasContent) {
      console.log(`   Label content: ${messageStyles.content}\n`);
    }
    
    // Type a test message
    await page.fill('.quikchat-input-textbox', 'Testing mobile interface improvements');
    console.log('✅ Typed test message');
    
    // Check textarea didn't scroll off screen
    const textareaVisible = await page.locator('.quikchat-input-textbox').isVisible();
    console.log(`✅ Textarea still visible: ${textareaVisible}\n`);
    
    // Take screenshot
    await page.screenshot({ path: 'mobile-dashboard-test.png', fullPage: false });
    console.log('📸 Screenshot saved as mobile-dashboard-test.png\n');
    
    console.log('✨ Mobile Dashboard Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  // Keep browser open for manual inspection
  console.log('\n👀 Browser will stay open for 30 seconds for manual inspection...');
  await page.waitForTimeout(30000);
  
  await browser.close();
})();