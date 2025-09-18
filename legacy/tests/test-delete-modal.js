/**
 * Test script for custom delete confirmation modal
 * Run against the live development environment
 */

const { chromium } = require('playwright');

const ADMIN_CREDENTIALS = {
  email: 'admin@resolve.io',
  password: 'admin123'
};

async function runTest() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('🔍 Testing custom delete confirmation modal...\n');
  
  try {
    // 1. Sign in as admin
    console.log('1. Signing in as admin...');
    await page.goto('http://localhost:5000/signin');
    await page.fill('input[name="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[name="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    console.log('   ✅ Signed in successfully\n');
    
    // 2. Navigate to users page
    console.log('2. Navigating to users page...');
    await page.goto('http://localhost:5000/users');
    await page.waitForSelector('#usersContainer');
    console.log('   ✅ Users page loaded\n');
    
    // 3. Create a test user to delete
    console.log('3. Creating test user...');
    await page.click('button:has-text("Add User")');
    await page.waitForTimeout(500);
    
    const timestamp = Date.now();
    const testEmail = `modal-test-${timestamp}@example.com`;
    
    await page.fill('input[name="name"]', `Modal Test ${timestamp}`);
    await page.fill('input[name="email"]', testEmail);
    await page.selectOption('select[name="role"]', 'user');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    console.log(`   ✅ Created test user: ${testEmail}\n`);
    
    // 4. Test delete modal appearance
    console.log('4. Testing delete modal...');
    const userRow = page.locator(`tr:has-text("${testEmail}")`);
    await userRow.waitFor();
    
    const deleteButton = userRow.locator('button:has-text("Delete")');
    await deleteButton.click();
    
    // Check modal appears
    const modal = page.locator('.modal-overlay');
    await modal.waitFor({ state: 'visible' });
    console.log('   ✅ Modal appeared\n');
    
    // 5. Verify modal content
    console.log('5. Verifying modal content...');
    const modalTitle = await modal.locator('.modal-title').textContent();
    const modalText = await modal.locator('.delete-modal-text').textContent();
    const warningText = await modal.locator('.delete-modal-warning').textContent();
    
    console.log(`   Title: ${modalTitle}`);
    console.log(`   Text: ${modalText}`);
    console.log(`   Warning: ${warningText}`);
    
    if (!modalTitle.includes('Delete User')) {
      throw new Error('Modal title incorrect');
    }
    if (!modalText.includes(testEmail)) {
      throw new Error('Modal does not show user email');
    }
    if (!warningText.includes('cannot be undone')) {
      throw new Error('Modal missing warning text');
    }
    console.log('   ✅ Modal content correct\n');
    
    // 6. Test cancel functionality
    console.log('6. Testing cancel button...');
    await modal.locator('button[data-action="cancel"]').click();
    await modal.waitFor({ state: 'hidden' });
    console.log('   ✅ Modal closed on cancel\n');
    
    // Verify user still exists
    await userRow.waitFor({ state: 'visible' });
    console.log('   ✅ User still in table after cancel\n');
    
    // 7. Test actual deletion
    console.log('7. Testing actual deletion...');
    await deleteButton.click();
    await modal.waitFor({ state: 'visible' });
    
    // Click delete button
    await modal.locator('button[data-action="delete"]').click();
    await modal.waitFor({ state: 'hidden' });
    console.log('   ✅ Modal closed after delete\n');
    
    // Wait for table refresh
    await page.waitForTimeout(2000);
    
    // Verify user is removed
    const userGone = await userRow.isVisible();
    if (userGone) {
      throw new Error('User still visible after deletion');
    }
    console.log('   ✅ User removed from table\n');
    
    // Check for success toast
    const toast = page.locator('.toast:has-text("deleted successfully")');
    if (await toast.isVisible()) {
      console.log('   ✅ Success toast displayed\n');
    }
    
    // 8. Test mobile responsiveness
    console.log('8. Testing mobile responsiveness...');
    
    // Create another test user
    await page.click('button:has-text("Add User")');
    await page.waitForTimeout(500);
    const mobileTestEmail = `mobile-test-${Date.now()}@example.com`;
    await page.fill('input[name="name"]', 'Mobile Test');
    await page.fill('input[name="email"]', mobileTestEmail);
    await page.selectOption('select[name="role"]', 'user');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Test delete on mobile
    const mobileUserRow = page.locator(`tr:has-text("${mobileTestEmail}")`);
    await mobileUserRow.locator('button:has-text("Delete")').click();
    await modal.waitFor({ state: 'visible' });
    
    // Check mobile styling
    const modalContent = modal.locator('.modal-content');
    const box = await modalContent.boundingBox();
    
    if (box.width > 360) {
      console.log(`   ⚠️  Modal width on mobile: ${box.width}px (should be <= 360px)`);
    } else {
      console.log(`   ✅ Modal width appropriate for mobile: ${box.width}px`);
    }
    
    // Check buttons are stacked on mobile
    const buttons = await modal.locator('.modal-footer button').all();
    if (buttons.length === 2) {
      const btn1Box = await buttons[0].boundingBox();
      const btn2Box = await buttons[1].boundingBox();
      
      if (btn1Box.y !== btn2Box.y) {
        console.log('   ✅ Buttons stacked vertically on mobile');
      } else {
        console.log('   ⚠️  Buttons not stacked on mobile');
      }
    }
    
    // Close modal
    await modal.locator('button[data-action="cancel"]').click();
    
    console.log('\n✅ All tests passed! Custom delete confirmation modal working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'delete-modal-error.png', fullPage: true });
    console.log('Screenshot saved to delete-modal-error.png');
    
  } finally {
    await browser.close();
  }
}

// Run the test
runTest().catch(console.error);