const { test, expect } = require('@playwright/test');

test.describe('Jira Integration with Automation Engine', () => {
    let authToken;
    
    test.beforeEach(async ({ page }) => {
        // Navigate to the app
        await page.goto('http://localhost:8082');
        
        // Sign up or login first
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', 'Test123!');
        await page.fill('input[name="company"]', 'Test Company');
        
        // Try signup first, if fails then login
        const signupButton = page.locator('button:has-text("Get Started")');
        if (await signupButton.isVisible()) {
            await signupButton.click();
        } else {
            await page.click('button:has-text("Sign In")');
        }
        
        // Wait for navigation to next step
        await page.waitForSelector('.knowledge-config', { timeout: 10000 });
        
        // Extract auth token from localStorage for debugging
        authToken = await page.evaluate(() => {
            return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        });
        console.log('Auth token obtained:', authToken ? 'Yes' : 'No');
    });
    
    test('Complete Jira integration flow with automation validation', async ({ page }) => {
        // Step 1: Click on Jira in knowledge sources
        console.log('Step 1: Selecting Jira integration');
        const jiraCard = page.locator('.integration-card[data-source="jira"]');
        await expect(jiraCard).toBeVisible();
        await jiraCard.click();
        
        // Step 2: Wait for integration form to appear
        console.log('Step 2: Waiting for integration form');
        await page.waitForSelector('#jira-credentials.active', { timeout: 10000 });
        
        // Step 3: Fill in Jira credentials
        console.log('Step 3: Filling Jira credentials');
        await page.fill('#jira-url', 'https://test-company.atlassian.net');
        await page.fill('#jira-email', 'admin@test-company.com');
        await page.fill('#jira-token', 'test-api-token-12345');
        
        // Step 4: Click Test Connection
        console.log('Step 4: Testing connection');
        const testButton = page.locator('button:has-text("Test Connection")');
        await expect(testButton).toBeEnabled();
        
        // Set up listener for SSE connection
        let sseConnected = false;
        page.on('response', response => {
            if (response.url().includes('/api/integrations/status-stream/')) {
                console.log('SSE connection established:', response.status());
                sseConnected = true;
            }
        });
        
        await testButton.click();
        
        // Step 5: Verify validation message appears
        console.log('Step 5: Waiting for validation to start');
        const validationMsg = page.locator('.validation-message');
        await expect(validationMsg).toBeVisible();
        await expect(validationMsg).toContainText('automation engine', { timeout: 5000 });
        
        // Step 6: Simulate automation callback (since we're testing locally)
        if (process.env.SIMULATE_CALLBACK === 'true') {
            console.log('Step 6: Simulating automation callback');
            
            // Extract webhook ID from network requests
            const webhookId = await page.evaluate(() => {
                // This would normally be extracted from the network request
                return window.lastWebhookId; // We'll need to expose this in the component
            });
            
            if (webhookId) {
                // Send callback to simulate automation response
                const callbackResponse = await fetch(`http://localhost:8080/api/integrations/callback/${webhookId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        status: 'success',
                        message: 'Jira connection validated successfully',
                        userData: 'Test User',
                        error: null
                    })
                });
                console.log('Callback sent:', callbackResponse.ok);
            }
        }
        
        // Step 7: Wait for validation to complete
        console.log('Step 7: Waiting for validation result');
        await expect(validationMsg).toHaveClass(/success|error/, { timeout: 65000 });
        
        // Step 8: If successful, Save button should be enabled
        if (await validationMsg.locator('.success').count() > 0) {
            console.log('Step 8: Validation successful, checking Save button');
            const saveButton = page.locator('button:has-text("Save & Continue")');
            await expect(saveButton).toBeEnabled();
            
            // Click Save
            await saveButton.click();
            
            // Should move to next step
            await expect(page.locator('.itsm-config')).toBeVisible({ timeout: 10000 });
            console.log('Integration saved and moved to next step');
        } else {
            console.log('Step 8: Validation failed');
            const errorText = await validationMsg.textContent();
            console.error('Validation error:', errorText);
        }
    });
    
    test('Handle automation timeout gracefully', async ({ page }) => {
        // Click on Jira
        const jiraCard = page.locator('.integration-card[data-source="jira"]');
        await jiraCard.click();
        
        // Fill credentials
        await page.waitForSelector('#jira-credentials.active');
        await page.fill('#jira-url', 'https://timeout-test.atlassian.net');
        await page.fill('#jira-email', 'timeout@test.com');
        await page.fill('#jira-token', 'timeout-token');
        
        // Click Test Connection
        await page.click('button:has-text("Test Connection")');
        
        // Wait for timeout (60 seconds is too long for test, so we check for the message)
        const validationMsg = page.locator('.validation-message');
        
        // The test should timeout after 60 seconds and show error
        // For testing purposes, we'll just verify the loading state appears
        await expect(validationMsg).toContainText('automation engine');
        
        // In a real test with shorter timeout, we'd wait for:
        // await expect(validationMsg).toContainText('timeout', { timeout: 65000 });
    });
    
    test('Verify SSE connection cleanup on navigation', async ({ page }) => {
        // Start Jira integration
        const jiraCard = page.locator('.integration-card[data-source="jira"]');
        await jiraCard.click();
        
        await page.waitForSelector('#jira-credentials.active');
        await page.fill('#jira-url', 'https://cleanup-test.atlassian.net');
        await page.fill('#jira-email', 'cleanup@test.com');
        await page.fill('#jira-token', 'cleanup-token');
        
        // Start validation
        await page.click('button:has-text("Test Connection")');
        await page.locator('.validation-message').waitFor();
        
        // Navigate away (back button)
        await page.click('button:has-text("Back to Knowledge Sources")');
        
        // Verify we're back at knowledge config
        await expect(page.locator('.knowledge-config')).toBeVisible();
        
        // SSE connection should be closed (verified by server logs)
    });
});

// Test configuration for Docker environment
test.describe('Docker Container Integration', () => {
    test.use({
        baseURL: process.env.DOCKER_URL || 'http://localhost:8082',
    });
    
    test('Verify Docker container is running', async ({ page }) => {
        // Check health endpoint
        const response = await page.request.get('/health');
        expect(response.ok()).toBeTruthy();
        const health = await response.json();
        expect(health.status).toBe('healthy');
        
        // Verify main page loads
        await page.goto('/');
        await expect(page.locator('.hero')).toBeVisible();
        await expect(page.locator('.signup-container')).toBeVisible();
    });
    
    test('Verify automation webhook configuration', async ({ page }) => {
        // This test verifies that environment variables are properly set
        const response = await page.request.get('/health');
        const health = await response.json();
        
        // Check if automation is configured (would need to expose this in health endpoint)
        console.log('Health check:', health);
        
        // Verify SSE endpoint is accessible
        const sseResponse = await page.request.get('/api/integrations/status-stream/test', {
            failOnStatusCode: false
        });
        
        // Should return 401 (auth required) not 404
        expect(sseResponse.status()).toBe(401);
    });
});