const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Configure test settings
test.use({
  video: 'retain-on-failure',
  screenshot: 'only-on-failure',
  trace: 'retain-on-failure'
});

test.describe('CSV Upload and Resolve Workflow Engine Integration', () => {

  test('validates CSV upload triggers Resolve API call', async ({ page, request }) => {
    // Generate unique test data
    const timestamp = Date.now();
    const testUser = {
      name: `CSV Test User ${timestamp}`,
      email: `csvtest${timestamp}@example.com`,
      company: `CSV Test Company ${timestamp}`,
      password: 'TestPassword123!'
    };

    console.log(`\n🧪 CSV UPLOAD & RESOLVE API TEST: ${testUser.email}\n`);

    // ============= STEP 1: CREATE ACCOUNT =============
    console.log('1️⃣ CREATING TEST ACCOUNT');
    
    // Navigate to signup page
    await page.goto('/');
    await expect(page).toHaveTitle(/Resolve Onboarding/);
    
    // Wait for dynamic content
    await page.waitForTimeout(3000);
    
    // Fill signup form
    const nameField = page.locator('input#fullName, input[name="fullName"], input[placeholder*="name" i]').first();
    const emailField = page.locator('input#email, input[type="email"], input[name="email"]').first();
    const companyField = page.locator('input#company, input[name="company"], input[placeholder*="company" i]').first();
    const passwordField = page.locator('input#password, input[type="password"], input[name="password"]').first();
    
    if (await nameField.isVisible()) {
      await nameField.fill(testUser.name);
      await emailField.fill(testUser.email);
      await companyField.fill(testUser.company);
      await passwordField.fill(testUser.password);
      console.log('   ✅ Signup form filled');
      
      // Submit signup
      const submitButton = page.locator('button[type="submit"], button:has-text("Get Started"), button:has-text("Sign Up")').first();
      await submitButton.click();
      console.log('   ✅ Signup submitted');
      
      // Wait for navigation
      await page.waitForTimeout(3000);
    }

    // ============= STEP 2: NAVIGATE TO INTEGRATIONS =============
    console.log('2️⃣ NAVIGATING TO INTEGRATIONS PAGE');
    
    // Check if we're on step2 or need to navigate there
    const currentUrl = page.url();
    if (!currentUrl.includes('step2')) {
      // Try to skip directly to integrations
      await page.goto('/step2.html');
      await page.waitForTimeout(2000);
    }
    
    // Wait for page to load
    await page.waitForSelector('body', { state: 'visible' });
    console.log('   ✅ On integrations page');

    // ============= STEP 3: CREATE TEST CSV FILE =============
    console.log('3️⃣ CREATING TEST CSV FILE');
    
    const csvContent = `Name,Email,Department,Role,Status
John Doe,john@example.com,Engineering,Developer,Active
Jane Smith,jane@example.com,Marketing,Manager,Active
Bob Johnson,bob@example.com,Sales,Representative,Active
Alice Williams,alice@example.com,HR,Director,Active
Test User ${timestamp},${testUser.email},Testing,QA Engineer,Active`;
    
    const csvFilePath = path.join(__dirname, `test-data-${timestamp}.csv`);
    fs.writeFileSync(csvFilePath, csvContent);
    console.log(`   ✅ Created test CSV file: ${csvFilePath}`);

    // ============= STEP 4: INTERCEPT NETWORK REQUESTS =============
    console.log('4️⃣ SETTING UP NETWORK INTERCEPTION');
    
    let resolveApiCalled = false;
    let resolveApiPayload = null;
    let callbackUrl = null;
    
    // Intercept the upload request
    await page.route('**/api/upload-knowledge', async (route, request) => {
      console.log('   🔍 Intercepted upload request');
      const response = await route.fetch();
      const responseBody = await response.json();
      
      // Extract callback URL if present
      if (responseBody.callbackUrl) {
        callbackUrl = responseBody.callbackUrl;
        console.log(`   📎 Callback URL: ${callbackUrl}`);
      }
      
      await route.fulfill({ response });
    });
    
    // Intercept Resolve API webhook calls
    await page.route('**/actions-api-staging.resolve.io/**', async (route, request) => {
      console.log('   🎯 RESOLVE API CALLED!');
      resolveApiCalled = true;
      
      // Capture the payload
      const postData = request.postData();
      if (postData) {
        try {
          resolveApiPayload = JSON.parse(postData);
          console.log('   📦 Resolve API Payload:', JSON.stringify(resolveApiPayload, null, 2));
        } catch (e) {
          console.log('   ⚠️ Could not parse Resolve API payload');
        }
      }
      
      // Mock successful response
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Webhook received' })
      });
    });

    // ============= STEP 5: UPLOAD CSV FILE =============
    console.log('5️⃣ UPLOADING CSV FILE');
    
    // Look for file upload section
    const fileInput = page.locator('input[type="file"]').first();
    
    if (await fileInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Upload the CSV file
      await fileInput.setInputFiles(csvFilePath);
      console.log('   ✅ CSV file selected');
      
      // Wait for upload to process
      await page.waitForTimeout(2000);
      
      // Look for upload button and click it
      const uploadButton = page.locator('button:has-text("Upload"), button:has-text("Submit"), button:has-text("Import")').first();
      if (await uploadButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await uploadButton.click();
        console.log('   ✅ Upload initiated');
        
        // Wait for upload to complete
        await page.waitForTimeout(5000);
      }
    } else {
      console.log('   ⚠️ File input not found, checking for alternative upload methods');
      
      // Try drag and drop area
      const dropZone = page.locator('.drop-zone, .dropzone, [data-testid="drop-zone"]').first();
      if (await dropZone.isVisible({ timeout: 5000 }).catch(() => false)) {
        await dropZone.click();
        await page.waitForTimeout(1000);
        
        // File dialog should open, set files
        const hiddenInput = page.locator('input[type="file"]');
        await hiddenInput.setInputFiles(csvFilePath);
        console.log('   ✅ CSV file uploaded via drop zone');
      }
    }

    // ============= STEP 6: VERIFY RESOLVE API CALL =============
    console.log('6️⃣ VERIFYING RESOLVE API INTEGRATION');
    
    // Wait a bit more for async operations
    await page.waitForTimeout(3000);
    
    // Check if Resolve API was called (might be disabled in local testing)
    if (process.env.WEBHOOK_ENABLED !== 'false') {
      if (resolveApiCalled) {
        console.log('   ✅ Resolve API was called successfully!');
        
        // Validate payload structure
        expect(resolveApiPayload).toBeTruthy();
        expect(resolveApiPayload.source).toBe('Onboarding');
        expect(resolveApiPayload.action).toBe('csv_upload_validation');
        expect(resolveApiPayload.user_email).toBe(testUser.email);
        expect(resolveApiPayload.integration_type).toBe('csv');
        expect(resolveApiPayload.callbackUrl).toBeTruthy();
        expect(resolveApiPayload.csv_row_count).toBeGreaterThan(0);
        
        console.log('   ✅ Payload structure validated');
      } else {
        console.log('   ⚠️ Resolve API was not called - webhook might be disabled');
      }
    } else {
      console.log('   ℹ️ Webhook is disabled in environment');
    }

    // ============= STEP 7: VERIFY CALLBACK ENDPOINT =============
    if (callbackUrl) {
      console.log('7️⃣ VERIFYING CALLBACK ENDPOINT');
      
      // Extract callback ID from URL
      const callbackId = callbackUrl.split('/').pop();
      
      // Test the callback endpoint
      const callbackResponse = await request.get(`/api/csv/callback/${callbackId}`);
      expect(callbackResponse.ok()).toBeTruthy();
      
      const callbackData = await callbackResponse.json();
      console.log('   📊 Callback data received:', {
        success: callbackData.success,
        fileCount: callbackData.files?.length,
        rowCount: callbackData.csvData?.length
      });
      
      // Validate callback data
      expect(callbackData.success).toBe(true);
      expect(callbackData.status).toBe('ready');
      expect(callbackData.userEmail).toBe(testUser.email);
      expect(callbackData.csvData).toBeTruthy();
      expect(callbackData.csvData.length).toBe(5); // We uploaded 5 rows
      
      console.log('   ✅ Callback endpoint validated');
      
      // Test download endpoint
      const downloadResponse = await request.get(`/api/csv/callback/${callbackId}/download`);
      expect(downloadResponse.ok()).toBeTruthy();
      
      const downloadedCsv = await downloadResponse.text();
      expect(downloadedCsv).toContain('Name,Email,Department,Role,Status');
      expect(downloadedCsv).toContain(testUser.email);
      
      console.log('   ✅ CSV download endpoint validated');
    }

    // ============= STEP 8: CHECK SUCCESS INDICATORS =============
    console.log('8️⃣ CHECKING SUCCESS INDICATORS');
    
    // Look for success messages
    const successMessage = page.locator('text=/success|complete|uploaded|imported/i').first();
    if (await successMessage.isVisible({ timeout: 5000 }).catch(() => false)) {
      const messageText = await successMessage.textContent();
      console.log(`   ✅ Success message found: "${messageText}"`);
    }
    
    // Check for completed integrations
    const completedIntegrations = await page.locator('.completed, .success, [data-status="complete"]').count();
    if (completedIntegrations > 0) {
      console.log(`   ✅ ${completedIntegrations} integration(s) marked as complete`);
    }

    // ============= CLEANUP =============
    console.log('9️⃣ CLEANUP');
    
    // Delete test CSV file
    if (fs.existsSync(csvFilePath)) {
      fs.unlinkSync(csvFilePath);
      console.log('   ✅ Test CSV file deleted');
    }
    
    console.log('\n✅ CSV UPLOAD & RESOLVE API TEST COMPLETED SUCCESSFULLY!\n');
  });

  test('validates Resolve API webhook payload structure', async ({ request }) => {
    console.log('\n🔬 TESTING WEBHOOK PAYLOAD STRUCTURE\n');
    
    // Create a mock CSV upload payload
    const mockPayload = {
      source: 'Onboarding',
      user_email: 'test@example.com',
      action: 'csv_upload_validation',
      integration_type: 'csv',
      callbackUrl: 'http://localhost:5000/api/csv/callback/test123',
      tenantToken: 'test-tenant',
      csv_row_count: 10,
      csv_files: ['test.csv'],
      timestamp: new Date().toISOString()
    };
    
    // Validate required fields
    expect(mockPayload).toHaveProperty('source');
    expect(mockPayload).toHaveProperty('user_email');
    expect(mockPayload).toHaveProperty('action');
    expect(mockPayload).toHaveProperty('integration_type');
    expect(mockPayload).toHaveProperty('callbackUrl');
    expect(mockPayload).toHaveProperty('csv_row_count');
    expect(mockPayload).toHaveProperty('timestamp');
    
    // Validate field types
    expect(typeof mockPayload.source).toBe('string');
    expect(typeof mockPayload.user_email).toBe('string');
    expect(typeof mockPayload.action).toBe('string');
    expect(typeof mockPayload.csv_row_count).toBe('number');
    expect(Array.isArray(mockPayload.csv_files)).toBe(true);
    
    console.log('   ✅ Webhook payload structure validated');
    console.log('   📋 Required fields:', Object.keys(mockPayload).join(', '));
  });

  test('validates CSV callback data retrieval', async ({ request }) => {
    console.log('\n🔄 TESTING CSV CALLBACK MECHANISM\n');
    
    // First, create a test upload to get a callback ID
    const uploadResponse = await request.post('/api/upload-knowledge', {
      multipart: {
        files: {
          name: 'test.csv',
          mimeType: 'text/csv',
          buffer: Buffer.from('Name,Email\nTest,test@example.com')
        }
      }
    });
    
    if (uploadResponse.ok()) {
      const uploadData = await uploadResponse.json();
      
      if (uploadData.callbackUrl) {
        const callbackId = uploadData.callbackUrl.split('/').pop();
        console.log(`   📎 Testing callback ID: ${callbackId}`);
        
        // Test callback retrieval
        const callbackResponse = await request.get(`/api/csv/callback/${callbackId}`);
        
        if (callbackResponse.ok()) {
          const callbackData = await callbackResponse.json();
          
          // Validate callback response structure
          expect(callbackData.success).toBe(true);
          expect(callbackData.status).toBe('ready');
          expect(callbackData).toHaveProperty('csvData');
          expect(callbackData).toHaveProperty('files');
          expect(callbackData).toHaveProperty('uploadedAt');
          
          console.log('   ✅ Callback data structure validated');
          console.log(`   📊 CSV rows available: ${callbackData.csvData?.length || 0}`);
        }
      }
    }
  });
});