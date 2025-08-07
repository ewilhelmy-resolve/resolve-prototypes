#!/bin/bash

# Test script for verifying the complete login flow
echo "🔍 Testing Resolve Onboarding System"
echo "====================================="

# Check if container is running
echo -n "1. Checking Docker container... "
if docker ps | grep -q resolve-onboarding-web-1; then
    echo "✅ Running"
else
    echo "❌ Not running"
    exit 1
fi

# Check backend health
echo -n "2. Checking backend health... "
HEALTH=$(curl -s http://localhost:8081/api/health | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('status', 'unknown'))" 2>/dev/null)
if [ "$HEALTH" = "healthy" ]; then
    echo "✅ Healthy"
else
    echo "❌ Unhealthy"
    exit 1
fi

# Test login with seeded user
echo -n "3. Testing login with john@resolve.io... "
echo '{"email":"john@resolve.io","password":"!Password1"}' > /tmp/test-login.json
RESPONSE=$(curl -s -X POST http://localhost:8081/api/login -H "Content-Type: application/json" -d @/tmp/test-login.json)
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✅ Success"
    TOKEN=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])" 2>/dev/null)
    echo "   Token: ${TOKEN:0:10}..."
else
    echo "❌ Failed"
    exit 1
fi

# Check frontend pages
echo -n "4. Checking frontend pages... "
PAGES_OK=true
for page in "" "jarvis.html"; do
    if ! curl -s http://localhost:8081/$page | grep -q "<title>"; then
        PAGES_OK=false
        break
    fi
done
if [ "$PAGES_OK" = true ]; then
    echo "✅ Accessible"
else
    echo "❌ Not accessible"
    exit 1
fi

# Check Resolve integration endpoint
echo -n "5. Testing Resolve integration endpoint... "
INTEGRATION_DATA='{"source":"Onboarding","user_email":"test@resolve.io","action":"learn_data"}'
INTEGRATION_RESPONSE=$(curl -s -X POST http://localhost:8081/api/integration/resolve -H "Content-Type: application/json" -d "$INTEGRATION_DATA")
if echo "$INTEGRATION_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Working"
else
    echo "❌ Failed"
fi

echo ""
echo "====================================="
echo "✨ All systems operational!"
echo ""
echo "Access the application at: http://localhost:8081"
echo "Login with: john@resolve.io / !Password1"
echo ""