const { chromium } = require('playwright');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function testSSERita() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Enable console logging
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('SSE') || text.includes('Conversation') || text.includes('📨') || text.includes('📬')) {
            console.log('BROWSER:', text);
        }
    });
    
    try {
        const timestamp = Date.now();
        const testEmail = `sse_test_${timestamp}@test.com`;
        const testPassword = 'Test123!';
        
        console.log('\n🎯 TESTING SSE WITH RITA CHAT');
        console.log('============================\n');
        
        // 1. Register user
        console.log('1️⃣  Registering user:', testEmail);
        await page.goto('http://localhost:5000');
        await page.waitForTimeout(2000);
        
        await page.fill('input[name="fullName"]', 'SSE Test User');
        await page.fill('input[name="email"]', testEmail);
        await page.fill('input[name="company"]', 'Test Corp');
        await page.fill('input[name="password"]', testPassword);
        await page.click('button:has-text("Continue")');
        
        await page.waitForURL('**/pages/step2.html', { timeout: 10000 });
        console.log('   ✅ User registered\n');
        
        // 2. Navigate to dashboard
        console.log('2️⃣  Going to dashboard...');
        try {
            const skipButton = page.locator('text=Skip this step');
            if (await skipButton.isVisible({ timeout: 3000 })) {
                await skipButton.click();
            }
        } catch (e) {
            await page.goto('http://localhost:5000/pages/dashboard.html');
        }
        
        await page.waitForTimeout(3000);
        console.log('   ✅ Dashboard loaded\n');
        
        // 3. Open Rita chat
        console.log('3️⃣  Opening Rita chat...');
        const ritaButton = await page.locator('#ritaButton, button:has-text("Rita"), .rita-toggle');
        if (await ritaButton.isVisible()) {
            await ritaButton.click();
            console.log('   ✅ Rita chat opened\n');
        }
        
        await page.waitForTimeout(2000);
        
        // 4. Send message via Rita
        console.log('4️⃣  Sending test message via Rita...');
        const ritaInput = await page.locator('#ritaInput');
        
        if (!await ritaInput.isVisible()) {
            console.log('   ❌ Rita input not visible');
            throw new Error('Rita input not found');
        }
        
        await ritaInput.fill('Test SSE message');
        
        // Find and click the send button
        const sendButton = await page.locator('.rita-send-btn, button[aria-label*="send"]').first();
        if (await sendButton.isVisible()) {
            await sendButton.click();
        } else {
            await ritaInput.press('Enter');
        }
        
        console.log('   ✅ Message sent\n');
        await page.waitForTimeout(3000);
        
        // 5. Check for conversation ID
        console.log('5️⃣  Getting conversation ID...');
        const conversationId = await page.evaluate(() => {
            // Check localStorage
            const stored = localStorage.getItem('currentConversationId');
            if (stored) return stored;
            
            // Check if there's a global chat instance
            if (window.chatInstance && window.chatInstance.conversationId) {
                return window.chatInstance.conversationId;
            }
            
            // Check Rita's data
            if (window.rita && window.rita.conversationId) {
                return window.rita.conversationId;
            }
            
            return null;
        });
        
        if (conversationId) {
            console.log('   ✅ Conversation ID:', conversationId, '\n');
        } else {
            console.log('   ⚠️  No conversation ID found, generating one...');
            const newConvId = `test-conv-${timestamp}`;
            console.log('   📝 Using test conversation ID:', newConvId, '\n');
        }
        
        // 6. Simulate Actions platform callback
        console.log('6️⃣  Simulating Actions platform callback...');
        const messageId = `msg_${timestamp}`;
        const aiResponse = `🎉 SSE TEST SUCCESS! This message came from the simulated Actions platform. Time: ${new Date().toLocaleTimeString()}`;
        
        const targetConvId = conversationId || `test-conv-${timestamp}`;
        
        const curlCommand = `curl -s -X POST 'http://localhost:5000/api/rag/chat-callback/${messageId}' \
          -H 'Content-Type: application/json' \
          -d '{
            "message_id": "${messageId}",
            "conversation_id": "${targetConvId}",
            "ai_response": "${aiResponse}",
            "status": "completed"
          }'`;
        
        console.log('   Sending callback to conversation:', targetConvId);
        const { stdout, stderr } = await execAsync(curlCommand);
        
        if (stderr) {
            console.error('   ⚠️  Curl stderr:', stderr);
        }
        
        console.log('   Callback response:', stdout, '\n');
        
        // 7. Check if message appears
        console.log('7️⃣  Checking for AI response in chat...');
        await page.waitForTimeout(5000);
        
        // Look for the AI response in various places
        const selectors = [
            `text="${aiResponse}"`,
            '.assistant-message',
            '.ai-message',
            '.rita-message.ai',
            '.quikchat-message',
            '[data-sender="assistant"]'
        ];
        
        let messageFound = false;
        for (const selector of selectors) {
            try {
                const element = await page.locator(selector).first();
                if (await element.isVisible({ timeout: 1000 })) {
                    const text = await element.textContent();
                    console.log(`   ✅ Found AI message with selector "${selector}"`);
                    console.log(`   📝 Content: ${text.substring(0, 100)}...`);
                    messageFound = true;
                    break;
                }
            } catch (e) {
                // Continue
            }
        }
        
        if (!messageFound) {
            console.log('   ❌ AI response not visible in chat');
            
            // Check browser console for SSE events
            const sseEvents = await page.evaluate(() => {
                return window.sseDebugLog || [];
            });
            
            if (sseEvents.length > 0) {
                console.log('   📊 SSE events logged:', sseEvents.length);
            }
        }
        
        await page.screenshot({ path: `sse-test-${timestamp}.png` });
        
        console.log('\n============================');
        console.log('📊 TEST COMPLETE');
        console.log('============================');
        console.log('Check screenshot: sse-test-' + timestamp + '.png');
        console.log('Browser will stay open for 20 seconds...');
        
        await page.waitForTimeout(20000);
        
    } catch (error) {
        console.error('Test failed:', error);
        await page.screenshot({ path: 'error-screenshot.png' });
    } finally {
        await browser.close();
    }
}

testSSERita().catch(console.error);