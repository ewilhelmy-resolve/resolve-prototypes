const { test, expect } = require('@playwright/test');

test.describe('Chat Scrolling Behavior', () => {

  test('validates chat input stays fixed while messages scroll', async ({ page }) => {
    // Generate unique user for this test
    const timestamp = Date.now();
    const testUser = {
      name: `Chat Test ${timestamp}`,
      email: `chattest${timestamp}@example.com`,
      company: `Test Company ${timestamp}`,
      password: 'TestPassword123!'
    };

    console.log(`\n🎭 TESTING CHAT SCROLLING WITH NEW USER: ${testUser.email}\n`);

    // ============= STEP 1: QUICK SIGNUP =============
    console.log('1️⃣ CREATING NEW ACCOUNT');
    
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Fill signup form
    await page.fill('input#fullName', testUser.name);
    await page.fill('input#email', testUser.email);
    await page.fill('input#company', testUser.company);
    await page.fill('input#password', testUser.password);
    await page.click('button:has-text("Continue")');
    
    console.log('   ✅ Account created');

    // ============= STEP 2: SKIP THROUGH ONBOARDING =============
    console.log('2️⃣ NAVIGATING THROUGH ONBOARDING');
    
    await page.waitForURL('**/step2.html');
    await page.click('button:has-text("Continue")');
    
    await page.waitForURL('**/completion.html');
    await page.waitForTimeout(5000); // Wait for completion animation
    await page.click('button:has-text("Continue to Dashboard")');
    
    console.log('   ✅ Onboarding completed');

    // ============= STEP 3: TEST CHAT ON DASHBOARD =============
    console.log('3️⃣ TESTING CHAT INTERFACE');
    
    await expect(page).toHaveTitle(/Dashboard - Resolve/);
    await expect(page.locator('h1')).toContainText('Ask Rita');
    
    // Verify chat container is present
    const chatContainer = page.locator('#quikchat-container');
    await expect(chatContainer).toBeVisible();
    console.log('   ✅ Chat container loaded');

    // ============= STEP 4: CHECK INITIAL LAYOUT =============
    console.log('4️⃣ CHECKING INITIAL LAYOUT');
    
    const initialLayout = await page.evaluate(() => {
      const input = document.querySelector('.quikchat-input-area');
      const messages = document.querySelector('.quikchat-messages-area');
      const viewport = window.innerHeight;
      
      if (!input || !messages) return null;
      
      return {
        inputBottom: input.getBoundingClientRect().bottom,
        inputTop: input.getBoundingClientRect().top,
        viewportHeight: viewport,
        messagesHeight: messages.clientHeight,
        messagesScrollHeight: messages.scrollHeight
      };
    });
    
    expect(initialLayout).not.toBeNull();
    expect(initialLayout.inputBottom).toBeLessThanOrEqual(initialLayout.viewportHeight);
    console.log(`   ✅ Input initially at bottom: ${initialLayout.inputBottom}px / ${initialLayout.viewportHeight}px`);

    // ============= STEP 5: ADD MANY MESSAGES =============
    console.log('5️⃣ ADDING MULTIPLE MESSAGES');
    
    // Add messages programmatically to test scrolling
    await page.evaluate(() => {
      const messagesArea = document.querySelector('.quikchat-messages-area');
      if (messagesArea) {
        // Add 20 messages to trigger scrolling
        for (let i = 1; i <= 20; i++) {
          const msgDiv = document.createElement('div');
          msgDiv.className = 'quikchat-message';
          msgDiv.innerHTML = `
            <div class="quikchat-message-user">${i % 2 === 0 ? 'You' : 'Ask Rita'}</div>
            <div class="quikchat-message-content">
              Test message ${i} - This is a message to verify that the chat area scrolls properly 
              while keeping the input field fixed at the bottom. The messages should scroll 
              within their container without pushing the input off screen.
            </div>
          `;
          messagesArea.appendChild(msgDiv);
        }
      }
    });
    
    await page.waitForTimeout(1000); // Allow DOM to settle
    console.log('   ✅ Added 20 test messages');

    // ============= STEP 6: VERIFY SCROLLING BEHAVIOR =============
    console.log('6️⃣ VERIFYING SCROLLING BEHAVIOR');
    
    const afterScrollLayout = await page.evaluate(() => {
      const input = document.querySelector('.quikchat-input-area');
      const messages = document.querySelector('.quikchat-messages-area');
      const viewport = window.innerHeight;
      
      if (!input || !messages) return null;
      
      const inputRect = input.getBoundingClientRect();
      
      return {
        inputBottom: inputRect.bottom,
        inputTop: inputRect.top,
        inputHeight: inputRect.height,
        viewportHeight: viewport,
        inputVisible: inputRect.bottom <= viewport && inputRect.top >= 0,
        messagesScrollable: messages.scrollHeight > messages.clientHeight,
        messagesScrollHeight: messages.scrollHeight,
        messagesClientHeight: messages.clientHeight,
        overflowY: window.getComputedStyle(messages).overflowY
      };
    });
    
    // Verify input stays at bottom
    expect(afterScrollLayout).not.toBeNull();
    expect(afterScrollLayout.inputVisible).toBe(true);
    expect(afterScrollLayout.inputBottom).toBeLessThanOrEqual(afterScrollLayout.viewportHeight);
    expect(afterScrollLayout.messagesScrollable).toBe(true);
    expect(afterScrollLayout.overflowY).toBe('auto');
    
    console.log('   ✅ Input still visible at bottom after messages added');
    console.log(`   📊 Messages area: ${afterScrollLayout.messagesScrollHeight}px content / ${afterScrollLayout.messagesClientHeight}px visible`);
    console.log(`   📍 Input position: ${afterScrollLayout.inputTop}px - ${afterScrollLayout.inputBottom}px`);

    // ============= STEP 7: TEST ACTUAL SCROLLING =============
    console.log('7️⃣ TESTING MESSAGE AREA SCROLLING');
    
    // Scroll messages area
    await page.evaluate(() => {
      const messages = document.querySelector('.quikchat-messages-area');
      if (messages) {
        messages.scrollTop = messages.scrollHeight;
      }
    });
    
    // Verify input still in place after scroll
    const afterUserScroll = await page.evaluate(() => {
      const input = document.querySelector('.quikchat-input-area');
      const messages = document.querySelector('.quikchat-messages-area');
      
      return {
        inputStillAtBottom: input ? input.getBoundingClientRect().bottom <= window.innerHeight : false,
        messagesScrolled: messages ? messages.scrollTop > 0 : false
      };
    });
    
    expect(afterUserScroll.inputStillAtBottom).toBe(true);
    expect(afterUserScroll.messagesScrolled).toBe(true);
    console.log('   ✅ Messages scrolled while input remained fixed');

    // ============= TEST COMPLETE =============
    console.log('\n' + '='.repeat(60));
    console.log('✅ CHAT SCROLLING BEHAVIOR VALIDATED!');
    console.log('='.repeat(60));
    console.log('\n📋 Test Results:');
    console.log('   ✅ New user onboarding completed');
    console.log('   ✅ Ask Rita chat interface loaded');
    console.log('   ✅ Input field stays fixed at bottom');
    console.log('   ✅ Messages scroll independently');
    console.log('   ✅ No UI elements pushed off screen');
    console.log(`\n🎯 User ${testUser.email} successfully tested chat scrolling!`);
  });
});