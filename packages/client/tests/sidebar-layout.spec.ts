import { test, expect } from '@playwright/test';

/**
 * Sidebar Layout E2E Tests
 *
 * Validates that the sidebar toggle works correctly and prevents layout regressions.
 * This test suite catches the common bug where the sidebar toggle breaks after code changes.
 */

test.describe('Sidebar Layout and Toggle', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to chat page (authenticated route with sidebar)
    await page.goto('/chat');

    // Wait for layout to be fully rendered
    await page.waitForSelector('[data-sidebar="trigger"]');
    await page.waitForSelector('img[alt="Rita Logo"]');
  });

  test('sidebar is visible by default on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Verify sidebar wrapper exists and is in expanded state
    const sidebarWrapper = page.locator('[data-state]');
    await expect(sidebarWrapper).toBeVisible();
    await expect(sidebarWrapper).toHaveAttribute('data-state', 'expanded');

    // Verify logo is visible inside sidebar
    const logo = page.locator('img[alt="Rita Logo"]');
    await expect(logo).toBeVisible();

    // Verify sidebar trigger button is visible
    const trigger = page.locator('[data-sidebar="trigger"]');
    await expect(trigger).toBeVisible();
  });

  test('main content has correct spacing when sidebar is expanded', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // Find main content wrapper
    const mainWrapper = page.locator('.fixed.inset-y-0.overflow-hidden').first();

    // On desktop with expanded sidebar, should have left offset of 256px (16rem = left-64)
    const boundingBox = await mainWrapper.boundingBox();
    expect(boundingBox?.x).toBeGreaterThanOrEqual(250); // Allow small margin for browser differences
    expect(boundingBox?.x).toBeLessThanOrEqual(260);
  });

  test('sidebar collapses when toggle button is clicked', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const sidebarWrapper = page.locator('[data-state]');
    const trigger = page.locator('[data-sidebar="trigger"]');

    // Initial state should be expanded
    await expect(sidebarWrapper).toHaveAttribute('data-state', 'expanded');

    // Click toggle button
    await trigger.click();

    // Wait for animation to complete
    await page.waitForTimeout(250);

    // Sidebar should now be collapsed
    await expect(sidebarWrapper).toHaveAttribute('data-state', 'collapsed');
    await expect(sidebarWrapper).toHaveAttribute('data-collapsible', 'offcanvas');
  });

  test('main content expands to full width when sidebar is collapsed', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const mainWrapper = page.locator('.fixed.inset-y-0.overflow-hidden').first();
    const trigger = page.locator('[data-sidebar="trigger"]');

    // Collapse sidebar
    await trigger.click();
    await page.waitForTimeout(250);

    // Main content should now start at left edge (x=0 or very close)
    const boundingBox = await mainWrapper.boundingBox();
    expect(boundingBox?.x).toBeLessThanOrEqual(5); // Allow small margin
  });

  test('sidebar expands again when toggle is clicked second time', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const sidebarWrapper = page.locator('[data-state]');
    const trigger = page.locator('[data-sidebar="trigger"]');

    // Collapse
    await trigger.click();
    await page.waitForTimeout(250);
    await expect(sidebarWrapper).toHaveAttribute('data-state', 'collapsed');

    // Expand again
    await trigger.click();
    await page.waitForTimeout(250);
    await expect(sidebarWrapper).toHaveAttribute('data-state', 'expanded');

    // Main content should be back to left offset
    const mainWrapper = page.locator('.fixed.inset-y-0.overflow-hidden').first();
    const boundingBox = await mainWrapper.boundingBox();
    expect(boundingBox?.x).toBeGreaterThanOrEqual(250);
  });

  test('logo remains visible throughout toggle cycle', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const logo = page.locator('img[alt="Rita Logo"]');
    const trigger = page.locator('[data-sidebar="trigger"]');

    // Logo should be visible initially
    await expect(logo).toBeVisible();

    // Collapse sidebar
    await trigger.click();
    await page.waitForTimeout(250);

    // Logo should still be visible (in the collapsed sidebar off-screen)
    // Note: It's technically off-screen but still in DOM
    const logoExists = await logo.count();
    expect(logoExists).toBe(1);

    // Expand again
    await trigger.click();
    await page.waitForTimeout(250);

    // Logo should definitely be visible now
    await expect(logo).toBeVisible();
  });

  test('sidebar trigger button position stays consistent', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const trigger = page.locator('[data-sidebar="trigger"]');

    // Get initial position
    const initialBox = await trigger.boundingBox();
    expect(initialBox).not.toBeNull();

    // Toggle sidebar
    await trigger.click();
    await page.waitForTimeout(250);

    // Button should still be visible and clickable
    await expect(trigger).toBeVisible();

    // Get position after collapse
    const collapsedBox = await trigger.boundingBox();
    expect(collapsedBox).not.toBeNull();

    // Button should be in roughly the same position (allowing for small shift from layout)
    // The important thing is it doesn't disappear or move drastically
    expect(Math.abs((collapsedBox?.x || 0) - (initialBox?.x || 0))).toBeLessThan(50);
  });

  test('new chat button appears when sidebar is collapsed', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const trigger = page.locator('[data-sidebar="trigger"]');

    // New Chat button in header should not be visible when sidebar is expanded
    const headerNewChatButton = page.locator('header').locator('button:has-text("New Chat")');
    await expect(headerNewChatButton).not.toBeVisible();

    // Collapse sidebar
    await trigger.click();
    await page.waitForTimeout(250);

    // New Chat button should now be visible in header
    await expect(headerNewChatButton).toBeVisible();
  });

  test('mobile viewport shows sidebar as overlay', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // On mobile, sidebar should not affect main content position
    const mainWrapper = page.locator('.fixed.inset-y-0.overflow-hidden').first();
    const boundingBox = await mainWrapper.boundingBox();

    // Should be at left edge on mobile
    expect(boundingBox?.x).toBeLessThanOrEqual(5);
  });

  test('visual regression: layout consistency check', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // Take screenshot of expanded state
    await expect(page).toHaveScreenshot('sidebar-expanded.png', {
      fullPage: false,
      animations: 'disabled',
    });

    // Collapse sidebar
    const trigger = page.locator('[data-sidebar="trigger"]');
    await trigger.click();
    await page.waitForTimeout(250);

    // Take screenshot of collapsed state
    await expect(page).toHaveScreenshot('sidebar-collapsed.png', {
      fullPage: false,
      animations: 'disabled',
    });

    // Expand again
    await trigger.click();
    await page.waitForTimeout(250);

    // Should match first screenshot
    await expect(page).toHaveScreenshot('sidebar-expanded.png', {
      fullPage: false,
      animations: 'disabled',
    });
  });
});
