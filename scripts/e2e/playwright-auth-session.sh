#!/usr/bin/env bash
set -euo pipefail

# Open an authenticated playwright-cli session via auto-login.
#
# Usage:
#   ./scripts/e2e/playwright-auth-session.sh [session-name] [redirect] [flags]
#   ./scripts/e2e/playwright-auth-session.sh rita /chat
#   ./scripts/e2e/playwright-auth-session.sh rita /settings/connections/itsm ENABLE_SERVICENOW
#
# This opens the auto-login page. The agent must then fill the Keycloak form:
#   "$PWCLI" fill e10 "testuser"
#   "$PWCLI" fill e12 "test"
#   "$PWCLI" click e15
#
# Prerequisites:
#   - Full stack running (pnpm e2e:check)
#   - DB seeded (pnpm db:reset)

SESSION_NAME="${1:-rita-e2e}"
REDIRECT="${2:-/chat}"
FLAGS="${3:-}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Resolve playwright-cli wrapper
PWCLI="$REPO_ROOT/.claude/skills/playwright/scripts/playwright_cli.sh"

if [[ ! -f "$PWCLI" ]]; then
  echo "❌ playwright_cli.sh not found at $PWCLI"
  exit 1
fi

# Build auto-login URL
URL="http://localhost:5173/test/auto-login?redirect=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$REDIRECT'))")"
if [[ -n "$FLAGS" ]]; then
  URL="${URL}&flags=${FLAGS}"
fi

echo "🌐 Opening session '$SESSION_NAME' → $REDIRECT"
if [[ -n "$FLAGS" ]]; then
  echo "   Flags: $FLAGS"
fi

export PLAYWRIGHT_CLI_SESSION="$SESSION_NAME"
"$PWCLI" open "$URL"

echo ""
echo "📝 Fill the Keycloak login form:"
echo "   \"\$PWCLI\" fill e10 \"testuser\""
echo "   \"\$PWCLI\" fill e12 \"test\""
echo "   \"\$PWCLI\" click e15"
echo ""
echo "   Then: \"\$PWCLI\" snapshot"
