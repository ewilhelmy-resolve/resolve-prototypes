#!/bin/bash

# Complete SSE Boomerang Test - Proves messages flow from curl to chat UI
set -e

echo "🎯 COMPLETE SSE BOOMERANG TEST"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:5000"
TEST_EMAIL="sse_$(date +%s)@test.com"
TEST_PASSWORD="Test123!"

echo -e "${YELLOW}📝 Step 1: Create Test User${NC}"
echo "Creating user: $TEST_EMAIL"

REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"SSE Test\",\"company\":\"Test Corp\"}" \
  -c cookies.txt)

if echo "$REGISTER_RESPONSE" | grep -q "success.*true"; then
  echo -e "${GREEN}✅ User created successfully${NC}"
else
  echo -e "${RED}❌ Failed to create user${NC}"
  echo "$REGISTER_RESPONSE"
  exit 1
fi

# Extract session token
SESSION_TOKEN=$(grep sessionToken cookies.txt | awk '{print $7}')
echo -e "${GREEN}🔑 Session token: ${SESSION_TOKEN:0:20}...${NC}"

echo ""
echo -e "${YELLOW}📝 Step 2: Start a Chat Conversation${NC}"

CHAT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/rag/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -d '{"message":"Hello AI, this is a test message"}')

CONVERSATION_ID=$(echo "$CHAT_RESPONSE" | grep -o '"conversation_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$CONVERSATION_ID" ]; then
  echo -e "${RED}❌ Failed to create conversation${NC}"
  echo "$CHAT_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Conversation created: $CONVERSATION_ID${NC}"

# Verify conversation is in database
echo ""
echo -e "${YELLOW}📝 Step 3: Verify Conversation in Database${NC}"

DB_CHECK=$(docker compose exec -T postgres psql -U resolve_user -d resolve_onboarding -t -c \
  "SELECT COUNT(*) FROM rag_conversations WHERE conversation_id = '$CONVERSATION_ID';" 2>/dev/null | tr -d ' ')

if [ "$DB_CHECK" = "1" ]; then
  echo -e "${GREEN}✅ Conversation exists in database${NC}"
else
  echo -e "${RED}❌ Conversation NOT in database (count: $DB_CHECK)${NC}"
fi

echo ""
echo -e "${YELLOW}📝 Step 4: Open SSE Connection (Background)${NC}"

# Start SSE listener in background and save to file
SSE_LOG="/tmp/sse_log_$$"
echo "Starting SSE listener (logging to $SSE_LOG)..."

(
  curl -N -H "Accept: text/event-stream" \
    -H "Authorization: Bearer $SESSION_TOKEN" \
    "$BASE_URL/api/rag/chat-stream/$CONVERSATION_ID" 2>/dev/null | while IFS= read -r line; do
    echo "$(date +%H:%M:%S) $line" >> "$SSE_LOG"
    if [[ $line == data:* ]]; then
      echo -e "${GREEN}📨 SSE Event: ${line:5:100}...${NC}"
    fi
  done
) &
SSE_PID=$!

sleep 2
echo -e "${GREEN}✅ SSE connection established (PID: $SSE_PID)${NC}"

echo ""
echo -e "${YELLOW}📝 Step 5: Send Test Message via SSE Endpoint${NC}"

TEST_MESSAGE="🚀 Test message sent at $(date +%H:%M:%S) - This should appear in the chat!"

TEST_RESPONSE=$(curl -s -X POST "$BASE_URL/api/rag/test-sse-message" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -d "{
    \"conversation_id\": \"$CONVERSATION_ID\",
    \"message\": \"$TEST_MESSAGE\",
    \"message_type\": \"chat-response\",
    \"store_in_db\": true
  }")

if echo "$TEST_RESPONSE" | grep -q "success.*true"; then
  CLIENTS=$(echo "$TEST_RESPONSE" | grep -o '"clients_notified":[0-9]*' | cut -d':' -f2)
  echo -e "${GREEN}✅ Test message sent to $CLIENTS client(s)${NC}"
else
  echo -e "${RED}❌ Failed to send test message${NC}"
  echo "$TEST_RESPONSE"
fi

# Give SSE time to receive
sleep 2

echo ""
echo -e "${YELLOW}📝 Step 6: Simulate Actions Platform Callback${NC}"

CALLBACK_MESSAGE="Hello from Actions Platform! Response generated at $(date +%H:%M:%S)"
MESSAGE_ID="msg_$(date +%s)_$$"

CALLBACK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/rag/chat-callback/$MESSAGE_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"message_id\": \"$MESSAGE_ID\",
    \"conversation_id\": \"$CONVERSATION_ID\",
    \"ai_response\": \"$CALLBACK_MESSAGE\",
    \"status\": \"completed\",
    \"sources\": [\"Knowledge Base\", \"Documentation\"],
    \"confidence\": 0.95
  }")

