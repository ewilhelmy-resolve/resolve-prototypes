#!/usr/bin/env node

const axios = require('axios');

// Test data based on what Actions platform would send
const testCallback = async () => {
    const messageId = '1fd675e8-38de-4f50-a5d7-8a9c432884a9';
    const callbackUrl = `http://localhost:5000/api/rag/chat-callback/${messageId}`;
    
    const payload = {
        conversation_id: "76421479-2cee-49a4-9e41-c07836e91ffa",
        tenant_id: "84fa1dd3-bdb4-44a1-ac76-2c7453ebc1db",
        ai_response: "Here's help with the Actions Platform Integration. The Actions platform allows you to integrate external services and automate workflows. You can create custom actions, set up webhooks, and process data through various endpoints.",
        callback_token: "5ba08e65c4c75538a92fe1dd52c2e4e61563fb6538c4f6eb54f3ae20b8c9dcae",
        processing_time_ms: 1500,
        sources: ["Actions Platform Documentation", "Integration Guide", "Webhook Reference"]
    };
    
    console.log('Sending callback to:', callbackUrl);
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('Payload size:', JSON.stringify(payload).length, 'bytes');
    
    try {
        const response = await axios.post(callbackUrl, payload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('\n✅ Success!');
        console.log('Status:', response.status);
        console.log('Response:', response.data);
    } catch (error) {
        console.error('\n❌ Error!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Status Text:', error.response.statusText);
            console.error('Response:', error.response.data);
            console.error('Headers:', error.response.headers);
        } else {
            console.error('Error:', error.message);
        }
    }
};

// First, let's create a test conversation and message
const setupTestData = async () => {
    console.log('Setting up test data...\n');
    
    try {
        // Login first to get a token
        const loginResponse = await axios.post('http://localhost:5000/api/auth/signin', {
            email: 'admin@resolve.io',
            password: 'P@ssw0rd123!'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Logged in successfully');
        
        // Create a conversation
        const convResponse = await axios.post(
            'http://localhost:5000/api/rag/conversations',
            {
                title: 'Test Actions Platform Integration'
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        
        const conversationId = convResponse.data.conversation_id;
        console.log('✅ Created conversation:', conversationId);
        
        // Send a message to get a message_id
        const messageResponse = await axios.post(
            'http://localhost:5000/api/rag/chat',
            {
                conversation_id: conversationId,
                message: 'help with Actions Platform Integration'
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        
        console.log('✅ Message sent, webhook should have been triggered');
        console.log('Message response:', messageResponse.data);
        
        // Now simulate the callback from Actions platform
        console.log('\n📡 Simulating Actions Platform callback in 2 seconds...\n');
        setTimeout(testCallback, 2000);
        
    } catch (error) {
        console.error('Setup error:', error.response?.data || error.message);
    }
};

// Check if we should setup test data or just test the callback
if (process.argv[2] === '--setup') {
    setupTestData();
} else {
    console.log('Testing callback directly...\n');
    console.log('(Use --setup flag to create test conversation first)\n');
    testCallback();
}