const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Knowledge Page Navigation', () => {
    
    test('navigate to knowledge page from dashboard using admin credentials', async ({ page }) => {
        console.log('\n🚀 KNOWLEDGE PAGE NAVIGATION TEST\n');
        
        // 1️⃣ LOGIN AS ADMIN
        console.log('1️⃣ LOGGING IN AS ADMIN');
        
        await page.goto('http://localhost:5000/login');
        await page.waitForSelector('input[type="email"]', { timeout: 10000 });
        
        // Fill login form with admin credentials
        await page.fill('input[type="email"]', 'admin@resolve.io');
        await page.fill('input[type="password"]', 'admin123');
        
        // Submit login
        await page.click('button:has-text("Sign In")');
        
        // Wait for dashboard
        await page.waitForURL('**/dashboard', { timeout: 15000 });
        console.log('   ✅ Logged in successfully, on dashboard');
        
        // Wait for page to fully load
        await page.waitForSelector('.knowledge-widget', { timeout: 10000 });
        await page.waitForTimeout(2000);
        
        // 2️⃣ FIND AND CLICK MANAGE KNOWLEDGE BASE BUTTON
        console.log('\n2️⃣ FINDING MANAGE KNOWLEDGE BASE BUTTON');
        
        // Look for the button using multiple strategies
        let manageButton = null;
        
        // Strategy 1: Text selector
        manageButton = page.locator('button:has-text("Manage Knowledge Base")');
        
        // Check if button exists
        const buttonCount = await manageButton.count();
        console.log(`   Found ${buttonCount} button(s) with text "Manage Knowledge Base"`);
        
        if (buttonCount === 0) {
            // Strategy 2: Class selector
            manageButton = page.locator('.knowledge-manage-btn');
            const classButtonCount = await manageButton.count();
            console.log(`   Found ${classButtonCount} button(s) with class "knowledge-manage-btn"`);
        }
        
        // If button found, ensure it's visible
        if (await manageButton.count() > 0) {
            // Scroll to button if needed
            await manageButton.first().scrollIntoViewIfNeeded();
            await page.waitForTimeout(500);
            
            // Check visibility
            const isVisible = await manageButton.first().isVisible();
            console.log(`   Button visible: ${isVisible}`);
            
            if (!isVisible) {
                console.log('   Attempting to make button visible...');
                // Try to expand or scroll to the knowledge widget
                await page.evaluate(() => {
                    const widget = document.querySelector('.knowledge-widget');
                    if (widget) {
                        widget.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                });
                await page.waitForTimeout(1000);
            }
            
            // Take screenshot before clicking
            await page.screenshot({ 
                path: path.join(__dirname, '../../screenshots/before-knowledge-click.png'),
                fullPage: true 
            });
            
            // Click the button
            console.log('   Clicking Manage Knowledge Base button...');
            await manageButton.first().click();
            
            // 3️⃣ VERIFY NAVIGATION TO KNOWLEDGE PAGE
            console.log('\n3️⃣ VERIFYING NAVIGATION TO KNOWLEDGE PAGE');
            
            // Wait for URL change
            await page.waitForTimeout(2000);
            
            const currentUrl = page.url();
            console.log(`   Current URL: ${currentUrl}`);
            
            // Check if we're on the knowledge page
            if (currentUrl.includes('/knowledge')) {
                console.log('   ✅ Successfully navigated to Knowledge page!');
                
                // Take screenshot of knowledge page
                await page.screenshot({ 
                    path: path.join(__dirname, '../../screenshots/knowledge-page-success.png'),
                    fullPage: true 
                });
                
                // 4️⃣ VALIDATE KEY COMPONENTS
                console.log('\n4️⃣ VALIDATING KNOWLEDGE PAGE COMPONENTS');
                
                // Check for title
                const hasTitle = await page.locator('h1').count() > 0;
                console.log(`   Page title present: ${hasTitle}`);
                
                // Check for knowledge management specific elements
                const hasStatsBar = await page.locator('.km-stats-bar').count() > 0;
                console.log(`   Stats bar present: ${hasStatsBar}`);
                
                const hasTable = await page.locator('.km-table, table').count() > 0;
                console.log(`   Data table present: ${hasTable}`);
                
                const hasSearch = await page.locator('.km-search-input, input[placeholder*="Search"]').count() > 0;
                console.log(`   Search input present: ${hasSearch}`);
                
                // Assert we're on the right page
                expect(currentUrl).toContain('/knowledge');
                
            } else if (currentUrl.includes('/login')) {
                console.log('   ❌ Redirected to login page - authentication issue');
                
                // Take screenshot for debugging
                await page.screenshot({ 
                    path: path.join(__dirname, '../../screenshots/knowledge-redirect-login.png'),
                    fullPage: true 
                });
                
                throw new Error('Knowledge page redirected to login - authentication not maintained');
                
            } else {
                console.log(`   ⚠️ Unexpected navigation to: ${currentUrl}`);
                
                // Take screenshot for debugging
                await page.screenshot({ 
                    path: path.join(__dirname, '../../screenshots/knowledge-unexpected-page.png'),
                    fullPage: true 
                });
            }
            
        } else {
            console.log('   ❌ Manage Knowledge Base button not found on page');
            
            // Debug: Check what's on the page
            const pageContent = await page.content();
            const hasKnowledgeWidget = pageContent.includes('knowledge-widget');
            console.log(`   Knowledge widget in HTML: ${hasKnowledgeWidget}`);
            
            // Take screenshot for debugging
            await page.screenshot({ 
                path: path.join(__dirname, '../../screenshots/dashboard-no-button.png'),
                fullPage: true 
            });
            
            throw new Error('Manage Knowledge Base button not found on dashboard');
        }
        
        console.log('\n✅ KNOWLEDGE PAGE NAVIGATION TEST COMPLETE!\n');
    });
    
    test('verify knowledge page requires authentication', async ({ page }) => {
        console.log('\n🔒 TESTING AUTHENTICATION REQUIREMENT\n');
        
        // Clear any existing cookies/session
        await page.context().clearCookies();
        
        // Try to access knowledge page directly without login
        await page.goto('http://localhost:5000/knowledge');
        await page.waitForSelector('input[type="email"]', { timeout: 10000 });
        
        // Check current URL
        const currentUrl = page.url();
        console.log(`   Current URL: ${currentUrl}`);
        
        // Should be redirected to login
        if (currentUrl.includes('/login')) {
            console.log('   ✅ Correctly redirected to login page');
            
            // Verify login page elements
            const hasEmailInput = await page.locator('input[type="email"]').count() > 0;
            const hasPasswordInput = await page.locator('input[type="password"]').count() > 0;
            const hasSignInButton = await page.locator('button:has-text("Sign In")').count() > 0;
            
            console.log(`   Email input present: ${hasEmailInput}`);
            console.log(`   Password input present: ${hasPasswordInput}`);
            console.log(`   Sign In button present: ${hasSignInButton}`);
            
            expect(currentUrl).toContain('/login');
            
        } else if (currentUrl.includes('/knowledge')) {
            console.log('   ❌ Knowledge page accessible without authentication!');
            throw new Error('Knowledge page should require authentication');
        }
        
        console.log('\n✅ AUTHENTICATION REQUIREMENT TEST COMPLETE!\n');
    });
});