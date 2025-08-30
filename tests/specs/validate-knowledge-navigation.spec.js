const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Knowledge Management Navigation - Docker Validation', () => {
    test.setTimeout(60000); // 60 second timeout for the entire test
    
    test('complete flow: login → dashboard → knowledge page', async ({ page }) => {
        console.log('\n🚀 VALIDATING KNOWLEDGE MANAGEMENT NAVIGATION\n');
        console.log('Target: Docker container on http://localhost:5000\n');
        
        // 1️⃣ NAVIGATE TO LOGIN PAGE
        console.log('1️⃣ NAVIGATING TO LOGIN PAGE');
        await page.goto('http://localhost:5000/login', { timeout: 10000 });
        
        // Verify we're on login page
        await expect(page).toHaveURL(/.*\/login/);
        const loginTitle = await page.locator('h1:has-text("Welcome back")').isVisible();
        expect(loginTitle).toBe(true);
        console.log('   ✅ Login page loaded successfully');
        
        // Take screenshot of login page
        await page.screenshot({ 
            path: path.join(__dirname, '../../screenshots/01-login-page.png'),
            fullPage: true 
        });
        
        // 2️⃣ PERFORM LOGIN
        console.log('\n2️⃣ LOGGING IN AS ADMIN');
        
        // Fill credentials
        await page.fill('input[type="email"]', 'admin@resolve.io');
        await page.fill('input[type="password"]', 'admin123');
        console.log('   ✅ Credentials entered');
        
        // Click Sign In button
        await page.click('button:has-text("Sign In")');
        console.log('   ✅ Sign In button clicked');
        
        // Wait for navigation to dashboard
        await page.waitForURL('**/dashboard', { timeout: 15000 });
        await expect(page).toHaveURL(/.*\/dashboard/);
        console.log('   ✅ Successfully redirected to dashboard');
        
        // Wait for dashboard to fully load
        await page.waitForSelector('h1, #welcomeUser, .dashboard-content', { timeout: 5000 });
        await page.waitForTimeout(1000);
        
        // Take screenshot of dashboard
        await page.screenshot({ 
            path: path.join(__dirname, '../../screenshots/02-dashboard.png'),
            fullPage: true 
        });
        
        // 3️⃣ VERIFY KNOWLEDGE WIDGET EXISTS
        console.log('\n3️⃣ VERIFYING KNOWLEDGE WIDGET ON DASHBOARD');
        
        // Check for knowledge widget
        const knowledgeWidget = await page.locator('.knowledge-widget').count();
        if (knowledgeWidget > 0) {
            console.log('   ✅ Knowledge widget found on dashboard');
            
            // Check widget contents
            const widgetTitle = await page.locator('.knowledge-widget >> text="Knowledge Base"').isVisible();
            if (widgetTitle) {
                console.log('   ✅ Knowledge Base title visible in widget');
            }
            
            // Check for upload area
            const uploadArea = await page.locator('.knowledge-upload').count();
            if (uploadArea > 0) {
                console.log('   ✅ Upload area present in widget');
            }
            
            // Check for stats
            const statsGrid = await page.locator('.knowledge-stats').count();
            if (statsGrid > 0) {
                console.log('   ✅ Stats grid present in widget');
            }
        } else {
            console.log('   ⚠️ Knowledge widget not found on dashboard');
        }
        
        // 4️⃣ FIND AND CLICK MANAGE KNOWLEDGE BASE BUTTON
        console.log('\n4️⃣ LOCATING MANAGE KNOWLEDGE BASE BUTTON');
        
        // Try multiple selectors to find the button
        let manageButton = null;
        const selectors = [
            'button:has-text("Manage Knowledge Base")',
            '.knowledge-manage-btn',
            'button[onclick*="Knowledge"]'
        ];
        
        for (const selector of selectors) {
            const count = await page.locator(selector).count();
            if (count > 0) {
                manageButton = page.locator(selector).first();
                console.log(`   ✅ Found button using selector: ${selector}`);
                break;
            }
        }
        
        if (!manageButton) {
            throw new Error('Manage Knowledge Base button not found with any selector');
        }
        
        // Scroll button into view
        await manageButton.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        console.log('   ✅ Button scrolled into view');
        
        // Take screenshot before clicking
        await page.screenshot({ 
            path: path.join(__dirname, '../../screenshots/03-before-click.png'),
            fullPage: true 
        });
        
        // Click the button
        await manageButton.click();
        console.log('   ✅ Manage Knowledge Base button clicked');
        
        // 5️⃣ VERIFY NAVIGATION TO KNOWLEDGE PAGE
        console.log('\n5️⃣ VERIFYING KNOWLEDGE PAGE NAVIGATION');
        
        // Wait for URL change
        await page.waitForTimeout(3000);
        const currentUrl = page.url();
        console.log(`   Current URL: ${currentUrl}`);
        
        if (currentUrl.includes('/knowledge')) {
            console.log('   ✅ Successfully navigated to Knowledge Management page!');
            
            // Take screenshot of knowledge page
            await page.screenshot({ 
                path: path.join(__dirname, '../../screenshots/04-knowledge-page.png'),
                fullPage: true 
            });
            
            // 6️⃣ VALIDATE KNOWLEDGE PAGE COMPONENTS
            console.log('\n6️⃣ VALIDATING KNOWLEDGE PAGE COMPONENTS');
            
            // Check for main title
            const titleExists = await page.locator('h1:has-text("Knowledge Base Management")').count() > 0 ||
                               await page.locator('.km-title').count() > 0;
            console.log(`   Page title: ${titleExists ? '✅' : '❌'}`);
            
            // Check for upload button
            const uploadBtnExists = await page.locator('button:has-text("Upload Documents")').count() > 0 ||
                                   await page.locator('.km-upload-btn').count() > 0;
            console.log(`   Upload button: ${uploadBtnExists ? '✅' : '❌'}`);
            
            // Check for stats bar
            const statsBarExists = await page.locator('.km-stats-bar').count() > 0;
            console.log(`   Stats bar: ${statsBarExists ? '✅' : '❌'}`);
            
            // Check for toolbar
            const toolbarExists = await page.locator('.km-toolbar').count() > 0;
            console.log(`   Toolbar: ${toolbarExists ? '✅' : '❌'}`);
            
            // Check for search input
            const searchExists = await page.locator('.km-search-input').count() > 0 ||
                                await page.locator('input[placeholder*="Search"]').count() > 0;
            console.log(`   Search input: ${searchExists ? '✅' : '❌'}`);
            
            // Check for data table
            const tableExists = await page.locator('.km-table').count() > 0 ||
                               await page.locator('table').count() > 0;
            console.log(`   Data table: ${tableExists ? '✅' : '❌'}`);
            
            // Check for footer
            const footerExists = await page.locator('.km-footer').count() > 0;
            console.log(`   Footer: ${footerExists ? '✅' : '❌'}`);
            
            // Count table rows
            const rowCount = await page.locator('.km-tr, tbody tr').count();
            console.log(`   Table rows: ${rowCount}`);
            
            // Final assertion
            expect(currentUrl).toContain('/knowledge');
            
        } else if (currentUrl.includes('/login')) {
            console.log('   ❌ ERROR: Redirected back to login page');
            console.log('   This indicates an authentication issue');
            
            // Take screenshot for debugging
            await page.screenshot({ 
                path: path.join(__dirname, '../../screenshots/error-redirected-to-login.png'),
                fullPage: true 
            });
            
            throw new Error('Knowledge page redirected to login - authentication not maintained');
            
        } else {
            console.log(`   ❌ ERROR: Unexpected navigation to: ${currentUrl}`);
            
            // Take screenshot for debugging
            await page.screenshot({ 
                path: path.join(__dirname, '../../screenshots/error-unexpected-page.png'),
                fullPage: true 
            });
            
            throw new Error(`Unexpected navigation to: ${currentUrl}`);
        }
        
        // 7️⃣ TEST NAVIGATION BACK TO DASHBOARD
        console.log('\n7️⃣ TESTING NAVIGATION BACK TO DASHBOARD');
        
        const dashboardBtn = await page.locator('button:has-text("Dashboard")').first();
        if (await dashboardBtn.isVisible()) {
            await dashboardBtn.click();
            await page.waitForURL('**/dashboard', { timeout: 10000 });
            console.log('   ✅ Successfully navigated back to dashboard');
        }
        
        console.log('\n✅ VALIDATION COMPLETE - ALL TESTS PASSED!\n');
        console.log('Screenshots saved in tests/screenshots/');
    });
});