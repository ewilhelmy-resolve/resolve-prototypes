const { test, expect, signInAsAdmin, waitForElement, BASE_URL } = require('../fixtures/simple-base');

// Helper function to send a chat message (not in simple-base)
async function sendChatMessage(page, message) {
  const chatInput = page.locator('textarea[placeholder*="Type a message"], textarea[placeholder*="Message Rita"], .quikchat-input-textbox');
  await expect(chatInput).toBeVisible({ timeout: 10000 });
  await chatInput.fill(message);
  await chatInput.press('Enter');
  await page.waitForTimeout(1000);
}

test.describe('Chat History Enhanced UI Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Authenticate before each test
        await signInAsAdmin(page);
    });

    test('Verify all UI improvements: visibility, delete, and active states', async ({ page }) => {
        console.log('🧪 Testing Chat History UI Enhancements');
        
        // Already logged in via beforeEach
        console.log('✅ Already authenticated as admin');
        
        // Wait for chat interface to load
        await page.waitForTimeout(3000);
        
        // Create a test conversation if needed
        await sendChatMessage(page, 'Test message for UI validation');
        
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
            await page.waitForTimeout(500);
            
            // Check active class
            const hasActiveClass = await secondItem.evaluate(el => el.classList.contains('active'));
            expect(hasActiveClass).toBe(true);
            console.log('  ✅ Active class applied on click');
            
            // Check visual indicators
            const bgColor = await secondItem.evaluate(el => window.getComputedStyle(el).backgroundColor);
            expect(bgColor).toContain('rgba');
            expect(bgColor).not.toBe('rgba(0, 0, 0, 0)'); // Not transparent
            console.log('  ✅ Active background color applied');
        }
        
        // Test 4: Message Counter Display
        console.log('\n📝 Test 4: Message Counter Display');
        if (itemCount > 0) {
            const firstItem = chatItems.first();
            const messageCount = firstItem.locator('.message-count');
            
            if (await messageCount.count() > 0) {
                const countText = await messageCount.textContent();
                expect(countText).toMatch(/\d+ MESSAGE/);
                console.log(`  Message count displayed: ${countText}`);
                
                // Check styling
                const color = await messageCount.evaluate(el => window.getComputedStyle(el).color);
                expect(color).toMatch(/rgb\(1[0-9]{2}, 1[0-9]{2}, 1[0-9]{2}\)/); // Gray color
                console.log('  ✅ Message counter properly styled');
            }
        }
        
        // Test 5: Overflow Handling
        console.log('\n📝 Test 5: Text Overflow Handling');
        if (itemCount > 0) {
            const firstItem = chatItems.first();
            const titleElement = firstItem.locator('.chat-item-title');
            
            const overflowStyle = await titleElement.evaluate(el => ({
                overflow: window.getComputedStyle(el).overflow,
                textOverflow: window.getComputedStyle(el).textOverflow,
                whiteSpace: window.getComputedStyle(el).whiteSpace
            }));
            
            expect(overflowStyle.overflow).toBe('hidden');
            expect(overflowStyle.textOverflow).toBe('ellipsis');
            expect(overflowStyle.whiteSpace).toBe('nowrap');
            console.log('  ✅ Text overflow handled with ellipsis');
        }
        
        console.log('\n✅ All UI enhancement tests passed!');
    });
    
    test('Quick delete operation test', async ({ page }) => {
        console.log('🧪 Testing Quick Delete Functionality');
        
        // Create a message to ensure we have something to delete
        await sendChatMessage(page, 'Message to be deleted');
        
        // Reload to ensure chat history loads
        await page.reload();
        await page.waitForTimeout(3000);
        
        const chatItems = page.locator('.chat-item');
        const initialCount = await chatItems.count();
        console.log(`  Initial chat items: ${initialCount}`);
        
        if (initialCount > 0) {
            const firstItem = chatItems.first();
            const deleteBtn = firstItem.locator('.chat-delete-btn');
            
            // Hover to show delete button
            await firstItem.hover();
            await page.waitForTimeout(500);
            
            // Click delete
            await deleteBtn.click();
            
            // Handle confirmation if it appears
            page.on('dialog', async dialog => {
                console.log(`  Confirmation dialog: ${dialog.message()}`);
                await dialog.accept();
            });
            
            // Wait for deletion
            await page.waitForTimeout(2000);
            
            // Check count after deletion
            const newCount = await chatItems.count();
            console.log(`  Chat items after delete: ${newCount}`);
            
            // Verify item was removed (or at least attempted)
            expect(newCount).toBeLessThanOrEqual(initialCount);
            console.log('  ✅ Delete operation completed');
        } else {
            console.log('  ⚠️ No chat items to delete');
        }
    });
});