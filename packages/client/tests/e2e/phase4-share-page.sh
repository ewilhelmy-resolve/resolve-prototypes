#!/bin/bash
# =============================================================================
# E2E: Snapshot-based Share (/jarvis/:shareId)
# =============================================================================
# Tests the snapshot share flow end-to-end.
#
# Prerequisites:
#   - Full stack running (pnpm dev)
#   - Migration 175 applied (shared_conversations table)
#   - At least one conversation with messages in the DB
#
# Notes:
#   - POST /enable and /disable require Keycloak auth — this script only
#     tests the public GET path. To test enable/disable, run
#     `pnpm e2e:login` first and pass --cookie to curl.
#
# Usage:
#   chmod +x packages/client/tests/e2e/phase4-share-page.sh
#   ./packages/client/tests/e2e/phase4-share-page.sh
# =============================================================================

set -euo pipefail

API="http://localhost:3000"
CLIENT="http://localhost:5173"

# Latest real conversation with messages (update if needed)
CONV_ID=$(docker exec rita-postgres-1 psql -U rita -d rita -t -A -c \
  "SELECT id FROM conversations ORDER BY created_at DESC LIMIT 1;")
CONV_ID=$(echo "$CONV_ID" | tr -d '[:space:]')
TEST_SHARE_ID="e2e-test-snapshot-$(date +%s)"

echo "============================================"
echo "E2E: Snapshot Share Tests"
echo "  conversation: $CONV_ID"
echo "  shareId:      $TEST_SHARE_ID"
echo "============================================"
echo ""

# ---- Setup: seed a snapshot directly in the DB ----
echo "--- Setup: seed snapshot ---"
docker exec rita-postgres-1 psql -U rita -d rita -q -c "
  INSERT INTO shared_conversations (share_id, conversation_id, title, messages)
  SELECT '$TEST_SHARE_ID', c.id, c.title,
         COALESCE(jsonb_agg(to_jsonb(m.*) ORDER BY m.created_at ASC), '[]'::jsonb)
  FROM conversations c
  LEFT JOIN messages m ON m.conversation_id = c.id
  WHERE c.id = '$CONV_ID'
  GROUP BY c.id, c.title
  ON CONFLICT (conversation_id) DO UPDATE
    SET share_id = EXCLUDED.share_id, messages = EXCLUDED.messages;
"
echo "  ✅ Snapshot seeded"
echo ""

# ---- Test 1: Valid shareId returns 200 with messages ----
echo "--- Test 1: GET /api/share/:shareId — valid snapshot ---"
RESPONSE=$(curl -s "$API/api/share/$TEST_SHARE_ID")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/share/$TEST_SHARE_ID")
if [ "$HTTP_CODE" = "200" ]; then
  MSG_COUNT=$(echo "$RESPONSE" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['messages']))")
  TITLE=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['conversation']['title'])")
  echo "  ✅ 200 OK — title='$TITLE', messages=$MSG_COUNT"
else
  echo "  ❌ Expected 200, got $HTTP_CODE"
fi
echo ""

# ---- Test 2: Unknown shareId returns 404 ----
echo "--- Test 2: Unknown shareId returns 404 ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/share/definitely-not-a-real-share-id")
if [ "$HTTP_CODE" = "404" ]; then
  echo "  ✅ 404 Not Found"
else
  echo "  ❌ Expected 404, got $HTTP_CODE"
fi
echo ""

# ---- Test 3: Oversized shareId returns 400 ----
echo "--- Test 3: Oversized shareId returns 400 ---"
OVERSIZED=$(python3 -c 'print("x" * 200)')
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/share/$OVERSIZED")
if [ "$HTTP_CODE" = "400" ]; then
  echo "  ✅ 400 Bad Request"
else
  echo "  ❌ Expected 400, got $HTTP_CODE"
fi
echo ""

# ---- Test 4: Deleted snapshot returns 404 ----
echo "--- Test 4: After DELETE, shareId returns 404 ---"
docker exec rita-postgres-1 psql -U rita -d rita -q -c \
  "DELETE FROM shared_conversations WHERE share_id = '$TEST_SHARE_ID';"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/share/$TEST_SHARE_ID")
if [ "$HTTP_CODE" = "404" ]; then
  echo "  ✅ 404 — snapshot deleted, URL no longer resolves"
else
  echo "  ❌ Expected 404 after delete, got $HTTP_CODE"
fi
echo ""

echo "============================================"
echo "API tests complete. Browser test:"
echo ""
echo "  # Re-seed for manual browser verification:"
echo "  (see 'Setup: seed snapshot' block above)"
echo ""
echo "  # Open in browser:"
echo "  $CLIENT/jarvis/<shareId>"
echo ""
echo "  # Authenticated flow (requires session cookie):"
echo "  pnpm e2e:login testuser test"
echo "  curl -b cookies.txt -X POST $API/api/conversations/$CONV_ID/share/enable"
echo "  # Response: { shareUrl, shareId } — open shareUrl in browser"
echo "============================================"
