---
name: "e2e-validate"
description: "Validate UI changes by navigating the running Rita app as a real user. Use when implementing frontend features, fixing UI bugs, or verifying navigation flows. Requires full stack running (pnpm dev). Uses the playwright skill for browser automation."
---

# E2E Validation Skill

Validate your UI changes by navigating the running Rita app with `playwright-cli`.

**IMPORTANT: Always research before browsing.** Before opening the browser, identify the route path, required feature flags, and required user role by reading the source code.

## Prerequisites

Before running any `$PWCLI` commands, set up the environment:

```bash
# 1. Verify npx is available (playwright-cli wrapper depends on it)
command -v npx >/dev/null 2>&1 || echo "ERROR: npx not found, install Node.js"

# 2. Set PWCLI to the project-local playwright wrapper script
export PWCLI="$(pwd)/.claude/skills/playwright/scripts/playwright_cli.sh"

# 3. Set session name (all commands share this browser session)
export PLAYWRIGHT_CLI_SESSION=rita-e2e
```

These exports must be set in every bash block that uses `$PWCLI`.

For advanced playwright-cli usage (tabs, traces, eval, etc.), read the playwright skill:
`.claude/skills/playwright/SKILL.md` and its `references/cli.md`.

## Workflow (must follow in order)

### Step 1: Research the target

Before touching the browser, answer these questions:

1. **What route path?** — Read `packages/client/src/router.tsx` for the URL
2. **What flags are needed?** — Check the page component for `useFeatureFlag()` calls
3. **What role is needed?** — Check if route uses `RoleProtectedRoute` (owner/admin only)
4. **What sidebar path?** — Check the layout component for navigation structure

```bash
# Find the route
grep -n "path.*settings\|path.*itsm" packages/client/src/router.tsx

# Find required flags for a page
grep "useFeatureFlag" packages/client/src/pages/settings/ItsmSources.tsx

# Check if a layout hides elements behind flags
grep "useFeatureFlag" packages/client/src/components/layouts/RitaSettingsLayout.tsx
```

### Step 2: Ensure services are running

```bash
pnpm e2e:check
```

### Step 3: Reset to known state (if needed)

```bash
pnpm db:reset
```

### Step 4: Open browser with auto-login

The auto-login endpoint sets localStorage flags and redirects through Keycloak.
The browser lands on the Keycloak login form — fill it with 3 commands:

```bash
# Open auto-login (sets flags, redirects to Keycloak)
"$PWCLI" open "http://localhost:5173/test/auto-login?flags=<FLAGS>&redirect=<PATH>"

# Keycloak login form — refs are stable:
#   e10 = username, e12 = password, e15 = Sign In button
"$PWCLI" fill e10 "<USERNAME>"
"$PWCLI" fill e12 "<PASSWORD>"
"$PWCLI" click e15

# Wait for app to load, then verify
"$PWCLI" snapshot
```

**Full example — ITSM settings with ServiceNow:**
```bash
"$PWCLI" open "http://localhost:5173/test/auto-login?flags=ENABLE_SERVICENOW&redirect=/settings/connections/itsm"
"$PWCLI" fill e10 "testuser"
"$PWCLI" fill e12 "test"
"$PWCLI" click e15
sleep 2
"$PWCLI" snapshot
```

**Simple login — chat page, no flags:**
```bash
"$PWCLI" open "http://localhost:5173/test/auto-login"
"$PWCLI" fill e10 "testuser"
"$PWCLI" fill e12 "test"
"$PWCLI" click e15
"$PWCLI" snapshot
```

### Step 5: Interact and validate

```bash
"$PWCLI" snapshot    # Get element refs
"$PWCLI" click eN    # Interact
"$PWCLI" snapshot    # Verify result
"$PWCLI" screenshot  # Capture evidence
```

### Step 6: Clean up

```bash
"$PWCLI" close
```

## How Auto-Login Works

