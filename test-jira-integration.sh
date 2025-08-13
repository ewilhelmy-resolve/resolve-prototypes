#!/bin/bash

echo "======================================"
echo "Testing Jira Integration with Docker"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOCKER_PORT=8080
TEST_TIMEOUT=120

# Function to check if port is available
check_port() {
    nc -z localhost $1 2>/dev/null
    return $?
}

# Function to wait for container to be ready
wait_for_container() {
    echo "Waiting for container to be ready..."
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if check_port $DOCKER_PORT; then
            echo -e "${GREEN}✓ Container is responding on port $DOCKER_PORT${NC}"
            
            # Check health endpoint
            if curl -s http://localhost:$DOCKER_PORT/health | grep -q "healthy"; then
                echo -e "${GREEN}✓ Health check passed${NC}"
                return 0
            fi
        fi
        
        echo "Waiting... (attempt $((attempt + 1))/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}✗ Container failed to start within timeout${NC}"
    return 1
}

# Step 1: Check Docker
echo "Step 1: Checking Docker..."
if ! docker --version > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker is installed${NC}"

# Step 2: Stop any existing containers
echo "Step 2: Cleaning up existing containers..."
docker-compose down 2>/dev/null || true
docker stop resolve-onboarding-test 2>/dev/null || true
docker rm resolve-onboarding-test 2>/dev/null || true
echo -e "${GREEN}✓ Cleanup complete${NC}"

# Step 3: Build Docker image
echo "Step 3: Building Docker image..."
if docker build -t resolve-onboarding:test .; then
    echo -e "${GREEN}✓ Docker image built successfully${NC}"
else
    echo -e "${RED}✗ Failed to build Docker image${NC}"
    exit 1
fi

# Step 4: Create test environment file
echo "Step 4: Creating test environment..."
cat > .env.test << EOF
PORT=3000
BASE_URL=http://localhost:3000
DATABASE_PATH=./test-onboarding.db
SESSION_SECRET=test-secret-key
AUTOMATION_WEBHOOK_URL=https://actions-api-staging.resolve.io/api/Webhooks/postEvent/00F4F67D-3B92-4FD2-A574-7BE22C6BE796
AUTOMATION_AUTH=Basic RTE0NzMwRkEtRDFCNS00MDM3LUFDRTMtQ0Y5N0ZCQzY3NkMyOlZaSkQqSSYyWEAkXkQ5Sjk4Rk5PJShGUVpaQ0dRNkEj
TENANT_TOKEN=test-tenant
WEBHOOK_ENABLED=true
EOF
echo -e "${GREEN}✓ Test environment created${NC}"

# Step 5: Start Docker container
echo "Step 5: Starting Docker container..."
docker run -d \
    --name resolve-onboarding-test \
    -p $DOCKER_PORT:3000 \
    --env-file .env.test \
    -v $(pwd)/test-onboarding.db:/app/test-onboarding.db \
    resolve-onboarding:test

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Container started${NC}"
else
    echo -e "${RED}✗ Failed to start container${NC}"
    exit 1
fi

# Step 6: Wait for container to be ready
echo "Step 6: Waiting for application to start..."
if wait_for_container; then
    echo -e "${GREEN}✓ Application is ready${NC}"
else
    echo -e "${RED}✗ Application failed to start${NC}"
    docker logs resolve-onboarding-test
    docker stop resolve-onboarding-test
    docker rm resolve-onboarding-test
    exit 1
fi

# Step 7: Run Playwright tests
echo "Step 7: Running Playwright tests..."
echo "======================================"

# Install Playwright if needed
if ! npx playwright --version > /dev/null 2>&1; then
    echo "Installing Playwright..."
    npm install -D @playwright/test
    npx playwright install chromium
fi

# Run the tests
DOCKER_URL=http://localhost:$DOCKER_PORT \
SIMULATE_CALLBACK=true \
npx playwright test tests/jira-integration-automation.spec.js \
    --reporter=list \
    --timeout=$TEST_TIMEOUT \
    --retries=0

TEST_RESULT=$?

# Step 8: Collect logs
echo "======================================"
echo "Step 8: Collecting logs..."
echo "Container logs:"
echo "---------------"
docker logs --tail=50 resolve-onboarding-test

# Step 9: Cleanup
echo "======================================"
echo "Step 9: Cleaning up..."
docker stop resolve-onboarding-test
docker rm resolve-onboarding-test
rm -f .env.test test-onboarding.db

# Report results
echo "======================================"
if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
else
    echo -e "${RED}✗ Tests failed with exit code $TEST_RESULT${NC}"
fi

exit $TEST_RESULT