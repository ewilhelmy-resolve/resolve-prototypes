/**
 * Test for custom delete confirmation modal
 * Runs against live development environment
 */

const { test, expect } = require('@playwright/test');

const ADMIN_CREDENTIALS = {
  email: 'admin@resolve.io',
  password: 'admin123'
};

test.describe('Delete Confirmation Modal', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as admin
    await page.goto('http://localhost:5000/signin');
    await page.fill('input[name="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[name="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Navigate to users page
    await page.goto('http://localhost:5000/users');
    await page.waitForSelector('#usersContainer');
  });

  test('should show custom modal instead of browser confirm', async ({ page }) => {
    // Create a test user
    await page.click('button:has-text("Add User")');
    await page.waitForTimeout(500);
    
    const timestamp = Date.now();
    const testEmail = `modal-test-${timestamp}@example.com`;
    
    await page.fill('input[name="name"]', `Modal Test ${timestamp}`);
    await page.fill('input[name="email"]', testEmail);
    await page.selectOption('select[name="role"]', 'user');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Find the user row
    const userRow = page.locator(`tr:has-text("${testEmail}")`);
    await expect(userRow).toBeVisible();
    
    // Click delete button
    const deleteButton = userRow.locator('button:has-text("Delete")');
    await deleteButton.click();
    
    // Verify custom modal appears (not browser confirm)
    const modal = page.locator('.modal-overlay');
    await expect(modal).toBeVisible();
    
    // Verify modal content
    await expect(modal.locator('.modal-title')).toContainText('Delete User');
    await expect(modal.locator('.delete-modal-text')).toContainText(testEmail);
    await expect(modal.locator('.delete-modal-warning')).toContainText('This action cannot be undone');
  });
  
  test('should cancel deletion when clicking cancel', async ({ page }) => {
    // Create a test user
    await page.click('button:has-text("Add User")');
    await page.waitForTimeout(500);
    
    const timestamp = Date.now();
    const testEmail = `cancel-test-${timestamp}@example.com`;
    
    await page.fill('input[name="name"]', `Cancel Test ${timestamp}`);
    await page.fill('input[name="email"]', testEmail);
    await page.selectOption('select[name="role"]', 'user');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Find the user row
    const userRow = page.locator(`tr:has-text("${testEmail}")`);
    await expect(userRow).toBeVisible();
    
    // Click delete button
    await userRow.locator('button:has-text("Delete")').click();
    
    // Click cancel in modal
    const modal = page.locator('.modal-overlay');
    await modal.locator('button[data-action="cancel"]').click();
    
    // Modal should close
    await expect(modal).not.toBeVisible();
    
    // User should still exist
    await expect(userRow).toBeVisible();
  });
  
  test('should delete user when confirming', async ({ page }) => {
    // Create a test user
    await page.click('button:has-text("Add User")');
    await page.waitForTimeout(500);
    
    const timestamp = Date.now();
    const testEmail = `delete-test-${timestamp}@example.com`;
    
    await page.fill('input[name="name"]', `Delete Test ${timestamp}`);
    await page.fill('input[name="email"]', testEmail);
    await page.selectOption('select[name="role"]', 'user');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Find the user row
    const userRow = page.locator(`tr:has-text("${testEmail}")`);
    await expect(userRow).toBeVisible();
    
    // Get initial row count
    const initialCount = await page.locator('#usersTableBody tr').count();
    
    // Click delete button
    await userRow.locator('button:has-text("Delete")').click();
    
    // Confirm deletion in modal
    const modal = page.locator('.modal-overlay');
    await modal.locator('button[data-action="delete"]').click();
    
    // Modal should close
    await expect(modal).not.toBeVisible();
    
    // Wait for table refresh
    await page.waitForTimeout(1500);
    
    // User should be removed
    await expect(userRow).not.toBeVisible();
    
    // Row count should decrease
    const newCount = await page.locator('#usersTableBody tr').count();
    expect(newCount).toBe(initialCount - 1);
    
    // Success toast should appear
    await expect(page.locator('.toast:has-text("deleted successfully")')).toBeVisible();
  });
  
  test('should be mobile-friendly', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Create a test user
    await page.click('button:has-text("Add User")');
    await page.waitForTimeout(500);
    
    const timestamp = Date.now();
    const testEmail = `mobile-test-${timestamp}@example.com`;
    
    await page.fill('input[name="name"]', `Mobile Test ${timestamp}`);
    await page.fill('input[name="email"]', testEmail);
    await page.selectOption('select[name="role"]', 'user');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Find and delete user
    const userRow = page.locator(`tr:has-text("${testEmail}")`);
    await userRow.locator('button:has-text("Delete")').click();
    
    // Check modal is visible and properly sized
    const modal = page.locator('.modal-overlay');
    await expect(modal).toBeVisible();
    
    const modalContent = modal.locator('.modal-content');
    const box = await modalContent.boundingBox();
    
    // Modal should fit mobile screen
    expect(box.width).toBeLessThanOrEqual(360);
    
    // Buttons should be visible
    await expect(modal.locator('button[data-action="cancel"]')).toBeVisible();
    await expect(modal.locator('button[data-action="delete"]')).toBeVisible();
    
    // Close modal
    await modal.locator('button[data-action="cancel"]').click();
  });
});