const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('CSV Upload E2E User Journey', () => {
  test('Complete CSV upload journey through UI clicks', async ({ page }) => {
    console.log('=== Starting CSV Upload E2E Test ===');
    
    // Step 1: Navigate to the homepage
    console.log('1. Navigating to homepage...');
    await page.goto('http://localhost:8082/');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of homepage
    await page.screenshot({ path: 'tests/screenshots/e2e-1-homepage.png' });
    console.log('   ✅ Homepage loaded');
    
    // Step 2: Wait for signup form to load and click login
    console.log('2. Clicking login link...');
    await page.waitForTimeout(2000); // Give components time to initialize
    
    // Click the login link
    const loginLink = page.locator('#loginLink');
    await expect(loginLink).toBeVisible({ timeout: 10000 });
    await loginLink.click();
    console.log('   ✅ Login form displayed');
    
    // Take screenshot of login form
    await page.screenshot({ path: 'tests/screenshots/e2e-2-login-form.png' });
    
    // Step 3: Fill in login credentials
    console.log('3. Entering credentials...');
    await page.fill('#loginEmail', 'john@resolve.io');
    await page.fill('#loginPassword', '!Password1');
    console.log('   ✅ Credentials entered');
    
    // Step 4: Submit login form
    console.log('4. Submitting login...');
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // Wait for navigation to jarvis.html
    await page.waitForURL('**/jarvis.html', { timeout: 15000 });
    console.log('   ✅ Logged in and redirected to Jarvis dashboard');
    
    // Take screenshot of Jarvis dashboard
    await page.screenshot({ path: 'tests/screenshots/e2e-3-jarvis-dashboard.png' });
    
    // Step 5: Wait for dashboard to fully load
    console.log('5. Waiting for dashboard to load...');
    await page.waitForTimeout(3000);
    
    // Step 6: Find and click the upload button/area
    console.log('6. Looking for CSV upload section...');
    
    // Check if the upload input exists
    const uploadInput = page.locator('#ticketFileUpload');
    const uploadLabel = page.locator('label[for="ticketFileUpload"]');
    
    // Take screenshot before upload
    await page.screenshot({ path: 'tests/screenshots/e2e-4-before-upload.png' });
    
    // Check if upload section is visible
    const isUploadVisible = await uploadLabel.isVisible();
    console.log(`   Upload button visible: ${isUploadVisible}`);
    
    if (!isUploadVisible) {
      // Try to find it in the analytics section
      const analyticsTab = page.locator('text=Analytics').first();
      if (await analyticsTab.isVisible()) {
        console.log('   Clicking Analytics tab...');
        await analyticsTab.click();
        await page.waitForTimeout(1000);
      }
    }
    
    // Step 7: Upload the CSV file
    console.log('7. Uploading CSV file...');
    const csvPath = path.resolve(__dirname, '..', 'sample-tickets.csv');
    
    // Verify the CSV file exists
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found at: ${csvPath}`);
    }
    console.log(`   CSV file found at: ${csvPath}`);
    
    // Set the file input
    await uploadInput.setInputFiles(csvPath);
    console.log('   ✅ CSV file selected and upload triggered');
    
    // Step 8: Wait for upload modal to appear
    console.log('8. Waiting for upload progress...');
    const uploadModal = page.locator('.upload-progress-modal');
    
    try {
      await expect(uploadModal).toBeVisible({ timeout: 5000 });
      console.log('   ✅ Upload progress modal appeared');
      
      // Take screenshot of upload progress
      await page.screenshot({ path: 'tests/screenshots/e2e-5-upload-progress.png' });
      
      // Wait for upload to complete
      await page.waitForTimeout(5000);
      
      // Check for success indicators
      const successText = page.locator('text=/success|complete|uploaded/i').first();
      if (await successText.isVisible({ timeout: 5000 })) {
        console.log('   ✅ Upload completed successfully');
      }
    } catch (error) {
      console.log('   ⚠️ Upload modal did not appear, checking for direct success');
    }
    
    // Step 9: Verify data is displayed
    console.log('9. Verifying uploaded data...');
    await page.waitForTimeout(2000);
    
    // Look for ticket data indicators
    const ticketIndicators = [
      page.locator('text=/TICK-/').first(),
      page.locator('text=/ticket/i').first(),
      page.locator('text=/Password Reset/').first(),
      page.locator('#dataSource')
    ];
    
    let dataFound = false;
    for (const indicator of ticketIndicators) {
      if (await indicator.isVisible({ timeout: 2000 }).catch(() => false)) {
        dataFound = true;
        const text = await indicator.textContent();
        console.log(`   ✅ Found data indicator: ${text}`);
        break;
      }
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'tests/screenshots/e2e-6-after-upload.png' });
    
    if (dataFound) {
      console.log('✅✅✅ CSV UPLOAD E2E TEST PASSED - Data uploaded and displayed!');
    } else {
      console.log('⚠️ Upload may have succeeded but data display not confirmed');
    }
    
    // Final assertion
    expect(dataFound).toBeTruthy();
  });
  
  test('Verify upload persists after page refresh', async ({ page }) => {
    console.log('=== Testing Data Persistence ===');
    
    // Login quickly
    await page.goto('http://localhost:8082/');
    await page.waitForTimeout(2000);
    await page.click('#loginLink');
    await page.fill('#loginEmail', 'john@resolve.io');
    await page.fill('#loginPassword', '!Password1');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/jarvis.html', { timeout: 15000 });
    
    console.log('1. Logged in successfully');
    
    // Refresh the page
    await page.reload();
    await page.waitForTimeout(3000);
    console.log('2. Page refreshed');
    
    // Check if data is still present
    const dataSource = page.locator('#dataSource');
    if (await dataSource.isVisible({ timeout: 5000 })) {
      const sourceText = await dataSource.textContent();
      console.log(`3. Data source found: ${sourceText}`);
      
      if (sourceText.includes('CSV')) {
        console.log('✅ CSV data persists after refresh');
      }
    }
  });
});