---
description: Run complete E2E test suite with Docker isolation
argument-hint: 
allowed-tools: bash
model: claude-3-5-sonnet-20241022
---

# Run All E2E Tests

## ⚠️ CRITICAL: Node 22 + WSL2 Issue

**Playwright hangs on Node 22 in WSL2**. Tests MUST be run using the Docker solution.

## The ONE Way to Run Tests

```bash
# From project root:
npm test

# OR from tests directory:
cd tests && ./run-tests.sh
```

## What This Does

1. **Builds test runner image** with Node 20 (where Playwright works)
2. **Runs each test spec** in its own isolated environment:
   - Separate PostgreSQL container with pgvector
   - Separate app container on random port
   - Complete isolation between tests
3. **Runs tests in parallel** for blazing fast execution
4. **Cleans up automatically** after completion

## DO NOT

- Run `npm test` directly on WSL2 with Node 22 (it will hang)
- Create alternative test runners
- Add new test approaches
- Use different configurations
- Try to "fix" or work around this in other ways

## Expected Output

### Success:
```
🚀 Running tests in Docker to avoid Playwright/WSL issues...
Building test runner image...
Running test: dashboard...
  ✅ dashboard passed
Running test: onboarding-journey...
  ✅ onboarding-journey passed
[... all tests ...]
✅ All tests complete!
```

### Failure:
```
❌ Test failed: [test-name]
Check logs with: docker logs test-[test-name]-[id]
```

## Test Coverage

**Total**: ~20 test spec files

**Critical Tests**:
- onboarding-journey.spec.js
- dashboard.spec.js
- knowledge-management.spec.js
- user-management.spec.js

**Feature Tests**:
- Chat functionality
- Document upload/viewer
- Mobile validation
- SSE real-time updates

## Troubleshooting

### Docker Not Running
```bash
# Start Docker daemon
sudo service docker start  # WSL2
```

### Clean Up Stuck Containers
```bash
docker ps -aq --filter "name=test-" | xargs -r docker rm -f
```

### View Test Logs
```bash
docker logs $(docker ps -aq --filter name=test-worker)
```

## The Golden Rule

**There is exactly ONE way to run tests: `npm test` (or `cd tests && ./run-tests.sh`)**

This is not optional. The Playwright module literally hangs on `require()` with Node 22 in WSL2. The Docker solution bypasses this completely by using Node 20 in containers.