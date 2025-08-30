---
description: Generate a new Playwright E2E test for a specific feature
argument-hint: [feature-name]
allowed-tools: write, read
model: claude-3-5-sonnet-20241022
---

# Generate E2E Test

Create a new Playwright E2E test specification for the requested feature.

## IMPORTANT: Docker Application Requirements
This is a Docker-based application. All tests require:
1. Docker daemon running
2. Application containers running (app and postgres)
3. Services healthy before tests can execute

## Context
- Feature to test: $ARGUMENTS
- Test location: tests/specs/
- Test framework: Playwright
- Base test fixture: tests/fixtures/base-test.js
- Application URL: http://localhost:5000 (Docker container)
- Database: PostgreSQL (Docker container)

## Generation Process

1. **Understand the Feature**
   - Parse the feature name/description
   - Identify key user flows to test
    - Check for existing test helpers, fixtures, and utilities that already cover the flow
   - Determine test assertions needed
   - Decide if authentication is required

2. **Choose the Right Pattern**
   
   **For tests requiring admin authentication:**
   ```javascript
   const { test, expect } = require('../fixtures/base-test');
   
   test('test name', async ({ authenticatedPage: page }) => {
     // Already signed in as admin@resolve.io
   });
   ```
   
   **For tests with custom user creation:**
   ```javascript
   const { test, expect, createUser } = require('../fixtures/base-test');
   
   test('test name', async ({ page, testUser }) => {
     const user = await createUser(page, testUser);
     // User is created and signed in
   });
   ```
   
   **For tests without authentication:**
   ```javascript
   const { test, expect } = require('../fixtures/base-test');
   
   test('test name', async ({ page }) => {
     await page.goto('http://localhost:5000');
     // No authentication needed
   });
   ```

3. **Use Base Test Utilities**
   
  Available helper functions from base-test.js (and other shared fixtures):
   - `signInAsAdmin(page)` - Sign in as admin@resolve.io
   - `signIn(page, credentials)` - Sign in with custom credentials
   - `createUser(page, userData)` - Create and sign in new user
   - `getTenantId(page)` - Get current user's tenant ID
   - `waitForElement(page, selector, options)` - Wait for element
   - `sendChatMessage(page, message)` - Send chat message
   - `uploadDocument(page, filePath)` - Upload a document
   - `navigateToDashboardSection(page, section)` - Navigate to dashboard section

  Reuse guidance:
  - Always prefer these existing helpers and fixtures over writing new utility code.
  - If a needed helper is missing, extend the existing fixture (for example, add a utility to `tests/fixtures/base-test.js`) instead of creating a separate helper module.
  - When extending shared helpers, keep changes small, well-documented, and covered by unit or integration tests where practical.
  - Avoid duplicating logic across specs; call the shared helper from multiple tests instead.

4. **Test Template Structure**

```javascript
const { test, expect, sendChatMessage, getTenantId } = require('../fixtures/base-test');

test.describe('${Feature Name}', () => {
  // Use authenticatedPage fixture for tests needing admin access
  test('should [main functionality]', async ({ authenticatedPage: page }) => {
    console.log('🧪 Testing ${feature} main functionality');
    
    // Test implementation using helper functions
    await sendChatMessage(page, 'Test message');
    
    // Get tenant ID if needed for API calls
    const tenantId = await getTenantId(page);
    
    // Make assertions
    const element = await page.locator('.selector');
    await expect(element).toBeVisible();
    
    console.log('✅ Main functionality test passed');
  });

  // Use testUser fixture for tests needing fresh user
  test('should handle [user flow]', async ({ page, testUser }) => {
    console.log('🧪 Testing ${feature} user flow');
    
    // Create new user with provided test data
    const user = await createUser(page, testUser);
    
    // Test with fresh user context
    // user.sessionToken available if needed
    
    console.log('✅ User flow test passed');
  });
  
  test('should handle [edge case]', async ({ authenticatedPage: page }) => {
    console.log('🧪 Testing ${feature} edge case');
    
    // Edge case testing
    
    console.log('✅ Edge case handled correctly');
  });

  test('should show error when [invalid action]', async ({ authenticatedPage: page }) => {
    console.log('🧪 Testing ${feature} error handling');
    
    // Error handling test
    
    console.log('✅ Error handling works correctly');
  });
});
```

