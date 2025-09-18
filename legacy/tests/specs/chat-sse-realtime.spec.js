const { test, expect, signInAsAdmin, waitForElement, BASE_URL } = require('../fixtures/simple-base');

test.describe('SSE Real Callback Test', () => {
    test('validates Actions platform callback updates chat in real-time', async ({ page }) => {
        // Test configuration
        const timestamp = Date.now();
        
        console.log('🎯 REAL SSE CALLBACK TEST');
        console.log('==========================');
        
        // 1. Use existing admin user instead of registering new user
        console.log('\n1️⃣  Signing in as admin user');
        await signInAsAdmin(page);
        console.log('   ✅ User authenticated');
        
        console.log('\n2️⃣  Dashboard loaded');
        
        // 3. Wait for chat interface to be ready (it should already be visible on dashboard)
        console.log('\n3️⃣  Waiting for chat interface...');
        await page.waitForTimeout(2000);
        
        // 4. Send initial message
        console.log('\n4️⃣  Sending initial message...');
        const chatInput = page.locator('textarea[placeholder*="Type a message"], textarea[placeholder*="Message Rita"], .quikchat-input-textbox');
        await expect(chatInput).toBeVisible({ timeout: 10000 });
        await chatInput.fill('Hello, this is a test message from Playwright');
        await chatInput.press('Enter');
        console.log('   ✅ Message sent');
        
        // 5. Extract conversation ID from browser console
        console.log('\n5️⃣  Extracting conversation ID...');
        
        // Wait for conversation to be established
        await page.waitForTimeout(2000);
        
        // Get conversation ID from localStorage or console
        const conversationId = await page.evaluate(() => {
            // Try localStorage first
            const stored = localStorage.getItem('currentConversationId');
            if (stored) return stored;
            
            // Try to find it in the page's JavaScript context
            if (window.ragChat && window.ragChat.conversationId) {
                return window.ragChat.conversationId;
            }
            
            // Look for it in the network responses (this would be in the chat response)
            return null;
        });
        
        if (!conversationId) {
            // Try to extract from console logs by re-sending a message
            await chatInput.fill('Getting conversation ID...');
            await chatInput.press('Enter');
            await page.waitForTimeout(1000);
            
            // Check again
            const convId = await page.evaluate(() => localStorage.getItem('currentConversationId'));
            if (!convId) {
                console.error('   ❌ Could not extract conversation ID');
                throw new Error('Failed to get conversation ID');
            }
            console.log('   ✅ Conversation ID:', convId);
        } else {
            console.log('   ✅ Conversation ID:', conversationId);
        }
        
        // 6. Get session token from cookies
        console.log('\n6️⃣  Getting session token...');
        const cookies = await page.context().cookies();
        const sessionCookie = cookies.find(c => c.name === 'sessionToken');
        
        if (!sessionCookie) {
            console.error('   ❌ No session token found');
            throw new Error('No session token');
        }
        
        const sessionToken = sessionCookie.value;
        console.log('   ✅ Session token:', sessionToken.substring(0, 20) + '...');
        
        // 7. Simulate Actions platform callback using page.request
        console.log('\n7️⃣  Simulating Actions platform callback...');
        
        const messageId = `msg_${timestamp}_playwright`;
        const aiResponse = `🤖 Hello from Actions Platform! This is an automated response to your message. Current time: ${new Date().toLocaleTimeString()}`;
        
        console.log('   📤 Sending callback via HTTP request...');
        
        // Add delay to avoid rate limiting
        await page.waitForTimeout(2000);
        
        try {
            const callbackResponse = await page.request.post(`/api/rag/chat-callback/${messageId}`, {
                data: {
                    message_id: messageId,
                    conversation_id: conversationId || await page.evaluate(() => localStorage.getItem('currentConversationId')),
                    ai_response: aiResponse,
                    status: "completed",
                    sources: ["Knowledge Base", "Documentation"],
                    confidence: 0.95,
                    response_time_ms: 150
                }
            });
            
            if (callbackResponse.ok()) {
                console.log('   ✅ Callback sent successfully');
            } else {
                console.log(`   ⚠️  Callback failed with status: ${callbackResponse.status()}`);
            }
        } catch (error) {
            console.error('   ❌ Failed to send callback:', error.message);
        }
        
        // 8. Wait and verify message appears in chat
        console.log('\n8️⃣  Waiting for message to appear in chat...');
        await page.waitForTimeout(3000);
        
        // Look for the AI response in the chat
        const aiMessage = page.locator(`text="${aiResponse}"`).first();
        const messageVisible = await aiMessage.isVisible().catch(() => false);
        
        if (messageVisible) {
            console.log('   ✅ AI response appeared in chat!');
            
            // Take screenshot for proof
            await page.screenshot({ 
                path: `/tmp/test-results/sse-callback-success-${timestamp}.png`,
                fullPage: false 
            });
            console.log('   📸 Screenshot saved');
        } else {
            // Try to find any AI message
            const anyAiMessage = await page.locator('.assistant-message, .ai-message, [data-role="assistant"]').last();
            if (await anyAiMessage.isVisible()) {
                const content = await anyAiMessage.textContent();
                console.log('   ⚠️  Found AI message but different content:', content);
            } else {
                console.log('   ❌ No AI response found in chat');
            }
            
            // Take screenshot of failure
            await page.screenshot({ 
                path: `/tmp/test-results/sse-callback-fail-${timestamp}.png`,
                fullPage: false 
            });
        }
        
        // 9. Send another callback to confirm it's working
        console.log('\n9️⃣  Sending second callback...');
        
        const secondMessageId = `msg_${timestamp}_2`;
        const secondResponse = `🎯 Second message: The SSE boomerang is working perfectly! Timestamp: ${Date.now()}`;
        
        try {
            await page.request.post(`/api/rag/chat-callback/${secondMessageId}`, {
                data: {
                    message_id: secondMessageId,
                    conversation_id: conversationId || await page.evaluate(() => localStorage.getItem('currentConversationId')),
                    ai_response: secondResponse,
                    status: "completed"
                }
            });
        } catch (error) {
            console.error('   ❌ Failed to send second callback:', error.message);
        }
        
        await page.waitForTimeout(2000);
        
        const secondMessage = page.locator(`text="${secondResponse}"`).first();
        const secondVisible = await secondMessage.isVisible().catch(() => false);
        
        if (secondVisible) {
            console.log('   ✅ Second message also appeared!');
        } else {
            console.log('   ⚠️  Second message not visible');
        }
        
        // Final validation
        console.log('\n============================');
        console.log('📊 TEST RESULTS:');
        console.log('============================');
        console.log(`User: ${testEmail}`);
        console.log(`Conversation: ${conversationId || 'extracted'}`);
        console.log(`First callback: ${messageVisible ? '✅ SUCCESS' : '❌ FAILED'}`);
        console.log(`Second callback: ${secondVisible ? '✅ SUCCESS' : '❌ FAILED'}`);
        
        // Assert at least one message appeared
        expect(messageVisible || secondVisible).toBeTruthy();
    });
});