---
description: Validate changes by rebuilding Docker app and running tests
argument-hint: [optional-specific-test]
allowed-tools: bash
model: claude-3-5-sonnet-20241022
---

# Validate Changes

Validate a change by executing the full validation workflow per CLAUDE.md.

## IMPORTANT: Docker Application Requirements
This is a containerized application that MUST run in Docker. All validation requires:
1. Docker daemon running
2. Application built and running in containers
3. Services healthy before testing

## Full Validation Process

### 1. Check Docker Prerequisites
```bash
# Verify Docker is running
if ! docker version >/dev/null 2>&1; then
  echo "❌ CRITICAL: Docker is not running!"
  echo "Please start Docker Desktop or Docker daemon first."
  exit 1
fi

echo "✅ Docker is running"
```

### 2. Rebuild Docker Application
```bash
echo "🔨 Building Docker application..."
docker compose build --pull

if [ $? -ne 0 ]; then
  echo "❌ Docker build failed!"
  exit 1
fi

echo "✅ Docker build successful"
```

### 3. Start Services
```bash
echo "🚀 Starting services..."
docker compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
MAX_WAIT=60
WAITED=0

while [ $WAITED -lt $MAX_WAIT ]; do
  HEALTH_STATUS=$(docker compose ps --format json | jq -r '.[] | select(.Service=="app" or .Service=="postgres") | .Health')
  
  if echo "$HEALTH_STATUS" | grep -q "healthy"; then
    APP_HEALTHY=$(docker compose ps app --format json | jq -r '.[0].Health')
    PG_HEALTHY=$(docker compose ps postgres --format json | jq -r '.[0].Health')
    
    if [ "$APP_HEALTHY" = "healthy" ] && [ "$PG_HEALTHY" = "healthy" ]; then
      echo "✅ All services are healthy!"
      break
    fi
  fi
  
  echo "   Waiting... ($WAITED/$MAX_WAIT seconds)"
  sleep 2
  WAITED=$((WAITED + 2))
done

if [ $WAITED -ge $MAX_WAIT ]; then
  echo "❌ Services failed to become healthy after $MAX_WAIT seconds"
  docker compose ps
  docker compose logs --tail=50
  exit 1
fi
```

### 4. Show Service Status
```bash
echo ""
echo "📊 Service Status:"
docker compose ps
```

### 5. Run Tests
```bash
echo ""
echo "🧪 Running E2E tests..."

# Check if specific test was requested
if [ -n "$ARGUMENTS" ]; then
  echo "Running specific test: $ARGUMENTS"
  npm test -- --grep "$ARGUMENTS"
else
  echo "Running all tests..."
  npm test
fi

TEST_RESULT=$?
```

### 6. Report Results
```bash
echo ""
echo "=" * 50

if [ $TEST_RESULT -eq 0 ]; then
  echo "✅ VALIDATION SUCCESSFUL"
  echo "All tests passed. Changes are ready."
  echo ""
  echo "Next steps:"
  echo "- Review the changes"
  echo "- Commit if all looks good"
else
  echo "❌ VALIDATION FAILED"
  echo "Tests failed. DO NOT COMMIT."
  echo ""
  echo "Debug steps:"
  echo "1. Check logs: docker compose logs --tail=100"
  echo "2. View test report: npm run test:report"
  echo "3. Run specific test: npm test -- --grep 'test-name'"
  exit 1
fi
```

## Quick Validation (When Already Running)

If Docker is already running and healthy, use this quick validation:

```bash
# Quick check if services are already healthy
if docker compose ps | grep -q "(healthy)"; then
  echo "✅ Services already running and healthy"
  npm test
else
  echo "⚠️ Services not healthy, running full validation..."
  # Run full validation steps above
fi
```

## Troubleshooting

### Docker Not Running
```bash
# macOS/Windows
# Start Docker Desktop application

# Linux
sudo systemctl start docker
```

### Services Won't Start
```bash
# Check logs
docker compose logs --tail=100

# Reset everything
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

### Port Conflicts
```bash
# Check if port 5000 is in use
lsof -i :5000 || netstat -an | grep 5000

# Stop conflicting service or change port in docker-compose.yml
```

### Database Issues
```bash
# Reset database
docker compose down -v
docker compose up -d postgres
docker compose up -d app
```

## Environment Variables

Default values (can be overridden):
- `APP_SERVICE=app` - Docker service name for application
- `POSTGRES_SERVICE=postgres` - Docker service name for database
- `PORT=5000` - Application port
- `TEST_CMD=npm test` - Test command to run

## Important Notes

1. **Never skip Docker build** - Always rebuild to ensure latest changes are included
2. **Wait for health checks** - Don't run tests until services are healthy
3. **Check logs on failure** - Docker logs often reveal the root cause
4. **Clean state** - Use `docker compose down -v` to reset if needed

Remember: This is a Docker application. It MUST be running in containers for validation to work properly.