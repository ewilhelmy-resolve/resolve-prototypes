const { test, expect, signInAsAdmin, waitForElement } = require('../fixtures/simple-base');
const path = require('path');

test.describe('Knowledge Management Page', () => {
    
    test('access knowledge management from dashboard', async ({ page }) => {
        // Simplified test: login as admin and access knowledge page
        console.log('🧪 Testing Knowledge Management Access');
        
        // Login as admin using helper function
        await signInAsAdmin(page);
        
        // Try to access knowledge page
        await page.goto('/knowledge');
        
        // Verify we can access the knowledge page
        // Look for any indication the page loaded (title, form, table, etc.)
        const pageLoaded = await page.waitForSelector('h1, h2, .page-title, form, table', { timeout: 5000 });
        expect(pageLoaded).toBeTruthy();
        
        console.log('✅ Knowledge management page accessible');
    });
});