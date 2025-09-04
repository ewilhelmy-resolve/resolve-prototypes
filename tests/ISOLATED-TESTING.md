# Isolated Testing Architecture

## Overview

This testing architecture ensures **complete isolation** between:
1. **Development instance** (port 5000, connected to Supabase)
2. **Each test spec** (gets its own app + PostgreSQL container pair)
3. **Parallel test execution** (tests don't interfere with each other)

## Key Principles

### 🎯 Complete Isolation
- **Dev instance on port 5000**: Remains connected to Supabase, completely untouched by tests
- **Each test spec file**: Gets its own dedicated app container + PostgreSQL container
- **No shared state**: Tests cannot affect each other or the dev environment
- **Safe destructive testing**: Can safely test DELETE operations, data modifications, etc.

### 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Development Environment                   │
├─────────────────────────────────────────────────────────────┤
│  Docker Compose (port 5000)  ←→  Supabase (Production DB)   │
│  ✅ Untouched by tests                                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Test Environment                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────┐                        │
│  │   dashboard-isolated.spec.js     │                        │
│  ├─────────────────────────────────┤                        │
│  │ App Container (port: random)     │                        │
│  │ PostgreSQL Container             │                        │
│  │ Isolated Network                 │                        │
│  │ Unique ID: abc123                │                        │
│  └─────────────────────────────────┘                        │
│                                                               │
│  ┌─────────────────────────────────┐                        │
│  │   onboarding.spec.js             │                        │
│  ├─────────────────────────────────┤                        │
│  │ App Container (port: random)     │                        │
│  │ PostgreSQL Container             │                        │
│  │ Isolated Network                 │                        │
│  │ Unique ID: def456                │                        │
│  └─────────────────────────────────┘                        │
│                                                               │
│  (Each spec file runs in complete isolation)                 │
└─────────────────────────────────────────────────────────────┘
```

## Usage

### Running Isolated Tests

```bash
# Run all tests in isolated environments
npx playwright test --config=playwright.config.isolated.js

# Run specific test in isolation
npx playwright test tests/specs/dashboard-isolated.spec.js --config=playwright.config.isolated.js

# Run with specific browser
npx playwright test --project=chromium --config=playwright.config.isolated.js
```

### Converting Existing Tests to Isolated

1. Import the `IsolatedTestEnvironment`:
```javascript
const IsolatedTestEnvironment = require('../isolated-test-setup');
```

2. Set up isolation in `beforeAll`:
```javascript
let testEnv;
let config;

test.beforeAll(async () => {
  testEnv = new IsolatedTestEnvironment('your-spec-name');
  config = await testEnv.setup();
});

test.afterAll(async () => {
  if (testEnv) {
    await testEnv.teardown();
  }
});
```

3. Use `config.appUrl` instead of hardcoded URLs:
```javascript
// Before (uses shared test containers):
await page.goto('http://localhost:5000');

// After (uses isolated container):
await page.goto(config.appUrl);
```

## Benefits

### ✅ True Isolation
- Each test spec has its own database - no data pollution
- Tests can run in parallel without conflicts
- Dev environment remains pristine

### ✅ Realistic Testing
- Each test gets a real PostgreSQL with pgvector
- Real application container with full functionality
- Actual network communication between containers

### ✅ Safe Destructive Testing
- Can test DELETE operations without fear
- Can modify system settings without affecting others
- Can test edge cases that would break shared environments

### ✅ Debugging
- Each test environment has a unique ID for tracking
- Container logs are isolated per test
- Failed test containers can be inspected independently

## Performance Considerations

### Resource Usage
- Each test spec spawns 2 containers (app + PostgreSQL)
- Running 10 test specs = 20 containers
- Adjust `workers` in playwright.config.isolated.js based on system resources

### Optimization Tips
1. **Reuse built images**: The app image is built once and reused
2. **Parallel execution**: Tests run in parallel up to worker limit
3. **Cleanup**: Containers are removed after tests complete

## Comparison with Previous Approach

| Aspect | Old (Shared Containers) | New (Isolated) |
|--------|-------------------------|----------------|
| Dev instance | At risk from tests | Completely safe |
| Test interference | Possible | Impossible |
| Parallel execution | Limited | Full parallelism |
| Database state | Shared, needs reset | Fresh per spec |
| Destructive tests | Risky | Safe |
| Resource usage | Lower | Higher |
| Test reliability | Variable | Consistent |

## Troubleshooting

### Tests are slow
- Reduce parallel workers in config
- Ensure Docker has enough resources
- Check for hanging containers: `docker ps`

### Container startup fails
- Check Docker daemon is running
- Ensure sufficient disk space
- Check port conflicts

### Database connection issues
- Verify PostgreSQL container started
- Check network connectivity
- Review container logs: `docker logs <container-id>`

## Migration Checklist

- [ ] Copy existing test to new file with `-isolated` suffix
- [ ] Add `IsolatedTestEnvironment` setup
- [ ] Replace hardcoded URLs with `config.appUrl`
- [ ] Update API calls to use isolated URL
- [ ] Test in isolation
- [ ] Remove or deprecate old test file

## Best Practices

1. **Name your environments clearly**: Use descriptive names in `IsolatedTestEnvironment('name')`
2. **Clean up test files**: Remove temporary files created during tests
3. **Log meaningful messages**: Include the unique ID when logging
4. **Group related tests**: Tests in same file share the environment
5. **Don't hardcode ports**: Always use dynamic ports from config

## Example Test Structure

```
tests/
├── isolated-test-setup.js       # Core isolation infrastructure
├── specs/
│   ├── dashboard-isolated.spec.js
│   ├── onboarding-isolated.spec.js
│   ├── document-upload-isolated.spec.js
│   └── ...
├── fixtures/                    # Shared test data
└── playwright.config.isolated.js
```

## Summary

This architecture provides **true test isolation** while keeping the development environment safe. Each test spec runs in its own world, enabling reliable, parallel, and safe testing without any risk to your development data or Supabase connection.