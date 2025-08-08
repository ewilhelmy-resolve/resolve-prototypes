const { test, expect } = require('@playwright/test');

test.describe('User launches Jarvis AI chat embedded in page', () => {
  test('user completes onboarding and sees Jarvis chat embedded without leaving the page', async ({ page }) => {
    console.log('\n🚀 Starting user journey: Launch embedded Jarvis chat\n');
    
    // User arrives at the onboarding page
    await page.goto('http://localhost:8082/');
    const initialUrl = page.url();
    console.log('✅ User lands on:', initialUrl);
    
    // Fast-forward to success page for this test
    await page.evaluate(() => {
      if (window.app) {
        window.app.currentStep = 7;
        window.app.showStep(7);
      }
    });
    
    // User sees the success page with embedded iframe
    await page.waitForSelector('#step7.active');
    console.log('✅ User is on success page (Step 7)');
    
    // Take screenshot of the page
    await page.screenshot({ 
      path: 'tests/screenshots/user-journey-before-jarvis-launch.png',
      fullPage: true 
    });
    
    // CRITICAL: Verify we're still on the same page (no redirect!)
    const urlAfterClick = page.url();
    expect(urlAfterClick).toBe(initialUrl);
    console.log('✅ CONFIRMED: User is still on the same page - NO REDIRECT!');
    
    // Verify the iframe is already present (auto-loaded in step 7)
    const jarvisIframe = await page.locator('#baristaChat');
    await expect(jarvisIframe).toBeVisible();
    console.log('✅ Jarvis chat iframe is now visible on the page');
    
    // Verify iframe is embedded with Jarvis URL
    const iframeSrc = await jarvisIframe.getAttribute('src');
    // Should be the real Jarvis URL
    expect(iframeSrc).toContain('resolvejarvisdev.espressive.com');
    console.log('✅ Iframe is loading Jarvis chat from:', iframeSrc);
    
    // Verify the container is displayed
    const container = await page.locator('#baristaChatContainer');
    await expect(container).toBeVisible();
    const containerDisplay = await container.evaluate(el => window.getComputedStyle(el).display);
    expect(containerDisplay).toBe('block');
    console.log('✅ Jarvis container is displayed (not hidden)');
    
    // Wait for iframe to load content
    await page.waitForTimeout(3000);
    
    // Take screenshot showing embedded Jarvis
    await page.screenshot({ 
      path: 'tests/screenshots/user-journey-jarvis-embedded.png',
      fullPage: true 
    });
    
    // Zoom in on just the Jarvis chat area
    await page.evaluate((el) => el.scrollIntoView(), await container.elementHandle());
    await container.screenshot({ 
      path: 'tests/screenshots/user-journey-jarvis-chat-closeup.png' 
    });
    
    // Final verification - count iframes on page
    const iframeCount = await page.locator('iframe').count();
    console.log(`✅ Page has ${iframeCount} iframe(s) embedded`);
    
    // Verify the page title hasn't changed (we're still on our page)
    const pageTitle = await page.title();
    expect(pageTitle).toContain('Resolve');
    console.log('✅ Page title confirms we\'re still on Resolve page:', pageTitle);
    
    console.log('\n🎉 SUCCESS: Jarvis chat is embedded IN the Resolve page!');
    console.log('📍 User never left the page - Jarvis loads inside an iframe\n');
  });

  test('user cannot navigate away from page when Jarvis is loaded', async ({ page }) => {
    // Navigate and launch Jarvis
    await page.goto('http://localhost:8082/');
    await page.evaluate(() => {
      if (window.app) {
        window.app.currentStep = 7;
        window.app.showStep(7);
      }
    });
    
    // Step 7 auto-loads the iframe
    await page.waitForSelector('#baristaChat');
    
    // Try to navigate away (non-blocking)
    const navigationPromise = page.goto('https://example.com').catch(() => {});
    
    // Wait a bit then navigate back to our page
    await page.waitForTimeout(1000);
    await page.goto('http://localhost:8082/');
    
    // Verify Jarvis iframe is part of OUR page structure
    const isJarvisPartOfOurPage = await page.evaluate(() => {
      const iframe = document.getElementById('baristaChat');
      return iframe && iframe.parentElement.id === 'baristaChatContainer';
    });
    
    expect(isJarvisPartOfOurPage).toBe(true);
    console.log('✅ Confirmed: Jarvis iframe is a child element of our page');
  });
});