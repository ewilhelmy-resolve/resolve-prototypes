# Testing Guide for Resolve Onboarding

## Overview
This application includes comprehensive E2E testing for the CSV upload functionality and user journey.

## Quick Start

### Local Testing
```bash
# Start the backend server
npm start

# Run all tests
npm test

# Run specific test
npx playwright test tests/csv-upload-e2e.spec.js
```

### Docker Testing
```bash
# Start all services
./docker-test.sh start

# Run tests in Docker
./docker-test.sh test

# View logs
./docker-test.sh logs

# Stop services
./docker-test.sh stop
```

## Test Credentials
- **Email**: john@resolve.io
- **Password**: !Password1

## Test Files

### E2E Tests
- `tests/csv-upload-e2e.spec.js` - Complete CSV upload journey through UI
- `tests/final-login.spec.js` - Login flow test
- `tests/user-navigates-onboarding.spec.js` - Onboarding navigation test

### Test Data
- `sample-tickets.csv` - Sample IT ticket data for upload testing

## Docker Setup

### Services
1. **Frontend** (port 8081) - Nginx serving static files
2. **Backend** (port 8082) - Node.js API server
3. **Test Runner** - Playwright test container

### Docker Commands
```bash
# Build images
docker-compose -f docker-compose.full.yml build

# Start services
docker-compose -f docker-compose.full.yml up -d frontend backend

# Run tests
docker-compose -f docker-compose.full.yml --profile test run test-runner

# View logs
docker-compose -f docker-compose.full.yml logs -f

# Stop and clean
docker-compose -f docker-compose.full.yml down -v
```

## CSV Upload Test Flow

1. Navigate to homepage (http://localhost:8082)
2. Click "Log in here" link
3. Enter credentials (john@resolve.io / !Password1)
4. Submit login form
5. Wait for redirect to Jarvis dashboard
6. Click "Upload Ticket CSV" button
7. Select sample-tickets.csv file
8. Wait for upload progress modal
9. Verify data appears in dashboard

## Test Results

- **HTML Report**: `playwright-report/index.html`
- **Screenshots**: `tests/screenshots/`
- **Test Results**: `test-results/`

## CI/CD

GitHub Actions workflow (`.github/workflows/test.yml`) runs:
- Local E2E tests on every push
- Docker-based tests for production environment
- Uploads test artifacts for review

## Troubleshooting

### Port Already in Use
```bash
# Kill existing processes
pkill -f node
docker-compose down

# Restart services
./docker-test.sh start
```

### Tests Timing Out
- Increase timeout in playwright.config.js
- Check if services are running: `curl http://localhost:8082/health`
- Review logs: `./docker-test.sh logs`

### Database Issues
```bash
# Reset database
rm resolve-onboarding.db
node init-admin.js
```

## Development Tips

1. Run tests in headed mode for debugging:
   ```bash
   npx playwright test --headed
   ```

2. Generate new test:
   ```bash
   npx playwright codegen http://localhost:8082
   ```

3. Update screenshots:
   ```bash
   npx playwright test --update-snapshots
   ```