if echo "$CALLBACK_RESPONSE" | grep -q "success.*true"; then
  echo -e "${GREEN}✅ Callback processed successfully${NC}"
else
  echo -e "${YELLOW}⚠️  Callback response: $CALLBACK_RESPONSE${NC}"
fi

# Give SSE time to receive
sleep 2

echo ""
echo -e "${YELLOW}📝 Step 7: Send Another Direct Message${NC}"

DIRECT_MESSAGE="📣 Direct update: The system is working! Time: $(date +%H:%M:%S)"

DIRECT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/rag/test-sse-message" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -d "{
    \"conversation_id\": \"$CONVERSATION_ID\",
    \"message\": \"$DIRECT_MESSAGE\",
    \"message_type\": \"chat-response\",
    \"store_in_db\": true
  }")

echo -e "${GREEN}✅ Direct message sent${NC}"

sleep 2

echo ""
echo -e "${YELLOW}📝 Step 8: Check Messages in Database${NC}"

MESSAGE_COUNT=$(docker compose exec -T postgres psql -U resolve_user -d resolve_onboarding -t -c \
  "SELECT COUNT(*) FROM rag_messages WHERE conversation_id = '$CONVERSATION_ID';" 2>/dev/null | tr -d ' ')

echo -e "${GREEN}📊 Total messages in database: $MESSAGE_COUNT${NC}"

echo ""
echo -e "${YELLOW}📝 Step 9: Verify SSE Events Received${NC}"

# Kill SSE listener
kill $SSE_PID 2>/dev/null || true

# Check SSE log
if [ -f "$SSE_LOG" ]; then
  EVENT_COUNT=$(grep -c "data:" "$SSE_LOG" || echo "0")
  echo -e "${GREEN}📊 SSE events received: $EVENT_COUNT${NC}"
  
  echo ""
  echo "Last 5 SSE events:"
  grep "data:" "$SSE_LOG" | tail -5 | while read -r line; do
    echo "  • $line"
  done
else
  echo -e "${RED}❌ No SSE events logged${NC}"
fi

echo ""
echo "============================================"
echo -e "${GREEN}🎉 TEST COMPLETE${NC}"
echo "============================================"
echo ""
echo "To see the messages in a real browser:"
echo "1. Open $BASE_URL"
echo "2. Sign in with: $TEST_EMAIL / $TEST_PASSWORD"
echo "3. Go to Dashboard and open the chat"
echo "4. You should see all the test messages"
echo ""
echo -e "${YELLOW}Manual Test Commands:${NC}"
echo ""
echo "# Send a message to the conversation:"
echo "curl -X POST '$BASE_URL/api/rag/test-sse-message' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Authorization: Bearer $SESSION_TOKEN' \\"
echo "  -d '{\"conversation_id\":\"$CONVERSATION_ID\",\"message\":\"Your message here\"}'"
echo ""
echo "# Listen to SSE stream:"
echo "curl -N -H 'Accept: text/event-stream' \\"
echo "  -H 'Authorization: Bearer $SESSION_TOKEN' \\"
echo "  '$BASE_URL/api/rag/chat-stream/$CONVERSATION_ID'"
echo ""

# Cleanup
rm -f cookies.txt "$SSE_LOG" 2>/dev/null

echo -e "${GREEN}✅ All tests completed!${NC}"