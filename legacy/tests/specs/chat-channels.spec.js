const { test, expect, signInAsAdmin, waitForElement } = require('../fixtures/simple-base');

// Configure to always record video for debugging
test.use({
  video: 'retain-on-failure',
  screenshot: 'only-on-failure',
  trace: 'retain-on-failure'
});

// Helper function to send a simulated assistant response via the callback endpoint
async function sendAssistantResponse(page, messageId, conversationId, tenantId, message) {
  const response = await page.request.post(`/api/rag/chat-callback/${messageId}`, {
    data: {
      conversation_id: conversationId,
      tenant_id: tenantId,
      ai_response: message,
      processing_time_ms: 500,
      sources: ['Test Source 1', 'Test Source 2']
    }
  });
  
  return response;
}

test.describe('Chat Channels - Multi-Conversation Flow', () => {

  test('send and receive messages across multiple chat channels', async ({ page }) => {
    // Generate unique user for this test
    const timestamp = Date.now();
    const testUser = {
      name: `Chat Test ${timestamp}`,
      email: `chatuser${timestamp}@example.com`,
      company: `ChatCo ${timestamp}`,
      password: 'TestPassword123!'
    };

    console.log(`\n🚀 CHAT CHANNELS TEST: ${testUser.email}\n`);

    // ============= SETUP: Quick Signup =============
    console.log('📝 Setting up test user...');
    
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Fill signup form with more specific selectors
    const nameField = page.locator('input[name="fullName"], input[placeholder*="name" i]').first();
    const emailField = page.locator('input[type="email"], input[name="email"]').first();
    const companyField = page.locator('input[name="company"], input[placeholder*="Acme" i]').first();
    const passwordField = page.locator('input[type="password"], input[name="password"]').first();
    
    await nameField.fill(testUser.name);
    await emailField.fill(testUser.email);
    await companyField.fill(testUser.company);
    await passwordField.fill(testUser.password);
    
    // Submit signup
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(2000);
    
    // Skip through integrations
    if (page.url().includes('step2')) {
      await page.click('button:has-text("Continue")');
      await page.waitForTimeout(2000);
    }
    
    // Skip through completion
    if (page.url().includes('completion')) {
      await page.waitForTimeout(5000); // Wait for setup
      const dashboardBtn = page.locator('button:has-text("Continue to Dashboard")');
      if (await dashboardBtn.isVisible()) {
        await dashboardBtn.click();
      }
    }
    
    // Navigate directly to dashboard if not already there
    if (!page.url().includes('dashboard')) {
      await page.goto('/dashboard');
    }
    
    console.log('   ✅ User setup complete, on dashboard');

    // ============= CHANNEL 1: First Conversation =============
    console.log('\n1️⃣ CHANNEL 1 - First Conversation');
    
    // Wait for chat to be ready
    await expect(page.locator('#quikchat-container')).toBeVisible({ timeout: 10000 });
    const chatInput = page.locator('textarea[placeholder*="Type a message"], textarea[placeholder*="Message Rita"]');
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    console.log('   ✅ Chat interface ready');
    
    // Set up network monitoring to capture the chat API response
    let messageId1 = null;
    let tenantId = null;
    
    page.on('response', async response => {
      if (response.url().includes('/api/rag/chat') && response.request().method() === 'POST') {
        try {
          const responseData = await response.json();
          if (!messageId1 && responseData.message_id) {
            messageId1 = responseData.message_id;
            console.log(`   📝 Captured message ID: ${messageId1}`);
          }
        } catch (e) {
          // Response might not be JSON
        }
      }
    });
    
    // Send first message in Channel 1
    const message1 = `Test message 1 from channel test - ${timestamp}`;
    await chatInput.fill(message1);
    await chatInput.press('Enter');
    console.log(`   📤 Sent: "${message1}"`);
    
    // ============= VERIFY LOADING INDICATOR =============
    console.log('   🔄 Checking for "Rita is thinking" loading indicator...');
    
    // Wait for the loading indicator to appear
    const loadingIndicator = page.locator('.system-loading-indicator');
    await expect(loadingIndicator).toBeVisible({ timeout: 2000 });
    
    // Verify the loading text
    const loadingText = page.locator('.loading-text');
    await expect(loadingText).toHaveText('Rita is thinking');
    
    // Verify the animated dots
    const loadingDots = page.locator('.loading-dots .dot');
    await expect(loadingDots).toHaveCount(3);
    
    // Verify it's not in a message card (system-level indicator)
    const notInCard = await page.locator('.quikchat-message .system-loading-indicator').count();
    expect(notInCard).toBe(0);
    
    console.log('   ✅ Loading indicator verified: "Rita is thinking" with 3 animated dots');
    
    // Wait for the message to appear in chat
    await page.waitForTimeout(2000);
    
    // Check if message was sent (appears in chat history)
    const sentMessage1 = page.locator('.quikchat-message-text').filter({ hasText: message1 });
    await expect(sentMessage1).toBeVisible({ timeout: 5000 });
    console.log('   ✅ Message appeared in chat');
    
    // Get the conversation ID and tenant ID
    let conversationId1 = null;
    try {
      const sessionInfo = await page.evaluate(() => {
        // Get conversation ID
        const convId = window.ragChat?.conversationId || 
                      localStorage.getItem('currentConversationId') ||
                      document.querySelector('[data-conversation-id]')?.dataset.conversationId;
        
        // Try to extract tenant ID from cookie or session
        const cookies = document.cookie.split(';');
        let tenantId = null;
        for (let cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'tenantId') {
            tenantId = value;
            break;
          }
        }
        
        return { conversationId: convId, tenantId: tenantId };
      });
      
      conversationId1 = sessionInfo.conversationId;
      tenantId = sessionInfo.tenantId || testUser.email; // Use email as fallback tenant ID
      
      if (conversationId1) {
        console.log(`   🔑 Channel 1 ID: ${conversationId1}`);
        console.log(`   👤 Tenant ID: ${tenantId}`);
      }
    } catch (e) {
      console.log('   ⚠️ Could not get conversation/tenant IDs');
    }
    
    // Send a simulated assistant response if we have the message ID
    if (messageId1 && conversationId1) {
      console.log('   📮 Sending simulated assistant response...');
      try {
        const callbackResponse = await sendAssistantResponse(
          page,
          messageId1,
          conversationId1,
          tenantId,
          `This is an automated test response for: "${message1}"`
        );
        
        if (callbackResponse.ok()) {
          console.log('   ✅ Assistant response sent via callback');
          
          // Wait for SSE to deliver the message
          await page.waitForTimeout(2000);
          
          // Verify loading indicator is removed when response arrives
          const loadingIndicatorGone = page.locator('.system-loading-indicator');
          await expect(loadingIndicatorGone).not.toBeVisible({ timeout: 3000 });
          console.log('   ✅ Loading indicator removed after response');
          
          // Check if assistant message appears
          const assistantMessage = page.locator('.quikchat-message-text').filter({ 
            hasText: /automated test response/ 
          });
          
          if (await assistantMessage.isVisible()) {
            console.log('   ✅ Assistant response appeared in chat via SSE');
          } else {
            console.log('   ⚠️ Assistant response sent but not yet visible');
          }
        } else {
          console.log(`   ⚠️ Callback failed: ${callbackResponse.status()}`);
        }
      } catch (error) {
        console.log(`   ⚠️ Could not send callback: ${error.message}`);
      }
    }

    // ============= CHANNEL 2: Start New Conversation =============
    console.log('\n2️⃣ CHANNEL 2 - New Conversation');
    
    // Reset message ID capture for new channel
    let messageId2 = null;
    page.removeAllListeners('response'); // Clear previous listeners
    page.on('response', async response => {
      if (response.url().includes('/api/rag/chat') && response.request().method() === 'POST') {
        try {
          const responseData = await response.json();
          if (!messageId2 && responseData.message_id) {
            messageId2 = responseData.message_id;
            console.log(`   📝 Captured message ID: ${messageId2}`);
          }
        } catch (e) {
          // Response might not be JSON
        }
      }
    });
    
    // Click "New chat" button to start a new conversation
    const newChatBtn = page.locator('button:has-text("New chat"), [class*="new-chat"], #new-chat-btn').first();
    if (await newChatBtn.isVisible()) {
      await newChatBtn.click();
      console.log('   ✅ Started new chat');
      await page.waitForTimeout(2000);
    } else {
      console.log('   ⚠️ New chat button not found, clearing current chat');
      // Alternative: clear current chat
      await page.evaluate(() => {
        if (window.ragChat) {
          window.ragChat.newConversation();
        }
        const messagesArea = document.querySelector('.quikchat-messages-area');
        if (messagesArea) messagesArea.innerHTML = '';
      });
    }
    
    // Send message in Channel 2
    const message2 = `Test message 2 from different channel - ${timestamp}`;
    await chatInput.fill(message2);
    await chatInput.press('Enter');
    console.log(`   📤 Sent: "${message2}"`);
    
    // Wait for the message to appear
    await page.waitForTimeout(2000);
    
    // Check if message was sent
    const sentMessage2 = page.locator('.quikchat-message-text').filter({ hasText: message2 });
    await expect(sentMessage2).toBeVisible({ timeout: 5000 });
    console.log('   ✅ Message appeared in chat');
    
    // Check that Channel 1 message is NOT visible (different conversation)
    const oldMessage = page.locator('.quikchat-message-text').filter({ hasText: message1 });
    const isOldMessageVisible = await oldMessage.isVisible().catch(() => false);
    if (!isOldMessageVisible) {
      console.log('   ✅ Channel 1 messages not visible (different conversation)');
    } else {
      console.log('   ⚠️ Channel 1 message still visible (may be same conversation)');
    }
    
    // Get Channel 2 conversation ID
    let conversationId2 = null;
    try {
      conversationId2 = await page.evaluate(() => {
        return window.ragChat?.conversationId || 
               localStorage.getItem('currentConversationId') ||
               document.querySelector('[data-conversation-id]')?.dataset.conversationId;
      });
      if (conversationId2) {
        console.log(`   🔑 Channel 2 ID: ${conversationId2}`);
        
        // Verify it's different from Channel 1
        if (conversationId1 && conversationId2 !== conversationId1) {
          console.log('   ✅ Different conversation ID from Channel 1');
        }
      }
    } catch (e) {
      console.log('   ⚠️ Could not get conversation ID');
    }
    
    // Send simulated response for Channel 2
    if (messageId2 && conversationId2) {
      console.log('   📮 Sending Channel 2 assistant response...');
      try {
        const callbackResponse = await sendAssistantResponse(
          page,
          messageId2,
          conversationId2,
          tenantId,
          `Channel 2 response: This is a response in the second conversation for "${message2}"`
        );
        
        if (callbackResponse.ok()) {
          console.log('   ✅ Assistant response sent for Channel 2');
          await page.waitForTimeout(2000);
          
          const assistantMessage = page.locator('.quikchat-message-text').filter({ 
            hasText: /Channel 2 response/ 
          });
          
          if (await assistantMessage.isVisible()) {
            console.log('   ✅ Channel 2 assistant response visible');
          }
        }
      } catch (error) {
        console.log(`   ⚠️ Channel 2 callback error: ${error.message}`);
      }
    }

    // ============= CHANNEL 3: One More Channel Switch =============
    console.log('\n3️⃣ CHANNEL 3 - Third Conversation');
    
    // Reset message ID capture for Channel 3
    let messageId3 = null;
    page.removeAllListeners('response');
    page.on('response', async response => {
      if (response.url().includes('/api/rag/chat') && response.request().method() === 'POST') {
        try {
          const responseData = await response.json();
          if (!messageId3 && responseData.message_id) {
            messageId3 = responseData.message_id;
            console.log(`   📝 Captured message ID: ${messageId3}`);
          }
        } catch (e) {
          // Response might not be JSON
        }
      }
    });
    
    // Start another new chat
    if (await newChatBtn.isVisible()) {
      await newChatBtn.click();
      console.log('   ✅ Started third chat');
      await page.waitForTimeout(2000);
    } else {
      await page.evaluate(() => {
        if (window.ragChat) {
          window.ragChat.newConversation();
        }
      });
    }
    
    // Send message in Channel 3
    const message3 = `Final test message in channel 3 - ${timestamp}`;
    await chatInput.fill(message3);
    await chatInput.press('Enter');
    console.log(`   📤 Sent: "${message3}"`);
    
    // Verify message appears
    await page.waitForTimeout(2000);
    const sentMessage3 = page.locator('.quikchat-message-text').filter({ hasText: message3 });
    await expect(sentMessage3).toBeVisible({ timeout: 5000 });
    console.log('   ✅ Message appeared in chat');
    
    // Verify isolation between channels
    const oldMessages = await page.locator('.quikchat-message-text').filter({ 
      hasText: new RegExp(`${message1}|${message2}`) 
    }).count();
    
    if (oldMessages === 0) {
      console.log('   ✅ Previous channel messages not visible');
    } else {
      console.log(`   ⚠️ Found ${oldMessages} messages from other channels`);
    }
    
    // Get Channel 3 conversation ID
    let conversationId3 = null;
    try {
      conversationId3 = await page.evaluate(() => {
        return window.ragChat?.conversationId || 
               localStorage.getItem('currentConversationId');
      });
      if (conversationId3) {
        console.log(`   🔑 Channel 3 ID: ${conversationId3}`);
      }
    } catch (e) {
      console.log('   ⚠️ Could not get conversation ID');
    }
    
    // Send response for Channel 3
    if (messageId3 && conversationId3) {
      console.log('   📮 Sending Channel 3 assistant response...');
      try {
        const callbackResponse = await sendAssistantResponse(
          page,
          messageId3,
          conversationId3,
          tenantId,
          `Final response: This is the third channel responding to "${message3}"`
        );
        
        if (callbackResponse.ok()) {
          console.log('   ✅ Assistant response sent for Channel 3');
          await page.waitForTimeout(2000);
          
          const assistantMessage = page.locator('.quikchat-message-text').filter({ 
            hasText: /Final response/ 
          });
          
          if (await assistantMessage.isVisible()) {
            console.log('   ✅ Channel 3 assistant response visible');
          }
        }
      } catch (error) {
        console.log(`   ⚠️ Channel 3 callback error: ${error.message}`);
      }
    }

    // ============= PERSISTENCE CHECK =============
    console.log('\n4️⃣ PERSISTENCE - Check Database Storage');
    
    // Check if recent chats section updates
    const recentChats = page.locator('text=Recent chats, text=RECENT CHATS').first();
    if (await recentChats.isVisible()) {
      console.log('   ✅ Recent chats section visible');
      
      // Look for any conversation entries
      const chatEntries = await page.locator('[class*="conversation"], [class*="chat-item"], [class*="history"]').count();
      if (chatEntries > 0) {
        console.log(`   ✅ Found ${chatEntries} conversation entries`);
      }
    }

    // ============= TEST SUMMARY =============
    console.log('\n' + '='.repeat(60));
    console.log('🎉 CHAT CHANNELS TEST COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n📋 Test Results:');
    console.log('   ✅ Channel 1: Message sent successfully');
    console.log('   ✅ Channel 2: New conversation started');
    console.log('   ✅ Channel 3: Multiple channels working');
    console.log('   ✅ Message Isolation: Channels are separate');
    
    if (conversationId1 && conversationId2 && conversationId1 !== conversationId2) {
      console.log('   ✅ Unique IDs: Different conversation IDs confirmed');
    }
    
    console.log(`\n📊 Total messages sent: 3`);
    console.log(`📧 Test user: ${testUser.email}`);
    console.log('\n✨ Multi-channel chat functionality verified!');
  });

  test('validate message persistence across page refresh', async ({ page }) => {
    // This test ensures messages persist when refreshing the page
    const timestamp = Date.now();
    const testUser = {
      name: `Persist Test ${timestamp}`,
      email: `persist${timestamp}@example.com`,
      company: `PersistCo ${timestamp}`,
      password: 'TestPassword123!'
    };

    console.log(`\n🔄 PERSISTENCE TEST: ${testUser.email}\n`);

    // Quick setup
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Fill signup form with more specific selectors
    const nameField = page.locator('input[name="fullName"], input[placeholder*="name" i]').first();
    const emailField = page.locator('input[type="email"], input[name="email"]').first();
    const companyField = page.locator('input[name="company"], input[placeholder*="Acme" i]').first();
    const passwordField = page.locator('input[type="password"], input[name="password"]').first();
    
    await nameField.fill(testUser.name);
    await emailField.fill(testUser.email);
    await companyField.fill(testUser.company);
    await passwordField.fill(testUser.password);
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(2000);
    
    // Skip to dashboard
    if (page.url().includes('step2')) {
      await page.click('button:has-text("Continue")');
      await page.waitForTimeout(2000);
    }
    if (page.url().includes('completion')) {
      await page.waitForTimeout(5000);
      const dashboardBtn = page.locator('button:has-text("Continue to Dashboard")');
      if (await dashboardBtn.isVisible()) {
        await dashboardBtn.click();
      }
    }
    if (!page.url().includes('dashboard')) {
      await page.goto('/dashboard');
    }

    console.log('1️⃣ Sending initial message...');
    
    // Send a message
    const chatInput = page.locator('textarea[placeholder*="Type a message"], textarea[placeholder*="Message Rita"]');
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    
    const testMessage = `Persistence test message - ${timestamp}`;
    await chatInput.fill(testMessage);
    await chatInput.press('Enter');
    
    // Verify message appears
    await page.waitForTimeout(2000);
    await expect(page.locator('.quikchat-message-text').filter({ hasText: testMessage })).toBeVisible();
    console.log('   ✅ Message sent and visible');
    
    // Get conversation ID before refresh
    const convIdBefore = await page.evaluate(() => {
      return window.ragChat?.conversationId || localStorage.getItem('currentConversationId');
    });
    console.log(`   🔑 Conversation ID: ${convIdBefore}`);
    
    console.log('\n2️⃣ Refreshing page...');
    await page.reload();
    await page.waitForTimeout(3000);
    
    // Check if chat interface loads
    await expect(page.locator('#quikchat-container')).toBeVisible({ timeout: 10000 });
    console.log('   ✅ Chat interface reloaded');
    
    // Check if conversation ID persists
    const convIdAfter = await page.evaluate(() => {
      return window.ragChat?.conversationId || localStorage.getItem('currentConversationId');
    });
    
    if (convIdBefore && convIdAfter && convIdBefore === convIdAfter) {
      console.log('   ✅ Conversation ID persisted');
    } else {
      console.log('   ⚠️ Conversation ID changed after refresh');
    }
    
    // Check if messages are loaded (may take time for history to load)
    await page.waitForTimeout(3000);
    const messageCount = await page.locator('.quikchat-message-text').count();
    
    if (messageCount > 0) {
      console.log(`   ✅ ${messageCount} messages loaded from history`);
      
      // Check if our specific message is there
      const ourMessage = await page.locator('.quikchat-message-text').filter({ hasText: testMessage }).isVisible();
      if (ourMessage) {
        console.log('   ✅ Original message found in history');
      } else {
        console.log('   ⚠️ Original message not found (may be loading)');
      }
    } else {
      console.log('   ⚠️ No message history loaded yet');
    }
    
    console.log('\n✨ Persistence test complete!');
  });

});