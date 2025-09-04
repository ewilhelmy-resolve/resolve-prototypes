#!/usr/bin/env node

const axios = require('axios');
const EventSource = require('eventsource');

async function testSSEFlow() {
    console.log('🧪 Testing SSE Chat Flow\n');
    
    try {
        // 1. Login
        console.log('1️⃣ Logging in...');
        const loginResponse = await axios.post('http://localhost:5000/api/auth/signin', {
            email: 'admin@resolve.io',
            password: 'P@ssw0rd123!'
        });
        
        const token = loginResponse.data.token;
        const tenantId = loginResponse.data.tenant_id;
        console.log('✅ Logged in successfully');
        console.log('   Tenant ID:', tenantId);
        
        // 2. Create conversation
        console.log('\n2️⃣ Creating conversation...');
        const convResponse = await axios.post(
            'http://localhost:5000/api/rag/conversations',
            { title: 'SSE Test Conversation' },
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        const conversationId = convResponse.data.conversation_id;
        console.log('✅ Created conversation:', conversationId);
        
        // 3. Connect to SSE
        console.log('\n3️⃣ Connecting to SSE stream...');
        const sseUrl = `http://localhost:5000/api/rag/chat-stream/${conversationId}`;
        const eventSource = new EventSource(sseUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        let sseReceived = false;
        const ssePromise = new Promise((resolve, reject) => {
            eventSource.onopen = () => {
                console.log('✅ SSE connection opened');
            };
            
            eventSource.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log('📨 SSE Event received:', data.type);
                console.log('   Data:', JSON.stringify(data, null, 2));
                
                if (data.type === 'chat-response') {
                    sseReceived = true;
                    resolve(data);
                }
            };
            
            eventSource.onerror = (error) => {
                console.error('❌ SSE Error:', error);
                reject(error);
            };
            
            // Timeout after 10 seconds
            setTimeout(() => {
                if (!sseReceived) {
                    reject(new Error('SSE timeout - no response received'));
                }
            }, 10000);
        });
        
        // 4. Send a chat message
        console.log('\n4️⃣ Sending chat message...');
        const chatResponse = await axios.post(
            'http://localhost:5000/api/rag/chat',
            {
                conversation_id: conversationId,
                message: 'Test message for SSE'
            },
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        console.log('✅ Chat message sent');
        console.log('   Message ID:', chatResponse.data.message_id);
        console.log('   Processing:', chatResponse.data.processing);
        
        // 5. Check global SSE clients on server
        console.log('\n5️⃣ Checking SSE client registration...');
        const diagnosticResponse = await axios.get(
            'http://localhost:5000/api/admin/diagnostics/sse-clients',
            { 
                headers: { 'Authorization': `Bearer ${token}` },
                validateStatus: () => true  
            }
        );
        
        if (diagnosticResponse.status === 200) {
            console.log('📊 SSE Clients:', diagnosticResponse.data);
        } else {
            console.log('⚠️  Could not retrieve SSE client info');
        }
        
        // 6. Simulate the callback that Actions platform would send
        console.log('\n6️⃣ Simulating Actions platform callback...');
        const callbackPayload = {
            conversation_id: conversationId,
            tenant_id: tenantId,
            ai_response: "This is a test response from the simulated Actions platform",
            processing_time_ms: 150,
            sources: ["test-source-1", "test-source-2"]
        };
        
        const callbackUrl = `http://localhost:5000/api/rag/chat-callback/${chatResponse.data.message_id}`;
        console.log('   Callback URL:', callbackUrl);
        console.log('   Payload:', JSON.stringify(callbackPayload, null, 2));
        
        const callbackResponse = await axios.post(
            callbackUrl,
            callbackPayload,
            { validateStatus: () => true }
        );
        
        console.log('   Callback response:', callbackResponse.status, callbackResponse.data);
        
        // 7. Wait for SSE event
        console.log('\n7️⃣ Waiting for SSE event...');
        try {
            const sseData = await ssePromise;
            console.log('✅ SSE event received successfully!');
            console.log('   AI Response:', sseData.ai_response);
        } catch (error) {
            console.error('❌ Failed to receive SSE event:', error.message);
        }
        
        // Clean up
        eventSource.close();
        console.log('\n✅ Test complete');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        if (error.response) {
            console.error('   Response:', error.response.data);
        }
    }
}

// Check if eventsource is installed
try {
    require('eventsource');
    testSSEFlow();
} catch (e) {
    console.log('Installing eventsource package...');
    require('child_process').execSync('npm install eventsource', { stdio: 'inherit' });
    testSSEFlow();
}