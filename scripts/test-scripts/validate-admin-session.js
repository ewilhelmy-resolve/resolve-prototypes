const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Create screenshots directory if it doesn't exist
const screenshotDir = '.playwright-mcp';
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

// Generate timestamp for unique screenshot names
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

async function validateAdminLogin() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('        ADMIN LOGIN & SESSION PERSISTENCE VALIDATION');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Target URL: http://localhost:5000`);
  console.log(`Test User: admin@resolve.io`);
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({ 
    headless: false, // Show browser for validation visibility
    slowMo: 500 // Slow down for better observation
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true
  });
  
  const page = await context.newPage();
  
  const results = {
    loginSuccess: false,
    dashboardAccess: false,
    sessionPersistence: {
      afterWait: false,
      afterRefresh: false,
      afterNavigation: false
    },
    screenshots: [],
    errors: []
  };

  try {
    // ============ STEP 1: NAVIGATE TO APPLICATION ============
    console.log('📍 STEP 1: Navigating to Application');
    console.log('   Target: http://localhost:5000/signin');
    
    await page.goto('http://localhost:5000/signin');
    await page.waitForLoadState('networkidle');
    
    const landingScreenshot = `${screenshotDir}/01-landing-page-${timestamp}.png`;
    await page.screenshot({ path: landingScreenshot, fullPage: true });
    results.screenshots.push(landingScreenshot);
    console.log('   ✅ Landing page loaded');
    console.log(`   📸 Screenshot: ${landingScreenshot}\n`);

    // ============ STEP 2: FILL LOGIN CREDENTIALS ============
    console.log('🔑 STEP 2: Entering Admin Credentials');
    
    // Try multiple selectors for robustness
    try {
      await page.fill('#email', 'admin@resolve.io');
    } catch {
      await page.fill('input[type="email"]', 'admin@resolve.io');
    }
    
    try {
      await page.fill('#password', 'admin123');
    } catch {
      await page.fill('input[type="password"]', 'admin123');
    }
    
    const credentialsScreenshot = `${screenshotDir}/02-credentials-filled-${timestamp}.png`;
    await page.screenshot({ path: credentialsScreenshot });
    results.screenshots.push(credentialsScreenshot);
    console.log('   ✅ Credentials entered');
    console.log(`   📸 Screenshot: ${credentialsScreenshot}\n`);

    // ============ STEP 3: SUBMIT LOGIN ============
    console.log('🚀 STEP 3: Submitting Login Form');
    
    await page.click('button[type="submit"]');
    
    // Wait for navigation with multiple possible outcomes
    try {
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      results.loginSuccess = true;
      console.log('   ✅ Successfully redirected to dashboard');
    } catch (e) {
      // Check if we're still on signin with an error
      const currentUrl = page.url();
      console.log(`   ❌ Login failed - Current URL: ${currentUrl}`);
      
      // Check for error messages
      const errorModal = await page.locator('.modal-overlay.show').isVisible().catch(() => false);
      if (errorModal) {
        const errorMessage = await page.locator('#modalMessage').textContent().catch(() => 'Unknown error');
        console.log(`   ⚠️ Error modal: ${errorMessage}`);
        results.errors.push(`Login error: ${errorMessage}`);
      }
      
      const loginFailScreenshot = `${screenshotDir}/03-login-failed-${timestamp}.png`;
      await page.screenshot({ path: loginFailScreenshot });
      results.screenshots.push(loginFailScreenshot);
      throw new Error('Login failed - dashboard not reached');
    }

    // ============ STEP 4: VERIFY DASHBOARD ACCESS ============
    console.log('📊 STEP 4: Verifying Dashboard Access');
    
    await page.waitForLoadState('networkidle');
    
    // Take dashboard screenshot
    const dashboardScreenshot = `${screenshotDir}/04-dashboard-initial-${timestamp}.png`;
    await page.screenshot({ path: dashboardScreenshot, fullPage: true });
    results.screenshots.push(dashboardScreenshot);
    
    // Verify dashboard elements
    const dashboardChecks = {
      url: page.url().includes('/dashboard'),
      ritaHeading: await page.locator('h1:has-text("Ask Rita")').isVisible().catch(() => false),
      chatContainer: await page.locator('#quikchat-container').isVisible().catch(() => false),
      knowledgeSection: await page.locator('text=Knowledge Base').first().isVisible().catch(() => false)
    };
    
    results.dashboardAccess = dashboardChecks.url || dashboardChecks.ritaHeading;
    
    console.log(`   URL contains /dashboard: ${dashboardChecks.url ? '✅' : '❌'}`);
    console.log(`   Rita heading visible: ${dashboardChecks.ritaHeading ? '✅' : '❌'}`);
    console.log(`   Chat container visible: ${dashboardChecks.chatContainer ? '✅' : '❌'}`);
    console.log(`   Knowledge Base visible: ${dashboardChecks.knowledgeSection ? '✅' : '❌'}`);
    console.log(`   📸 Screenshot: ${dashboardScreenshot}\n`);

    // Check cookies
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === 'sessionToken');
    if (sessionCookie) {
      console.log(`   🍪 Session cookie found (expires: ${new Date(sessionCookie.expires * 1000).toISOString()})\n`);
    } else {
      console.log('   ⚠️ No session cookie found!\n');
      results.errors.push('No session cookie set after login');
    }

    // ============ STEP 5: TEST SESSION PERSISTENCE - WAIT ============
    console.log('⏱️ STEP 5: Testing Session Persistence (5 second wait)');
    console.log('   Waiting to see if session expires...');
    
    await page.waitForTimeout(5000);
    
    const urlAfterWait = page.url();
    results.sessionPersistence.afterWait = urlAfterWait.includes('/dashboard');
    
    if (results.sessionPersistence.afterWait) {
      console.log('   ✅ Still on dashboard after 5 seconds');
      const afterWaitScreenshot = `${screenshotDir}/05-after-wait-${timestamp}.png`;
      await page.screenshot({ path: afterWaitScreenshot });
      results.screenshots.push(afterWaitScreenshot);
      console.log(`   📸 Screenshot: ${afterWaitScreenshot}\n`);
    } else {
      console.log(`   ❌ Redirected to: ${urlAfterWait}`);
      results.errors.push(`Session lost after wait - redirected to ${urlAfterWait}`);
    }

    // ============ STEP 6: TEST SESSION PERSISTENCE - REFRESH ============
    console.log('🔄 STEP 6: Testing Session Persistence (Page Refresh)');
    console.log('   Refreshing page...');
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const urlAfterRefresh = page.url();
    results.sessionPersistence.afterRefresh = urlAfterRefresh.includes('/dashboard');
    
    if (results.sessionPersistence.afterRefresh) {
      console.log('   ✅ Still on dashboard after refresh');
      
      // Verify elements still visible
      const ritaVisible = await page.locator('h1:has-text("Ask Rita")').isVisible().catch(() => false);
      console.log(`   Rita heading still visible: ${ritaVisible ? '✅' : '❌'}`);
      
      const afterRefreshScreenshot = `${screenshotDir}/06-after-refresh-${timestamp}.png`;
      await page.screenshot({ path: afterRefreshScreenshot });
      results.screenshots.push(afterRefreshScreenshot);
      console.log(`   📸 Screenshot: ${afterRefreshScreenshot}\n`);
    } else {
      console.log(`   ❌ Redirected to: ${urlAfterRefresh}`);
      results.errors.push(`Session lost after refresh - redirected to ${urlAfterRefresh}`);
      const lostSessionScreenshot = `${screenshotDir}/06-session-lost-${timestamp}.png`;
      await page.screenshot({ path: lostSessionScreenshot });
      results.screenshots.push(lostSessionScreenshot);
    }

    // ============ STEP 7: TEST NAVIGATION ============
    if (results.sessionPersistence.afterRefresh) {
      console.log('🧭 STEP 7: Testing Navigation to Other Pages');
      console.log('   Navigating to /knowledge page...');
      
      await page.goto('http://localhost:5000/knowledge');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      const urlAtKnowledge = page.url();
      if (urlAtKnowledge.includes('/knowledge')) {
        console.log('   ✅ Successfully navigated to knowledge page');
        
        const knowledgeScreenshot = `${screenshotDir}/07-knowledge-page-${timestamp}.png`;
        await page.screenshot({ path: knowledgeScreenshot });
        results.screenshots.push(knowledgeScreenshot);
        console.log(`   📸 Screenshot: ${knowledgeScreenshot}`);
        
        // Navigate back to dashboard
        console.log('   Navigating back to dashboard...');
        await page.goto('http://localhost:5000/dashboard');
        await page.waitForLoadState('networkidle');
        
        const urlBackToDashboard = page.url();
        results.sessionPersistence.afterNavigation = urlBackToDashboard.includes('/dashboard');
        
        if (results.sessionPersistence.afterNavigation) {
          console.log('   ✅ Successfully returned to dashboard');
          const finalScreenshot = `${screenshotDir}/08-final-dashboard-${timestamp}.png`;
          await page.screenshot({ path: finalScreenshot });
          results.screenshots.push(finalScreenshot);
          console.log(`   📸 Screenshot: ${finalScreenshot}\n`);
        } else {
          console.log(`   ❌ Could not return to dashboard - redirected to: ${urlBackToDashboard}\n`);
          results.errors.push(`Session lost during navigation - redirected to ${urlBackToDashboard}`);
        }
      } else {
        console.log(`   ❌ Could not navigate to knowledge - redirected to: ${urlAtKnowledge}\n`);
        results.errors.push(`Session lost when navigating to knowledge - redirected to ${urlAtKnowledge}`);
      }
    }

  } catch (error) {
    console.error('\n❌ VALIDATION ERROR:', error.message);
    results.errors.push(error.message);
    
    // Take error screenshot
    const errorScreenshot = `${screenshotDir}/error-${timestamp}.png`;
    await page.screenshot({ path: errorScreenshot });
    results.screenshots.push(errorScreenshot);
  } finally {
    // Keep browser open for 3 seconds to observe final state
    console.log('\n⏳ Keeping browser open for observation...');
    await page.waitForTimeout(3000);
    await browser.close();
  }

  // ============ GENERATE VALIDATION REPORT ============
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('                      VALIDATION REPORT');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  
  console.log('📋 TEST RESULTS:');
  console.log('────────────────');
  console.log(`✓ Login Success: ${results.loginSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`✓ Dashboard Access: ${results.dashboardAccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`✓ Session Persistence:`);
  console.log(`  - After 5s wait: ${results.sessionPersistence.afterWait ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  - After refresh: ${results.sessionPersistence.afterRefresh ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  - After navigation: ${results.sessionPersistence.afterNavigation ? '✅ PASS' : '❌ FAIL'}`);
  
  if (results.errors.length > 0) {
    console.log('\n⚠️ ISSUES FOUND:');
    console.log('─────────────────');
    results.errors.forEach((error, i) => {
      console.log(`${i + 1}. ${error}`);
    });
  }
  
  console.log('\n📸 SCREENSHOTS CAPTURED:');
  console.log('────────────────────────');
  results.screenshots.forEach(screenshot => {
    console.log(`- ${screenshot}`);
  });
  
  // Calculate overall status
  const overallPass = results.loginSuccess && 
                      results.dashboardAccess && 
                      results.sessionPersistence.afterWait &&
                      results.sessionPersistence.afterRefresh &&
                      results.sessionPersistence.afterNavigation;
  
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log(`OVERALL STATUS: ${overallPass ? '✅ VALIDATION PASSED' : '❌ VALIDATION FAILED'}`);
  console.log('═══════════════════════════════════════════════════════════════════\n');
  
  // Save report to file
  const reportPath = `${screenshotDir}/validation-report-${timestamp}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 Full report saved to: ${reportPath}\n`);
  
  process.exit(overallPass ? 0 : 1);
}

// Run the validation
validateAdminLogin().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});