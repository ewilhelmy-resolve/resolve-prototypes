const { test, expect } = require('../fixtures/base-test');

test.describe('Knowledge Page Document Viewer', () => {
  test('should open document viewer modal for markdown documents', async ({ authenticatedPage: page }) => {
    console.log('🧪 Testing document viewer modal in knowledge page');

    // Navigate to knowledge page
    await page.goto('http://localhost:5000/knowledge');
    await page.waitForLoadState('networkidle');

    // Upload a test markdown document
    const testFile = 'tests/fixtures/test-data/test-doc-1756577659705.txt';
    await page.setInputFiles('input[type="file"]', testFile);

    // Wait for the document to appear in the list
    await page.waitForSelector('.km-doc-name');
    
    // Click the view button on the first document
    await page.click('button[title="View"]');

    // Verify modal appears
    const modal = await page.locator('#documentViewerModal');
    await expect(modal).toBeVisible();

    // Verify modal components
    const title = await page.locator('#documentTitle');
    await expect(title).toBeVisible();

    const content = await page.locator('#documentContent');
    await expect(content).toBeVisible();

    // Verify markdown rendering
    await expect(content.locator('h1')).toBeVisible();
    await expect(content.locator('p')).toBeVisible();
    await expect(content.locator('code')).toBeVisible();

    console.log('✅ Document viewer modal test passed');
  });

  test('should close document viewer when clicking outside', async ({ authenticatedPage: page }) => {
    console.log('🧪 Testing document viewer modal closing');

    await page.goto('http://localhost:5000/knowledge');
    await page.waitForLoadState('networkidle');

    // Open the first document
    await page.click('button[title="View"]');
    
    // Verify modal appears
    const modal = await page.locator('#documentViewerModal');
    await expect(modal).toBeVisible();

    // Click outside the modal to close
    await page.mouse.click(0, 0);

    // Verify modal disappears
    await expect(modal).not.toBeVisible();

    console.log('✅ Document viewer modal close test passed');
  });

  test('should close document viewer with escape key', async ({ authenticatedPage: page }) => {
    console.log('🧪 Testing document viewer modal escape key');

    await page.goto('http://localhost:5000/knowledge');
    await page.waitForLoadState('networkidle');

    // Open the first document
    await page.click('button[title="View"]');
    
    // Verify modal appears
    const modal = await page.locator('#documentViewerModal');
    await expect(modal).toBeVisible();

    // Press escape key
    await page.keyboard.press('Escape');

    // Verify modal disappears
    await expect(modal).not.toBeVisible();

    console.log('✅ Document viewer modal escape key test passed');
  });

  test('should close document viewer with close button', async ({ authenticatedPage: page }) => {
    console.log('🧪 Testing document viewer modal close button');

    await page.goto('http://localhost:5000/knowledge');
    await page.waitForLoadState('networkidle');

    // Open the first document
    await page.click('button[title="View"]');
    
    // Verify modal appears
    const modal = await page.locator('#documentViewerModal');
    await expect(modal).toBeVisible();

    // Click close button
    await page.click('#documentViewerModal button[onclick*="remove"]');

    // Verify modal disappears
    await expect(modal).not.toBeVisible();

    console.log('✅ Document viewer modal close button test passed');
  });

  test('should display document metadata correctly', async ({ authenticatedPage: page }) => {
    console.log('🧪 Testing document viewer metadata display');

    await page.goto('http://localhost:5000/knowledge');
    await page.waitForLoadState('networkidle');

    // Open the first document
    await page.click('button[title="View"]');
    
    // Verify modal appears with metadata
    const meta = await page.locator('#documentMeta');
    await expect(meta).toBeVisible();

    // Check metadata elements
    await expect(meta.locator('.km-status-badge')).toBeVisible();
    await expect(meta.locator('span:has-text("PDF")')).toBeVisible();
    
    // Check date formatting
    const dateText = await meta.locator('span:last-child').textContent();
    expect(dateText).toMatch(/[A-Z][a-z]{2} \d{1,2}, \d{4}/);

    console.log('✅ Document viewer metadata test passed');
  });
});