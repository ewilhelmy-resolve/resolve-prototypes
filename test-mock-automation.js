/**
 * Simple test script to verify Jira integration with mock automation callback
 */

const http = require('http');

async function runTest() {
    console.log('=== Jira Integration Test with Mock Automation ===\n');
    
    const baseUrl = 'http://localhost:8082';
    
    // Step 1: Create a test user
    console.log('Step 1: Creating test user...');
    const signupData = {
        email: 'automation-test@example.com',
        password: 'Test123!',
        company: 'Automation Test Co'
    };
    
    const signupResponse = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData)
    });
    
    const signupResult = await signupResponse.json();
    let authToken;
    
    if (!signupResult.success) {
        // Try to login instead
        console.log('User exists, trying login...');
        const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: signupData.email,
                password: signupData.password
            })
        });
        
        const loginResult = await loginResponse.json();
        if (!loginResult.success) {
            console.error('Login failed:', loginResult);
            return;
        }
        authToken = loginResult.token;
    } else {
        authToken = signupResult.token;
    }
    console.log('✓ User created, token:', authToken.substring(0, 10) + '...');
    
    // Step 2: Call Jira validation
    console.log('\nStep 2: Testing Jira validation...');
    const jiraConfig = {
        url: 'https://test-company.atlassian.net',
        email: 'admin@test-company.com',
        token: 'test-api-token-12345'
    };
    
    const validationResponse = await fetch(`${baseUrl}/api/integrations/validate-jira`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(jiraConfig)
    });
    
    const validationResult = await validationResponse.json();
    console.log('Validation response:', validationResult);
    
    if (!validationResult.webhookId) {
        console.error('No webhook ID received');
        return;
    }
    
    const webhookId = validationResult.webhookId;
    console.log('✓ Webhook ID:', webhookId);
    
    // Step 3: Set up SSE listener
    console.log('\nStep 3: Setting up SSE listener...');
    const { EventSource } = require('eventsource');
    const eventSource = new EventSource(
        `${baseUrl}/api/integrations/status-stream/${webhookId}?token=${encodeURIComponent(authToken)}`
    );
    
    let sseReceived = false;
    
    eventSource.onmessage = (event) => {
        console.log('SSE message received:', event.data);
        const data = JSON.parse(event.data);
        if (data.completed) {
            sseReceived = true;
            console.log('✓ Validation completed via SSE:', data.status);
            eventSource.close();
        }
    };
    
    eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        eventSource.close();
    };
    
    // Step 4: Send mock callback after 2 seconds
    console.log('\nStep 4: Sending mock callback in 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const callbackData = {
        status: 'success',
        message: 'Jira connection validated successfully',
        userData: 'Test Admin User',
        error: null
    };
    
    const callbackResponse = await fetch(
        `${baseUrl}/api/integrations/callback/${webhookId}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(callbackData)
        }
    );
    
    const callbackResult = await callbackResponse.json();
    console.log('Callback response:', callbackResult);
    
    // Step 5: Wait for SSE to receive the update
    console.log('\nStep 5: Waiting for SSE update...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 6: Report results
    console.log('\n=== Test Results ===');
    console.log('✓ User creation: SUCCESS');
    console.log('✓ Validation request: SUCCESS');
    console.log('✓ Webhook ID generated: SUCCESS');
    console.log('✓ Callback sent: SUCCESS');
    console.log(sseReceived ? '✓ SSE update received: SUCCESS' : '✗ SSE update received: FAILED');
    
    console.log('\n=== Test Complete ===');
    process.exit(sseReceived ? 0 : 1);
}

// Check if eventsource is installed
try {
    require('eventsource');
} catch (e) {
    console.log('Installing eventsource package...');
    require('child_process').execSync('npm install eventsource', { stdio: 'inherit' });
}

// Run the test
runTest().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});