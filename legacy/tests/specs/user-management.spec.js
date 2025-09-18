const { test, expect, waitForElement, signInAsAdmin } = require('../fixtures/simple-base');

test.describe('User Management - Complete Test Suite', () => {
    
    // ==================== ACCESS CONTROL ====================
    test.describe('Access Control', () => {
        test('should require authentication', async ({ page }) => {
            // Direct access without auth should redirect to login
            await page.goto('/users');
            await expect(page).toHaveURL(/.*signin/);
        });

        test('should require tenant-admin role', async ({ page }) => {
            // Login as regular user (non-admin) - skip this test since we only have admin user
            // This test would require creating a regular user first
            test.skip(true, 'Regular user not available in test environment');
        });

        test('should allow tenant-admin access', async ({ page }) => {
            await signInAsAdmin(page);
            await page.goto('/users');
            await expect(page).toHaveURL(/.*users/);
            await expect(page.locator('h1:has-text("User Management")')).toBeVisible();
        });
    });

    // ==================== USER LISTING ====================
    test.describe('User Listing', () => {
        test('should display user table with all columns', async ({ page }) => {
            await signInAsAdmin(page);
            await page.goto('/users');
            await page.waitForSelector('#usersContainer');
            
            // Verify table headers
            const headers = ['Name', 'Email', 'Role', 'Status', 'Last Login'];
            for (const header of headers) {
                await expect(page.locator(`th:has-text("${header}")`)).toBeVisible();
            }
        });

        test('should show pagination controls', async ({ page }) => {
            await signInAsAdmin(page);
            await page.goto('/users');
            
            // Check pagination elements
            await expect(page.locator('#prevPage')).toBeVisible();
            await expect(page.locator('#nextPage')).toBeVisible();
            await expect(page.locator('#pageInfo')).toBeVisible();
            await expect(page.locator('#totalCount')).toBeVisible();
        });

        test.skip('should handle empty state', async ({ page }) => {
            await signInAsAdmin(page);
            await page.goto('/users');
            
            // If no users, should show empty state
            const emptyState = page.locator('#emptyState');
            const tableBody = page.locator('#usersTableBody');
            
            // Either empty state or table should be visible
            const hasUsers = await tableBody.locator('tr').count() > 0;
            if (!hasUsers) {
                await expect(emptyState).toBeVisible();
                await expect(emptyState.locator('text=No users found')).toBeVisible();
            }
        });
    });

    // ==================== USER SEARCH & FILTERING ====================
    test.describe('Search and Filtering', () => {
        test.skip('should search users by name or email', async ({ page }) => {
            await signInAsAdmin(page);
            await page.goto('/users');
            await page.waitForSelector('#usersContainer');
            
            // Search functionality
            const searchInput = page.locator('input[placeholder*="Search"]');
            if (await searchInput.isVisible()) {
                await searchInput.fill('admin');
                await page.waitForTimeout(500); // Debounce delay
                
                // Should filter results
                const rows = page.locator('#usersTableBody tr');
                const count = await rows.count();
                if (count > 0) {
                    // Verify filtered results contain search term
                    const firstRow = rows.first();
                    const text = await firstRow.textContent();
                    expect(text.toLowerCase()).toContain('admin');
                }
            }
        });

        test.skip('should filter by role', async ({ page }) => {
            await signInAsAdmin(page);
            await page.goto('/users');
            
            const roleFilter = page.locator('select#roleFilter');
            if (await roleFilter.isVisible()) {
                // Filter by admin role
                await roleFilter.selectOption('tenant-admin');
                await page.waitForTimeout(500);
                
                // Verify filtered results
                const roles = page.locator('.role-badge');
                const count = await roles.count();
                if (count > 0) {
                    for (let i = 0; i < count; i++) {
                        const roleText = await roles.nth(i).textContent();
                        expect(roleText).toContain('Admin');
                    }
                }
            }
        });

        test.skip('should filter by status', async ({ page }) => {
            await signInAsAdmin(page);
            await page.goto('/users');
            
            const statusFilter = page.locator('select#statusFilter');
            if (await statusFilter.isVisible()) {
                // Filter by active status
                await statusFilter.selectOption('active');
                await page.waitForTimeout(500);
                
                // Verify filtered results
                const statuses = page.locator('.status-badge');
                const count = await statuses.count();
                if (count > 0) {
                    for (let i = 0; i < count; i++) {
                        const statusText = await statuses.nth(i).textContent();
                        expect(statusText).toContain('Active');
                    }
                }
            }
        });
    });

    // ==================== USER CREATION ====================
    test.describe('User Creation', () => {
        test.skip('should open add user modal', async ({ page }) => {
            await signInAsAdmin(page);
            await page.goto('/users');
            
            // Click add user button
            const addButton = page.locator('button:has-text("Add User")');
            await addButton.click();
            
            // Modal should appear
            const modal = page.locator('.modal, [role="dialog"]');
            await expect(modal).toBeVisible();
            
            // Modal should have form fields
            await expect(modal.locator('input[name="name"]')).toBeVisible();
            await expect(modal.locator('input[name="email"]')).toBeVisible();
            await expect(modal.locator('select[name="role"]')).toBeVisible();
        });

        test.skip('should validate required fields', async ({ page }) => {
            await signInAsAdmin(page);
            await page.goto('/users');
            
            // Open modal
            await page.click('button:has-text("Add User")');
            
            // Try to submit without data
            const submitButton = page.locator('button:has-text("Create User"), button:has-text("Add")').last();
            await submitButton.click();
            
            // Should show validation errors
            const emailInput = page.locator('input[name="email"]');
            const isRequired = await emailInput.getAttribute('required');
            expect(isRequired).not.toBeNull();
        });

        test.skip('should create new user', async ({ page }) => {
            await signInAsAdmin(page);
            await page.goto('/users');
            
            // Open modal
            await page.click('button:has-text("Add User")');
            
            // Fill form
            const timestamp = Date.now();
            const testUser = {
                name: `Test User ${timestamp}`,
                email: `test${timestamp}@example.com`,
                role: 'user'
            };
            
            await page.fill('input[name="name"]', testUser.name);
            await page.fill('input[name="email"]', testUser.email);
            await page.selectOption('select[name="role"]', testUser.role);
            
            // Submit
            await page.click('button:has-text("Create User"), button:has-text("Add")');
            
            // Modal should close
            await page.waitForTimeout(1000);
            const modal = page.locator('.modal, [role="dialog"]');
            await expect(modal).not.toBeVisible();
            
            // User should appear in list
            await expect(page.locator(`text=${testUser.email}`)).toBeVisible();
        });
    });

    // ==================== USER EDITING ====================
    test.describe('User Editing', () => {
        test.skip('should open edit modal for user', async ({ page }) => {
            await signInAsAdmin(page);
            await page.goto('/users');
            await page.waitForSelector('#usersTableBody');
            
            // Click edit on first user
            const editButton = page.locator('.action-btn:has-text("Edit")').first();
            if (await editButton.isVisible()) {
                await editButton.click();
                
                // Modal should open with user data
                const modal = page.locator('.modal, [role="dialog"]');
                await expect(modal).toBeVisible();
                
                // Fields should be pre-filled
                const nameInput = modal.locator('input[name="name"]');
                const value = await nameInput.inputValue();
                expect(value).not.toBe('');
            }
        });

        test.skip('should update user role', async ({ page }) => {
            await signInAsAdmin(page);
            await page.goto('/users');
            
            // Find a non-admin user
            const userRow = page.locator('#usersTableBody tr').filter({ 
                hasText: 'User' 
            }).first();
            
            if (await userRow.isVisible()) {
                // Click edit
                await userRow.locator('.action-btn:has-text("Edit")').click();
                
                // Change role
                const modal = page.locator('.modal, [role="dialog"]');
                await modal.locator('select[name="role"]').selectOption('tenant-admin');
                
                // Save
                await modal.locator('button:has-text("Save"), button:has-text("Update")').click();
                
                // Verify change
                await page.waitForTimeout(1000);
                await expect(userRow.locator('.role-badge')).toContainText('Admin');
            }
        });
    });

    // ==================== USER DELETION ====================
    test.describe('User Deletion', () => {
        test('should delete user and refresh table', async ({ page }) => {
            await signInAsAdmin(page);
            await page.goto('/users');
            await page.waitForSelector('#usersContainer');
            
            // First, create a test user to delete
            await page.click('button:has-text("Add User")');
            await page.waitForTimeout(500);
            
            const timestamp = Date.now();
            const testEmail = `delete-test-${timestamp}@example.com`;
            
            // Fill form
            await page.fill('input[name="name"]', `Delete Test ${timestamp}`);
            await page.fill('input[name="email"]', testEmail);
            await page.selectOption('select[name="role"]', 'user');
            
            // Submit
            await page.click('button[type="submit"]');
            await page.waitForTimeout(2000);
            
            // Verify user appears in table
            const userRow = page.locator(`tr:has-text("${testEmail}")`);
            await expect(userRow).toBeVisible();
            
            // Get initial row count
            const initialRowCount = await page.locator('#usersTableBody tr').count();
            
            // Delete the user
            const deleteButton = userRow.locator('button:has-text("Delete")');
            await deleteButton.click();
            
            // Wait for custom modal to appear
            const deleteModal = page.locator('.modal-overlay');
            await expect(deleteModal).toBeVisible();
            
            // Verify modal content
            await expect(deleteModal.locator('.modal-title')).toContainText('Delete User');
            await expect(deleteModal.locator('.delete-modal-text')).toContainText(testEmail);
            
            // Click the delete button in the modal
            await deleteModal.locator('button[data-action="delete"]').click();
            
            // Wait for modal to close and table to refresh
            await expect(deleteModal).not.toBeVisible();
            await page.waitForTimeout(1000);
            
            // Verify user is removed from table
            await expect(userRow).not.toBeVisible();
            
            // Verify row count decreased
            const newRowCount = await page.locator('#usersTableBody tr').count();
            expect(newRowCount).toBe(initialRowCount - 1);
            
            // Verify success toast appeared
            await expect(page.locator('.toast:has-text("deleted successfully")')).toBeVisible();
        });
        
        test('should show custom confirmation modal before delete', async ({ page }) => {
            await signInAsAdmin(page);
            await page.goto('/users');
            await page.waitForSelector('#usersTableBody');
            
            // Check if there are any users to test with
            const userRows = await page.locator('#usersTableBody tr').count();
            if (userRows < 2) {
                // Create a test user first if needed
                await page.click('button:has-text("Add User")');
                await page.fill('input[name="name"]', 'Test Modal User');
                await page.fill('input[name="email"]', 'modal-test@example.com');
                await page.selectOption('select[name="role"]', 'user');
                await page.click('button[type="submit"]');
                await page.waitForTimeout(2000);
            }
            
            // Find a deletable user (not current admin)
            const userRow = page.locator('#usersTableBody tr').filter({ 
                hasNotText: 'admin@test.com' 
            }).first();
            
            if (await userRow.isVisible()) {
                const deleteButton = userRow.locator('button:has-text("Delete")');
                await deleteButton.click();
                
                // Verify custom modal appears
                const modal = page.locator('.modal-overlay');
                await expect(modal).toBeVisible();
                
                // Verify modal has correct elements
                await expect(modal.locator('.modal-title')).toContainText('Delete User');
                await expect(modal.locator('.delete-modal-warning')).toContainText('This action cannot be undone');
                
                // Test cancel functionality
                await modal.locator('button[data-action="cancel"]').click();
                
                // Modal should close
                await expect(modal).not.toBeVisible();
                
                // User should still be in table
                await expect(userRow).toBeVisible();
            }
        });

        test.skip('should prevent self-deletion', async ({ page }) => {
            await signInAsAdmin(page);
            await page.goto('/users');
            
            // Find current admin row
            const adminRow = page.locator('#usersTableBody tr').filter({ 
                hasText: 'admin@resolve.io' 
            }).first();
            
            if (await adminRow.isVisible()) {
                const deleteButton = adminRow.locator('.action-btn:has-text("Delete")');
                
                // Delete button should be disabled or not visible for self
                const isDisabled = await deleteButton.isDisabled();
                const isVisible = await deleteButton.isVisible();
                
                expect(isDisabled || !isVisible).toBeTruthy();
            }
        });
    });

    // ==================== PASSWORD RESET ====================
    test.describe('Password Reset', () => {
        test.skip('should have reset password option', async ({ page }) => {
            await signInAsAdmin(page);
            await page.goto('/users');
            
            // Check for reset password button/link
            const resetButton = page.locator('.action-btn:has-text("Reset Password")').first();
            if (await resetButton.isVisible()) {
                await resetButton.click();
                
                // Should show confirmation or modal
                page.on('dialog', dialog => {
                    expect(dialog.message()).toContain('password');
                    dialog.accept();
                });
            }
        });
    });

    // ==================== BULK ACTIONS ====================
    test.describe('Bulk Actions', () => {
        test.skip('should have select all checkbox', async ({ page }) => {
            await signInAsAdmin(page);
            await page.goto('/users');
            
            const selectAll = page.locator('input[type="checkbox"]#selectAll, thead input[type="checkbox"]');
            if (await selectAll.isVisible()) {
                await selectAll.check();
                
                // All checkboxes should be checked
                const checkboxes = page.locator('#usersTableBody input[type="checkbox"]');
                const count = await checkboxes.count();
                for (let i = 0; i < count; i++) {
                    await expect(checkboxes.nth(i)).toBeChecked();
                }
            }
        });

        test.skip('should show bulk action buttons when users selected', async ({ page }) => {
            await signInAsAdmin(page);
            await page.goto('/users');
            
            // Select first user
            const firstCheckbox = page.locator('#usersTableBody input[type="checkbox"]').first();
            if (await firstCheckbox.isVisible()) {
                await firstCheckbox.check();
                
                // Bulk action buttons should appear
                const bulkDelete = page.locator('button:has-text("Delete Selected")');
                if (await bulkDelete.isVisible()) {
                    await expect(bulkDelete).toBeVisible();
                }
            }
        });
    });

    // ==================== SORTING ====================
    test.describe('Table Sorting', () => {
        test.skip('should sort by name', async ({ page }) => {
            await signInAsAdmin(page);
            await page.goto('/users');
            
            const nameHeader = page.locator('th:has-text("Name")');
            if (await nameHeader.isVisible()) {
                // Get initial order
                const firstNameBefore = await page.locator('#usersTableBody tr').first().locator('td').nth(1).textContent();
                
                // Click to sort
                await nameHeader.click();
                await page.waitForTimeout(500);
                
                // Check if order changed
                const firstNameAfter = await page.locator('#usersTableBody tr').first().locator('td').nth(1).textContent();
                
                // Should be different (unless only 1 user)
                const rowCount = await page.locator('#usersTableBody tr').count();
                if (rowCount > 1) {
                    expect(firstNameBefore !== firstNameAfter).toBeTruthy();
                }
            }
        });
    });

    // ==================== DATA PERSISTENCE ====================
    test.describe('Data Persistence', () => {
        test.skip('should persist user changes after page reload', async ({ page }) => {
            await signInAsAdmin(page);
            await page.goto('/users');
            
            // Count users before reload
            const countBefore = await page.locator('#usersTableBody tr').count();
            
            // Reload page
            await page.reload();
            await page.waitForSelector('#usersTableBody');
            
            // Count should be same
            const countAfter = await page.locator('#usersTableBody tr').count();
            expect(countAfter).toBe(countBefore);
        });
    });

    // ==================== ERROR HANDLING ====================
    test.describe('Error Handling', () => {
        test.skip('should handle duplicate email gracefully', async ({ page }) => {
            await signInAsAdmin(page);
            await page.goto('/users');
            
            // Try to create user with existing email
            await page.click('button:has-text("Add User")');
            await page.fill('input[name="name"]', 'Duplicate User');
            await page.fill('input[name="email"]', 'admin@resolve.io'); // Existing email
            await page.selectOption('select[name="role"]', 'user');
            
            // Submit
            await page.click('button:has-text("Create User"), button:has-text("Add")');
            
            // Should show error message
            const errorToast = page.locator('.toast-error, .error-message');
            await expect(errorToast).toBeVisible();
            await expect(errorToast).toContainText(/email.*exists|duplicate/i);
        });

        test.skip('should handle network errors', async ({ page }) => {
            await signInAsAdmin(page);
            await page.goto('/users');
            
            // Simulate offline
            await page.context().setOffline(true);
            
            // Try to load users
            await page.click('button:has-text("Refresh"), button:has-text("Reload")');
            
            // Should show error
            const errorMessage = page.locator('.toast-error, .error-message');
            await expect(errorMessage).toBeVisible();
            
            // Restore connection
            await page.context().setOffline(false);
        });
    });
});