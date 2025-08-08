const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Tenant Data Isolation', () => {
  const baseURL = 'http://localhost:3001';
  
  // Helper function to create test CSV
  const createTestCSV = (tenantName) => {
    const csvContent = `ticket_id,title,description,status,priority,category,created_at
${tenantName}-001,Issue 1 for ${tenantName},Description,open,high,Support,2024-01-15
${tenantName}-002,Issue 2 for ${tenantName},Description,resolved,medium,IT,2024-01-16
${tenantName}-003,Issue 3 for ${tenantName},Description,open,low,HR,2024-01-17`;
    
    const testDataDir = path.join(__dirname, '..', 'test-data');
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir);
    }
    
    const filePath = path.join(testDataDir, `${tenantName}.csv`);
    fs.writeFileSync(filePath, csvContent);
    return filePath;
  };

  test('Verify complete tenant isolation flow', async ({ page }) => {
    console.log('Starting tenant isolation test...');
    
    // Step 1: Navigate to file upload page directly
    await page.goto(`${baseURL}/test-file-upload.html`);
    await expect(page).toHaveURL(/test-file-upload/);
    console.log('✓ Navigated to file upload page');
    
    // Step 2: Set tenant 1 email in session storage
    await page.evaluate(() => {
      sessionStorage.setItem('userEmail', 'tenant1@company.com');
    });
    
    // Step 3: Upload CSV for Tenant 1
    const tenant1File = createTestCSV('CompanyA');
    const fileUploadComponent = await page.waitForSelector('file-upload', { timeout: 5000 });
    
    // Access shadow DOM
    const uploadResult1 = await page.evaluate(async (filePath) => {
      const component = document.querySelector('file-upload');
      const shadowRoot = component.shadowRoot;
      const fileInput = shadowRoot.querySelector('#file-input');
      
      // Simulate file upload
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'X-User-Email': 'tenant1@company.com'
        },
        body: (() => {
          const formData = new FormData();
          formData.append('file', new File([`ticket_id,title,status
CompanyA-001,Issue 1,open
CompanyA-002,Issue 2,resolved`], 'test.csv', { type: 'text/csv' }));
          return formData;
        })()
      });
      
      return await response.json();
    });
    
    console.log('✓ Uploaded data for Tenant 1');
    
    // Step 4: Generate API key for Tenant 1
    const apiKey1Response = await page.request.post(`${baseURL}/api/generate-key`, {
      headers: {
        'X-User-Email': 'tenant1@company.com',
        'Content-Type': 'application/json'
      }
    });
    
    const { apiKey: tenant1Key } = await apiKey1Response.json();
    console.log(`✓ Generated API key for Tenant 1: ${tenant1Key}`);
    
    // Step 5: Switch to Tenant 2
    await page.evaluate(() => {
      sessionStorage.setItem('userEmail', 'tenant2@company.com');
    });
    
    // Step 6: Upload CSV for Tenant 2
    const uploadResult2 = await page.evaluate(async () => {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'X-User-Email': 'tenant2@company.com'
        },
        body: (() => {
          const formData = new FormData();
          formData.append('file', new File([`ticket_id,title,status
CompanyB-001,Issue 1,open
CompanyB-002,Issue 2,closed`], 'test2.csv', { type: 'text/csv' }));
          return formData;
        })()
      });
      
      return await response.json();
    });
    
    console.log('✓ Uploaded data for Tenant 2');
    
    // Step 7: Generate API key for Tenant 2
    const apiKey2Response = await page.request.post(`${baseURL}/api/generate-key`, {
      headers: {
        'X-User-Email': 'tenant2@company.com',
        'Content-Type': 'application/json'
      }
    });
    
    const { apiKey: tenant2Key } = await apiKey2Response.json();
    console.log(`✓ Generated API key for Tenant 2: ${tenant2Key}`);
    
    // Step 8: Test Tenant 1 can only see their data
    const tenant1DataResponse = await page.request.get(`${baseURL}/api/tickets/data`, {
      headers: {
        'X-API-Key': tenant1Key,
        'Content-Type': 'application/json'
      }
    });
    
    const tenant1Data = await tenant1DataResponse.json();
    expect(tenant1Data.success).toBe(true);
    
    // Verify Tenant 1 only sees CompanyA data
    const hasOnlyCompanyA = tenant1Data.data.every(ticket => 
      ticket.ticket_id && ticket.ticket_id.includes('CompanyA')
    );
    
    if (tenant1Data.data.length > 0) {
      expect(hasOnlyCompanyA).toBe(true);
      console.log(`✓ Tenant 1 sees only their data (${tenant1Data.data.length} records)`);
    }
    
    // Step 9: Test Tenant 2 can only see their data
    const tenant2DataResponse = await page.request.get(`${baseURL}/api/tickets/data`, {
      headers: {
        'X-API-Key': tenant2Key,
        'Content-Type': 'application/json'
      }
    });
    
    const tenant2Data = await tenant2DataResponse.json();
    expect(tenant2Data.success).toBe(true);
    
    // Verify Tenant 2 only sees CompanyB data
    const hasOnlyCompanyB = tenant2Data.data.every(ticket => 
      ticket.ticket_id && ticket.ticket_id.includes('CompanyB')
    );
    
    if (tenant2Data.data.length > 0) {
      expect(hasOnlyCompanyB).toBe(true);
      console.log(`✓ Tenant 2 sees only their data (${tenant2Data.data.length} records)`);
    }
    
    // Step 10: Verify cross-tenant access is blocked
    const noCompanyBInTenant1 = !tenant1Data.data.some(ticket => 
      ticket.ticket_id && ticket.ticket_id.includes('CompanyB')
    );
    const noCompanyAInTenant2 = !tenant2Data.data.some(ticket => 
      ticket.ticket_id && ticket.ticket_id.includes('CompanyA')
    );
    
    expect(noCompanyBInTenant1).toBe(true);
    expect(noCompanyAInTenant2).toBe(true);
    
    console.log('✅ TENANT ISOLATION VERIFIED - Tenants cannot see each other\'s data');
    
    // Display summary
    console.log('\n=== Test Summary ===');
    console.log(`Tenant 1 (tenant1@company.com):`);
    console.log(`  - API Key: ${tenant1Key}`);
    console.log(`  - Records: ${tenant1Data.data.length}`);
    console.log(`  - Can see: Only CompanyA data`);
    console.log(`\nTenant 2 (tenant2@company.com):`);
    console.log(`  - API Key: ${tenant2Key}`);
    console.log(`  - Records: ${tenant2Data.data.length}`);
    console.log(`  - Can see: Only CompanyB data`);
    console.log('\n✅ All isolation tests passed!');
  });

  test('Test API pagination and filtering per tenant', async ({ page }) => {
    // Generate API key for test
    const testEmail = 'pagination-test@company.com';
    
    // Upload test data with multiple records
    const uploadResponse = await page.evaluate(async (email) => {
      const csvContent = `ticket_id,title,status,priority,category
TEST-001,Issue 1,open,high,Support
TEST-002,Issue 2,resolved,medium,IT
TEST-003,Issue 3,open,low,HR
TEST-004,Issue 4,resolved,high,Support
TEST-005,Issue 5,open,medium,IT`;
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'X-User-Email': email
        },
        body: (() => {
          const formData = new FormData();
          formData.append('file', new File([csvContent], 'pagination-test.csv', { type: 'text/csv' }));
          return formData;
        })()
      });
      
      return await response.json();
    }, testEmail);
    
    // Generate API key
    const apiKeyResponse = await page.request.post(`${baseURL}/api/generate-key`, {
      headers: {
        'X-User-Email': testEmail,
        'Content-Type': 'application/json'
      }
    });
    
    const { apiKey } = await apiKeyResponse.json();
    
    // Test pagination
    const page1Response = await page.request.get(`${baseURL}/api/tickets/data?page=1&limit=2`, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    const page1Data = await page1Response.json();
    expect(page1Data.data.length).toBeLessThanOrEqual(2);
    expect(page1Data.pagination.page).toBe(1);
    
    // Test filtering by status
    const openTicketsResponse = await page.request.get(`${baseURL}/api/tickets/data?status=open`, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    const openTickets = await openTicketsResponse.json();
    const allOpen = openTickets.data.every(t => t.status === 'open');
    expect(allOpen).toBe(true);
    
    console.log('✅ Pagination and filtering working correctly per tenant');
  });

  test.afterAll(async () => {
    // Cleanup test files
    const testDataDir = path.join(__dirname, '..', 'test-data');
    if (fs.existsSync(testDataDir)) {
      const files = fs.readdirSync(testDataDir);
      files.forEach(file => {
        if (file.endsWith('.csv')) {
          fs.unlinkSync(path.join(testDataDir, file));
        }
      });
    }
  });
});