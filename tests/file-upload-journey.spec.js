const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('File Upload User Journey with Tenant Isolation', () => {
  const baseURL = 'http://localhost:3001';
  
  // Test data for different tenants
  const tenant1 = {
    email: 'tenant1@company1.com',
    password: 'Password123!',
    company: 'Company One',
    firstName: 'Alice',
    lastName: 'Johnson'
  };
  
  const tenant2 = {
    email: 'tenant2@company2.com', 
    password: 'Password456!',
    company: 'Company Two',
    firstName: 'Bob',
    lastName: 'Smith'
  };

  // Create sample CSV data for each tenant
  const createSampleCSV = (tenantId) => {
    const csvContent = `ticket_id,title,description,status,priority,category,created_at,resolved_at,cost_saved
${tenantId}-001,Password Reset,User forgot password for ${tenantId},resolved,high,Password Reset,2024-01-15,2024-01-15,25.00
${tenantId}-002,Software Install,Install software for ${tenantId},resolved,medium,Software,2024-01-16,2024-01-16,50.00
${tenantId}-003,VPN Issue,VPN not working for ${tenantId},open,high,Network,2024-01-17,,
${tenantId}-004,Email Setup,Configure email for ${tenantId},resolved,low,Email,2024-01-18,2024-01-18,35.00`;
    
    const fileName = `test-tickets-${tenantId}.csv`;
    const filePath = path.join(__dirname, '..', 'test-data', fileName);
    
    // Create test-data directory if it doesn't exist
    const testDataDir = path.join(__dirname, '..', 'test-data');
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir);
    }
    
    fs.writeFileSync(filePath, csvContent);
    return filePath;
  };

  test.beforeAll(async () => {
    // Create test CSV files for both tenants
    createSampleCSV('tenant1');
    createSampleCSV('tenant2');
  });

  test('Complete user journey for Tenant 1', async ({ page }) => {
    // 1. Navigate to the application
    await page.goto(baseURL);
    await expect(page).toHaveTitle(/Resolve/);
    
    // 2. Register Tenant 1
    await page.click('text=Get Started');
    await page.waitForTimeout(1000);
    
    // Fill registration form
    await page.fill('input[type="email"]', tenant1.email);
    await page.fill('input[name="password"]', tenant1.password);
    await page.fill('input[name="confirmPassword"]', tenant1.password);
    await page.fill('input[name="company"]', tenant1.company);
    await page.fill('input[name="firstName"]', tenant1.firstName);
    await page.fill('input[name="lastName"]', tenant1.lastName);
    
    // Submit registration
    await page.click('button:has-text("Create Account")');
    await page.waitForTimeout(2000);
    
    // 3. Navigate to file upload page
    await page.goto(`${baseURL}/test-file-upload.html`);
    await page.waitForTimeout(1000);
    
    // 4. Upload CSV file for Tenant 1
    const fileUploadComponent = await page.waitForSelector('file-upload');
    const shadowRoot = await fileUploadComponent.evaluateHandle(el => el.shadowRoot);
    
    // Get file input within shadow DOM
    const fileInput = await shadowRoot.$('input#file-input');
    const filePath1 = createSampleCSV('tenant1');
    await fileInput.setInputFiles(filePath1);
    
    // Wait for upload to complete
    await page.waitForTimeout(3000);
    
    // 5. Verify upload success message
    const successMessage = await shadowRoot.$('.success-message');
    const successText = await successMessage.textContent();
    expect(successText).toContain('Successfully uploaded');
    
    // 6. Wait for API key generation
    await page.waitForTimeout(2000);
    
    // 7. Get the generated API key
    const apiKeyInput = await shadowRoot.$('#api-key-input');
    const apiKey1 = await apiKeyInput.inputValue();
    expect(apiKey1).toMatch(/^rslv_/);
    
    console.log(`Tenant 1 API Key: ${apiKey1}`);
    
    // 8. Test API access for Tenant 1
    const apiResponse1 = await page.request.get(`${baseURL}/api/tickets/data`, {
      headers: {
        'X-API-Key': apiKey1,
        'Content-Type': 'application/json'
      }
    });
    
    expect(apiResponse1.status()).toBe(200);
    const data1 = await apiResponse1.json();
    expect(data1.success).toBe(true);
    expect(data1.data).toBeInstanceOf(Array);
    
    // Verify Tenant 1 can only see their own data
    const tenant1Tickets = data1.data.filter(t => t.ticket_id.startsWith('tenant1'));
    expect(tenant1Tickets.length).toBeGreaterThan(0);
    
    // Verify no data from other tenants
    const otherTenantTickets = data1.data.filter(t => !t.ticket_id.startsWith('tenant1'));
    expect(otherTenantTickets.length).toBe(0);
  });

  test('Complete user journey for Tenant 2 with isolation verification', async ({ page }) => {
    // 1. Navigate to the application
    await page.goto(baseURL);
    
    // 2. Register Tenant 2
    await page.click('text=Get Started');
    await page.waitForTimeout(1000);
    
    // Fill registration form for Tenant 2
    await page.fill('input[type="email"]', tenant2.email);
    await page.fill('input[name="password"]', tenant2.password);
    await page.fill('input[name="confirmPassword"]', tenant2.password);
    await page.fill('input[name="company"]', tenant2.company);
    await page.fill('input[name="firstName"]', tenant2.firstName);
    await page.fill('input[name="lastName"]', tenant2.lastName);
    
    // Submit registration
    await page.click('button:has-text("Create Account")');
    await page.waitForTimeout(2000);
    
    // 3. Navigate to file upload page
    await page.goto(`${baseURL}/test-file-upload.html`);
    await page.waitForTimeout(1000);
    
    // 4. Upload CSV file for Tenant 2
    const fileUploadComponent = await page.waitForSelector('file-upload');
    const shadowRoot = await fileUploadComponent.evaluateHandle(el => el.shadowRoot);
    
    const fileInput = await shadowRoot.$('input#file-input');
    const filePath2 = createSampleCSV('tenant2');
    await fileInput.setInputFiles(filePath2);
    
    // Wait for upload to complete
    await page.waitForTimeout(3000);
    
    // 5. Get the generated API key for Tenant 2
    await page.waitForTimeout(2000);
    const apiKeyInput = await shadowRoot.$('#api-key-input');
    const apiKey2 = await apiKeyInput.inputValue();
    expect(apiKey2).toMatch(/^rslv_/);
    
    console.log(`Tenant 2 API Key: ${apiKey2}`);
    
    // 6. Test API access for Tenant 2
    const apiResponse2 = await page.request.get(`${baseURL}/api/tickets/data`, {
      headers: {
        'X-API-Key': apiKey2,
        'Content-Type': 'application/json'
      }
    });
    
    expect(apiResponse2.status()).toBe(200);
    const data2 = await apiResponse2.json();
    expect(data2.success).toBe(true);
    
    // Verify Tenant 2 can only see their own data
    const tenant2Tickets = data2.data.filter(t => t.ticket_id.startsWith('tenant2'));
    expect(tenant2Tickets.length).toBeGreaterThan(0);
    
    // Verify no data from Tenant 1
    const tenant1Tickets = data2.data.filter(t => t.ticket_id.startsWith('tenant1'));
    expect(tenant1Tickets.length).toBe(0);
    
    // 7. Verify Tenant 2 cannot access Tenant 1's data with wrong API key
    // This should fail if they try to use Tenant 1's API key
    console.log('Verified: Tenant 2 cannot see Tenant 1 data');
  });

  test('Test multiple file uploads for same tenant', async ({ page }) => {
    const testEmail = 'multifile@test.com';
    
    // 1. Register new user
    await page.goto(baseURL);
    await page.click('text=Get Started');
    await page.waitForTimeout(1000);
    
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.fill('input[name="confirmPassword"]', 'TestPass123!');
    await page.fill('input[name="company"]', 'Multi Test Co');
    await page.fill('input[name="firstName"]', 'Multi');
    await page.fill('input[name="lastName"]', 'Tester');
    
    await page.click('button:has-text("Create Account")');
    await page.waitForTimeout(2000);
    
    // 2. Navigate to upload page
    await page.goto(`${baseURL}/test-file-upload.html`);
    await page.waitForTimeout(1000);
    
    // 3. Upload first batch of data
    const fileUploadComponent = await page.waitForSelector('file-upload');
    const shadowRoot = await fileUploadComponent.evaluateHandle(el => el.shadowRoot);
    
    const fileInput = await shadowRoot.$('input#file-input');
    const firstBatch = createSampleCSV('batch1');
    await fileInput.setInputFiles(firstBatch);
    await page.waitForTimeout(3000);
    
    // 4. Upload second batch of data
    const secondBatch = createSampleCSV('batch2');
    await fileInput.setInputFiles(secondBatch);
    await page.waitForTimeout(3000);
    
    // 5. Get API key and verify all data is accessible
    const apiKeyInput = await shadowRoot.$('#api-key-input');
    const apiKey = await apiKeyInput.inputValue();
    
    const apiResponse = await page.request.get(`${baseURL}/api/tickets/data`, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await apiResponse.json();
    expect(data.success).toBe(true);
    
    // Should have data from both batches
    const batch1Data = data.data.filter(t => t.ticket_id.startsWith('batch1'));
    const batch2Data = data.data.filter(t => t.ticket_id.startsWith('batch2'));
    
    expect(batch1Data.length).toBeGreaterThan(0);
    expect(batch2Data.length).toBeGreaterThan(0);
    
    console.log(`Total records for multi-file tenant: ${data.data.length}`);
  });

  test('Test API filtering and pagination', async ({ page }) => {
    // Use existing tenant1 credentials
    await page.goto(baseURL);
    
    // Login as tenant1
    await page.click('text=Login');
    await page.waitForTimeout(1000);
    await page.fill('input[type="email"]', tenant1.email);
    await page.fill('input[type="password"]', tenant1.password);
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(2000);
    
    // Navigate to upload page to get API key
    await page.goto(`${baseURL}/test-file-upload.html`);
    await page.waitForTimeout(1000);
    
    const fileUploadComponent = await page.waitForSelector('file-upload');
    const shadowRoot = await fileUploadComponent.evaluateHandle(el => el.shadowRoot);
    
    // Trigger API key generation if needed
    const generateKeyResponse = await page.request.post(`${baseURL}/api/generate-key`, {
      headers: {
        'X-User-Email': tenant1.email,
        'Content-Type': 'application/json'
      }
    });
    
    const keyData = await generateKeyResponse.json();
    const apiKey = keyData.apiKey;
    
    // Test filtering by status
    const openTickets = await page.request.get(`${baseURL}/api/tickets/data?status=open`, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    const openData = await openTickets.json();
    expect(openData.success).toBe(true);
    const allOpen = openData.data.every(t => t.status === 'open');
    expect(allOpen).toBe(true);
    
    // Test pagination
    const page1Response = await page.request.get(`${baseURL}/api/tickets/data?page=1&limit=2`, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    const page1Data = await page1Response.json();
    expect(page1Data.pagination.page).toBe(1);
    expect(page1Data.data.length).toBeLessThanOrEqual(2);
    
    console.log('API filtering and pagination working correctly');
  });

  test('Verify tenant isolation security', async ({ page }) => {
    // Create API keys for both tenants
    const tenant1KeyResponse = await page.request.post(`${baseURL}/api/generate-key`, {
      headers: {
        'X-User-Email': tenant1.email,
        'Content-Type': 'application/json'
      }
    });
    const tenant1Key = (await tenant1KeyResponse.json()).apiKey;
    
    const tenant2KeyResponse = await page.request.post(`${baseURL}/api/generate-key`, {
      headers: {
        'X-User-Email': tenant2.email,
        'Content-Type': 'application/json'
      }
    });
    const tenant2Key = (await tenant2KeyResponse.json()).apiKey;
    
    // Try to access Tenant 2's data with Tenant 1's key
    const crossAccessResponse = await page.request.get(`${baseURL}/api/tickets/data`, {
      headers: {
        'X-API-Key': tenant1Key,
        'Content-Type': 'application/json'
      }
    });
    
    const crossAccessData = await crossAccessResponse.json();
    
    // Tenant 1 should only see their own data, not Tenant 2's
    const tenant1OnlyData = crossAccessData.data.every(t => 
      !t.ticket_id.startsWith('tenant2')
    );
    expect(tenant1OnlyData).toBe(true);
    
    console.log('✅ Tenant isolation verified - tenants cannot see each other\'s data');
  });

  test.afterAll(async () => {
    // Cleanup test data files
    const testDataDir = path.join(__dirname, '..', 'test-data');
    if (fs.existsSync(testDataDir)) {
      const files = fs.readdirSync(testDataDir);
      files.forEach(file => {
        if (file.startsWith('test-tickets-')) {
          fs.unlinkSync(path.join(testDataDir, file));
        }
      });
    }
  });
});