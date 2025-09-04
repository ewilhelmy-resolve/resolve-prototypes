# No-Mocks Test Suite

This directory contains integration tests that use **zero mocks** and test against real infrastructure using Testcontainers.

## Philosophy

Instead of mocking database connections, Redis sessions, or other external dependencies, these tests:

- **Start real PostgreSQL containers** with pgvector extension
- **Start real Redis containers** for session management  
- **Test against actual Express server** running in test mode
- **Verify data persistence** in actual databases
- **Test real HTTP requests** using supertest

## Test Coverage

### Authentication Flow (`auth.test.js`)

#### 1. User Registration (Signup Flow)
- ✅ Valid registration with all tiers (free, standard, premium, enterprise, admin)
- ✅ Password hashing verification in real database (bcrypt)
- ✅ Session creation in Redis with proper expiration
- ✅ Duplicate email prevention
- ✅ Password strength validation
- ✅ Email format validation
- ✅ Input sanitization (XSS prevention)
- ✅ Legacy field compatibility (name/fullName, company/companyName)

#### 2. User Login (Signin Flow)
- ✅ Successful login with correct credentials
- ✅ Failed login with wrong password
- ✅ Failed login with non-existent user
- ✅ Session management in Redis
- ✅ Cookie generation with proper security flags
- ✅ Input validation and format checking

#### 3. Session Management
- ✅ Session persistence across requests
- ✅ Session expiration handling
- ✅ Concurrent session handling for same user
- ✅ Logout and session cleanup
- ✅ Sliding expiration (session extension on activity)
- ✅ Redis-based session storage with fallback

#### 4. Password Security
- ✅ Password reset token generation
- ✅ Password reset with valid token
- ✅ Token expiration handling
- ✅ Invalid token rejection
- ✅ Password strength enforcement on reset
- ✅ Old session cleanup after password reset

#### 5. Rate Limiting & Security
- ✅ Rate limiting on registration endpoint
- ✅ Rate limiting on login endpoint  
- ✅ Account lockout after failed attempts
- ✅ SQL injection prevention
- ✅ Input validation and sanitization

#### 6. Database Integration
- ✅ Transaction handling during user creation
- ✅ Concurrent user registration handling
- ✅ Referential integrity maintenance
- ✅ UUID generation for tenant_id
- ✅ Proper timestamp handling

#### 7. Redis Session Store Integration
- ✅ Session data consistency between Redis and application
- ✅ Redis key expiration handling
- ✅ Graceful fallback when Redis unavailable
- ✅ Session data structure validation

## Running the Tests

### Prerequisites

- Docker (for Testcontainers)
- Node.js 16+ 
- npm/yarn

### Install Dependencies

```bash
npm install
```

### Run Auth Tests

```bash
# Run just the auth tests
npm run test:auth

# Run all no-mocks tests
npm run test:no-mocks

# Run with the custom runner script
node tests/no-mocks/run-auth-tests.js
```

### Environment Variables

The tests automatically set up isolated test environments with:

- **PostgreSQL**: `pgvector/pgvector:pg16` container
- **Redis**: `redis:7.2-alpine` container  
- **Test Database**: `test_resolve_db`
- **Test User**: `test_user` / `test_password`

## Test Architecture

```
┌─────────────────────────────────────────────────┐
│                  Auth Test Suite                │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│              TestEnvironment                    │
│  ┌─────────────────┬────────────────────────────┤
│  │   PostgreSQL    │         Redis              │
│  │   Container     │       Container            │
│  │                 │                            │
│  │ • pgvector      │ • Session storage          │
│  │ • Real DB       │ • Rate limiting            │
│  │ • Transactions  │ • Cache                    │
│  └─────────────────┴────────────────────────────┤
└─────────────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│              Express App                        │
│                                                 │
│  • Real Auth Routes                             │
│  • Real Middleware                              │  
│  • Real Services                                │
│  • No Mocks                                     │
└─────────────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│              Supertest                          │
│                                                 │
│  • Real HTTP Requests                           │
│  • Cookie Handling                              │
│  • Response Validation                          │
└─────────────────────────────────────────────────┘
```

## Configuration

### Jest Configuration

The tests use a custom Jest config (`jest.config.js`) with:

- **120 second timeout** for container startup
- **Serial execution** (`maxWorkers: 1`) to avoid container conflicts
- **Open handle detection** for proper cleanup
- **Force exit** to ensure clean shutdown

### Container Management

Each test suite:

1. **Starts fresh containers** before all tests
2. **Clears data** before each test
3. **Maintains isolation** between tests
4. **Cleans up resources** after completion

## Debugging

### Container Logs

```bash
# View container startup
docker logs <container_id>

# Monitor Redis commands
docker exec <redis_container> redis-cli monitor

# Connect to test database
docker exec -it <postgres_container> psql -U test_user -d test_resolve_db
```

### Test Debugging

```bash
# Run with verbose Jest output
npm run test:auth -- --verbose

# Debug specific test
npm run test:auth -- --testNamePattern="should successfully register"

# Run with Node debugger
node --inspect-brk node_modules/.bin/jest tests/no-mocks/auth.test.js
```

### Common Issues

1. **Container Startup Timeout**
   - Increase Jest timeout in config
   - Check Docker resources

2. **Port Conflicts**
   - Tests use random ports via Testcontainers
   - Check for conflicting services

3. **Redis Connection Errors**
   - Verify Redis container health
   - Check network configuration

4. **Database Migration Errors**
   - Verify init SQL script exists
   - Check PostgreSQL extensions

## Adding New Tests

### Structure

```javascript
describe('New Feature Tests', () => {
  let testEnv;
  let helpers;

  beforeAll(async () => {
    testEnv = new TestEnvironment();
    const result = await testEnv.initialize();
    helpers = testEnv.helpers;
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    // Clear data for isolation
    await helpers.executeQuery('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
    await helpers.clearRedisData();
  });

  test('should test new feature', async () => {
    // Test implementation
  });
});
```

### Best Practices

1. **Use real data flow** - no mocks, test full stack
2. **Verify persistence** - check data in database/Redis  
3. **Test edge cases** - invalid inputs, race conditions
4. **Clean up properly** - ensure test isolation
5. **Use descriptive names** - clear test intentions
6. **Assert thoroughly** - verify all expected changes

## Performance Considerations

- **Container startup**: ~10-15 seconds per test suite
- **Test execution**: ~30-60 seconds for full auth suite
- **Memory usage**: ~512MB peak with containers
- **Cleanup time**: ~5 seconds per test suite

## CI/CD Integration

The tests are designed to run in CI environments:

- **Docker-in-Docker** support via Testcontainers
- **Deterministic** test execution
- **Proper resource cleanup**
- **JUnit XML** output for reporting

```bash
# Example CI command
docker run --privileged -v /var/run/docker.sock:/var/run/docker.sock \
  node:18 npm run test:no-mocks
```

## Troubleshooting

### Test Failures

1. Check container health with `docker ps`
2. Verify database schema with test helpers
3. Check Redis connectivity with `PING` command
4. Review Jest configuration for timeouts
5. Examine error logs for specific failure details

### Performance Issues

1. Increase Jest timeout for slower environments
2. Reduce test parallelization (`maxWorkers: 1`)
3. Monitor Docker resource usage
4. Consider test data size and complexity

The no-mocks approach provides confidence that the authentication system works correctly in a real environment, catching integration issues that unit tests with mocks might miss.