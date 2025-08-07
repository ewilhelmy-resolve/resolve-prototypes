const { test, expect } = require('@playwright/test');

test.describe('Jarvis Style Guide Validation', () => {
  const baseUrl = 'http://localhost:8081';

  test('jarvis-mock.html has correct color palette', async ({ page }) => {
    await page.goto(`${baseUrl}/jarvis-mock.html`);
    
    // Check body background color
    const bodyBg = await page.evaluate(() => {
      const body = document.body;
      return window.getComputedStyle(body).backgroundColor;
    });
    expect(bodyBg).toBe('rgb(11, 30, 60)'); // #0B1E3C
    
    // Check chat header styling
    const headerBg = await page.locator('.chat-header').evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    expect(headerBg).toContain('rgba(11, 30, 60'); // rgba(11, 30, 60, 0.95)
    
    // Check if logo is present and visible
    const logo = await page.locator('img[src="logo.svg"]');
    await expect(logo).toBeVisible();
    
    // Check Jarvis logo gradient
    const jarvisLogo = await page.locator('.jarvis-logo').evaluate(el => 
      window.getComputedStyle(el).background
    );
    expect(jarvisLogo).toContain('linear-gradient');
    
    // Check status dot color (Cyan Loader)
    const statusDot = await page.locator('.status-dot').evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    expect(statusDot).toBe('rgb(40, 183, 181)'); // #28B7B5
    
    // Check font family
    const fontFamily = await page.evaluate(() => 
      window.getComputedStyle(document.body).fontFamily
    );
    expect(fontFamily).toContain('Inter');
  });

  test('jarvis.html has correct styling and logo', async ({ page }) => {
    await page.goto(`${baseUrl}/jarvis.html`);
    
    // Check body has jarvis-context class
    const hasJarvisContext = await page.evaluate(() => 
      document.body.classList.contains('jarvis-context')
    );
    expect(hasJarvisContext).toBe(true);
    
    // Check logo is present in header
    const logo = await page.locator('.app-logo img[src="logo.svg"]');
    await expect(logo).toBeVisible();
    
    // Check app header background
    const headerBg = await page.locator('.app-header').evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    expect(headerBg).toContain('rgba(11, 30, 60'); // rgba(11, 30, 60, 0.95)
    
    // Check navigation link styling
    const navLink = await page.locator('.nav-link').first();
    const navLinkColor = await navLink.evaluate(el => 
      window.getComputedStyle(el).color
    );
    expect(navLinkColor).toBe('rgb(209, 213, 219)'); // #D1D5DB
    
    // Check active nav link
    const activeNavLink = await page.locator('.nav-link.active');
    const activeBg = await activeNavLink.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    expect(activeBg).toBe('rgb(59, 130, 246)'); // #3B82F6
  });

  test('context-demo.html shows different styles for each context', async ({ page }) => {
    await page.goto(`${baseUrl}/context-demo.html`);
    
    // Check Jarvis context section
    const jarvisSection = await page.locator('.jarvis-context');
    const jarvisBg = await jarvisSection.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    expect(jarvisBg).toBe('rgb(11, 30, 60)'); // #0B1E3C
    
    // Check Onboarding context section
    const onboardingSection = await page.locator('.onboarding-context');
    const onboardingBg = await onboardingSection.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    expect(onboardingBg).toBe('rgb(248, 249, 250)'); // #f8f9fa
    
    // Check integration cards have different styles in each context
    const jarvisCard = await page.locator('.jarvis-context .integration-card').first();
    const jarvisCardBg = await jarvisCard.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    
    const onboardingCard = await page.locator('.onboarding-context .integration-card').first();
    const onboardingCardBg = await onboardingCard.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    
    // They should have different backgrounds
    expect(jarvisCardBg).not.toBe(onboardingCardBg);
  });

  test('buttons have proper styling and hover effects', async ({ page }) => {
    await page.goto(`${baseUrl}/jarvis-mock.html`);
    
    // Check send button gradient
    const sendButton = await page.locator('.send-button');
    const buttonBg = await sendButton.evaluate(el => 
      window.getComputedStyle(el).background
    );
    expect(buttonBg).toContain('linear-gradient');
    
    // Check quick action button styling
    const quickAction = await page.locator('.quick-action').first();
    const quickActionBg = await quickAction.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    expect(quickActionBg).toContain('rgba(209, 213, 219'); // rgba(209, 213, 219, 0.1)
    
    // Hover over quick action and check color change
    await quickAction.hover();
    await page.waitForTimeout(300); // Wait for transition
    const hoverBg = await quickAction.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    expect(hoverBg).toBe('rgb(59, 130, 246)'); // #3B82F6
  });

  test('input fields have correct focus styles', async ({ page }) => {
    await page.goto(`${baseUrl}/jarvis-mock.html`);
    
    const inputField = await page.locator('.input-field');
    
    // Check initial state
    const initialBg = await inputField.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    expect(initialBg).toContain('rgba(209, 213, 219'); // rgba(209, 213, 219, 0.1)
    
    // Focus the input
    await inputField.focus();
    
    // Check focused state
    const focusedBorderColor = await inputField.evaluate(el => 
      window.getComputedStyle(el).borderColor
    );
    expect(focusedBorderColor).toBe('rgb(0, 157, 255)'); // #009DFF
  });

  test('CSS files are loaded correctly', async ({ page }) => {
    await page.goto(`${baseUrl}/jarvis.html`);
    
    // Check if jarvis-context.css is loaded
    const cssLoaded = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      return links.some(link => link.href.includes('jarvis-context.css'));
    });
    expect(cssLoaded).toBe(true);
    
    // Check if Inter font is loaded
    const fontLoaded = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link'));
      return links.some(link => link.href.includes('fonts.googleapis.com'));
    });
    expect(fontLoaded).toBe(true);
  });

  test('container spacing is consistent', async ({ page }) => {
    await page.goto(`${baseUrl}/jarvis.html`);
    
    // Check stat cards have consistent spacing
    const statCards = await page.locator('.stat-card');
    const cardCount = await statCards.count();
    
    if (cardCount > 0) {
      const firstCard = await statCards.first();
      const padding = await firstCard.evaluate(el => 
        window.getComputedStyle(el).padding
      );
      expect(padding).toBe('24px'); // --spacing-lg
      
      const marginBottom = await firstCard.evaluate(el => 
        window.getComputedStyle(el).marginBottom
      );
      expect(marginBottom).toBe('16px'); // Consistent margin
    }
  });

  test('visual regression - jarvis-mock screenshot', async ({ page }) => {
    await page.goto(`${baseUrl}/jarvis-mock.html`);
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot for visual comparison
    await expect(page).toHaveScreenshot('jarvis-mock-styled.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('visual regression - jarvis dashboard screenshot', async ({ page }) => {
    await page.goto(`${baseUrl}/jarvis.html`);
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot for visual comparison
    await expect(page).toHaveScreenshot('jarvis-dashboard-styled.png', {
      fullPage: false, // Just viewport
      animations: 'disabled'
    });
  });

  test('responsive design works correctly', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${baseUrl}/context-demo.html`);
    
    // Check if grid switches to single column
    const demoContainer = await page.locator('.demo-container');
    const gridColumns = await demoContainer.evaluate(el => 
      window.getComputedStyle(el).gridTemplateColumns
    );
    
    // On mobile, should be single column
    expect(gridColumns).not.toContain('1fr 1fr');
  });
});