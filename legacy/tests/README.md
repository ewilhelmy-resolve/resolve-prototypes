# E2E Testing with Playwright

## ⚠️ IMPORTANT: Node 22 + WSL2 Compatibility Issue

**Playwright hangs on Node 22 in WSL2**. This is a known issue. Tests MUST be run using the Docker solution below.

## The ONE Testing Approach

**There is exactly ONE way to run tests**: Using Docker containers with isolated environments.

### DO NOT:
- Create new test runners
- Add alternative test approaches  
- Run tests directly with `npm test` on WSL2 with Node 22
- Create different configurations
- Use Jest or any other test framework

### DO:
- Use `npm test` to run all tests
- Each test spec gets its own isolated app + database container pair

## Running Tests

```bash
# The ONLY way to run tests (from project root)
npm test
```

This script:
1. Builds a Docker image with Node 20 (where Playwright works)
2. Installs all dependencies
3. Runs all test specs in isolated containers
4. Each spec gets its own PostgreSQL + app container
5. Tests run blazing fast in parallel

## How Isolation Works

When tests run:
1. **Global Setup** builds the test Docker image once
2. **Each test spec** gets:
   - Its own PostgreSQL container with pgvector
   - Its own app container on a random port
   - Complete isolation from other tests
   - Fresh database with admin user
3. **Automatic cleanup** after each spec completes

## Project Structure

```
tests/
├── run-tests.sh               # The ONE test runner script
├── specs/                     # ALL 20 test files (organized by feature)
│   ├── auth-*.spec.js        # Authentication tests (4)
│   ├── dashboard-*.spec.js   # Dashboard tests (2)
│   ├── knowledge-*.spec.js   # Knowledge tests (4)
│   ├── document-*.spec.js    # Document tests (3)
│   ├── chat-*.spec.js        # Chat tests (4)
│   ├── user-*.spec.js        # User tests (2)
│   └── mobile-*.spec.js      # Mobile tests (1)
├── fixtures/                  # Shared test utilities
│   └── base-test.js          # Common test helpers  
├── docker-compose.test.yml   # Container configuration
├── Dockerfile.test           # Test-specific Docker image
├── TEST_SPECS.md             # Test specification documentation
└── README.md                 # This file
```

## Writing Tests

### Use the Base Test Fixture

```javascript
const { test, expect, signInAsAdmin } = require('../fixtures/base-test');

test.describe('Feature Name', () => {
  // Tests with isolation
  test('should work in isolation', async ({ page, isolatedEnv }) => {
    // isolatedEnv provides the isolated container URLs
    await page.goto('/dashboard');
    // ... test logic
  });
});
```

### Available Helpers

From `fixtures/base-test.js`:
- `signInAsAdmin(page)` - Sign in as admin
- `createUser(page, userData)` - Create new user
- `sendChatMessage(page, message)` - Send chat
- `uploadDocument(page, filePath)` - Upload file

## Test Configuration

- **Config**: `playwright.config.test.js`
- **Timeout**: 20s per test
- **Workers**: 2 parallel max
- **Isolation**: Complete per spec

## Troubleshooting

### Playwright Hangs on Require
This is why we use Docker. The issue is Node 22 + WSL2 + Playwright incompatibility.

### Tests Won't Start
```bash
# Ensure Docker is running
docker ps

# Clean up old containers
docker ps -aq --filter "name=test-" | xargs -r docker rm -f
```

### View Logs
```bash
docker logs $(docker ps -aq --filter name=test-worker)
```

## The Golden Rule

**USE `npm test` ONLY** (which runs `tests/run-tests.sh`)

Do not:
- Run Playwright directly in WSL2 with Node 22
- Create new test approaches
- Add Jest or other frameworks
- Make "simple" alternatives

This is the ONLY way that works reliably.