# Test Isolation Guide

## ⚠️ CRITICAL: Tests MUST NOT Use Production Database

The current test setup is **BROKEN** - tests are hitting the live system at port 5000 with the production database. This is dangerous and wrong.

## Current Problem

- Tests use `localhost:5000` which is the LIVE application
- Tests use `admin@resolve.io` which is the PRODUCTION admin
- Tests modify the REAL database
- No isolation between test runs

## Required Solution

Tests MUST run in isolated containers with:
1. Separate test database (not the production one)
2. Test-specific admin user (not production admin)
3. Fresh data for each test run
4. No connection to port 5000 on the host

## Implementation Status

### ✅ Created Files
- `docker-compose.test.yml` - Defines isolated test containers
- `Dockerfile.test` - Test-specific container build
- `run-tests.sh` - Proper isolation runner

### ✅ Fixed Credentials
- Test admin: `admin@test.com` (not `admin@resolve.io`)
- Test password: `admin123`
- Test database: `test_resolve_db` (not `resolve_db`)

## How to Run Tests Properly

```bash
# DO NOT RUN:
npm test  # This hits production!

# INSTEAD RUN:
./tests/run-tests.sh  # This uses isolated containers
```

## Verification

To verify tests are isolated:
1. Stop the production app: `docker compose down`
2. Run tests: `./tests/run-tests.sh`
3. Tests should still pass (proving they're not using production)

## TODO

1. Remove the old broken test approach
2. Update package.json to use the isolated runner
3. Add CI/CD checks to prevent tests hitting production
4. Add environment variable checks to fail tests if they detect production DB

## Key Files to Review

- `/tests/fixtures/simple-base.js` - Must use `admin@test.com`
- `/tests/playwright.config.js` - Must document isolation
- `/tests/run-tests.sh` - Must create isolated containers

## WARNING

**NEVER** run tests that:
- Connect to `localhost:5000` on the host
- Use `admin@resolve.io` credentials
- Connect to `resolve_db` database
- Share containers with production

Tests MUST be completely isolated!