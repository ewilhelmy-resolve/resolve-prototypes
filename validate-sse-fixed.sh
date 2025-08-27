#\!/bin/bash

echo "🎯 VALIDATING SSE CALLBACK FLOW LOCALLY"
echo "========================================"
echo ""

# Create test user
EMAIL="validate_$(date +%s)@test.com"
PASSWORD="Test123\!"

echo "1️⃣  Creating test user: $EMAIL"
REGISTER_RESPONSE=$(curl -s -X POST "http://localhost:5000/api/register" \
  -H "Content-Type: application/json" \
  -d "{\"fullName\":\"Validate User\",\"email\":\"$EMAIL\",\"company\":\"Test Corp\",\"password\":\"$PASSWORD\"}" \
  -c cookies.txt)

TOKEN=$(grep sessionToken cookies.txt | awk '{print $7}')
echo "   ✅ User created with token: ${TOKEN:0:20}..."
echo ""

# Start a chat conversation using cookies
echo "2️⃣  Starting chat conversation..."
CHAT_RESPONSE=$(curl -s -X POST "http://localhost:5000/api/rag/chat" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"message":"Hello from validation script"}')

CONV_ID=$(echo "$CHAT_RESPONSE" | grep -o '"conversation_id":"[^"]*' | cut -d'"' -f4)
MSG_ID=$(echo "$CHAT_RESPONSE" | grep -o '"message_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$CONV_ID" ]; then
  echo "   ❌ Failed to start conversation"
  echo "   Response: $CHAT_RESPONSE"
  exit 1
fi

echo "   ✅ Conversation ID: $CONV_ID"
echo "   ✅ Message ID: $MSG_ID"
echo ""

# Start SSE listener with cookies
echo "3️⃣  Starting SSE listener..."
SSE_LOG="/tmp/sse_validate_$$"

# Start SSE connection with cookies
(
  curl -N -s \
    -H "Accept: text/event-stream" \
    -b cookies.txt \
    "http://localhost:5000/api/rag/chat-stream/$CONV_ID" 2>/dev/null | while read -r line; do
    echo "$(date +%H:%M:%S) $line" >> "$SSE_LOG"
    if [[ $line == data:* ]]; then
      echo "   📨 SSE Event received"
    fi
  done
) &
SSE_PID=$\!

echo "   📡 SSE connected (PID: $SSE_PID)"
sleep 2

# Send callback
echo ""
echo "4️⃣  Simulating Actions platform callback..."
CALLBACK_RESPONSE=$(curl -s -X POST "http://localhost:5000/api/rag/chat-callback/$MSG_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"message_id\": \"$MSG_ID\",
    \"conversation_id\": \"$CONV_ID\",
    \"ai_response\": \"✅ VALIDATION SUCCESS at $(date +%H:%M:%S)\",
    \"status\": \"completed\"
  }")

echo "   Callback response: $CALLBACK_RESPONSE"
sleep 3

# Check results
EVENT_COUNT=$(grep -c "data:" "$SSE_LOG" 2>/dev/null || echo "0")
echo "   📊 SSE events received: $EVENT_COUNT"

# Kill SSE
kill $SSE_PID 2>/dev/null

# Summary
echo ""
echo "========================================"
if [ "$EVENT_COUNT" -gt "1" ]; then
  echo "✅ VALIDATION PASSED\!"
  echo "   Messages are delivered via SSE"
else
  echo "❌ SSE DELIVERY FAILED"
  echo "   Check the implementation"
fi

rm -f cookies.txt "$SSE_LOG"
