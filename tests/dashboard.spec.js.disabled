const { test, expect } = require('@playwright/test');

test.describe('Dashboard', () => {
  test('should load the dashboard page', async ({ page }) => {
    await page.goto('/pages/dashboard.html');
    
    // Check page title
    await expect(page).toHaveTitle(/Dashboard - Resolve/);
    
    // Check for main elements
    await expect(page.locator('h1:has-text("Ask Rita")')).toBeVisible();
    
    // Check for chat input
    await expect(page.locator('input[placeholder="Ask me anything..."]')).toBeVisible();
    
    // Check for sidebar elements
    await expect(page.getByRole('button', { name: 'New chat' })).toBeVisible();
    await expect(page.locator('h3:has-text("Recent chats")')).toBeVisible();
    
    // Check for knowledge base section
    await expect(page.locator('h3:has-text("Knowledge Base")')).toBeVisible();
  });

  test('should have working chat input', async ({ page }) => {
    await page.goto('/pages/dashboard.html');
    
    // Type in chat input
    const chatInput = page.locator('#chatInput');
    await chatInput.fill('Test message');
    
    // Check that text was entered
    await expect(chatInput).toHaveValue('Test message');
    
    // Clear the input manually (simulating realistic behavior)
    await chatInput.clear();
    await expect(chatInput).toHaveValue('');
  });

  test('should display knowledge base articles', async ({ page }) => {
    await page.goto('/pages/dashboard.html');
    
    // Check for knowledge base articles in the right sidebar
    await expect(page.locator('text=Password Reset Procedures')).toBeVisible();
    await expect(page.locator('text=Network Connectivity Issues')).toBeVisible();
    await expect(page.locator('text=Software Installation Guide')).toBeVisible();
    await expect(page.locator('text=Email Configuration')).toBeVisible();
    await expect(page.locator('text=VPN Access Setup')).toBeVisible();
  });

  test('should have functional header elements', async ({ page }) => {
    await page.goto('/pages/dashboard.html');
    
    // Check for logo (SVG)
    await expect(page.locator('.logo-svg')).toBeVisible();
    
    // Check for trial badge
    await expect(page.locator('text=30 days remaining')).toBeVisible();
    
    // Check for Dashboard button
    await expect(page.getByRole('button', { name: 'Dashboard' })).toBeVisible();
    
    // Check for user avatar
    await expect(page.locator('.user-avatar')).toBeVisible();
  });

  test('should have Share Rita section', async ({ page }) => {
    await page.goto('/pages/dashboard.html');
    
    // Check for Share Rita section
    await expect(page.locator('h3:has-text("Share Rita")')).toBeVisible();
    await expect(page.locator('text=Invite your team members')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share invite link' })).toBeVisible();
  });
});