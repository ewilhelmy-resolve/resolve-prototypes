# Test Specifications

## Total: 20 Test Specs

### Authentication (4 tests)
- `auth-admin-login.spec.js` - Admin login functionality
- `auth-login-basic.spec.js` - Basic user login
- `auth-login-keyboard.spec.js` - Login keyboard navigation (Enter key)
- `auth-signup.spec.js` - User signup validation

### Dashboard (2 tests)
- `dashboard-main.spec.js` - Main dashboard functionality
- `dashboard-isolated.spec.js` - Isolated dashboard testing

### Knowledge Management (4 tests)
- `knowledge-access.spec.js` - Knowledge base access control
- `knowledge-api.spec.js` - Knowledge API endpoints
- `knowledge-management.spec.js` - Knowledge management features
- `knowledge-navigation.spec.js` - Knowledge page navigation

### Document Processing (3 tests)
- `document-upload.spec.js` - Document upload functionality
- `document-viewer.spec.js` - Document viewer component
- `document-rag-vectors.spec.js` - RAG vectorization process

### Chat & Real-time (4 tests)
- `chat-channels.spec.js` - Chat channel functionality
- `chat-history.spec.js` - Chat history UI
- `chat-rita-loading.spec.js` - Rita loading indicator
- `chat-sse-realtime.spec.js` - Server-sent events real-time updates

### User Management (2 tests)
- `user-management.spec.js` - Comprehensive user management (12 suites, 30+ tests)
  - Access control & authorization
  - User CRUD operations
  - Search, filtering, sorting
  - Bulk actions
  - Password reset
  - Error handling
- `user-onboarding.spec.js` - User onboarding journey

### Mobile (1 test)
- `mobile-responsive.spec.js` - Mobile responsive validation

## Naming Convention

All test files follow the pattern: `{feature}-{specific-function}.spec.js`

- Feature prefix groups related tests (auth, dashboard, knowledge, etc.)
- Specific function describes what is being tested
- No redundant suffixes like "-test" or "-simple"
- Consistent kebab-case naming