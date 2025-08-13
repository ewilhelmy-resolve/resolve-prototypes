const { test, expect } = require('@playwright/test');

test.describe('Jira Integration Simple Test', () => {
    test('Basic flow check', async ({ page }) => {
        // Navigate to the app
        console.log('Navigating to app...');
        await page.goto('http://localhost:8082');
        
        // Check if signup form is visible
        console.log('Checking for signup form...');
        const emailInput = page.locator('input[name="email"]');
        await expect(emailInput).toBeVisible({ timeout: 10000 });
        
        // Fill signup form
        console.log('Filling signup form...');
        await emailInput.fill('test@example.com');
        await page.fill('input[name="password"]', 'Test123!');
        await page.fill('input[name="company"]', 'Test Company');
        
        // Submit form
        console.log('Submitting form...');
        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();
        
        // Wait for knowledge config page
        console.log('Waiting for knowledge config...');
        await page.waitForSelector('.knowledge-config', { timeout: 15000 });
        
        // Click on Jira card
        console.log('Clicking Jira card...');
        const jiraCard = page.locator('.integration-card[data-source="jira"]');
        await expect(jiraCard).toBeVisible();
        await jiraCard.click();
        
        // Check if integration form appears
        console.log('Checking for integration form...');
        const jiraForm = page.locator('#jiraIntegrationContainer');
        await expect(jiraForm).toBeVisible({ timeout: 10000 });
        
        console.log('Test completed successfully!');
    });
    
    test('Health check', async ({ request }) => {
        const response = await request.get('http://localhost:8082/health');
        expect(response.ok()).toBeTruthy();
        
        const health = await response.json();
        console.log('Health response:', health);
        
        expect(health.status).toBe('healthy');
        expect(health.environment.sseEnabled).toBe(true);
    });
});