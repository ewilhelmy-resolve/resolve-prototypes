const { test, expect } = require('@playwright/test');

test.describe('New Customer Journey - Configure Later Flow', () => {
  const testCustomer = {
    email: `testuser${Date.now()}@example.com`,
    company: 'Test Company LLC',
    password: 'TestPassword123!'
  };

  test('Complete onboarding with Configure Later for both options', async ({ page }) => {
    // Start at the homepage
    await page.goto('http://localhost:8082');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Step 1: Fill out signup form
    console.log(`Creating new customer: ${testCustomer.email}`);
    
    // Fill in email
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill(testCustomer.email);
    
    // Fill in company name
    const companyInput = page.locator('input[name="company"], input[placeholder*="company" i]').first();
    await companyInput.fill(testCustomer.company);
    
    // Fill in password
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(testCustomer.password);
    
    // Click Continue button
    await page.locator('button:has-text("Continue")').first().click();
    
    // Wait for the next step to load
    await page.waitForTimeout(3000);
    
    // Step 2: Configure Knowledge Sources - Select "Configure Later"
    // Check if we're on the knowledge sources step
    const knowledgeHeading = page.locator('text="Configure Your Knowledge Sources"');
    await expect(knowledgeHeading).toBeVisible({ timeout: 10000 });
    
    console.log('On Knowledge Sources step');
    
    // Click on Configure Later option - use a more specific selector
    const configureLaterCards = page.locator('text="Configure Later"');
    const firstConfigureLater = configureLaterCards.first();
    await firstConfigureLater.click();
    
    // Wait for selection
    await page.waitForTimeout(1000);
    
    // Click Continue button
    await page.locator('button:has-text("Continue")').click();
    
    // Wait for navigation
    await page.waitForTimeout(3000);
    
    // Step 3: Configure ITSM Solution - Select "Configure Later"
    const itsmHeading = page.locator('text="Configure Your ITSM Solution"');
    await expect(itsmHeading).toBeVisible({ timeout: 10000 });
    
    console.log('On ITSM Configuration step');
    
    // Click on Configure Later option for ITSM
    const itsmConfigureLater = page.locator('text="Configure Later"').first();
    await itsmConfigureLater.click();
    
    // Wait for selection
    await page.waitForTimeout(1000);
    
    // Click Continue button
    await page.locator('button:has-text("Continue")').click();
    
    // Wait for navigation to final screen
    await page.waitForTimeout(3000);
    
    // Step 4: Verify we reach the "Building Your AI-Powered Environment" screen
    const finalHeading = page.locator('text="Building Your AI-Powered Environment"');
    await expect(finalHeading).toBeVisible({ timeout: 10000 });
    
    // Verify the email is displayed correctly
    await expect(page.locator(`text=${testCustomer.email}`)).toBeVisible();
    
    console.log('✅ Customer onboarding completed successfully');
    
    // Step 5: Verify customer appears in admin dashboard
    console.log('Checking admin dashboard for new customer...');
    
    // Navigate to admin portal
    await page.goto('http://localhost:8082/admin-portal');
    
    // Login as admin
    await page.fill('input[type="email"]', 'john@resolve.io');
    await page.fill('input[type="password"]', '!Password1');
    await page.click('button:has-text("Sign In to Admin Panel")');
    
    // Wait for dashboard to load
    await page.waitForSelector('h1:has-text("Admin Dashboard")', { timeout: 10000 });
    
    // Search for the new customer (if search is needed)
    const searchBox = page.locator('input[placeholder*="Search"]');
    if (await searchBox.isVisible()) {
      await searchBox.fill(testCustomer.email);
      await page.waitForTimeout(1000);
    }
    
    // Verify customer appears in the list
    await expect(page.locator(`text=${testCustomer.email}`)).toBeVisible();
    await expect(page.locator(`text=${testCustomer.company}`)).toBeVisible();
    
    console.log('✅ Customer verified in admin dashboard');
    
    // Check the tier is 'standard' (default for Configure Later)
    const customerRow = page.locator(`tr:has-text("${testCustomer.email}")`);
    await expect(customerRow.locator('.tier-badge, span:has-text("standard")')).toBeVisible();
    
    console.log('✅ Customer tier verified as standard');
  });

  test('Quick verification of Configure Later flow', async ({ page }) => {
    const quickEmail = `quick${Date.now()}@test.com`;
    
    // Navigate and complete signup
    await page.goto('http://localhost:8082');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', quickEmail);
    await page.fill('input[name="company"], input[placeholder*="company" i]', 'Quick Test Co');
    await page.fill('input[type="password"]', 'QuickPass123!');
    await page.click('button:has-text("Continue")');
    
    // Knowledge Sources - Configure Later
    await page.waitForTimeout(3000);
    await expect(page.locator('text="Configure Your Knowledge Sources"')).toBeVisible({ timeout: 10000 });
    await page.locator('text="Configure Later"').first().click();
    await page.waitForTimeout(500);
    await page.click('button:has-text("Continue")');
    
    // ITSM - Configure Later  
    await page.waitForTimeout(3000);
    await expect(page.locator('text="Configure Your ITSM Solution"')).toBeVisible({ timeout: 10000 });
    await page.locator('text="Configure Later"').first().click();
    await page.waitForTimeout(500);
    await page.click('button:has-text("Continue")');
    
    // Verify completion
    await page.waitForTimeout(3000);
    await expect(page.locator('text="Building Your AI-Powered Environment"')).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${quickEmail}`)).toBeVisible();
    
    console.log(`✅ Quick test completed for ${quickEmail}`);
  });

  test('Batch customer creation with Configure Later', async ({ page }) => {
    const customers = [];
    const batchSize = 3;
    
    for (let i = 0; i < batchSize; i++) {
      const customer = {
        email: `batch${i}_${Date.now()}@test.com`,
        company: `Batch Company ${i + 1}`
      };
      customers.push(customer);
      
      console.log(`Creating customer ${i + 1}/${batchSize}: ${customer.email}`);
      
      // Navigate to homepage
      await page.goto('http://localhost:8082');
      await page.waitForLoadState('networkidle');
      
      // Complete signup
      await page.fill('input[type="email"]', customer.email);
      await page.fill('input[name="company"], input[placeholder*="company" i]', customer.company);
      await page.fill('input[type="password"]', 'BatchPass123!');
      await page.click('button:has-text("Continue")');
      
      // Knowledge Sources - Configure Later
      await page.waitForTimeout(3000);
      await page.locator('text="Configure Later"').first().click();
      await page.click('button:has-text("Continue")');
      
      // ITSM - Configure Later
      await page.waitForTimeout(3000);
      await page.locator('text="Configure Later"').first().click();
      await page.click('button:has-text("Continue")');
      
      // Verify completion
      await page.waitForTimeout(3000);
      await expect(page.locator(`text=${customer.email}`)).toBeVisible({ timeout: 10000 });
    }
    
    // Verify all customers in admin dashboard
    console.log('Verifying batch customers in admin dashboard...');
    
    await page.goto('http://localhost:8082/admin-portal');
    await page.fill('input[type="email"]', 'john@resolve.io');
    await page.fill('input[type="password"]', '!Password1');
    await page.click('button:has-text("Sign In to Admin Panel")');
    
    await page.waitForSelector('h1:has-text("Admin Dashboard")', { timeout: 10000 });
    
    // Check for each customer
    for (const customer of customers) {
      // Clear search and search for specific customer
      const searchBox = page.locator('input[placeholder*="Search"]');
      await searchBox.clear();
      await searchBox.fill(customer.email);
      await page.waitForTimeout(1000);
      
      await expect(page.locator(`text=${customer.email}`)).toBeVisible();
      console.log(`✅ Verified ${customer.email}`);
    }
    
    console.log(`✅ All ${batchSize} customers verified in dashboard`);
  });
});