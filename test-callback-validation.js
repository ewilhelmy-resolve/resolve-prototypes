#!/usr/bin/env node

const axios = require('axios');

// Test with exact production data
const testProductionCallback = async () => {
    const messageId = 'b7e4d2d5-5331-4d33-82e8-522e5faf9eb3';
    const callbackUrl = `http://localhost:5000/api/rag/chat-callback/${messageId}`;
    
    // Simulate what Actions platform should be sending
    const payload = {
        conversation_id: "32fc6cc2-8573-43c8-982a-be47ae5e730f",
        tenant_id: "84fa1dd3-bdb4-44a1-ac76-2c7453ebc1db",
        callback_token: "3e635f258b9e71ef53c0c7a53fe8c48f2df542f5734ba86737b0f9c77c047a4c",
        ai_response: "To integrate the Actions Platform with Resolve Onboarding, follow these steps: 1. Set up webhooks to receive events from the onboarding platform. 2. Process the webhook payload to extract necessary data like callback_token, tenant_id, and conversation_id. 3. Send responses back using the callback URL with proper authentication. 4. Ensure you use the exact callback_token received in the original webhook for authentication.",
        processing_time_ms: 1500,
        sources: ["source1", "source2", "source3"]
    };
    
    console.log('Testing production scenario...');
    console.log('Message ID:', messageId);
    console.log('Payload size:', JSON.stringify(payload).length, 'bytes');
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    try {
        const response = await axios.post(callbackUrl, payload, {
            headers: {
                'Content-Type': 'application/json'
            },
            validateStatus: () => true // Accept any status code
        });
        
        if (response.status === 200) {
            console.log('\n✅ Success!');
        } else {
            console.log(`\n❌ Error: ${response.status} ${response.statusText}`);
        }
        console.log('Status:', response.status);
        console.log('Response:', response.data);
        
        // Check if the issue is with the specific message ID
        if (response.status === 404) {
            console.log('\n⚠️  Note: This message ID may not exist in the local database.');
            console.log('The production server may have different data.');
        }
        
    } catch (error) {
        console.error('\n❌ Request failed!');
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
    }
};

// Test various error scenarios
const testErrorScenarios = async () => {
    console.log('\n=== Testing Error Scenarios ===\n');
    
    const scenarios = [
        {
            name: 'Missing conversation_id',
            payload: {
                tenant_id: "84fa1dd3-bdb4-44a1-ac76-2c7453ebc1db",
                callback_token: "test-token",
                ai_response: "Test response"
            }
        },
        {
            name: 'Missing tenant_id',
            payload: {
                conversation_id: "32fc6cc2-8573-43c8-982a-be47ae5e730f",
                callback_token: "test-token",
                ai_response: "Test response"
            }
        },
        {
            name: 'Missing ai_response',
            payload: {
                conversation_id: "32fc6cc2-8573-43c8-982a-be47ae5e730f",
                tenant_id: "84fa1dd3-bdb4-44a1-ac76-2c7453ebc1db",
                callback_token: "test-token"
            }
        },
        {
            name: 'Malformed JSON with placeholder',
            payload: '{"conversation_id": "%conversation_id%", "tenant_id": "test"}'
        }
    ];
    
    for (const scenario of scenarios) {
        console.log(`Testing: ${scenario.name}`);
        try {
            const response = await axios.post(
                'http://localhost:5000/api/rag/chat-callback/test-message-id',
                scenario.payload,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    validateStatus: () => true
                }
            );
            console.log(`  Status: ${response.status} - ${JSON.stringify(response.data)}`);
        } catch (error) {
            console.log(`  Error: ${error.message}`);
        }
        console.log();
    }
};

// Run tests
const runTests = async () => {
    await testProductionCallback();
    
    if (process.argv[2] === '--errors') {
        await testErrorScenarios();
    }
};

runTests();