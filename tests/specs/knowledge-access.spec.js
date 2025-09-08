const { test, expect, signInAsAdmin, waitForElement } = require('../fixtures/simple-base');

test.describe('Knowledge Base Access Test', () => {
    test('Admin should be able to access knowledge management without redirect to login', async ({ page }) => {
        // Login as admin using helper function
        await signInAsAdmin(page);
        
        // Verify we're on dashboard
        await expect(page).toHaveURL(/.*dashboard/);
        
        // Check if session is properly set
        const cookies = await page.context().cookies();
        const sessionCookie = cookies.find(c => c.name === 'sessionToken');
        console.log('Session cookie exists:', !!sessionCookie);
        
        // Find and click the knowledge management button
        const knowledgeButton = page.locator('button:has-text("Manage Knowledge Base")');
        await expect(knowledgeButton).toBeVisible();
        
        // Store the current URL before clicking
        const urlBeforeClick = page.url();
        console.log('URL before click:', urlBeforeClick);
        
        // Click the knowledge management button
        await knowledgeButton.click();
        
        // Wait for navigation to knowledge page
        await page.waitForSelector('h1:has-text("Knowledge Base Management")', { timeout: 10000 });
        
        // Check the final URL
        const finalUrl = page.url();
        console.log('URL after click:', finalUrl);
        
        // The test should fail if we're redirected to login
        await expect(page).not.toHaveURL(/.*login/);
        
        // We should be on the knowledge page
        await expect(page).toHaveURL(/.*knowledge/);
        
        // Verify the knowledge page has loaded
        const pageTitle = await page.locator('h1').first().textContent();
        console.log('Page title:', pageTitle);
        
        // Additional check: verify we can see knowledge management content
        await expect(page.locator('text=/Knowledge.*Management/i')).toBeVisible({ timeout: 5000 });
    });
    
    test('Regular user (stakeholder) should also access knowledge page when authenticated', async ({ page }) => {
        // Navigate to home page
        await page.goto('/');
        
        // Create a new user account (stakeholder)
        await page.getByRole('link', { name: 'Sign up' }).click();
        await page.waitForURL('**/signup');
        
        const timestamp = Date.now();
        const testEmail = `stakeholder-${timestamp}@test.com`;
        
        // Fill signup form
        await page.fill('input[name="email"]', testEmail);
        await page.fill('input[name="password"]', 'Test123!');
        await page.fill('input[name="company"]', 'Test Company');
        await page.fill('input[name="phone"]', '555-0100');
        
        // Submit signup
        await page.getByRole('button', { name: 'Create account' }).click();
        
        // Should redirect to step2
        await page.waitForURL('**/step2', { timeout: 10000 });
        
        // Complete onboarding
        await page.fill('textarea[name="challenges"]', 'Test challenges');
        await page.getByRole('button', { name: 'Complete' }).click();
        
        // Wait for dashboard
        await page.waitForURL('**/dashboard', { timeout: 10000 });
        
        // Find and click the knowledge management button
        const knowledgeButton = page.locator('button:has-text("Manage Knowledge Base")');
        await expect(knowledgeButton).toBeVisible();
        
        // Click the knowledge management button
        await knowledgeButton.click();
        
        // Wait for navigation to knowledge page
        await page.waitForSelector('h1:has-text("Knowledge Base Management")', { timeout: 10000 });
        
        // Should NOT be redirected to login
        await expect(page).not.toHaveURL(/.*login/);
        
        // Should be on the knowledge page
        await expect(page).toHaveURL(/.*knowledge/);
    });
});