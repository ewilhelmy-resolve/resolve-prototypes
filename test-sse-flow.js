const { chromium } = require('playwright');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function testSSEFlow() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Enable console logging
    page.on('console', msg => {
        if (msg.text().includes('SSE') || msg.text().includes('Conversation ID') || msg.text().includes('📨')) {
            console.log('BROWSER:', msg.text());
        }
    });
    
    try {
        const timestamp = Date.now();
        const testEmail = `sse_test_${timestamp}@test.com`;
        const testPassword = 'Test123!';
        
        console.log('\n🎯 TESTING SSE FLOW LOCALLY');
        console.log('============================\n');
        
        // 1. Register user
        console.log('1️⃣  Registering user:', testEmail);
        await page.goto('http://localhost:5000');
        await page.waitForTimeout(2000);
        
        // The landing page has the registration form directly
        await page.fill('input[name="fullName"]', 'SSE Test User');
        await page.fill('input[name="email"]', testEmail);
        await page.fill('input[name="company"]', 'Test Corp');
        await page.fill('input[name="password"]', testPassword);
        await page.click('button:has-text("Continue")');
        
        await page.waitForURL('**/pages/step2.html');
        console.log('   ✅ User registered\n');
        
        // 2. Go to dashboard
        console.log('2️⃣  Navigating to dashboard...');
        
        // Try to skip step 2 or go directly
        try {
            const skipButton = page.locator('text=Skip this step');
            if (await skipButton.isVisible({ timeout: 5000 })) {
                await skipButton.click();
            }
        } catch (e) {
            console.log('   Skip button not found, navigating directly...');
            await page.goto('http://localhost:5000/pages/dashboard.html');
        }
        
        await page.waitForTimeout(3000);
        console.log('   ✅ Dashboard loaded\n');
        
        // 3. Chat should be already visible in dashboard
        console.log('3️⃣  Chat widget should be embedded in dashboard...');
        
        // Wait for QuikChat to initialize
        await page.waitForTimeout(5000);
        
        // Check if QuikChat instance exists
        const hasQuikChat = await page.evaluate(() => {
            return window.chatInstance !== undefined;
        });
        console.log('   QuikChat initialized:', hasQuikChat);
        
        // Take a screenshot to see what's on the page
        await page.screenshot({ path: 'dashboard-view.png' });
        
        // 4. Send a message - look inside the quikchat container
        console.log('4️⃣  Looking for chat input...');
        
        // Try various selectors for the chat input
        const selectors = [
            '#quikchat-container input',
            '#quikchat-container textarea',
            '.quikchat-input',
            '.quikchat-input input',
            '.quikchat input',
            'input[placeholder*="Type"]',
            'input[placeholder*="message"]',
            'textarea[placeholder*="message"]',
            '.chat-input input',
            '.message-input',
            '.quikchat-container input',
            'input.quikchat'
        ];
        
        let chatInput = null;
        for (const selector of selectors) {
            try {
                const element = page.locator(selector).first();
                if (await element.isVisible({ timeout: 1000 })) {
                    chatInput = element;
                    console.log(`   ✅ Found chat input with selector: ${selector}`);
                    break;
                }
            } catch (e) {
                // Continue to next selector
            }
        }
        
        if (!chatInput) {
            // List all visible inputs for debugging
            const allInputs = await page.locator('input, textarea').all();
            console.log(`   Found ${allInputs.length} input elements on page`);
            for (const input of allInputs) {
                const placeholder = await input.getAttribute('placeholder');
                const type = await input.getAttribute('type');
                const id = await input.getAttribute('id');
                console.log(`     - ${type} input: id="${id}", placeholder="${placeholder}"`);
            }
        }
        
        if (!chatInput || !await chatInput.isVisible()) {
            console.log('   ❌ Chat input not visible');
            await page.screenshot({ path: 'chat-not-visible.png' });
            throw new Error('Chat input not found');
        }
        
        await chatInput.fill('Hello, this is a test message');
        await chatInput.press('Enter');
        console.log('   ✅ Message sent\n');
        
        // Wait for response
        await page.waitForTimeout(3000);
        
        // 5. Extract conversation ID
        console.log('5️⃣  Extracting conversation ID...');
        const conversationId = await page.evaluate(() => {
            return localStorage.getItem('currentConversationId');
        });
        
        if (!conversationId) {
            console.log('   ❌ No conversation ID found');
            throw new Error('Failed to get conversation ID');
        }
        
        console.log('   ✅ Conversation ID:', conversationId, '\n');
        
        // 6. Get session token
        const cookies = await context.cookies();
        const sessionCookie = cookies.find(c => c.name === 'sessionToken');
        const sessionToken = sessionCookie ? sessionCookie.value : null;
        
        // 7. Simulate Actions platform callback
        console.log('6️⃣  Simulating Actions platform callback...');
        const messageId = `msg_${timestamp}`;
        const aiResponse = `🎉 SUCCESS! This is the Actions platform responding. The SSE system is working correctly. Time: ${new Date().toLocaleTimeString()}`;
        
        const curlCommand = `curl -s -X POST 'http://localhost:5000/api/rag/chat-callback/${messageId}' \
          -H 'Content-Type: application/json' \
          -d '{
            "message_id": "${messageId}",
            "conversation_id": "${conversationId}",
            "ai_response": "${aiResponse}",
            "status": "completed"
          }'`;
        
        console.log('   Sending callback...');
        const { stdout, stderr } = await execAsync(curlCommand);
        
        if (stderr) {
            console.error('   ⚠️  Curl stderr:', stderr);
        }
        
        console.log('   Callback response:', stdout);
        
        // 8. Wait and check if message appears
        console.log('\n7️⃣  Waiting for message to appear in chat...');
        await page.waitForTimeout(5000);
        
        // Look for the AI response
        const messageVisible = await page.locator(`text="${aiResponse}"`).isVisible().catch(() => false);
        
        if (messageVisible) {
            console.log('   ✅ AI RESPONSE APPEARED IN CHAT!');
            await page.screenshot({ path: `sse-success-${timestamp}.png` });
        } else {
            // Check for any AI messages
            const anyAiMessage = await page.locator('.assistant-message, .ai-message, [data-sender="Assistant"]').last();
            if (await anyAiMessage.isVisible()) {
                const content = await anyAiMessage.textContent();
                console.log('   ⚠️  Found AI message but different:', content);
            } else {
                console.log('   ❌ NO AI RESPONSE IN CHAT');
            }
            await page.screenshot({ path: `sse-fail-${timestamp}.png` });
        }
        
        // Keep browser open for manual inspection
        console.log('\n============================');
        console.log('📊 TEST COMPLETE');
        console.log('============================');
        console.log('Browser will stay open for 30 seconds for inspection...');
        await page.waitForTimeout(30000);
        
    } catch (error) {
        console.error('Test failed:', error);
        await page.screenshot({ path: 'error-screenshot.png' });
    } finally {
        await browser.close();
    }
}

testSSEFlow().catch(console.error);