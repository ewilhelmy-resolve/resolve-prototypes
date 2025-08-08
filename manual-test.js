const puppeteer = require('puppeteer');

(async () => {
  console.log('Starting browser...');
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  console.log('Going to http://localhost:8082/');
  await page.goto('http://localhost:8082/', { waitUntil: 'networkidle2', timeout: 10000 });
  console.log('Page loaded');
  
  // Take screenshot
  await page.screenshot({ path: 'page-loaded.png' });
  console.log('Screenshot saved as page-loaded.png');
  
  // Check if login link exists
  const loginExists = await page.$('#loginLink') !== null;
  console.log('Login link exists:', loginExists);
  
  if (!loginExists) {
    // Check page content
    const content = await page.content();
    const hasSignupForm = content.includes('signupFormContainer');
    console.log('Has signup form container:', hasSignupForm);
    
    // Try waiting more
    console.log('Waiting for JavaScript to load...');
    await page.waitForTimeout(5000);
    
    const loginExistsAfterWait = await page.$('#loginLink') !== null;
    console.log('Login link exists after wait:', loginExistsAfterWait);
  }
  
  await browser.close();
  console.log('Done');
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});