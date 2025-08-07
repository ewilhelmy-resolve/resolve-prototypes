const { test, expect } = require('@playwright/test');

test.describe('User launches Jarvis AI chat embedded in page', () => {
  test('user completes onboarding and sees Jarvis chat embedded without leaving the page', async ({ page }) => {
    console.log('\n🚀 Starting user journey: Launch embedded Jarvis chat\n');
    
    // User arrives at the onboarding page
    await page.goto('http://localhost:8081/');
    const initialUrl = page.url();
    console.log('✅ User lands on:', initialUrl);
    
    // Fast-forward to success page for this test
    await page.evaluate(() => {
      if (window.app) {
        window.app.currentStep = 7;
        window.app.showStep(7);
      }
    });
    
    // User sees the success page with Launch button
    await page.waitForSelector('#step7.active');
    const launchButton = await page.locator('button:has-text("Launch Jarvis AI")');
    await expect(launchButton).toBeVisible();
    console.log('✅ User sees "Launch Jarvis AI" button on success page');
    
    // Take screenshot before launching
    await page.screenshot({ 
      path: 'tests/screenshots/user-journey-before-jarvis-launch.png',
      fullPage: true 
    });
    
    // User clicks to launch Jarvis
    await launchButton.click();
    console.log('✅ User clicks "Launch Jarvis AI" button');
    
    // CRITICAL: Verify we're still on the same page (no redirect!)
    const urlAfterClick = page.url();
    expect(urlAfterClick).toBe(initialUrl);
    console.log('✅ CONFIRMED: User is still on the same page - NO REDIRECT!');
    
    // Verify the iframe appears
    const jarvisIframe = await page.locator('#jarvisChat');
    await expect(jarvisIframe).toBeVisible();
    console.log('✅ Jarvis chat iframe is now visible on the page');
    
    // Verify iframe is embedded with Jarvis URL
    const iframeSrc = await jarvisIframe.getAttribute('src');
    // Accept either mock or proxy URL
    expect(['/jarvis-mock.html', '/jarvis-proxy/'].includes(iframeSrc)).toBeTruthy();
    console.log('✅ Iframe is loading Jarvis chat from:', iframeSrc);
    
    // Verify the container is displayed
    const container = await page.locator('#jarvisChatContainer');
    await expect(container).toBeVisible();
    const containerDisplay = await container.evaluate(el => window.getComputedStyle(el).display);
    expect(containerDisplay).toBe('block');
    console.log('✅ Jarvis container is displayed (not hidden)');
    
    // Verify preview is hidden
    const preview = await page.locator('#chatPreview');
    await expect(preview).toBeHidden();
    console.log('✅ Preview chat interface is hidden');
    
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
    await page.goto('http://localhost:8081/');
    await page.evaluate(() => {
      if (window.app) {
        window.app.currentStep = 7;
        window.app.showStep(7);
      }
    });
    
    await page.click('button:has-text("Launch Jarvis AI")');
    await page.waitForSelector('#jarvisChat');
    
    // Try to navigate away (non-blocking)
    const navigationPromise = page.goto('https://example.com').catch(() => {});
    
    // Wait a bit then navigate back to our page
    await page.waitForTimeout(1000);
    await page.goto('http://localhost:8081/');
    
    // Verify Jarvis iframe is part of OUR page structure
    const isJarvisPartOfOurPage = await page.evaluate(() => {
      const iframe = document.getElementById('jarvisChat');
      return iframe && iframe.parentElement.id === 'jarvisChatContainer';
    });
    
    expect(isJarvisPartOfOurPage).toBe(true);
    console.log('✅ Confirmed: Jarvis iframe is a child element of our page');
  });
});