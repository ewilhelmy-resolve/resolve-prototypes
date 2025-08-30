---
description: Run complete E2E test suite with validation workflow
argument-hint: 
allowed-tools: bash
model: claude-3-5-sonnet-20241022
---

# Run All E2E Tests

Execute the complete E2E test suite following the validation workflow from CLAUDE.md.

## IMPORTANT: Docker Application Requirements
This is a Docker-based application. The app MUST be running in Docker for tests to work.

## Validation Steps

### 1. Ensure Docker is Running
```bash
# Check if Docker daemon is running
docker version >/dev/null 2>&1 || (echo "❌ Docker is not running! Please start Docker first." && exit 1)
```

### 2. Build and Start Application
```bash
# Build and start the application
docker compose build --pull
docker compose up -d

# Wait for services to be healthy (max 30 seconds)
for i in {1..30}; do
  if docker compose ps | grep -q "(healthy)"; then
    echo "✅ Services are healthy"
    break
  fi
  echo "Waiting for services to be healthy... ($i/30)"
  sleep 1
done
```

### 3. Verify Services Health
```bash
docker compose ps
```
Ensure both `app` and `postgres` show `(healthy)` status.

### 4. Run Test Suite
```bash
npm test
```

### 3. Report Results

#### Success Criteria
- ALL 16 test specs must pass
- No timeouts or hanging tests
- Clean test execution

#### If ALL tests pass:
```
✅ ALL E2E TESTS PASSED
- Total: 16 test files
- Status: Ready for commit
```

#### If ANY test fails:
```
❌ E2E TESTS FAILED
- Failed: [list failed tests]
- DO NOT COMMIT
- Run 'npm run test:report' for details
```

## Test Coverage

**Critical Tests** (must always pass):
- onboarding-journey.spec.js
- chat-channels.spec.js  
- knowledge-api-e2e.spec.js
- rag-vectorization.spec.js

**Feature Tests**:
- Chat UI (5 tests)
- Mobile (2 tests)
- Documents (3 tests)
- Real-time (3 tests)

## Quick Actions

- View HTML report: `npm run test:report`
- Clean artifacts: `npm run test:clean`
- Run with UI: `npm run test:ui`