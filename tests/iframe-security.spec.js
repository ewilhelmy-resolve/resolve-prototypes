const { test, expect } = require('@playwright/test');

test.describe('Iframe Security Tests', () => {
  test('should examine Jarvis AI iframe security', async ({ page }) => {
    // Navigate to the success page with Jarvis AI
    await page.goto('http://localhost:8081/');
    
    // Quick navigation to success step
    await page.evaluate(() => {
      if (window.app) {
        window.app.currentStep = 7;
        window.app.showStep(7);
      }
    });
    
    // Wait for the page to load
    await page.waitForTimeout(1000);
    
    // Click Launch Jarvis AI button
    await page.click('button:has-text("Launch Jarvis AI")');
    
    // Wait for iframe to be visible
    await page.waitForSelector('#jarvisChat', { state: 'visible' });
    
    // Check if iframe src can be modified
    const originalSrc = await page.evaluate(() => {
      const iframe = document.getElementById('jarvisChat');
      return iframe ? iframe.src : null;
    });
    
    console.log('Original iframe src:', originalSrc);
    
    // Try to modify iframe src (security test)
    const srcModified = await page.evaluate(() => {
      const iframe = document.getElementById('jarvisChat');
      if (iframe) {
        try {
          iframe.src = 'https://example.com';
          return true;
        } catch (e) {
          console.error('Error modifying iframe:', e);
          return false;
        }
      }
      return false;
    });
    
    if (srcModified) {
      const newSrc = await page.evaluate(() => {
        const iframe = document.getElementById('jarvisChat');
        return iframe ? iframe.src : null;
      });
      console.log('⚠️  WARNING: Iframe src was modified to:', newSrc);
    }
    
    // Check iframe sandbox attributes
    const sandboxAttrs = await page.evaluate(() => {
      const iframe = document.getElementById('jarvisChat');
      return iframe ? iframe.getAttribute('sandbox') : null;
    });
    
    console.log('Iframe sandbox attributes:', sandboxAttrs || 'None set');
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/jarvis-iframe-security.png' });
  });
  
  test('should check if external site allows embedding', async ({ page }) => {
    // Try to load the Jarvis URL directly
    const response = await page.goto('https://resolvejarvisdev.espressive.com/v2/chat/');
    
    // Check response headers
    const headers = response.headers();
    console.log('\nSecurity Headers from Jarvis AI:');
    console.log('X-Frame-Options:', headers['x-frame-options'] || 'Not set');
    console.log('Content-Security-Policy:', headers['content-security-policy'] || 'Not set');
    console.log('X-Content-Type-Options:', headers['x-content-type-options'] || 'Not set');
    
    // Take screenshot of the actual Jarvis page
    await page.screenshot({ path: 'tests/screenshots/jarvis-direct-access.png' });
  });
  
  test('should test iframe injection vulnerabilities', async ({ page }) => {
    await page.goto('http://localhost:8081/');
    
    // Navigate to success step
    await page.evaluate(() => {
      if (window.app) {
        window.app.currentStep = 7;
        window.app.showStep(7);
      }
    });
    
    // Test URL parameter injection
    await page.goto('http://localhost:8081/?jarvis_url=https://malicious-site.com');
    
    // Check if URL parameter affects iframe
    const iframeSrc = await page.evaluate(() => {
      const iframe = document.getElementById('jarvisChat');
      return iframe ? iframe.src : null;
    });
    
    if (iframeSrc && iframeSrc.includes('malicious-site.com')) {
      console.log('⚠️  CRITICAL: URL parameter injection vulnerability detected!');
    } else {
      console.log('✅ URL parameter injection test passed');
    }
    
    // Test DOM manipulation
    const domManipulated = await page.evaluate(() => {
      try {
        // Try to create a new iframe with different source
        const maliciousIframe = document.createElement('iframe');
        maliciousIframe.src = 'https://evil-site.com';
        maliciousIframe.id = 'jarvisChat';
        
        const container = document.getElementById('jarvisChatContainer');
        if (container) {
          const existingIframe = document.getElementById('jarvisChat');
          if (existingIframe) {
            existingIframe.remove();
          }
          container.appendChild(maliciousIframe);
          return true;
        }
      } catch (e) {
        console.error('DOM manipulation error:', e);
      }
      return false;
    });
    
    if (domManipulated) {
      console.log('⚠️  WARNING: DOM can be manipulated to change iframe source');
    }
  });
});