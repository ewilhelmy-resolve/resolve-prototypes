# Test Specifications

This directory contains end-to-end test specifications using Playwright.

## Test Files

- `document-upload.spec.js`: Validates document upload functionality including:
  - Upload button behavior
  - Document processing flow
  - Recent uploads display
  - Webhook integration
  
- `document-viewer.spec.js`: Tests document viewing functionality
  - Modal display and interactions
  - Document content rendering
  - API integration

- `knowledge-api-e2e.spec.js`: Tests complete knowledge API flow
  - Document ingestion
  - Vector processing
  - Search capabilities
  - Tenant isolation

## Running Tests

Run all tests:
```bash
npm test
```

Run specific test:
```bash
npx playwright test tests/specs/document-upload.spec.js
```

Run in UI mode:
```bash
npm run test:ui
```