# Automated Testing

## Structure

```
tests/
├── specs/                 # All test specifications (clean separation)
│   └── *.spec.js         # 16 Playwright E2E tests
├── config/                # Test configurations
│   ├── docker-compose.test.yml
│   └── playwright.config.testcontainers.js
├── fixtures/              # Test data and sample files
│   ├── test-data/        # Sample documents
│   └── *.csv, *.log     # Test data files
├── test-results/         # Test execution results (gitignored)
├── playwright-report/    # HTML test reports (gitignored)
├── global-setup.js      # Playwright global setup
├── global-teardown.js   # Playwright global teardown
└── README.md            # This documentation
```

## Test Suites

### Core Features (E2E)
- `onboarding-journey.spec.js` - Complete user onboarding flow
- `dashboard.spec.js.disabled` - Dashboard functionality (currently disabled)

### Chat Features
- `chat-channels.spec.js` - Chat channel management
- `chat-history-ui-enhanced.spec.js` - Chat history UI and CRUD operations
- `chat-scrolling.spec.js` - Chat scrolling behavior
- `textarea-behavior.spec.js` - Chat textarea auto-resize and behavior
- `textarea-button-test.spec.js` - Send button interactions

### Mobile Experience
- `mobile-chat-test.spec.js` - Mobile chat interface
- `mobile-validation-simple.spec.js` - Mobile UI validation

### Knowledge & RAG
- `knowledge-api-e2e.spec.js` - Knowledge API integration
- `rag-embeddings.spec.js` - RAG embeddings functionality
- `rag-vectorization.spec.js` - Vector storage with pgvector
- `document-viewer.spec.js` - Document viewing functionality
- `csv-upload-resolve.spec.js` - CSV upload and processing

### Real-time Features
- `sse-callback-real.spec.js` - Server-sent events and callbacks
- `rita-loading-indicator.spec.js` - Loading states
- `rita-quick-test.spec.js` - Rita integration tests

## Running Tests

### Run All Tests
```bash
npm test
```

### Interactive UI Mode
```bash
npm run test:ui
```

### Headed Mode (See Browser)
```bash
npm run test:headed
```

### Debug Mode
```bash
npm run test:debug
```

### Run Specific Test
```bash
npx playwright test tests/specs/onboarding-journey.spec.js
```

### Run by Pattern
```bash
npm run test:specific "chat"  # Runs all chat-related tests
```

### View Test Report
```bash
npm run test:report
```

### Clean Test Artifacts
```bash
npm run test:clean
```

## Writing Tests

Create new test files with `.spec.js` extension in the `tests/specs/` directory:

```javascript
const { test, expect } = require('@playwright/test');

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/');
  });

  test('should perform expected behavior', async ({ page }) => {
    // Arrange
    await page.fill('input[name="email"]', 'test@example.com');
    
    // Act
    await page.click('button[type="submit"]');
    
    // Assert
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('.welcome')).toContainText('Welcome');
  });
});
```

## Best Practices

1. **One assertion per test** when possible
2. **Use data-testid attributes** for reliable selectors
3. **Avoid hardcoded waits** - use Playwright's auto-waiting
4. **Clean up test data** in afterEach or afterAll hooks
5. **Use Page Object Model** for complex pages
6. **Group related tests** with describe blocks
7. **Keep tests independent** - each test should run in isolation
8. **Use fixtures** for test data instead of hardcoding

## Configuration

- **Main Config:** `playwright.config.js` (project root)
- **Test Directory:** `./tests`
- **Output Directory:** `tests/test-results/`
- **Report Directory:** `tests/playwright-report/`
- **Base URL:** `http://localhost:5000`
- **Browsers:** Chromium, Firefox, WebKit
- **Parallel Execution:** Enabled (all tests run in parallel)

## CI/CD Integration

Tests run automatically in CI with:
- Retries: 2 on failure
- Workers: 1 (sequential in CI)
- Fail on test.only: Yes (prevents accidental exclusive tests)