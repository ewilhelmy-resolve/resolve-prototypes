const { chromium } = require('@playwright/test');

async function testAdminLogin() {
  console.log('🧪 Testing admin login on localhost:5000...\n');
  
  const browser = await chromium.launch({ 
    headless: true, // Run headless for testing
    slowMo: 100 // Slight delay for stability
  });
  const context = await browser.newContext({
    // Accept all cookies to ensure session persistence
    acceptDownloads: true,
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();
  
  try {
    // 1. Navigate to signin page
    console.log('1️⃣ Navigating to signin page...');
    await page.goto('http://localhost:5000/signin');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of login page
    await page.screenshot({ path: '.playwright-mcp/login-page.png' });
    console.log('   ✅ Login page loaded');
    
    // 2. Fill in admin credentials
    console.log('\n2️⃣ Entering admin credentials...');
    // Use data-testid selectors for reliability
    await page.fill('[data-testid="email-input"]', 'admin@resolve.io');
    await page.fill('[data-testid="password-input"]', 'admin123');
    console.log('   ✅ Credentials entered');
    
    // Take screenshot before submitting
    await page.screenshot({ path: '.playwright-mcp/login-form-filled.png' });
    
    // 3. Click signin button
    console.log('\n3️⃣ Submitting signin form...');
    // Use data-testid for the button
    await page.click('[data-testid="signin-button"]');
    
    // 4. Wait for navigation or error
    console.log('\n4️⃣ Waiting for response...');
    try {
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      console.log('   ✅ Successfully redirected to dashboard!');
      
      // 5. Verify dashboard elements
      console.log('\n5️⃣ Verifying dashboard elements...');
      await page.waitForLoadState('networkidle');
      
      // Take screenshot of dashboard
      await page.screenshot({ path: '.playwright-mcp/dashboard.png', fullPage: true });
      
      // Check for key elements
      const title = await page.title();
      console.log(`   📄 Page title: ${title}`);
      
      const ritaHeading = await page.locator('h1:has-text("Ask Rita")').isVisible();
      if (ritaHeading) {
        console.log('   ✅ "Ask Rita" heading found');
      }
      
      const chatContainer = await page.locator('#quikchat-container').isVisible();
      if (chatContainer) {
        console.log('   ✅ Chat container found');
      }
      
      const knowledgeSection = await page.locator('text=Knowledge Base').first().isVisible();
      if (knowledgeSection) {
        console.log('   ✅ Knowledge Base section found');
      }
      
      // Check cookies
      const cookies = await context.cookies();
      console.log('   🍪 Cookies after login:', cookies.length);
      const sessionCookie = cookies.find(c => c.name === 'sessionToken');
      if (sessionCookie) {
        console.log('   ✅ Session cookie found:', sessionCookie.name, '(expires:', new Date(sessionCookie.expires * 1000).toISOString(), ')');
      } else {
        console.log('   ❌ No session cookie found!');
      }
      
      console.log('\n✨ SUCCESS! Admin login works and dashboard loads correctly!');
      console.log('📸 Screenshots saved to .playwright-mcp/');
      
      // 6. Test session persistence
      console.log('\n6️⃣ Testing session persistence...');
      
      // Wait a few seconds to see if we get logged out
      console.log('   ⏱️ Waiting 3 seconds to check if session persists...');
      await page.waitForTimeout(3000);
      
      // Check if still on dashboard
      const stillOnDashboard = page.url().includes('/dashboard');
      if (stillOnDashboard) {
        console.log('   ✅ Still on dashboard after 3 seconds');
      } else {
        console.log('   ❌ Redirected away from dashboard to:', page.url());
        throw new Error('Session did not persist - user was logged out');
      }
      
      // 7. Test page refresh
      console.log('\n7️⃣ Testing page refresh...');
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Check URL after refresh
      const urlAfterRefresh = page.url();
      if (urlAfterRefresh.includes('/dashboard')) {
        console.log('   ✅ Still on dashboard after page refresh');
        await page.screenshot({ path: '.playwright-mcp/dashboard-after-refresh.png' });
      } else {
        console.log('   ❌ Redirected to:', urlAfterRefresh);
        await page.screenshot({ path: '.playwright-mcp/session-lost.png' });
        throw new Error('Session lost after page refresh');
      }
      
      // 8. Navigate to another page and back
      console.log('\n8️⃣ Testing navigation...');
      await page.goto('http://localhost:5000/knowledge');
      await page.waitForLoadState('networkidle');
      
      const onKnowledgePage = page.url().includes('/knowledge');
      if (onKnowledgePage) {
        console.log('   ✅ Successfully navigated to knowledge page');
        
        // Go back to dashboard
        await page.goto('http://localhost:5000/dashboard');
        await page.waitForLoadState('networkidle');
        
        if (page.url().includes('/dashboard')) {
          console.log('   ✅ Successfully navigated back to dashboard');
          console.log('\n🎉 SUCCESS! Session persistence verified!');
        } else {
          console.log('   ❌ Could not navigate back to dashboard');
          throw new Error('Session lost during navigation');
        }
      } else {
        console.log('   ❌ Could not navigate to knowledge page - redirected to:', page.url());
        throw new Error('Session lost when navigating to other pages');
      }
      
    } catch (error) {
      console.log('   ❌ Login failed or redirect did not happen');
      
      // Check for error modal
      const modalVisible = await page.locator('.modal-overlay.show').isVisible();
      if (modalVisible) {
        const errorMessage = await page.locator('#modalMessage').textContent();
        console.log(`   ⚠️ Error modal shown: ${errorMessage}`);
      }
      
      // Take screenshot of failure
      await page.screenshot({ path: '.playwright-mcp/login-failure.png' });
      
      // Check current URL
      const currentUrl = page.url();
      console.log(`   📍 Current URL: ${currentUrl}`);
      
      throw new Error('Login failed - ' + error.message);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    // Keep browser open for 5 seconds to see the result
    console.log('\n⏳ Keeping browser open for 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

// Run the test
testAdminLogin().catch(console.error);