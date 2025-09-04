const { chromium } = require('@playwright/test');

async function runQuickTest() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('🧪 Testing signup validation modal...');
  
  // Test 1: Check modal appears for empty form
  await page.goto('http://localhost:5000');
  await page.click('button[type="submit"]');
  
  // Wait for modal
  const modal = page.locator('.modal-overlay.show');
  const isModalVisible = await modal.isVisible();
  
  if (isModalVisible) {
    const message = await page.locator('#modalMessage').textContent();
    console.log('✅ Modal works! Message:', message);
  } else {
    console.log('❌ Modal not showing');
  }
  
  // Test 2: Check registration with cookies
  console.log('\n🧪 Testing registration flow...');
  await page.reload();
  await page.fill('#fullName', 'Test User');
  await page.fill('#email', `test${Date.now()}@example.com`);
  await page.fill('#company', 'Test Company');
  await page.fill('#password', 'TestPass123');
  await page.click('button[type="submit"]');
  
  // Wait for redirect
  await page.waitForTimeout(2000);
  const currentUrl = page.url();
  
  if (currentUrl.includes('step2')) {
    console.log('✅ Registration successful, redirected to step2');
    
    // Check if cookie was set
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name === 'sessionToken');
    
    if (sessionCookie) {
      console.log('✅ Session cookie set!');
    } else {
      console.log('❌ No session cookie found');
    }
  } else {
    console.log('❌ Registration failed or no redirect');
  }
  
  // Test 3: Check if we can continue to dashboard
  console.log('\n🧪 Testing dashboard access...');
  await page.goto('http://localhost:5000/dashboard');
  await page.waitForTimeout(2000);
  
  const dashboardUrl = page.url();
  if (dashboardUrl.includes('dashboard')) {
    const title = await page.title();
    console.log('✅ Dashboard accessible! Title:', title);
  } else {
    console.log('❌ Redirected away from dashboard to:', dashboardUrl);
  }
  
  await browser.close();
  console.log('\n✨ Quick test complete!');
}

runQuickTest().catch(console.error);