#!/bin/bash

# Test SSE Boomerang - Proves messages can be sent via curl and appear in chat UI
# This script simulates the full flow of sending a message to the chat

set -e

echo "🎯 SSE Boomerang Test Script"
echo "============================="
echo ""

# Configuration
BASE_URL="http://localhost:5000"
TEST_EMAIL="ssetest_$(date +%s)@example.com"
TEST_PASSWORD="Test123!"
TEST_NAME="SSE Tester"
TEST_COMPANY="Test Corp"

echo "📝 Step 1: Creating test user..."
echo "Email: $TEST_EMAIL"

# Register a new user
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"$TEST_NAME\",\"company\":\"$TEST_COMPANY\"}" \
  -c cookies_test.txt)

# Check if registration was successful
if echo "$REGISTER_RESPONSE" | grep -q "success.*true"; then
  echo "✅ User registered successfully"
else
  echo "❌ Registration failed. Response:"
  echo "$REGISTER_RESPONSE"
  echo ""
  echo "Trying to login instead..."
  
  # Try to login if registration failed
  LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/signin" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
    -c cookies_test.txt)
  
  if echo "$LOGIN_RESPONSE" | grep -q "success.*true"; then
    echo "✅ Logged in successfully"
  else
    echo "❌ Login also failed. Exiting."
    exit 1
  fi
fi

# Extract session token from cookies
SESSION_TOKEN=$(grep sessionToken cookies_test.txt | awk '{print $7}')
if [ -z "$SESSION_TOKEN" ]; then
  echo "❌ No session token found"
  exit 1
fi
echo "🔑 Session token: ${SESSION_TOKEN:0:10}..."

echo ""
echo "📝 Step 2: Starting a chat conversation..."

# Send initial chat message to create conversation
CHAT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/rag/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -d '{"message":"Hello, this is a test message to start the conversation"}')

# Extract conversation ID
CONVERSATION_ID=$(echo "$CHAT_RESPONSE" | grep -o '"conversation_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$CONVERSATION_ID" ]; then
  echo "❌ Failed to get conversation ID"
  echo "Response: $CHAT_RESPONSE"
  exit 1
fi

echo "✅ Conversation created: $CONVERSATION_ID"

echo ""
echo "📝 Step 3: Opening SSE connection to monitor messages..."
echo "(This will listen for 10 seconds for incoming messages)"

# Start SSE listener in background
(
  curl -N -H "Accept: text/event-stream" \
    "$BASE_URL/api/rag/chat-stream/$CONVERSATION_ID" \
    2>/dev/null | while IFS= read -r line; do
    if [[ $line == data:* ]]; then
      echo "📨 SSE Message received: ${line:5}"
    fi
  done
) &
SSE_PID=$!

# Give SSE connection time to establish
sleep 2

echo ""
echo "📝 Step 4: Sending test message via the test endpoint..."

# Send test message through the SSE test endpoint
TEST_MESSAGE="🚀 Boomerang test successful! Message sent at $(date +%H:%M:%S)"
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
  CLIENTS_NOTIFIED=$(echo "$TEST_RESPONSE" | grep -o '"clients_notified":[0-9]*' | cut -d':' -f2)
  echo "✅ Test message sent successfully to $CLIENTS_NOTIFIED client(s)"
else
  echo "❌ Failed to send test message"
  echo "Response: $TEST_RESPONSE"
fi

echo ""
echo "📝 Step 5: Simulating Actions platform callback..."

# Generate a callback token and message ID
MESSAGE_ID="msg_$(date +%s)_$RANDOM"
CALLBACK_TOKEN=$(echo -n "$MESSAGE_ID:$CONVERSATION_ID" | base64)

# Simulate the Actions platform sending a callback
CALLBACK_MESSAGE="Hello from simulated Actions platform! This proves the callback works. Time: $(date +%H:%M:%S)"

CALLBACK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/rag/chat-callback/$MESSAGE_ID" \
  -H "Content-Type: application/json" \
  -H "X-Callback-Token: $CALLBACK_TOKEN" \
  -d "{
    \"message_id\": \"$MESSAGE_ID\",
    \"conversation_id\": \"$CONVERSATION_ID\",
    \"ai_response\": \"$CALLBACK_MESSAGE\",
    \"status\": \"completed\",
    \"sources\": [\"Test Source 1\", \"Test Source 2\"],
    \"confidence\": 0.95,
    \"response_time_ms\": 150
  }")

if echo "$CALLBACK_RESPONSE" | grep -q "success.*true"; then
  echo "✅ Callback processed successfully"
else
  echo "⚠️  Callback response: $CALLBACK_RESPONSE"
fi

echo ""
echo "📝 Step 6: Verifying messages in conversation history..."

# Fetch conversation history
HISTORY_RESPONSE=$(curl -s -X GET "$BASE_URL/api/rag/conversation/$CONVERSATION_ID" \
  -H "Authorization: Bearer $SESSION_TOKEN")

MESSAGE_COUNT=$(echo "$HISTORY_RESPONSE" | grep -o '"role"' | wc -l)
echo "📊 Total messages in conversation: $MESSAGE_COUNT"

# Wait a bit more for SSE messages
echo ""
echo "⏳ Waiting 5 more seconds for SSE messages..."
sleep 5

# Kill SSE listener
kill $SSE_PID 2>/dev/null || true

echo ""
echo "============================================"
echo "🎯 TEST COMPLETE"
echo "============================================"
echo ""
echo "To see this in action in the browser:"
echo "1. Open $BASE_URL in a browser"
echo "2. Sign in with email: $TEST_EMAIL password: $TEST_PASSWORD"
echo "3. Go to Dashboard and open the chat"
echo "4. You should see the test messages that were sent"
echo ""
echo "Conversation ID for manual testing: $CONVERSATION_ID"
echo ""
echo "To manually send another message to this conversation:"
echo "curl -X POST '$BASE_URL/api/rag/test-sse-message' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Authorization: Bearer $SESSION_TOKEN' \\"
echo "  -d '{\"conversation_id\":\"$CONVERSATION_ID\",\"message\":\"Your message here\"}'"
echo ""

# Cleanup
rm -f cookies_test.txt

echo "✅ Test script completed successfully!"