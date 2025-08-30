const { test, expect } = require('@playwright/test');

test.describe('Document Viewer', () => {
  test('validates knowledge base document viewer functionality', async ({ page }) => {
    console.log('\n📚 TESTING DOCUMENT VIEWER\n');
    
    // 1. Sign in as admin
    console.log('1️⃣ Signing in as admin...');
    await page.goto('http://localhost:5000/signin');
    await page.fill('input[type="email"]', 'admin@resolve.io');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    console.log('   ✅ Signed in successfully\n');
    
    // 2. Check for Knowledge Base section
    console.log('2️⃣ Looking for Knowledge Base section...');
    await page.waitForTimeout(2000);
    
    // Check if Knowledge Base exists
    const knowledgeBase = await page.locator('text="Knowledge Base"').first();
    await expect(knowledgeBase).toBeVisible();
    console.log('   ✅ Knowledge Base section found\n');
    
    // 3. Check for View buttons
    console.log('3️⃣ Checking for View buttons...');
    const viewButtons = await page.locator('button:has-text("View")').all();
    console.log(`   📊 Found ${viewButtons.length} View button(s)\n`);
    
    // 4. Test document viewer with known document ID
    console.log('4️⃣ Testing document viewer modal...');
    
    // Call viewDocument function directly
    const result = await page.evaluate(() => {
      if (typeof viewDocument === 'function') {
        viewDocument('76ea2185-b4f7-4592-865a-1a6cd27e301d');
        return true;
      }
      return false;
    });
    
    expect(result).toBe(true);
    console.log('   ✅ viewDocument function called\n');
    
    // Wait for modal to appear
    await page.waitForTimeout(2000);
    
    // 5. Validate modal contents
    console.log('5️⃣ Validating modal contents...');
    
    const modal = page.locator('#documentViewerModal');
    await expect(modal).toBeVisible();
    console.log('   ✅ Modal is visible');
    
    const title = await page.locator('#documentTitle').textContent();
    expect(title).toContain('KB0012345');
    console.log(`   ✅ Document title: ${title}`);
    
    const meta = await page.locator('#documentMeta').textContent();
    expect(meta.toLowerCase()).toContain('ready');
    expect(meta).toContain('Processed');
    console.log('   ✅ Document metadata shows processed status');
    
    const content = page.locator('#documentContent');
    await expect(content).toBeVisible();
    const contentText = await content.textContent();
    expect(contentText).toContain('How to Reset Your SSO Password');
    console.log('   ✅ Document content is displayed\n');
    
    // 6. Test modal close
    console.log('6️⃣ Testing modal close...');
    
    // Press ESC to close
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    await expect(modal).not.toBeVisible();
    console.log('   ✅ Modal closed with ESC key\n');
    
    // 7. Test API endpoint directly
    console.log('7️⃣ Testing API endpoint...');
    
    const apiResponse = await page.evaluate(async () => {
      const response = await fetch('/api/rag/document/76ea2185-b4f7-4592-865a-1a6cd27e301d/view', {
        credentials: 'include'
      });
      return {
        ok: response.ok,
        status: response.status
      };
    });
    
    expect(apiResponse.ok).toBe(true);
    expect(apiResponse.status).toBe(200);
    console.log('   ✅ API endpoint returns document successfully\n');
    
    console.log('✅ DOCUMENT VIEWER TEST COMPLETED SUCCESSFULLY!\n');
  });
});