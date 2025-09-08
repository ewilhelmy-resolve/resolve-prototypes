#!/bin/bash

# Test runner with COMPLETE ISOLATION
# Each test spec gets its own database and app container

set -e

echo "🚀 E2E TEST SUITE - ISOLATED CONTAINERS"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track test results
PASSED_TESTS=()
FAILED_TESTS=()

# Clean up function
cleanup() {
    echo "🧹 Cleaning up test containers..."
    docker compose -f tests/docker-compose.test.yml down -v 2>/dev/null || true
    docker ps -aq --filter "name=test-" | xargs -r docker rm -f 2>/dev/null || true
}

# Clean up before starting
cleanup

# Build test image once
echo "📦 Building test Docker image..."
docker compose -f tests/docker-compose.test.yml build test-app

# Get list of test specs
TEST_SPECS=$(find tests/specs -name "*.spec.js" -type f | sort)
TOTAL_SPECS=$(echo "$TEST_SPECS" | wc -l)
CURRENT_SPEC=0

echo "📋 Found $TOTAL_SPECS test specs to run"
echo ""

# Run each spec in its own isolated environment
for SPEC in $TEST_SPECS; do
    CURRENT_SPEC=$((CURRENT_SPEC + 1))
    SPEC_NAME=$(basename "$SPEC" .spec.js)
    
    echo -e "${YELLOW}[$CURRENT_SPEC/$TOTAL_SPECS]${NC} Running: $SPEC_NAME"
    
    # Create unique container names for this spec
    export COMPOSE_PROJECT_NAME="test-$SPEC_NAME-$$"
    
    # Start isolated containers for this spec
    docker compose -f tests/docker-compose.test.yml up -d test-postgres test-app 2>/dev/null
    
    # Wait for app to be healthy
    echo -n "  ⏳ Waiting for containers to be ready..."
    HEALTH_COUNT=0
    while [ $HEALTH_COUNT -lt 30 ]; do
        if docker compose -f tests/docker-compose.test.yml ps | grep -q "test-app.*(healthy)"; then
            echo " ✓"
            break
        fi
        sleep 1
        HEALTH_COUNT=$((HEALTH_COUNT + 1))
    done
    
    if [ $HEALTH_COUNT -eq 30 ]; then
        echo -e " ${RED}✗ Timeout${NC}"
        FAILED_TESTS+=("$SPEC_NAME (timeout)")
        docker compose -f tests/docker-compose.test.yml down -v 2>/dev/null
        continue
    fi
    
    # Get the app port
    APP_PORT=$(docker compose -f tests/docker-compose.test.yml port test-app 5000 2>/dev/null | cut -d: -f2)
    
    # Run the test inside the test-app container
    echo -n "  🎭 Running tests..."
    if docker compose -f tests/docker-compose.test.yml exec -T test-app \
        npx playwright test "/app/$SPEC" \
        --config=/app/tests/playwright.config.js \
        --reporter=json 2>/dev/null | grep -q '"status":"passed"'; then
        echo -e " ${GREEN}✓ PASSED${NC}"
        PASSED_TESTS+=("$SPEC_NAME")
    else
        echo -e " ${RED}✗ FAILED${NC}"
        FAILED_TESTS+=("$SPEC_NAME")
        
        # Show logs on failure
        echo "  📋 Container logs:"
        docker compose -f tests/docker-compose.test.yml logs test-app --tail=20 2>/dev/null | sed 's/^/    /'
    fi
    
    # Clean up this spec's containers
    docker compose -f tests/docker-compose.test.yml down -v 2>/dev/null
    echo ""
done

# Final cleanup
cleanup

# Report results
echo "=========================================="
echo "📊 TEST RESULTS"
echo "=========================================="
echo ""
echo -e "${GREEN}✅ Passed: ${#PASSED_TESTS[@]} tests${NC}"
for test in "${PASSED_TESTS[@]}"; do
    echo "   • $test"
done

if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}❌ Failed: ${#FAILED_TESTS[@]} tests${NC}"
    for test in "${FAILED_TESTS[@]}"; do
        echo "   • $test"
    done
    echo ""
    echo "=========================================="
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    exit 1
else
    echo ""
    echo "=========================================="
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    exit 0
fi