---
description: Generate a new Playwright E2E test for a specific feature
argument-hint: [feature-name]
allowed-tools: write, read
model: claude-3-5-sonnet-20241022
---

# Generate E2E Test

Create a new Playwright E2E test specification for the requested feature.

## Context
- Feature to test: $ARGUMENTS
- Test location: tests/specs/
- Test framework: Playwright

## Generation Process

1. **Understand the Feature**
   - Parse the feature name/description
   - Identify key user flows to test
   - Determine test assertions needed

2. **Generate Test File**
   Create `tests/specs/${feature-name}.spec.js` with:
   - Proper test structure
   - Setup and teardown
   - Multiple test cases covering:
     - Happy path
     - Edge cases
     - Error handling
   - Clear test descriptions

3. **Test Template Structure**

```javascript
const { test, expect } = require('@playwright/test');

test.describe('${Feature Name}', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to starting point
    await page.goto('http://localhost:5000');
    // Login if needed
  });

  test('should [main functionality]', async ({ page }) => {
    // Test implementation
  });

  test('should handle [edge case]', async ({ page }) => {
    // Edge case testing
  });

  test('should show error when [invalid action]', async ({ page }) => {
    // Error handling test
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

## Best Practices to Follow

1. Use descriptive test names
2. Keep tests independent
3. Use data-testid for reliable selectors
4. Avoid hardcoded waits
5. Clean up test data in afterEach
6. Test both success and failure paths

## Output

Generate a complete test file and save it to `tests/specs/[feature-name].spec.js`
Report: "✅ Generated test for [feature] at tests/specs/[feature-name].spec.js"