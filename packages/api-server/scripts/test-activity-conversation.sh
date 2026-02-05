#!/bin/bash
# Test script: Verify activity-based conversation mapping
# Two different sessionKeys with same activityId should get same conversationId

set -e

VALKEY_HOST="localhost"
VALKEY_PORT="6379"
API_URL="http://localhost:3000"

# Same activityId for both
ACTIVITY_ID=12345
# Use proper UUIDs
TENANT_ID="$(uuidgen | tr '[:upper:]' '[:lower:]')"
USER_GUID="$(uuidgen | tr '[:upper:]' '[:lower:]')"

# Two different session keys
SESSION_KEY_A="test-session-A-$(date +%s)"
SESSION_KEY_B="test-session-B-$(date +%s)"

echo "=== Activity-Based Conversation Test ==="
echo "ActivityId: $ACTIVITY_ID"
echo "SessionKey A: $SESSION_KEY_A"
echo "SessionKey B: $SESSION_KEY_B"
echo ""

# Create Valkey payload with activityId
PAYLOAD=$(cat <<EOF
{
  "tenantId": "$TENANT_ID",
  "userGuid": "$USER_GUID",
  "actionsApiBaseUrl": "http://localhost:3001",
  "clientId": "test-client",
  "clientKey": "test-key",
  "accessToken": "test-token",
  "refreshToken": "test-refresh",
  "tokenExpiry": 9999999999,
  "context": {
    "designer": "activity",
    "activityId": $ACTIVITY_ID,
    "activityName": "Test Activity"
  }
}
EOF
)

echo "Setting up Valkey keys..."

# Set both session keys with same payload (same activityId)
docker exec rita-valkey-1 valkey-cli HSET "rita:session:$SESSION_KEY_A" data "$PAYLOAD"
docker exec rita-valkey-1 valkey-cli HSET "rita:session:$SESSION_KEY_B" data "$PAYLOAD"

echo "Valkey keys created."
echo ""

echo "Calling API with SessionKey A..."
RESULT_A=$(curl -s -X POST "$API_URL/api/iframe/validate-instantiation" \
  -H "Content-Type: application/json" \
  -d "{\"sessionKey\": \"$SESSION_KEY_A\"}")

CONV_ID_A=$(echo "$RESULT_A" | jq -r '.conversationId')
echo "Response A: $RESULT_A"
echo "ConversationId A: $CONV_ID_A"
echo ""

echo "Calling API with SessionKey B..."
RESULT_B=$(curl -s -X POST "$API_URL/api/iframe/validate-instantiation" \
  -H "Content-Type: application/json" \
  -d "{\"sessionKey\": \"$SESSION_KEY_B\"}")

CONV_ID_B=$(echo "$RESULT_B" | jq -r '.conversationId')
echo "Response B: $RESULT_B"
echo "ConversationId B: $CONV_ID_B"
echo ""

echo "=== Results ==="
if [ "$CONV_ID_A" = "$CONV_ID_B" ]; then
  echo "✅ SUCCESS: Both sessionKeys got the same conversationId!"
  echo "   ConversationId: $CONV_ID_A"
else
  echo "❌ FAILED: Different conversationIds!"
  echo "   ConversationId A: $CONV_ID_A"
  echo "   ConversationId B: $CONV_ID_B"
  exit 1
fi

# Cleanup Valkey keys
echo ""
echo "Cleaning up Valkey keys..."
docker exec rita-valkey-1 valkey-cli DEL "rita:session:$SESSION_KEY_A"
docker exec rita-valkey-1 valkey-cli DEL "rita:session:$SESSION_KEY_B"
echo "Done."
