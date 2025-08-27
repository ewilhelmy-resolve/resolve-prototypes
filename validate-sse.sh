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

if \! echo "$REGISTER_RESPONSE" | grep -q "success.*true"; then
  echo "   ❌ Registration failed"
  exit 1
fi

TOKEN=$(grep sessionToken cookies.txt | awk '{print $7}')
echo "   ✅ User created with token: ${TOKEN:0:20}..."
echo ""

# Start a chat conversation
echo "2️⃣  Starting chat conversation..."
CHAT_RESPONSE=$(curl -s -X POST "http://localhost:5000/api/rag/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
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

# Check if conversation is in database
echo "3️⃣  Checking database..."
DB_CHECK=$(docker compose exec -T postgres psql -U resolve_user -d resolve_onboarding -t -c \
  "SELECT COUNT(*) FROM rag_conversations WHERE conversation_id = '$CONV_ID';" | tr -d ' ')

if [ "$DB_CHECK" = "1" ]; then
  echo "   ✅ Conversation saved to database"
else
  echo "   ❌ Conversation NOT in database"
fi
echo ""

# Start SSE listener in background
echo "4️⃣  Starting SSE listener..."
SSE_LOG="/tmp/sse_validate_$$"
touch "$SSE_LOG"

# Start SSE connection in background
(
  curl -N -s -H "Accept: text/event-stream" \
    -H "Authorization: Bearer $TOKEN" \
    "http://localhost:5000/api/rag/chat-stream/$CONV_ID" 2>/dev/null | while read -r line; do
    echo "$(date +%H:%M:%S) $line" >> "$SSE_LOG"
    if [[ $line == data:* ]]; then
      echo "   📨 SSE Event received" 
      MSG=$(echo "${line:5}" | grep -o '"ai_response":"[^"]*' | cut -d'"' -f4)
      if [ \! -z "$MSG" ]; then
        echo "   💬 AI Response: ${MSG:0:50}..."
      fi
    fi
  done
) &
SSE_PID=$\!

echo "   📡 SSE connected (PID: $SSE_PID)"
sleep 2
echo ""

# Send callback simulating Actions platform
echo "5️⃣  Simulating Actions platform callback..."
CALLBACK_RESPONSE=$(curl -s -X POST "http://localhost:5000/api/rag/chat-callback/$MSG_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"message_id\": \"$MSG_ID\",
    \"conversation_id\": \"$CONV_ID\",
    \"ai_response\": \"✅ VALIDATION SUCCESS\! SSE is working. This message was delivered via callback at $(date +%H:%M:%S)\",
    \"status\": \"completed\"
  }")

if echo "$CALLBACK_RESPONSE" | grep -q "success.*true"; then
  echo "   ✅ Callback processed successfully"
else
  echo "   ⚠️  Callback response: $CALLBACK_RESPONSE"
fi

# Wait for SSE to receive the message
echo "   ⏳ Waiting for SSE delivery..."
sleep 3

# Check SSE log
if [ -f "$SSE_LOG" ]; then
  EVENT_COUNT=$(grep -c "data:" "$SSE_LOG" 2>/dev/null || echo "0")
  echo "   📊 Total SSE events: $EVENT_COUNT"
fi

# Kill SSE listener
kill $SSE_PID 2>/dev/null

# Check messages in database
echo ""
echo "6️⃣  Checking database for messages..."
MSG_COUNT=$(docker compose exec -T postgres psql -U resolve_user -d resolve_onboarding -t -c \
  "SELECT COUNT(*) FROM rag_messages WHERE conversation_id = '$CONV_ID';" | tr -d ' ')

echo "   📊 Messages in database: $MSG_COUNT"

# Get the actual messages
echo "   📝 Message content:"
docker compose exec -T postgres psql -U resolve_user -d resolve_onboarding -c \
  "SELECT role, LEFT(message, 60) as message_preview FROM rag_messages WHERE conversation_id = '$CONV_ID' ORDER BY created_at;" 2>/dev/null

# Summary
echo ""
echo "========================================"
echo "📊 VALIDATION SUMMARY"
echo "========================================"

SUCCESS=true
[ "$DB_CHECK" = "1" ] || SUCCESS=false
[ "$EVENT_COUNT" -gt "0" ] || SUCCESS=false
[ "$MSG_COUNT" -gt "1" ] || SUCCESS=false

if [ "$SUCCESS" = true ]; then
  echo "✅ ALL CHECKS PASSED\!"
  echo "   • Conversation created and saved"
  echo "   • SSE connection established"
  echo "   • Callback processed"
  echo "   • Messages delivered via SSE"
  echo "   • Messages stored in database"
else
  echo "❌ SOME CHECKS FAILED"
  echo "   • Conversation in DB: $DB_CHECK/1"
  echo "   • SSE events received: $EVENT_COUNT"
  echo "   • Messages in DB: $MSG_COUNT (expected >1)"
fi

# Cleanup
rm -f cookies.txt "$SSE_LOG"

echo ""
echo "✅ Validation complete\!"
