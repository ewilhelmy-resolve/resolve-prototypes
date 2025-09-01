#!/usr/bin/env node

const axios = require('axios');

// Test with malformed JSON that will cause a 400 error
const test400Error = async () => {
    const messageId = 'test-400-error-' + Date.now();
    const callbackUrl = `http://localhost:5000/api/rag/chat-callback/${messageId}`;
    
    // Send malformed JSON with unescaped placeholders
    const malformedBody = `{
        "conversation_id": "%conversation_id%",
        "tenant_id": "%tenant_id%",
        "callback_token": "%callback_token%",
        "ai_response": "%llmresponse%",
        "processing_time_ms": 1500,
        "sources": ["source1", "source2", "source3"]
    }`;
    
    console.log('Testing 400 error handling...');
    console.log('Sending malformed JSON to:', callbackUrl);
    console.log('Body:', malformedBody);
    
    try {
        const response = await axios.post(callbackUrl, malformedBody, {
            headers: {
                'Content-Type': 'application/json'
            },
            validateStatus: () => true // Accept any status code
        });
        
        console.log('\nResponse Status:', response.status);
        console.log('Response Body:', response.data);
        
        if (response.status === 400) {
            console.log('\n✅ 400 error properly handled!');
            console.log('Now check the Webhook Traffic Monitor to see if it was logged.');
        }
        
    } catch (error) {
        console.error('\n❌ Request failed completely!');
        console.error('Error:', error.message);
    }
    
    // Now check if it was logged
    setTimeout(async () => {
        console.log('\n📊 Checking webhook traffic monitor...');
        try {
            // Login to get token
            const loginResponse = await axios.post('http://localhost:5000/api/auth/signin', {
                email: 'admin@resolve.io',
                password: 'P@ssw0rd123!'
            });
            
            const token = loginResponse.data.token;
            
            // Get webhook traffic
            const trafficResponse = await axios.get('http://localhost:5000/api/admin/diagnostics/webhook-traffic', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            // Find our test request
            const ourRequest = trafficResponse.data.find(entry => 
                entry.request_url && entry.request_url.includes(messageId)
            );
            
            if (ourRequest) {
                console.log('✅ Found in webhook traffic monitor!');
                console.log('Status:', ourRequest.response_status);
                console.log('Error:', ourRequest.error_message);
                console.log('Request Body:', ourRequest.request_body?.substring(0, 100) + '...');
            } else {
                console.log('❌ Not found in webhook traffic monitor');
                console.log('This might be a timing issue. Check manually in the dashboard.');
            }
        } catch (err) {
            console.error('Failed to check traffic monitor:', err.message);
        }
    }, 2000);
};

test400Error();