## Test Categories to Consider

- **User flows**: Complete end-to-end journeys
- **Form validation**: Input validation and error messages
- **API integration**: Backend communication
- **UI interactions**: Clicks, typing, navigation
- **Mobile responsiveness**: Different viewports
- **Error states**: Error handling and recovery
- **SSE/Real-time**: Server-sent events and real-time updates
- **Knowledge base**: Document upload and management
- **Chat functionality**: Message sending and history

## Best Practices to Follow

1. **Use the base test fixture** - Don't duplicate authentication logic
2. **Choose appropriate fixture** - authenticatedPage for admin, testUser for new users
3. **Use helper functions** - Leverage utilities from base-test.js
4. **Console logging** - Add clear progress indicators with emojis
5. **Descriptive test names** - Be specific about what's being tested
6. **Keep tests independent** - Each test should be self-contained
7. **Avoid hardcoded waits** - Use waitForSelector, waitForLoadState instead
8. **Test both success and failure** - Cover happy path and error cases
9. **Clean assertions** - Use Playwright's built-in expect matchers
10. **Handle async properly** - Always await async operations
11. **Prefer reuse over new helpers** - Reuse, extend, or update existing fixtures and utilities rather than creating new helper files. Create new helpers only when a clear, justified gap exists and document why a new helper was required.

## Common Patterns

### Testing with API calls
```javascript
test('should interact with API', async ({ authenticatedPage: page }) => {
  const tenantId = await getTenantId(page);
  
  const response = await page.evaluate(async (tid) => {
    const res = await fetch(\`/api/tenant/\${tid}/endpoint\`, {
      credentials: 'include'
    });
    return res.json();
  }, tenantId);
  
  expect(response.status).toBe('success');
});
```

### Testing real-time features
```javascript
test('should handle SSE updates', async ({ authenticatedPage: page }) => {
  // Set up SSE listener
  await page.evaluate(() => {
    window.sseMessages = [];
    const sse = new EventSource('/api/stream');
    sse.onmessage = (e) => window.sseMessages.push(JSON.parse(e.data));
  });
  
  // Trigger action that causes SSE update
  await sendChatMessage(page, 'Test');
  
  // Wait and check for SSE message
  await page.waitForTimeout(2000);
  const messages = await page.evaluate(() => window.sseMessages);
  expect(messages.length).toBeGreaterThan(0);
});
```

### Testing file uploads
```javascript
test('should upload document', async ({ authenticatedPage: page }) => {
  const testFile = 'tests/fixtures/test-data/test-doc.txt';
  await uploadDocument(page, testFile);
  
  // Verify upload success
  const successMessage = page.locator('.upload-success');
  await expect(successMessage).toBeVisible();
});
```

## Output

Generate a complete test file and save it to `tests/specs/[feature-name].spec.js`
Report: "✅ Generated test for [feature] at tests/specs/[feature-name].spec.js"

## Important Notes

### Docker Requirements
- **Application must be running in Docker** for tests to work
- Run `docker compose ps` to verify services are healthy before testing
- If tests fail with connection errors, check Docker status first
- Port 5000 must be exposed from Docker container

### Test Configuration
- All tests should use the base test fixture from `tests/fixtures/base-test.js`
- Admin credentials are: admin@resolve.io / admin123
- Base URL is: http://localhost:5000 (Docker container, not host)
- Don't duplicate login logic - use authenticatedPage fixture
- For new user tests, use the testUser fixture
- Always include console.log statements for test progress visibility

### Pre-Test Checklist
Before running generated tests:
1. `docker compose ps` - Verify services are running
2. `docker compose logs app --tail=10` - Check for startup errors
3. `curl http://localhost:5000/health` - Verify app is accessible
4. `npm test -- --grep "new-test-name"` - Run specific test