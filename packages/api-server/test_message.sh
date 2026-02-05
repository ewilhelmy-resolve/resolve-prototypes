#!/bin/bash

echo "🔐 Creating authentication session..."
SESSION_COOKIE=$(cd ../.. && node test-auth.js 2>/dev/null | grep "🍪 Session Cookie:" | sed 's/.*🍪 Session Cookie: //')

if [ -z "$SESSION_COOKIE" ]; then
  echo "❌ Failed to get session cookie"
  exit 1
fi

echo "✅ Got session cookie: ${SESSION_COOKIE:0:30}..."

echo -e "\n📝 Creating a test message..."
RESPONSE=$(curl -s -X POST \
  -H "Cookie: $SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"content": "Test message from Phase 3 - updated for conversation API"}' \
  http://localhost:3000/api/messages)

echo "Response: $RESPONSE"

# Extract conversation ID
CONVERSATION_ID=$(echo $RESPONSE | grep -o '"conversation_id":"[^"]*"' | sed 's/"conversation_id":"\([^"]*\)"/\1/')

if [ -z "$CONVERSATION_ID" ]; then
  echo "❌ Failed to extract conversation ID"
  exit 1
fi

echo -e "\n📋 Getting conversations..."
curl -s -H "Cookie: $SESSION_COOKIE" \
  http://localhost:3000/api/conversations | jq '.'

echo -e "\n📋 Getting messages from the new conversation..."
curl -s -H "Cookie: $SESSION_COOKIE" \
  "http://localhost:3000/api/conversations/$CONVERSATION_ID/messages" | jq '.'