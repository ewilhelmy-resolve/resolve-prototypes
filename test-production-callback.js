#!/usr/bin/env node

const axios = require('axios');

async function testProductionCallback() {
    console.log('🧪 Testing Production Callback Scenario\n');
    
    try {
        // 1. Login to get tenant info
        console.log('1️⃣ Logging in...');
        const loginResponse = await axios.post('http://localhost:5000/signin', {
            email: 'admin@resolve.io',
            password: 'P@ssw0rd123!'
        });
        
        const token = loginResponse.data.token;
        const tenantId = loginResponse.data.tenant_id;
        console.log('✅ Logged in');
        console.log('   Tenant ID:', tenantId);
        
        // 2. Create a conversation
        console.log('\n2️⃣ Creating conversation...');
        const convResponse = await axios.post(
            'http://localhost:5000/api/rag/conversations',
            { title: 'Test Production Callback' },
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        const conversationId = convResponse.data.conversation_id;
        console.log('✅ Created conversation:', conversationId);
        
        // 3. Send a message
        console.log('\n3️⃣ Sending message...');
        const chatResponse = await axios.post(
            'http://localhost:5000/api/rag/chat',
            {
                conversation_id: conversationId,
                message: 'help with Actions Platform Integration'
            },
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        const messageId = chatResponse.data.message_id;
        console.log('✅ Message sent');
        console.log('   Message ID:', messageId);
        
        // 4. Wait a moment for webhook to be processed
        console.log('\n⏳ Waiting 2 seconds for webhook processing...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 5. Simulate the callback that Actions platform sends
        console.log('\n4️⃣ Simulating Actions platform callback...');
        
        const llmResponse = `To integrate the Actions Platform with the Resolve Onboarding platform, you need to follow a specific workflow involving webhooks and callbacks for document processing and vectorization. Here's a quick guide to help you:

1. **Webhook Payload**: When a document is uploaded, a webhook is sent from the Resolve Onboarding platform to the Actions Platform with details such as the document URL and a callback_token.

2. **Callback Token**: The callback_token provided in the webhook is crucial. It must be used in all callbacks to ensure authentication. Failing to use it correctly will result in a 401 Unauthorized error.

3. **Document Processing Workflow**:
   - **Markdown Callback**: Send the processed document as markdown text to the markdown_callback_url using Authorization: Bearer {callback_token}.
   - **Vector Callback**: Send the document vectors to the vector_callback_url using X-Callback-Token: {callback_token}.

4. **Completion**: When both callbacks are successfully received, the document status will change to ready, indicating it's available for viewing and semantic search.

5. **Supported File Types**: Ensure your document is in a supported file type such as PDF, DOCX, TXT, etc.`;
        
        const callbackPayload = {
            conversation_id: conversationId,
            tenant_id: tenantId,
            ai_response: llmResponse,
            processing_time_ms: 1500,
            sources: ["Actions Platform Documentation", "Integration Guide", "Webhook Reference"]
        };
        
        const callbackUrl = `http://localhost:5000/api/rag/chat-callback/${messageId}`;
        console.log('   Callback URL:', callbackUrl);
        console.log('   Payload size:', JSON.stringify(callbackPayload).length, 'bytes');
        
        const callbackResponse = await axios.post(
            callbackUrl,
            callbackPayload,
            { 
                headers: { 'Content-Type': 'application/json' },
                validateStatus: () => true 
            }
        );
        
        console.log('   Callback response:', callbackResponse.status);
        console.log('   Response data:', callbackResponse.data);
        
        if (callbackResponse.status === 200) {
            console.log('\n✅ Callback successful!');
            
            // 6. Check the database to verify the message was stored
            console.log('\n5️⃣ Verifying message in database...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Get conversation messages
            const messagesResponse = await axios.get(
                `http://localhost:5000/api/rag/conversations/${conversationId}/messages`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            
            console.log('📊 Messages in conversation:');
            messagesResponse.data.forEach(msg => {
                console.log(`   ${msg.role}: ${msg.message?.substring(0, 60)}...`);
            });
            
            // Check if our response is there
            const hasResponse = messagesResponse.data.some(msg => 
                msg.role === 'assistant' && msg.message.includes('Actions Platform')
            );
            
            if (hasResponse) {
                console.log('\n✅ AI response successfully stored in database!');
                console.log('⚠️  If it\'s not showing in UI, the issue is with SSE delivery');
            } else {
                console.log('\n❌ AI response NOT found in database');
            }
            
        } else {
            console.log('\n❌ Callback failed with status:', callbackResponse.status);
        }
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
}

testProductionCallback();