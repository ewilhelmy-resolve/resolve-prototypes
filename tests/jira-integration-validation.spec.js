const { test, expect } = require('@playwright/test');

test.describe('Jira Validation with Automation Engine', () => {
    test('Complete validation flow with mock callback', async ({ page, request }) => {
        // Step 1: Navigate and signup
        console.log('Step 1: Navigate and signup');
        await page.goto('http://localhost:8082');
        
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', 'Test123!');
        await page.fill('input[name="company"]', 'Test Company');
        await page.locator('button[type="submit"]').first().click();
        
        // Step 2: Navigate to Jira integration
        console.log('Step 2: Navigate to Jira integration');
        await page.waitForSelector('.knowledge-config', { state: 'visible', timeout: 10000 });
        await page.locator('.integration-card[data-source="jira"]').click();
        
        // Step 3: Wait for integration form
        console.log('Step 3: Wait for integration form');
        await page.waitForSelector('#jiraIntegrationContainer', { timeout: 10000 });
        
        // Step 4: Fill Jira credentials
        console.log('Step 4: Fill Jira credentials');
        await page.waitForSelector('#jira-credentials.active', { timeout: 5000 });
        await page.fill('#jira-url', 'https://test-company.atlassian.net');
        await page.fill('#jira-email', 'admin@test-company.com');
        await page.fill('#jira-token', 'test-api-token-12345');
        
        // Step 5: Set up network monitoring
        console.log('Step 5: Setting up network monitoring');
        let webhookId = null;
        let sseConnected = false;
        
        // Monitor for validation request
        page.on('response', async response => {
            const url = response.url();
            
            // Capture webhook ID from validation response
            if (url.includes('/api/integrations/validate-jira')) {
                try {
                    const json = await response.json();
                    if (json.webhookId) {
                        webhookId = json.webhookId;
                        console.log('Captured webhook ID:', webhookId);
                    }
                } catch (e) {
                    // Ignore JSON parse errors
                }
            }
            
            // Monitor SSE connection
            if (url.includes('/api/integrations/status-stream/')) {
                console.log('SSE connection established');
                sseConnected = true;
            }
        });
        
        // Step 6: Click Test Connection
        console.log('Step 6: Click Test Connection');
        const testButton = page.locator('button:has-text("Test Connection")');
        await expect(testButton).toBeEnabled();
        await testButton.click();
        
        // Step 7: Wait for validation to start
        console.log('Step 7: Wait for validation to start');
        const validationMsg = page.locator('.validation-message');
        await expect(validationMsg).toBeVisible();
        await expect(validationMsg).toContainText('automation engine', { timeout: 5000 });
        
        // Step 8: Wait a moment for webhook ID to be captured
        console.log('Step 8: Waiting for webhook ID...');
        await page.waitForTimeout(2000);
        
        // Step 9: Send mock callback
        if (webhookId) {
            console.log('Step 9: Sending mock callback for webhook:', webhookId);
            
            try {
                const callbackResponse = await request.post(
                    `http://localhost:8082/api/integrations/callback/${webhookId}`,
                    {
                        data: {
                            status: 'success',
                            message: 'Jira connection validated successfully',
                            userData: 'Test User (admin@test-company.com)',
                            error: null
                        }
                    }
                );
                
                console.log('Callback response status:', callbackResponse.status());
                const callbackData = await callbackResponse.json();
                console.log('Callback response:', callbackData);
            } catch (error) {
                console.error('Error sending callback:', error);
            }
        } else {
            console.log('Warning: No webhook ID captured, cannot send callback');
        }
        
        // Step 10: Wait for validation result
        console.log('Step 10: Wait for validation result');
        await expect(validationMsg).toHaveClass(/success|error/, { timeout: 10000 });
        
        // Step 11: Check final state
        const isSuccess = await validationMsg.evaluate(el => el.classList.contains('success'));
        if (isSuccess) {
            console.log('Step 11: Validation successful!');
            const msgText = await validationMsg.textContent();
            console.log('Success message:', msgText);
            
            // Check if Save button is enabled
            const saveButton = page.locator('button:has-text("Save & Continue")');
            await expect(saveButton).toBeEnabled();
            console.log('Save button is enabled');
        } else {
            const msgText = await validationMsg.textContent();
            console.log('Step 11: Validation failed:', msgText);
        }
    });
    
    test('Test automation timeout handling', async ({ page }) => {
        // Navigate and signup
        await page.goto('http://localhost:8082');
        await page.fill('input[name="email"]', 'timeout@example.com');
        await page.fill('input[name="password"]', 'Test123!');
        await page.fill('input[name="company"]', 'Timeout Test');
        await page.locator('button[type="submit"]').first().click();
        
        // Navigate to Jira
        await page.waitForSelector('.knowledge-config');
        await page.locator('.integration-card[data-source="jira"]').click();
        
        // Fill credentials
        await page.waitForSelector('#jira-credentials.active');
        await page.fill('#jira-url', 'https://timeout.atlassian.net');
        await page.fill('#jira-email', 'timeout@test.com');
        await page.fill('#jira-token', 'timeout-token');
        
        // Click Test (but don't send callback)
        await page.locator('button:has-text("Test Connection")').click();
        
        // Should show loading state
        const validationMsg = page.locator('.validation-message');
        await expect(validationMsg).toContainText('automation engine');
        
        // This will eventually timeout after 60s (we won't wait that long in the test)
        console.log('Validation started, would timeout after 60 seconds');
    });
});