```
Browser → /test/auto-login (API, proxied via Vite)
  → Sets localStorage flags
  → Redirects to Keycloak auth URL

Browser → Keycloak login form
  → Agent fills username/password (3 commands)
  → Keycloak authenticates, sets SSO cookies

Browser → /test/auto-login-complete (API, proxied)
  → 302 redirects to final destination

Browser → /settings/connections/itsm (client)
  → keycloak-js check-sso detects Keycloak session
  → Authenticated! Page renders with flags applied
```

## Route Reference

### Main app (requires auth)

| Route | Page | Role | Flags needed |
|-------|------|------|-------------|
| `/chat` | Chat home | any | — |
| `/chat/:conversationId` | Chat conversation | any | — |
| `/content` | Knowledge articles | owner, admin | — |
| `/tickets` | Tickets list | owner, admin | `ENABLE_TICKETS_V2` for V2 UI |
| `/tickets/:id` | Cluster detail | owner, admin | — |
| `/tickets/:clusterId/:ticketId` | Ticket detail | owner, admin | — |
| `/devtools` | Dev tools panel | any | — |
| `/jirita` | Workflow builder | any | `ENABLE_WORKFLOWS` |

### Settings (requires auth)

| Route | Page | Role | Flags needed |
|-------|------|------|-------------|
| `/settings/profile` | User profile | any | — |
| `/settings/connections/knowledge` | Knowledge sources | any | — |
| `/settings/connections/knowledge/:id` | Knowledge source detail | any | — |
| `/settings/connections/itsm` | ITSM sources | any | At least one: `ENABLE_SERVICENOW`, `ENABLE_JIRA`, `ENABLE_IVANTI`, `ENABLE_FRESHSERVICE` |
| `/settings/connections/itsm/:id` | ITSM source detail | any | Same as above |
| `/settings/users` | User management | any | — |

### Public (no auth)

| Route | Page |
|-------|------|
| `/login` | Signup / sign-in |
| `/iframe/chat` | Iframe embedded chat |
| `/credential-setup` | IT admin credential delegation |
| `/demo/schema-renderer` | Schema renderer demo |

## Feature Flags Reference

### Local flags (localStorage — set via auto-login `flags` param)

| Flag | Controls |
|------|----------|
| `ENABLE_SERVICENOW` | ServiceNow KB + ITSM in connection sources |
| `ENABLE_JIRA` | Jira ITSM in connection sources |
| `ENABLE_IVANTI` | Ivanti ITSM in connection sources |
| `ENABLE_FRESHSERVICE` | Freshservice ITSM in connection sources |
| `ENABLE_TICKETS_V2` | New cluster-based tickets UI |
| `ENABLE_WORKFLOWS` | Workflow builder (JIRITA) |
| `ENABLE_MULTI_FILE_UPLOAD` | Multi-file upload in chat and files |
| `ENABLE_LANGUAGE_SWITCHER` | EN/ES-MX language dropdown in header |
| `ENABLE_EXPERIMENTAL_FEATURES` | Experimental features |
| `SHOW_WELCOME_MODAL` | Force welcome modal to show |

### Platform flags (API-controlled — set via `/test/feature-flags`)

| Flag (platform name) | Controls |
|----------------------|----------|
| `auto-pilot` | Auto Pilot master toggle |
| `auto-pilot-suggestions` | AI-powered suggestions |
| `auto-pilot-actions` | Automated actions execution |
| `iframe-dev-tools` | Dev tools in iframe chat |

## Auto-Login Endpoint

```
GET http://localhost:5173/test/auto-login?flags=<FLAGS>&redirect=<PATH>
```

| Param | Default | Description |
|-------|---------|-------------|
| `redirect` | `/chat` | Client path to redirect to after login |
| `flags` | — | Comma-separated localStorage flag names to enable |

Note: Username/password are filled in the Keycloak form, not in the URL.

## Test Accounts

| Username | Password | Role | User ID |
|----------|----------|------|---------|
| `testuser` | `test` | owner | `22222222-2222-2222-2222-222222222222` |
| `testmember` | `test` | member | `33333333-3333-3333-3333-333333333333` |

