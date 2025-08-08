const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ 
    headless: true  // Run headless for testing
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => console.log('Browser:', msg.text()));
  page.on('pageerror', err => console.log('Error:', err.message));
  
  try {
    console.log('1. Going to http://localhost:8082/');
    await page.goto('http://localhost:8082/');
    await page.waitForTimeout(2000);
    
    console.log('2. Clicking login link...');
    await page.click('#loginLink');
    
    console.log('3. Logging in...');
    await page.fill('#loginEmail', 'john@resolve.io');
    await page.fill('#loginPassword', '!Password1');
    await page.click('button[type="submit"]');
    
    console.log('4. Waiting for Jarvis page...');
    await page.waitForURL('**/jarvis.html', { timeout: 10000 });
    console.log('   ✅ On Jarvis page');
    
    await page.waitForTimeout(3000);
    
    console.log('5. Looking for upload button...');
    // Take screenshot before upload
    await page.screenshot({ path: 'before-upload.png' });
    
    // Find the file input
    const fileInput = await page.$('#ticketFileUpload');
    if (!fileInput) {
      console.log('   ❌ No file input found!');
      return;
    }
    
    console.log('6. Uploading CSV file...');
    const csvPath = path.resolve(__dirname, 'sample-tickets.csv');
    await fileInput.setInputFiles(csvPath);
    
    console.log('7. Waiting to observe upload dialog...');
    
    // Wait and watch for the modal
    await page.waitForTimeout(2000);
    
    // Check if modal appeared
    const modal = await page.$('.upload-progress-modal');
    if (modal) {
      console.log('   ✅ Upload modal appeared');
      
      // Take screenshot of modal
      await page.screenshot({ path: 'upload-modal.png' });
      
      // Wait to see if it closes
      console.log('8. Waiting to see if modal closes...');
      for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(1000);
        const stillVisible = await modal.isVisible();
        console.log(`   ${i+1}s - Modal visible: ${stillVisible}`);
        
        if (!stillVisible) {
          console.log('   ✅ Modal closed!');
          break;
        }
        
        // Check the status text
        const statusEl = await page.$('#uploadStatus');
        if (statusEl) {
          const status = await statusEl.textContent();
          console.log(`   Status: ${status}`);
        }
      }
      
      // Final screenshot
      await page.screenshot({ path: 'after-upload.png' });
      
      // Check if modal is still there
      const finalCheck = await modal.isVisible();
      if (finalCheck) {
        console.log('   ❌ Modal is STILL VISIBLE - it never closed!');
        
        // Try to get any error messages
        const modalContent = await modal.innerHTML();
        console.log('Modal HTML:', modalContent.substring(0, 500));
      }
    } else {
      console.log('   ❌ No upload modal found');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
})();