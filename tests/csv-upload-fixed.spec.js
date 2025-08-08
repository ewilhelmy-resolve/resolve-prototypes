const { test, expect } = require('@playwright/test');
const path = require('path');

test('CSV upload dialog auto-closes', async ({ page }) => {
  // Navigate and login
  await page.goto('http://localhost:8082/');
  await page.waitForTimeout(2000);
  
  await page.click('#loginLink');
  await page.fill('#loginEmail', 'john@resolve.io');
  await page.fill('#loginPassword', '!Password1');
  await page.click('button[type="submit"]');
  
  // Wait for Jarvis page
  await page.waitForURL('**/jarvis.html', { timeout: 10000 });
  console.log('✅ Logged in to Jarvis');
  
  await page.waitForTimeout(2000);
  
  // Upload CSV
  const csvPath = path.resolve(__dirname, '..', 'sample-tickets.csv');
  const fileInput = page.locator('#ticketFileUpload');
  await fileInput.setInputFiles(csvPath);
  console.log('✅ CSV file selected');
  
  // Wait for modal to appear
  const modal = page.locator('.upload-progress-modal');
  await expect(modal).toBeVisible({ timeout: 5000 });
  console.log('✅ Upload modal appeared');
  
  // Wait for modal to auto-close (should take about 4.5 seconds total)
  await expect(modal).toBeHidden({ timeout: 10000 });
  console.log('✅✅✅ Upload modal closed automatically!');
  
  // Verify data is displayed
  const ticketData = await page.locator('text=/ticket|TICK-/i').first();
  if (await ticketData.isVisible({ timeout: 2000 })) {
    console.log('✅ Ticket data is displayed');
  }
});