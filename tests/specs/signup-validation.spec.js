const { test, expect } = require('../fixtures/base-test');

test.describe('Signup Page Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5000');
  });

  const checkModalMessage = async (page, expectedMessage) => {
    const modalOverlay = page.locator('.modal-overlay.show');
    await expect(modalOverlay).toBeVisible();
    
    const modalMessage = page.locator('#modalMessage');
    await expect(modalMessage).toHaveText(expectedMessage);
    
    // Close modal for next test
    await page.click('.modal-btn.primary');
    await expect(modalOverlay).not.toBeVisible();
  };

  test('should show modal for empty fields', async ({ page }) => {
    console.log('🧪 Testing empty fields validation');
    
    // Try submitting with all fields empty
    await page.click('button[type="submit"]');
    await checkModalMessage(page, 'Please fill in all required fields');
    
    // Fill only email
    await page.fill('#email', 'test@example.com');
    await page.click('button[type="submit"]');
    await checkModalMessage(page, 'Please enter a password');
    
    // Fill only password
    await page.fill('#email', '');
    await page.fill('#password', 'TestPass123!');
    await page.click('button[type="submit"]');
    await checkModalMessage(page, 'Please enter your email');
    
    console.log('✅ Empty fields validation test passed');
  });

  test('should show modal for invalid email format', async ({ page }) => {
    console.log('🧪 Testing email format validation');
    
    // Test invalid email formats
    const invalidEmails = [
      'notanemail',
      'missing@domain',
      '@nodomain.com',
      'spaces @ domain.com'
    ];

    for (const email of invalidEmails) {
      await page.fill('#email', email);
      await page.fill('#password', 'ValidPass123!');
      await page.click('button[type="submit"]');
      await checkModalMessage(page, 'Please enter a valid email address');
    }
    
    console.log('✅ Email format validation test passed');
  });

  test('should show modal for password requirements', async ({ page }) => {
    console.log('🧪 Testing password requirements');
    
    const validEmail = 'test@example.com';
    const invalidPasswords = [
      { value: '12345', message: 'Password must be at least 8 characters long' },
      { value: 'nodigits', message: 'Password must contain at least one number' },
      { value: '12345678', message: 'Password must contain at least one letter' }
    ];

    for (const { value, message } of invalidPasswords) {
      await page.fill('#email', validEmail);
      await page.fill('#password', value);
      await page.click('button[type="submit"]');
      await checkModalMessage(page, message);
    }
    
    console.log('✅ Password requirements test passed');
  });

  test('should show modal for existing email', async ({ page }) => {
    console.log('🧪 Testing existing email validation');
    
    // Try signing up with admin email
    await page.fill('#email', 'admin@resolve.io');
    await page.fill('#password', 'ValidPass123!');
    await page.click('button[type="submit"]');
    await checkModalMessage(page, 'This email is already registered');
    
    console.log('✅ Existing email validation test passed');
  });

  test('modal can be closed', async ({ page }) => {
    console.log('🧪 Testing modal close functionality');

    // Show modal by submitting empty form
    await page.click('button[type="submit"]');
    const modalOverlay = page.locator('.modal-overlay.show');
    await expect(modalOverlay).toBeVisible();

    // Test closing with OK button
    await page.click('.modal-btn.primary');
    await expect(modalOverlay).not.toBeVisible();

    // Show modal again
    await page.click('button[type="submit"]');
    await expect(modalOverlay).toBeVisible();

    // Test closing by clicking outside
    await page.click('.modal-overlay', { position: { x: 10, y: 10 } });
    await expect(modalOverlay).not.toBeVisible();

    // Show modal again
    await page.click('button[type="submit"]');
    await expect(modalOverlay).toBeVisible();

    // Test closing with Escape key
    await page.keyboard.press('Escape');
    await expect(modalOverlay).not.toBeVisible();

    console.log('✅ Modal close functionality test passed');
  });
});