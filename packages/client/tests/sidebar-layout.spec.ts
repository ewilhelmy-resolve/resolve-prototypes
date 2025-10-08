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

  test('main content wrapper is full-width with padding for sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // Find main content wrapper - should always be at left edge
    const mainWrapper = page.locator('.fixed.inset-y-0.overflow-hidden').first();
    const boundingBox = await mainWrapper.boundingBox();

    // Main wrapper should be at left edge (full width)
    expect(boundingBox?.x).toBeLessThanOrEqual(5);

    // Header should have padding to account for sidebar
    const header = page.locator('header');
    const headerPadding = await header.evaluate((el) =>
      window.getComputedStyle(el).paddingLeft
    );
    // Should have 256px (16rem) left padding on desktop
    expect(headerPadding).toBe('256px');
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

    // Sidebar should now be collapsed with offcanvas collapsible mode
    await expect(sidebarWrapper).toHaveAttribute('data-state', 'collapsed');
    await expect(sidebarWrapper).toHaveAttribute('data-collapsible', 'offcanvas');

    // CRITICAL: Verify the sidebar is actually visually hidden (negative left position)
    const sidebarBox = await sidebarWrapper.boundingBox();
    expect(sidebarBox?.x).toBeLessThan(0); // Should be off-screen to the left
  });

  test('header position stays consistent when sidebar is collapsed', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const header = page.locator('header');
    const sidebarWrapper = page.locator('[data-state]');
    const trigger = page.locator('[data-sidebar="trigger"]');

    // Get header padding before collapse
    const paddingBefore = await header.evaluate((el) =>
      window.getComputedStyle(el).paddingLeft
    );

    // Collapse sidebar
    await trigger.click();
    await page.waitForTimeout(250);

    // Verify sidebar is in offcanvas mode
    await expect(sidebarWrapper).toHaveAttribute('data-collapsible', 'offcanvas');

    // CRITICAL: Header padding should remain the same (header doesn't move)
    const paddingAfter = await header.evaluate((el) =>
      window.getComputedStyle(el).paddingLeft
    );
    expect(paddingAfter).toBe(paddingBefore);
    expect(paddingAfter).toBe('256px');
  });

  test('sidebar expands again when toggle is clicked second time', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const sidebarWrapper = page.locator('[data-state]');
    const trigger = page.locator('[data-sidebar="trigger"]');

    // Collapse
    await trigger.click();
    await page.waitForTimeout(250);
    await expect(sidebarWrapper).toHaveAttribute('data-state', 'collapsed');

    // Verify sidebar is off-screen
    const collapsedBox = await sidebarWrapper.boundingBox();
    expect(collapsedBox?.x).toBeLessThan(0);

    // Expand again
    await trigger.click();
    await page.waitForTimeout(250);
    await expect(sidebarWrapper).toHaveAttribute('data-state', 'expanded');

    // Sidebar should be back on-screen at left edge
    const expandedBox = await sidebarWrapper.boundingBox();
    expect(expandedBox?.x).toBeGreaterThanOrEqual(0);
    expect(expandedBox?.x).toBeLessThanOrEqual(5);
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

  test('header elements stay in exact same position when sidebar toggles', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const trigger = page.locator('[data-sidebar="trigger"]');
    const breadcrumb = page.locator('header').locator('text="Rita Go"');

    // Get initial positions
    const initialTriggerBox = await trigger.boundingBox();
    const initialBreadcrumbBox = await breadcrumb.boundingBox();
    expect(initialTriggerBox).not.toBeNull();
    expect(initialBreadcrumbBox).not.toBeNull();

    // Toggle sidebar
    await trigger.click();
    await page.waitForTimeout(250);

    // Elements should still be visible
    await expect(trigger).toBeVisible();
    await expect(breadcrumb).toBeVisible();

    // Get positions after collapse
    const collapsedTriggerBox = await trigger.boundingBox();
    const collapsedBreadcrumbBox = await breadcrumb.boundingBox();

    // CRITICAL: Header elements should be in EXACT same position
    // This is the key requirement - header doesn't move when sidebar toggles
    expect(collapsedTriggerBox?.x).toBe(initialTriggerBox?.x);
    expect(collapsedTriggerBox?.y).toBe(initialTriggerBox?.y);
    expect(collapsedBreadcrumbBox?.x).toBe(initialBreadcrumbBox?.x);
    expect(collapsedBreadcrumbBox?.y).toBe(initialBreadcrumbBox?.y);
  });

  test('sidebar has correct z-index and logo is visible above main content', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const sidebarWrapper = page.locator('[data-state]');
    const logo = page.locator('img[alt="Rita Logo"]');
    const mainWrapper = page.locator('.fixed.inset-y-0.overflow-hidden').first();

    // Verify sidebar has higher z-index than main content
    const sidebarZIndex = await sidebarWrapper.evaluate((el) => {
      // Find the fixed sidebar div (child of wrapper)
      const fixedSidebar = el.querySelector('.fixed.z-50');
      return fixedSidebar ? window.getComputedStyle(fixedSidebar).zIndex : null;
    });
    const mainZIndex = await mainWrapper.evaluate((el) =>
      window.getComputedStyle(el).zIndex
    );

    expect(sidebarZIndex).toBe('50');
    expect(mainZIndex).toBe('0');

    // CRITICAL: Logo must be visible (not covered by main content)
    await expect(logo).toBeVisible();

    // Verify logo is actually rendered on screen (not just in DOM)
    const logoBox = await logo.boundingBox();
    expect(logoBox).not.toBeNull();
    expect(logoBox?.width).toBeGreaterThan(0);
    expect(logoBox?.height).toBeGreaterThan(0);
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
