const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Complete E2E User Journey', () => {
  test('Full journey: Login → Upload CSV → Verify Progress → Auto-close', async ({ page }) => {
    console.log('========================================');
    console.log('Starting Complete E2E User Journey Test');
    console.log('========================================\n');
    
    // ============ STEP 1: NAVIGATE TO HOMEPAGE ============
    console.log('STEP 1: Navigate to Homepage');
    await page.goto('http://localhost:8082/');
    await expect(page).toHaveURL('http://localhost:8082/');
    await page.waitForLoadState('networkidle');
    console.log('✅ Homepage loaded successfully\n');
    
    // ============ STEP 2: LOGIN PROCESS ============
    console.log('STEP 2: Login Process');
    
    // Wait for signup form to initialize
    await page.waitForTimeout(2000);
    
    // Click login link
    const loginLink = page.locator('#loginLink');
    await expect(loginLink).toBeVisible({ timeout: 10000 });
    await loginLink.click();
    console.log('✅ Login link clicked');
    
    // Wait for login form
    await expect(page.locator('#loginEmail')).toBeVisible({ timeout: 5000 });
    console.log('✅ Login form displayed');
    
    // Fill credentials
    await page.fill('#loginEmail', 'john@resolve.io');
    await page.fill('#loginPassword', '!Password1');
    console.log('✅ Credentials entered');
    
    // Submit login
    await page.click('button[type="submit"]');
    console.log('✅ Login submitted');
    
    // Wait for redirect to Jarvis
    await page.waitForURL('**/jarvis.html', { timeout: 15000 });
    console.log('✅ Successfully redirected to Jarvis dashboard\n');
    
    // ============ STEP 3: CSV UPLOAD ============
    console.log('STEP 3: CSV Upload Process');
    
    // Wait for page to fully load
    await page.waitForTimeout(3000);
    
    // Find upload input
    const uploadInput = page.locator('#ticketFileUpload');
    await expect(uploadInput).toBeAttached({ timeout: 10000 });
    console.log('✅ Upload input found');
    
    // Prepare CSV file
    const csvPath = path.resolve(__dirname, '..', 'sample-tickets.csv');
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found at: ${csvPath}`);
    }
    console.log(`✅ CSV file exists: ${csvPath}`);
    
    // Upload file
    await uploadInput.setInputFiles(csvPath);
    console.log('✅ CSV file selected for upload\n');
    
    // ============ STEP 4: PROGRESS BAR VALIDATION ============
    console.log('STEP 4: Progress Bar Validation');
    
    // Wait for modal to appear
    const modal = page.locator('.upload-progress-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });
    console.log('✅ Upload modal appeared');
    
    // Track progress bar updates
    const progressBar = page.locator('#uploadProgressBar');
    const statusText = page.locator('#uploadStatus');
    
    // Monitor progress updates
    let progressChecks = [];
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(500);
      
      const width = await progressBar.evaluate(el => el.style.width);
      const status = await statusText.textContent();
      
      progressChecks.push({ width, status });
      console.log(`   Progress: ${width} - ${status}`);
      
      // Check if we reached 100%
      if (width === '100%') {
        console.log('✅ Progress reached 100%');
        break;
      }
    }
    
    // Verify progress went beyond 50%
    const progressValues = progressChecks.map(p => parseInt(p.width));
    const maxProgress = Math.max(...progressValues);
    
    if (maxProgress <= 50) {
      throw new Error(`Progress bar stuck at ${maxProgress}% - Did not progress beyond 50%!`);
    }
    console.log(`✅ Progress bar reached ${maxProgress}% - Not stuck at 50%\n`);
    
    // ============ STEP 5: VERIFY AUTO-CLOSE ============
    console.log('STEP 5: Verify Modal Auto-Close');
    
    // Check for success message
    const successMessage = page.locator('text=/Upload Complete|✅/').first();
    const hasSuccess = await successMessage.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasSuccess) {
      console.log('✅ Success message displayed');
    }
    
    // Wait for modal to auto-close (should happen within 5 seconds after success)
    await expect(modal).toBeHidden({ timeout: 10000 });
    console.log('✅ Modal auto-closed successfully\n');
    
    // ============ STEP 6: VERIFY DATA DISPLAY ============
    console.log('STEP 6: Verify Data Display');
    
    // Check if ticket data is visible
    const dataIndicators = [
      { selector: 'text=/TICK-/', description: 'Ticket ID' },
      { selector: 'text=/Password Reset/', description: 'Ticket title' },
      { selector: '#dataSource', description: 'Data source indicator' },
      { selector: 'text=/11/', description: 'Ticket count' }
    ];
    
    let dataFound = false;
    for (const indicator of dataIndicators) {
      const element = page.locator(indicator.selector).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        const text = await element.textContent();
        console.log(`✅ Found ${indicator.description}: ${text.substring(0, 50)}...`);
        dataFound = true;
      }
    }
    
    if (!dataFound) {
      console.log('⚠️ No ticket data indicators found on page');
    }
    
    // ============ FINAL SUMMARY ============
    console.log('\n========================================');
    console.log('E2E TEST COMPLETED SUCCESSFULLY! ✅');
    console.log('========================================');
    console.log('Summary:');
    console.log('  1. Homepage loads: ✅');
    console.log('  2. Login works: ✅');
    console.log('  3. CSV uploads: ✅');
    console.log(`  4. Progress bar reaches ${maxProgress}%: ✅`);
    console.log('  5. Modal auto-closes: ✅');
    console.log(`  6. Data displayed: ${dataFound ? '✅' : '⚠️'}`);
    console.log('========================================\n');
    
    // Final assertions
    expect(maxProgress).toBeGreaterThan(50);
    expect(await modal.isVisible()).toBe(false);
  });
  
  test('Quick validation: Upload without freeze', async ({ page }) => {
    // Quick login
    await page.goto('http://localhost:8082/');
    await page.waitForTimeout(2000);
    await page.click('#loginLink');
    await page.fill('#loginEmail', 'john@resolve.io');
    await page.fill('#loginPassword', '!Password1');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/jarvis.html', { timeout: 15000 });
    
    // Upload CSV
    await page.waitForTimeout(2000);
    const csvPath = path.resolve(__dirname, '..', 'sample-tickets.csv');
    await page.locator('#ticketFileUpload').setInputFiles(csvPath);
    
    // Check progress doesn't freeze
    const progressBar = page.locator('#uploadProgressBar');
    await page.waitForTimeout(1000);
    const width1 = await progressBar.evaluate(el => el.style.width);
    await page.waitForTimeout(2000);
    const width2 = await progressBar.evaluate(el => el.style.width);
    
    console.log(`Progress moved from ${width1} to ${width2}`);
    
    // Should progress beyond 50%
    const finalWidth = parseInt(width2);
    expect(finalWidth).toBeGreaterThan(50);
    console.log(`✅ Progress bar reached ${finalWidth}% - not frozen!`);
  });
});