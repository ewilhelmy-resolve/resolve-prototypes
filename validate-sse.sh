#!/bin/bash

# Simple SSE Validation - Shows messages appearing in real-time

echo "🎯 SSE BOOMERANG VALIDATION"
echo "============================"
echo ""

# Setup
BASE_URL="http://localhost:5000"
EMAIL="demo_$(date +%s)@test.com"
PASSWORD="Test123!"

# 1. Create user
echo "1️⃣ Creating user: $EMAIL"
curl -s -X POST "$BASE_URL/api/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"Demo User\",\"company\":\"Test\"}" \
  -c cookies.txt > /dev/null

TOKEN=$(grep sessionToken cookies.txt | awk '{print $7}')
echo "   ✅ Token: ${TOKEN:0:20}..."

# 2. Start conversation
echo ""
echo "2️⃣ Starting conversation..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/rag/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message":"Hello, testing SSE"}')

CONV_ID=$(echo "$RESPONSE" | grep -o '"conversation_id":"[^"]*' | cut -d'"' -f4)
echo "   ✅ Conversation: $CONV_ID"

# 3. Start SSE listener
echo ""
echo "3️⃣ Starting SSE listener (will show messages in real-time)..."
echo "   📡 Listening for events..."
echo ""

# Run SSE in background, format output nicely
(
  curl -N -s -H "Accept: text/event-stream" \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/api/rag/chat-stream/$CONV_ID" 2>/dev/null | while read -r line; do
    if [[ $line == data:* ]]; then
      # Extract just the message content
      MSG=$(echo "${line:5}" | grep -o '"content":"[^"]*' | cut -d'"' -f4 || \
            echo "${line:5}" | grep -o '"ai_response":"[^"]*' | cut -d'"' -f4 || \
            echo "${line:5}" | grep -o '"message":"[^"]*' | cut -d'"' -f4)
      
      if [ ! -z "$MSG" ] && [ "$MSG" != "Connected to chat stream" ]; then
        echo "   💬 $(date +%H:%M:%S) → $MSG"
      fi
    fi
  done
) &
SSE_PID=$!

sleep 2

# 4. Send test messages
echo ""
echo "4️⃣ Sending test messages (watch them appear above)..."
echo ""

# Message 1
echo "   📤 Sending: 'Hello from curl test!'"
curl -s -X POST "$BASE_URL/api/rag/test-sse-message" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"conversation_id\": \"$CONV_ID\",
    \"message\": \"Hello from curl test! 👋\",
    \"message_type\": \"chat-response\"
  }" > /dev/null

sleep 2

# Message 2
echo "   📤 Sending: 'The boomerang is working!'"
curl -s -X POST "$BASE_URL/api/rag/test-sse-message" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"conversation_id\": \"$CONV_ID\",
    \"message\": \"🎯 The boomerang is working! Message sent at $(date +%H:%M:%S)\",
    \"message_type\": \"chat-response\"
  }" > /dev/null

sleep 2

# Message 3 - Simulate callback from Actions platform
echo "   📤 Simulating Actions platform callback..."
MSG_ID="msg_$(date +%s)"
curl -s -X POST "$BASE_URL/api/rag/chat-callback/$MSG_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"message_id\": \"$MSG_ID\",
    \"conversation_id\": \"$CONV_ID\",
    \"ai_response\": \"🤖 Response from Actions platform: Everything is working perfectly!\",
    \"status\": \"completed\"
  }" > /dev/null

sleep 3

# Stop SSE
kill $SSE_PID 2>/dev/null

echo ""
echo "============================"
echo "✅ VALIDATION COMPLETE"
echo "============================"
echo ""
echo "To test manually:"
echo ""
echo "1. Send a message:"
echo "   curl -X POST '$BASE_URL/api/rag/test-sse-message' \\"
echo "     -H 'Authorization: Bearer $TOKEN' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"conversation_id\":\"$CONV_ID\",\"message\":\"Your message\"}'"
echo ""
echo "2. Listen to SSE stream:"
echo "   curl -N -H 'Authorization: Bearer $TOKEN' \\"
echo "     '$BASE_URL/api/rag/chat-stream/$CONV_ID'"
echo ""

rm -f cookies.txt