## Deterministic Data (after `pnpm db:reset`)

| Entity | ID | Notes |
|--------|----|-------|
| Organization | `11111111-1111-1111-1111-111111111111` | "Test Organization" |
| Conversation 1 | `44444444-4444-4444-4444-444444444444` | Has 4 messages |
| Conversation 2 | `55555555-5555-5555-5555-555555555555` | Empty |

## Keycloak Login Form Refs

The Keycloak login form element refs are **stable** (same across sessions):

| Ref | Element |
|-----|---------|
| `e10` | Username textbox |
| `e12` | Password textbox |
| `e15` | "Sign In" button |

## Important Patterns

### File upload
The hidden `<input type="file">` is triggered by a button click. You must `upload` immediately after `click`:

```bash
"$PWCLI" click e113        # Click "Add Article" (or any upload button)
"$PWCLI" upload path/to/file.txt   # Must follow immediately — file chooser modal times out
```

- Files must be inside the project root (playwright-cli blocks external paths)
- Use `scripts/e2e/fixtures/` for test files

### Welcome modal
On fresh DB state (`pnpm db:reset`), a welcome modal appears on first page load. Dismiss it before interacting:

```bash
"$PWCLI" snapshot   # Look for dialog with "Get Started" / "Close" button
"$PWCLI" click eN   # Click Close (ref=e20 typically) or Get Started
```

### Navigation within a session
Each `"$PWCLI" open` creates a **new browser** (loses auth). After auto-login, navigate within the same session using clicks or `eval`:

```bash
# Good — click sidebar links to navigate
"$PWCLI" click e40   # Click "Knowledge Articles" in sidebar

# Good — use eval for programmatic navigation (stays in same session)
"$PWCLI" eval "window.location.href = 'http://localhost:5173/verify-email?token=abc123'"

# Bad — opens new browser, loses auth
"$PWCLI" open "http://localhost:5173/content"
```

## Mailpit (Email Testing)

Mailpit captures all emails sent by the app (signup verification, invitations, password reset).

**Web UI**: http://localhost:8025

**API** (for agents to extract links from emails):

```bash
# List messages
curl -s http://localhost:8025/api/v1/messages | jq '.messages[0]'

# Get specific message (HTML body)
curl -s http://localhost:8025/api/v1/message/{ID} | jq -r '.HTML'

# Search for emails by recipient
curl -s "http://localhost:8025/api/v1/search?query=to:testuser@example.com" | jq '.messages'

# Delete all messages (clean slate)
curl -X DELETE http://localhost:8025/api/v1/messages
```

**Common pattern — extract verification link from email:**
```bash
# After signup, get the latest email and extract the verification URL
EMAIL_ID=$(curl -s http://localhost:8025/api/v1/messages | jq -r '.messages[0].ID')
VERIFY_URL=$(curl -s "http://localhost:8025/api/v1/message/$EMAIL_ID" | jq -r '.HTML' | grep -o 'href="[^"]*verify[^"]*"' | head -1 | sed 's/href="//;s/"$//')
echo "$VERIFY_URL"

# Navigate to it in the browser (within same session)
"$PWCLI" eval "window.location.href = '$VERIFY_URL'"
```

## Troubleshooting

- **"No session found"** → Cookie expired. Re-run auto-login flow
- **Page/feature not visible** → Check flags. Research with `grep "useFeatureFlag" <page-file>`
- **"Not authorized"** → Check role. Use `testuser` (owner) for admin pages
- **Services not running** → `pnpm e2e:check`, then `pnpm dev`
- **Stale data** → `pnpm db:reset`
- **Element ref not found** → `"$PWCLI" snapshot` to get fresh refs
- **Welcome modal blocking** → Dismiss: click "Get Started" button
- **`open` resets auth** → Each `open` creates new browser. Do all navigation within one session
- **Keycloak "Cookie not found"** → Don't fetch Keycloak pages server-side; browser must visit Keycloak directly
