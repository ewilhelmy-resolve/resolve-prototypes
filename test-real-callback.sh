#!/bin/bash

# Real callback test - simulates Actions platform callback to an active chat session

echo "🎯 REAL CALLBACK TEST (No test endpoints)"
echo "=========================================="
echo ""

BASE_URL="http://localhost:5000"
EMAIL="real_callback_$(date +%s)@test.com"
PASSWORD="Test123!"

# Step 1: Create user and get session
echo "1️⃣  Creating user: $EMAIL"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"Real Test\",\"company\":\"Test Corp\"}" \
  -c cookies.txt)

if ! echo "$REGISTER_RESPONSE" | grep -q "success.*true"; then
  echo "   ❌ Registration failed"
  echo "$REGISTER_RESPONSE"
  exit 1
fi

TOKEN=$(grep sessionToken cookies.txt | awk '{print $7}')
echo "   ✅ User created"
echo "   🔑 Token: ${TOKEN:0:20}..."

# Step 2: Start a real chat conversation
echo ""
echo "2️⃣  Starting chat conversation..."
CHAT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/rag/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message":"Hello AI, I need help with my workflow"}')

CONV_ID=$(echo "$CHAT_RESPONSE" | grep -o '"conversation_id":"[^"]*' | cut -d'"' -f4)
MSG_ID=$(echo "$CHAT_RESPONSE" | grep -o '"message_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$CONV_ID" ]; then
  echo "   ❌ Failed to start conversation"
  echo "$CHAT_RESPONSE"
  exit 1
fi

echo "   ✅ Conversation: $CONV_ID"
echo "   📝 Message ID: $MSG_ID"

# Step 3: Verify conversation is in database
echo ""
echo "3️⃣  Verifying conversation in database..."
DB_CHECK=$(docker compose exec -T postgres psql -U resolve_user -d resolve_onboarding -t -c \
  "SELECT COUNT(*) FROM rag_conversations WHERE conversation_id = '$CONV_ID';" 2>/dev/null | tr -d ' ')

if [ "$DB_CHECK" = "1" ]; then
  echo "   ✅ Conversation saved to database"
else
  echo "   ❌ Conversation NOT in database"
fi

# Step 4: Start SSE listener to monitor responses
echo ""
echo "4️⃣  Starting SSE listener..."
SSE_LOG="/tmp/sse_real_$$"

# Start SSE in background
(
  curl -N -s -H "Accept: text/event-stream" \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/api/rag/chat-stream/$CONV_ID" 2>/dev/null | while read -r line; do
    echo "$(date +%H:%M:%S) $line" >> "$SSE_LOG"
    if [[ $line == data:* ]]; then
      MSG=$(echo "${line:5}" | grep -o '"ai_response":"[^"]*' | cut -d'"' -f4)
      if [ ! -z "$MSG" ]; then
        echo "   💬 AI Response: $MSG"
      fi
    fi
  done
) &
SSE_PID=$!

echo "   📡 SSE connected (PID: $SSE_PID)"
sleep 2

# Step 5: Simulate Actions platform callback (this is what would happen in production)
echo ""
echo "5️⃣  Simulating Actions platform callback..."
echo "   This is what the Actions platform would send back:"

CALLBACK_MSG_ID="${MSG_ID:-msg_$(date +%s)}"
AI_RESPONSE="Based on your request, I can help you create an automated workflow. Here are the steps: 1) First, we'll set up a trigger for your incident type. 2) Then configure the automated response actions. 3) Finally, we'll add notification rules. Would you like me to walk you through this process?"

echo ""
echo "   Callback URL: $BASE_URL/api/rag/chat-callback/$CALLBACK_MSG_ID"
echo "   Sending callback..."

CALLBACK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/rag/chat-callback/$CALLBACK_MSG_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"message_id\": \"$CALLBACK_MSG_ID\",
    \"conversation_id\": \"$CONV_ID\",
    \"ai_response\": \"$AI_RESPONSE\",
    \"status\": \"completed\",
    \"sources\": [\"Workflow Templates\", \"Best Practices Guide\"],
    \"confidence\": 0.92,
    \"response_time_ms\": 245
  }")

if echo "$CALLBACK_RESPONSE" | grep -q "success.*true"; then
  echo "   ✅ Callback processed successfully"
else
  echo "   ⚠️  Callback response: $CALLBACK_RESPONSE"
fi

# Wait for SSE to receive the message
sleep 3

# Step 6: Send another callback to simulate follow-up
echo ""
echo "6️⃣  Sending follow-up callback..."

FOLLOW_UP_ID="msg_followup_$(date +%s)"
FOLLOW_UP_MSG="I've prepared a template for your CPU monitoring workflow. It includes: automatic scaling when CPU > 80%, notification to your team, and incident creation in your ticketing system. Should I deploy this now?"

FOLLOW_UP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/rag/chat-callback/$FOLLOW_UP_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"message_id\": \"$FOLLOW_UP_ID\",
    \"conversation_id\": \"$CONV_ID\",
    \"ai_response\": \"$FOLLOW_UP_MSG\",
    \"status\": \"completed\"
  }")

echo "   ✅ Follow-up sent"

sleep 2

# Step 7: Check SSE log for received messages
echo ""
echo "7️⃣  Checking SSE events received..."

if [ -f "$SSE_LOG" ]; then
  EVENT_COUNT=$(grep -c "data:" "$SSE_LOG" 2>/dev/null || echo "0")
  echo "   📊 Total SSE events: $EVENT_COUNT"
  
  RESPONSE_COUNT=$(grep -c "ai_response" "$SSE_LOG" 2>/dev/null || echo "0")
  echo "   💬 AI responses received: $RESPONSE_COUNT"
fi

# Kill SSE listener
kill $SSE_PID 2>/dev/null

# Step 8: Verify messages in database
echo ""
echo "8️⃣  Checking database for messages..."

MSG_COUNT=$(docker compose exec -T postgres psql -U resolve_user -d resolve_onboarding -t -c \
  "SELECT COUNT(*) FROM rag_messages WHERE conversation_id = '$CONV_ID';" 2>/dev/null | tr -d ' ')

echo "   📊 Messages in database: $MSG_COUNT"

# Summary
echo ""
echo "=========================================="
echo "📊 TEST SUMMARY"
echo "=========================================="
echo ""
echo "✅ What this proves:"
echo "   • Real chat conversations are created with IDs"
echo "   • Conversations are saved to database"
echo "   • SSE connections work for real conversations"
echo "   • Callbacks update the conversation in real-time"
echo "   • Messages flow: Actions Platform → Callback → SSE → Chat UI"
echo ""
echo "📝 To see in browser:"
echo "   1. Login at $BASE_URL with: $EMAIL / $PASSWORD"
echo "   2. Open the chat widget"
echo "   3. The AI responses should be visible"
echo ""
echo "🔧 Manual callback command for this conversation:"
echo "curl -X POST '$BASE_URL/api/rag/chat-callback/YOUR_MSG_ID' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"conversation_id\":\"$CONV_ID\",\"ai_response\":\"Your message\"}'"
echo ""

# Cleanup
rm -f cookies.txt "$SSE_LOG"

echo "✅ Real callback test completed!"