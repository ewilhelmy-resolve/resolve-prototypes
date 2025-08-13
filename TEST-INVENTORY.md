# Playwright E2E Test Inventory

All tests are configured to run against Docker container at `http://localhost:8082`

## User Journey Tests

### 1. **user-navigates-onboarding.spec.js**
- Should load the homepage
- Should have working navigation

### 2. **user-completes-payment-flow.spec.js**
- Complete user payment flow journey

### 3. **user-launches-jarvis-chat-embedded.spec.js**
- User completes onboarding and sees Jarvis chat embedded without leaving the page
- User cannot navigate away from page when Jarvis is loaded

### 4. **complete-e2e-journey.spec.js**
- Full journey: Login → Upload CSV → Verify Progress → Auto-close
- Quick validation: Upload without freeze

### 5. **new-customer-configure-later.spec.js**
- Complete onboarding with Configure Later for both options
- Quick verification of Configure Later flow
- Batch customer creation with Configure Later

## Feature-Specific Tests

### 6. **csv-upload.spec.js**
- Upload sample tickets CSV file
- Test CSV upload via API

### 7. **csv-upload-e2e.spec.js**
- Complete CSV upload journey through UI clicks
- Verify upload persists after page refresh

### 8. **jarvis-display.spec.js**
- Jarvis display functionality tests

### 9. **onboarding.spec.js**
- Should load the homepage
- Should have working navigation

## Integration Tests

### 10. **jira-integration-simple.spec.js**
- Basic flow check
- Health check

### 11. **jira-integration-automation.spec.js**
- Complete Jira integration flow with automation validation
- Handle automation timeout gracefully
- Verify SSE connection cleanup on navigation
- Verify Docker container is running
- Verify automation webhook configuration

### 12. **jira-integration-validation.spec.js**
- Complete validation flow with mock callback
- Test automation timeout handling

## Admin Portal Tests

### 13. **admin-portal-link.spec.js**
- Admin user (john@resolve.io) can see admin portal link
- Regular user (alice@company1.com) cannot see admin portal link
- Admin portal link navigates to correct page

### 14. **admin-access-from-jarvis.spec.js**
- Admin user can see and access admin portal from Jarvis application
- Non-admin user cannot see admin portal link in Jarvis
- Admin portal link styling and security verification

## Deleted Tests (Cleanup/Debug versions)
- csv-upload-fixed.spec.js
- debug-login.spec.js
- final-login.spec.js
- real-login.spec.js
- simple-login.spec.js

These were testing/debug variations that are no longer needed.

## Running Tests

```bash
# Run all tests against Docker container
npm test

# Run specific test suite
npx playwright test tests/complete-e2e-journey.spec.js

# Run with UI mode for debugging
npx playwright test --ui

# Run specific test
npx playwright test -g "Full journey"
```

## Prerequisites
1. Docker containers must be running:
   ```bash
   docker-compose up -d
   ```

2. Application should be healthy at http://localhost:8082

3. Database should be initialized with proper schema

## Test Coverage
- ✅ User registration and login
- ✅ CSV file upload
- ✅ Knowledge source configuration
- ✅ ITSM configuration
- ✅ Jira integration with automation engine
- ✅ Admin portal access control
- ✅ Jarvis AI assistant integration
- ✅ Configure Later options
- ✅ SSE real-time updates
- ✅ Payment flow
- ✅ Complete onboarding journey