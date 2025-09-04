# Testcontainers Infrastructure

This directory contains the foundational Testcontainers setup for running no-mocks integration tests with real PostgreSQL (pgvector) and Redis containers.

## Overview

The testcontainers infrastructure provides:

- **Real PostgreSQL container** with pgvector extension for vector operations
- **Real Redis container** for session management and caching
- **Complete data seeding** with realistic test data
- **Helper utilities** for database operations and testing
- **Automatic container lifecycle management**
- **Health checks and error handling**

## Architecture

```
tests/testcontainers/
├── base-container-setup.js    # Container initialization and lifecycle
├── data-seeding.js           # Database schema init and test data
├── test-helpers.js           # Database/Redis helpers and utilities
├── index.js                  # Main exports and TestEnvironment class
└── README.md                 # This documentation
```

## Quick Start

### Basic Usage

```javascript
const { TestEnvironment } = require('./tests/testcontainers');

describe('My Integration Tests', () => {
    let testEnv;

    beforeAll(async () => {
        testEnv = new TestEnvironment();
        await testEnv.initialize();
    });

    afterAll(async () => {
        await testEnv.cleanup();
    });

    beforeEach(async () => {
        // Reset to clean state between tests
        await testEnv.reset();
    });

    test('should work with real database', async () => {
        const user = await testEnv.helpers.findUserByEmail('admin@test.com');
        expect(user).toBeTruthy();
        expect(user.tier).toBe('admin');
    });
});
```

### Advanced Usage

```javascript
const { TestContainerSetup, DataSeeder, TestHelpers } = require('./tests/testcontainers');

describe('Custom Test Suite', () => {
    let containerSetup, seeder, helpers;

    beforeAll(async () => {
        // Manual setup for fine-grained control
        containerSetup = new TestContainerSetup();
        const containers = await containerSetup.initialize();
        
        helpers = new TestHelpers(containerSetup);
        seeder = new DataSeeder(containerSetup);
        
        await seeder.initializeSchema();
        await seeder.seedTestData();
    });

    afterAll(async () => {
        await helpers.closePersistentConnections();
        await containerSetup.cleanup();
    });
});
```

## Test Data

The seeder creates comprehensive test data including:

### Users
- `admin@test.com` - Admin tier user
- `premium@test.com` - Premium tier user  
- `free@test.com` - Free tier user
- `enterprise@test.com` - Enterprise tier user

All users have password in format `{tier}123` (e.g., `admin123`)

### Sessions
- Active sessions for all test users
- 24-hour expiration
- Stored in both PostgreSQL and Redis

### RAG Data
- Sample documents with vector embeddings
- Conversation history
- Tenant tokens for callback authentication

### Redis Cache
- Session data
- Rate limiting counters
- Application cache

## Container Configuration

### PostgreSQL
- **Image**: `pgvector/pgvector:pg16`
- **Database**: `test_resolve_db`
- **User**: `test_user`
- **Password**: `test_password`
- **Extensions**: pgvector for 1536-dimensional vectors

### Redis  
- **Image**: `redis:7.2-alpine`
- **Persistence**: AOF enabled
- **Health checks**: Built-in ping checks

## Helper Methods

### Database Helpers

```javascript
// User operations
const user = await helpers.findUserByEmail('admin@test.com');
const user = await helpers.findUserById(1);

// Session operations  
const session = await helpers.getSessionByToken('token123');

// RAG operations
const documents = await helpers.getRAGDocuments(tenantId);
const vectors = await helpers.getRAGVectors(documentId);

// Utility operations
const count = await helpers.countRecords('users', 'tier = $1', ['admin']);
await helpers.executeTransaction([
    { sql: 'INSERT INTO users...', params: [...] },
    { sql: 'INSERT INTO sessions...', params: [...] }
]);
```

### Redis Helpers

```javascript
// Session management
const sessionData = await helpers.getRedisSession('token123');
await helpers.setRedisSession('token123', userData, 3600);

// Rate limiting
const count = await helpers.getRateLimitCount('user@test.com');
await helpers.incrementRateLimit('user@test.com');

// Caching
const data = await helpers.getCachedData('key');
await helpers.setCachedData('key', data, 1800);
```

### Test Utilities

```javascript
// Wait for conditions
await helpers.waitForCondition(async () => {
    const count = await helpers.countRecords('users');
    return count > 0;
}, 5000);

// Wait for database records
const user = await helpers.waitForRecord('users', 'email = $1', ['new@test.com']);

// Generate test data
const email = helpers.generateTestEmail('mytest');
const token = helpers.generateTestToken('mytoken');
const vector = helpers.generateTestVector(1536);
```

## Environment Variables

The containers automatically configure these environment variables for your application:

```bash
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=<dynamic-port>
POSTGRES_DB=test_resolve_db
POSTGRES_USER=test_user
POSTGRES_PASSWORD=test_password
DATABASE_URL=postgresql://test_user:test_password@localhost:<port>/test_resolve_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=<dynamic-port>  
REDIS_URL=redis://localhost:<port>

# Test environment
NODE_ENV=test
PORT=0
SESSION_SECRET=test-session-secret-key-for-testing-only
```

## Health Checks

```javascript
// Check container health
const health = await testEnv.healthCheck();
console.log(health);
// {
//   healthy: true,
//   postgres: true,
//   redis: true,
//   timestamp: '2024-01-01T12:00:00.000Z'
// }

// Get resource usage
const usage = await testEnv.getResourceUsage();
console.log(usage);
// {
//   database: { size: '1234 kB', tables: [...] },
//   redis: { memory_usage: 1024 },
//   timestamp: '2024-01-01T12:00:00.000Z'
// }
```

## Error Handling

The infrastructure includes comprehensive error handling:

- **Container startup failures** - Automatic cleanup and clear error messages
- **Health check timeouts** - Configurable retry logic with exponential backoff
- **Connection failures** - Automatic reconnection and connection pooling
- **Data seeding errors** - Transaction rollback and state recovery

## Performance Considerations

- **Parallel container startup** - PostgreSQL and Redis start simultaneously
- **Connection reuse** - Persistent connections available for multi-query tests
- **Efficient cleanup** - Truncate tables instead of dropping/recreating
- **Smart health checks** - Early exit when services are ready
- **Resource monitoring** - Built-in resource usage tracking

## Best Practices

1. **Use TestEnvironment class** for most test suites - it provides the simplest interface
2. **Reset between tests** using `testEnv.reset()` to ensure clean state
3. **Use persistent connections** for tests with many database operations
4. **Close connections** in test cleanup to prevent resource leaks
5. **Monitor resource usage** in long-running test suites
6. **Use isolated test users** for tests that modify user data

## Troubleshooting

### Common Issues

1. **Container startup timeout**
   - Check Docker daemon is running
   - Increase timeout values in container configuration
   - Check system resources (memory, CPU)

2. **pgvector extension missing**
   - Verify using `pgvector/pgvector:pg16` image
   - Check container logs for extension installation errors

3. **Connection refused errors**
   - Wait for health checks to pass before running tests
   - Use `testEnv.healthCheck()` to verify container state

4. **Memory issues with long test suites**
   - Monitor resource usage with `testEnv.getResourceUsage()`
   - Reset test environment periodically
   - Close persistent connections between test suites

### Debug Logging

Enable debug logging:

```bash
DEBUG=testcontainers* npm test
```

## Integration with Existing Tests

This infrastructure is designed to be used alongside existing Playwright tests and can be integrated into the current test suite structure.