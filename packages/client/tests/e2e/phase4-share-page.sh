#!/bin/bash
# =============================================================================
# Phase 4 E2E: Share Page Verification
# =============================================================================
# Tests the /jarvis/:conversationId share page end-to-end.
#
# Prerequisites:
#   - Full stack running (pnpm dev)
#   - Migration applied: share_status + share_token columns on conversations
#   - At least one conversation with messages in the DB
#
# Usage:
#   chmod +x packages/client/tests/e2e/phase4-share-page.sh
#   ./packages/client/tests/e2e/phase4-share-page.sh
# =============================================================================

set -euo pipefail

PWCLI="${CODEX_HOME:-$HOME/.codex}/skills/playwright/scripts/playwright_cli.sh"
API="http://localhost:3000"
CLIENT="http://localhost:5173"

# Test conversation IDs (update these with real IDs from your DB)
CONV_ID="7c7e12fe-a192-44fe-8ae3-f10a2087c1c2"

echo "============================================"
echo "Phase 4 E2E: Share Page Tests"
echo "============================================"
echo ""

# ---- Test 1: API — Public share returns data ----
echo "--- Test 1: API — Public share endpoint ---"
echo "Setting conversation to public..."
docker exec rita-postgres-1 psql -U rita -d rita -q -c \
  "UPDATE conversations SET share_status = 'public', share_token = NULL WHERE id = '$CONV_ID';"

echo "Fetching: GET $API/api/share/$CONV_ID"
RESPONSE=$(curl -s -w "\n%{http_code}" "$API/api/share/$CONV_ID")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  MSG_COUNT=$(echo "$BODY" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['messages']))")
  TITLE=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['conversation']['title'])")
  echo "  ✅ 200 OK — Title: '$TITLE', Messages: $MSG_COUNT"
else
  echo "  ❌ Expected 200, got $HTTP_CODE"
fi
echo ""

# ---- Test 2: API — Private share returns 403 ----
echo "--- Test 2: API — Private share returns 403 ---"
docker exec rita-postgres-1 psql -U rita -d rita -q -c \
  "UPDATE conversations SET share_status = 'private', share_token = NULL WHERE id = '$CONV_ID';"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/share/$CONV_ID")
if [ "$HTTP_CODE" = "403" ]; then
  echo "  ✅ 403 Forbidden (private conversation blocked)"
else
  echo "  ❌ Expected 403, got $HTTP_CODE"
fi
echo ""

# ---- Test 3: API — Token-protected share ----
echo "--- Test 3: API — Token-protected share ---"
TEST_TOKEN="abc123testtoken456"
docker exec rita-postgres-1 psql -U rita -d rita -q -c \
  "UPDATE conversations SET share_status = 'token', share_token = '$TEST_TOKEN' WHERE id = '$CONV_ID';"

echo "  Without token..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/share/$CONV_ID")
if [ "$HTTP_CODE" = "403" ]; then
  echo "  ✅ 403 — Missing token rejected"
else
  echo "  ❌ Expected 403, got $HTTP_CODE"
fi

echo "  With wrong token..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/share/$CONV_ID?token=wrongtoken")
if [ "$HTTP_CODE" = "403" ]; then
  echo "  ✅ 403 — Wrong token rejected"
else
  echo "  ❌ Expected 403, got $HTTP_CODE"
fi

echo "  With correct token..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/share/$CONV_ID?token=$TEST_TOKEN")
if [ "$HTTP_CODE" = "200" ]; then
  echo "  ✅ 200 — Correct token accepted"
else
  echo "  ❌ Expected 200, got $HTTP_CODE"
fi
echo ""

# ---- Test 4: API — Not found ----
echo "--- Test 4: API — Nonexistent conversation returns 404 ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/share/00000000-0000-0000-0000-000000000000")
if [ "$HTTP_CODE" = "404" ]; then
  echo "  ✅ 404 Not Found"
else
  echo "  ❌ Expected 404, got $HTTP_CODE"
fi
echo ""

# ---- Test 5: API — Enable sharing ----
echo "--- Test 5: API — Enable/disable sharing endpoints ---"
echo "  Enable public..."
RESPONSE=$(curl -s -X POST "$API/api/share/$CONV_ID/enable" \
  -H "Content-Type: application/json" \
  -d '{"mode":"public"}')
STATUS=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('shareStatus',''))")
if [ "$STATUS" = "public" ]; then
  echo "  ✅ Public sharing enabled"
else
  echo "  ❌ Expected shareStatus=public, got: $RESPONSE"
fi

echo "  Enable token..."
RESPONSE=$(curl -s -X POST "$API/api/share/$CONV_ID/enable" \
  -H "Content-Type: application/json" \
  -d '{"mode":"token"}')
TOKEN=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('shareToken',''))")
if [ ${#TOKEN} -eq 64 ]; then
  echo "  ✅ Token sharing enabled (token: ${TOKEN:0:8}...)"
else
  echo "  ❌ Expected 64-char token, got length ${#TOKEN}"
fi

echo "  Disable..."
RESPONSE=$(curl -s -X POST "$API/api/share/$CONV_ID/disable")
SUCCESS=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',''))")
if [ "$SUCCESS" = "True" ]; then
  echo "  ✅ Sharing disabled"
else
  echo "  ❌ Expected success=true, got: $RESPONSE"
fi
echo ""

# ---- Reset to public for browser tests ----
echo "--- Resetting conversation to public for browser tests ---"
docker exec rita-postgres-1 psql -U rita -d rita -q -c \
  "UPDATE conversations SET share_status = 'public', share_token = NULL WHERE id = '$CONV_ID';"
echo "  Done. Conversation is public."
echo ""

echo "============================================"
echo "API tests complete. Now run browser tests:"
echo ""
echo "  # Public share page:"
echo "  $CLIENT/jarvis/$CONV_ID"
echo ""
echo "  # Token-protected (after setting share_status='token'):"
echo "  $CLIENT/jarvis/$CONV_ID?token=$TEST_TOKEN"
echo ""
echo "  # Playwright automation:"
echo "  \"\$PWCLI\" open $CLIENT/jarvis/$CONV_ID --headed"
echo "  \"\$PWCLI\" snapshot"
echo "  \"\$PWCLI\" screenshot output/playwright/share-page.png"
echo "============================================"
