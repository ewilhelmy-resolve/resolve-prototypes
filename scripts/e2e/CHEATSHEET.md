# E2E Validation Cheatsheet

## Setup

```bash
pnpm e2e:check            # Are all services up?
pnpm db:reset             # Reset DB to clean seed
pnpm e2e:reset-keycloak   # Re-import Keycloak realm (rarely needed)
```

## Auto-Login (4 commands)

```bash
# 1. Open auto-login (sets flags, redirects to Keycloak)
"$PWCLI" open "http://localhost:5173/test/auto-login?flags=ENABLE_SERVICENOW&redirect=/settings/connections/itsm"

# 2-4. Fill Keycloak form (refs are stable: e10=username, e12=password, e15=submit)
"$PWCLI" fill e10 "testuser"
"$PWCLI" fill e12 "test"
"$PWCLI" click e15

# 5. Verify
sleep 2
"$PWCLI" snapshot
```

## Common Scenarios

```bash
# Chat (no flags needed)
"$PWCLI" open "http://localhost:5173/test/auto-login"

# ITSM Settings
"$PWCLI" open "http://localhost:5173/test/auto-login?flags=ENABLE_SERVICENOW&redirect=/settings/connections/itsm"

# All ITSM providers
"$PWCLI" open "http://localhost:5173/test/auto-login?flags=ENABLE_SERVICENOW,ENABLE_JIRA,ENABLE_IVANTI,ENABLE_FRESHSERVICE&redirect=/settings/connections/itsm"

# Tickets V2
"$PWCLI" open "http://localhost:5173/test/auto-login?flags=ENABLE_TICKETS_V2&redirect=/tickets"

# Knowledge articles (no flags)
"$PWCLI" open "http://localhost:5173/test/auto-login?redirect=/content"

# Login as member
# (fill e10 with "testmember" instead of "testuser")
```

## Test Accounts

```
testuser   / test → owner  (22222222-2222-2222-2222-222222222222)
testmember / test → member (33333333-3333-3333-3333-333333333333)
```

## Platform Flags (API)

```bash
curl -X POST http://localhost:5173/test/feature-flags \
  -H "Content-Type: application/json" \
  -d '{"flags":{"auto-pilot":true}}'

curl -X DELETE http://localhost:5173/test/feature-flags
```
