---
description: Run complete E2E test suite with validation workflow
argument-hint: 
allowed-tools: bash
model: claude-3-5-sonnet-20241022
---

# Run All E2E Tests

Execute the complete E2E test suite following the validation workflow from CLAUDE.md.

## Validation Steps

### 1. Pre-flight Check
```bash
docker compose ps
```
Ensure app and postgres show `(healthy)` status.

### 2. Run Test Suite
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