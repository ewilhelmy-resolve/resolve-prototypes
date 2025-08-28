const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

test.describe('Chat History Enhanced UI Tests', () => {
    test('Verify all UI improvements: visibility, delete, and active states', async ({ page }) => {
        console.log('🧪 Testing Chat History UI Enhancements');
        
        // Login as admin
        await page.goto(BASE_URL);
        await page.click('text="Sign in here"');
        await page.fill('input[type="email"]', 'admin@resolve.io');
        await page.fill('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard', { timeout: 10000 });
        console.log('✅ Logged in as admin');
        
        // Wait for chat interface to load
        await page.waitForTimeout(3000);
        
        // Create a test conversation if needed
        const chatInput = page.locator('textarea, input[type="text"]').last();
        await chatInput.fill('Test message for UI validation');
        await chatInput.press('Enter');
        await page.waitForTimeout(2000);
        
        // Reload to ensure chat history loads
        await page.reload();
        await page.waitForTimeout(3000);
        
        // Test 1: Text Visibility
        console.log('\n📝 Test 1: Text Visibility');
        const chatItems = page.locator('.chat-item');
        const itemCount = await chatItems.count();
        console.log(`  Found ${itemCount} chat items`);
        
        if (itemCount > 0) {
            const firstItem = chatItems.first();
            const titleElement = firstItem.locator('.chat-item-title');
            
            // Check text color
            const textColor = await titleElement.evaluate(el => window.getComputedStyle(el).color);
            console.log(`  Text color: ${textColor}`);
            expect(textColor).not.toBe('rgb(255, 255, 255)'); // Not pure white
            expect(textColor).toMatch(/rgb\(22[0-9], 22[0-9], 22[0-9]\)/); // Light gray
            
            // Check background
            const bgColor = await firstItem.evaluate(el => window.getComputedStyle(el).backgroundColor);
            console.log(`  Background: ${bgColor}`);
            expect(bgColor).toContain('rgba'); // Has transparency
            
            console.log('  ✅ Text is visible with proper contrast');
        }
        
        // Test 2: Delete Button on Hover
        console.log('\n📝 Test 2: Delete Button on Hover');
        if (itemCount > 0) {
            const testItem = chatItems.first();
            const deleteBtn = testItem.locator('.chat-delete-btn');
            
            // Check initial state (hidden)
            const initialOpacity = await deleteBtn.evaluate(el => window.getComputedStyle(el).opacity);
            expect(initialOpacity).toBe('0');
            console.log('  Delete button initially hidden');
            
            // Hover and check
            await testItem.hover();
            await page.waitForTimeout(500);
            const hoverOpacity = await deleteBtn.evaluate(el => window.getComputedStyle(el).opacity);
            expect(hoverOpacity).toBe('1');
            console.log('  ✅ Delete button appears on hover');
            
            // Move mouse away
            await page.mouse.move(0, 0);
        }
        
        // Test 3: Active State on Click
        console.log('\n📝 Test 3: Active State on Click');
        if (itemCount > 1) {
            const secondItem = chatItems.nth(1);
            
            // Click to activate
            await secondItem.click();
            await page.waitForTimeout(2000);
            
            // Check active class
            const hasActiveClass = await secondItem.evaluate(el => el.classList.contains('active'));
            expect(hasActiveClass).toBeTruthy();
            
            // Check active styling
            const activeBg = await secondItem.evaluate(el => window.getComputedStyle(el).backgroundColor);
            console.log(`  Active background: ${activeBg}`);
            expect(activeBg).toContain('0.2'); // Blue with transparency
            
            // Check if messages loaded
            const messages = await page.locator('.quikchat-message').count();
            expect(messages).toBeGreaterThan(0);
            
            console.log('  ✅ Active state applied and conversation loaded');
        }
        
        // Test 4: Delete Functionality
        console.log('\n📝 Test 4: Delete Functionality');
        const initialCount = await chatItems.count();
        
        if (initialCount > 2) {
            // Set up dialog handler
            let dialogHandled = false;
            page.once('dialog', async dialog => {
                console.log(`  Confirmation: "${dialog.message()}"`);
                expect(dialog.message()).toContain('Are you sure');
                await dialog.accept();
                dialogHandled = true;
            });
            
            // Delete a chat
            const itemToDelete = chatItems.nth(2);
            await itemToDelete.hover();
            await page.waitForTimeout(500);
            
            const deleteBtn = itemToDelete.locator('.chat-delete-btn');
            await deleteBtn.click();
            
            // Wait for deletion
            await page.waitForTimeout(2000);
            
            const finalCount = await chatItems.count();
            expect(finalCount).toBe(initialCount - 1);
            expect(dialogHandled).toBeTruthy();
            
            console.log(`  Deleted: ${initialCount} → ${finalCount} items`);
            console.log('  ✅ Delete with confirmation works');
        }
        
        console.log('\n✅ All UI enhancements verified successfully!');
        console.log('  ✓ Text is visible (light gray on dark)');
        console.log('  ✓ Delete buttons appear on hover');
        console.log('  ✓ Active states highlight selected chats');
        console.log('  ✓ Delete functionality with confirmation works');
        console.log('  ✓ Clicking chats loads conversations');
    });
    
    test('Quick delete operation test', async ({ page }) => {
        console.log('🧪 Quick Delete Operation Test');
        
        // Quick login
        await page.goto(`${BASE_URL}/signin`);
        await page.fill('input[type="email"]', 'admin@resolve.io');
        await page.fill('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard');
        
        await page.waitForTimeout(3000);
        
        // Count chats
        const chatItems = page.locator('.chat-item');
        const count = await chatItems.count();
        console.log(`Found ${count} chats`);
        
        if (count > 0) {
            // Delete first item
            page.on('dialog', dialog => dialog.accept());
            
            const firstItem = chatItems.first();
            await firstItem.hover();
            await page.waitForTimeout(500);
            
            const deleteBtn = firstItem.locator('.chat-delete-btn');
            if (await deleteBtn.isVisible()) {
                await deleteBtn.click();
                await page.waitForTimeout(2000);
                
                const newCount = await chatItems.count();
                console.log(`After delete: ${newCount} chats`);
                expect(newCount).toBe(count - 1);
                console.log('✅ Delete successful');
            }
        }
    });
});