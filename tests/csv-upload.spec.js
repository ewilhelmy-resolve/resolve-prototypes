const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('CSV Ticket Upload', () => {
  test('Upload sample tickets CSV file', async ({ page }) => {
    // Step 1: Navigate to homepage
    await page.goto('http://localhost:8082/');
    console.log('✅ Loaded homepage');
    
    // Step 2: Login as john@resolve.io
    await page.waitForTimeout(2000);
    await page.click('#loginLink');
    await page.fill('#loginEmail', 'john@resolve.io');
    await page.fill('#loginPassword', '!Password1');
    await page.click('button[type="submit"]');
    console.log('✅ Logged in');
    
    // Step 3: Wait for redirect to jarvis.html
    await page.waitForURL('**/jarvis.html', { timeout: 10000 });
    console.log('✅ Redirected to Jarvis dashboard');
    
    // Step 4: Look for file upload section
    const uploadSection = await page.locator('file-upload, .file-upload-container, #file-upload').first();
    const uploadExists = await uploadSection.count() > 0;
    
    if (uploadExists) {
      console.log('✅ File upload section found');
      
      // Step 5: Upload the CSV file
      const csvPath = path.join(__dirname, '..', 'sample-tickets.csv');
      const fileInput = await page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(csvPath);
      console.log('✅ CSV file selected');
      
      // Step 6: Wait for upload to complete
      await page.waitForTimeout(3000);
      
      // Check for success message or uploaded files list
      const successMessage = await page.locator('.success-message, .uploaded-files, #uploaded-files').first();
      if (await successMessage.count() > 0) {
        console.log('✅ File uploaded successfully');
      }
    } else {
      console.log('⚠️ No file upload section found on Jarvis page');
    }
  });
  
  test('Test CSV upload via API', async ({ request }) => {
    const fs = require('fs');
    const csvContent = fs.readFileSync(path.join(__dirname, '..', 'sample-tickets.csv'));
    
    // Step 1: Login to get token
    const loginResponse = await request.post('http://localhost:8082/api/auth/login', {
      data: {
        email: 'john@resolve.io',
        password: '!Password1'
      }
    });
    
    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Got auth token');
    
    // Step 2: Upload CSV file
    const uploadResponse = await request.post('http://localhost:8082/api/tickets/upload', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      multipart: {
        csvFile: {
          name: 'sample-tickets.csv',
          mimeType: 'text/csv',
          buffer: csvContent
        }
      }
    });
    
    console.log('Upload response status:', uploadResponse.status());
    
    if (uploadResponse.ok()) {
      const uploadData = await uploadResponse.json();
      console.log('✅ CSV uploaded via API');
      console.log('Response:', JSON.stringify(uploadData, null, 2));
      
      // Verify the response contains ticket data
      if (uploadData.tickets) {
        console.log(`✅ Uploaded ${uploadData.tickets.length} tickets`);
      }
    } else {
      const errorText = await uploadResponse.text();
      console.log('❌ Upload failed:', errorText);
    }
    
    expect(uploadResponse.ok()).toBeTruthy();
  });
});