# E2E Validation Scripts

Scripts for agent-driven e2e validation of the Rita app. Agents use `playwright-cli` to navigate the running app and validate their changes.

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `health-check.ts` | `pnpm e2e:check` | Verify all 7 services are running |
| `login.ts` | `pnpm e2e:login [user] [pass]` | Get session cookie (for curl/API testing) |
| `set-flags.ts` | `tsx scripts/e2e/set-flags.ts flag=value` | Set platform feature flag overrides |
| `playwright-auth-session.sh` | `./scripts/e2e/playwright-auth-session.sh` | Open playwright-cli with auto-login |
| `reset-keycloak.mjs` | `pnpm e2e:reset-keycloak` | Wipe Keycloak volume and re-import realm |

## Quick Start

```bash
pnpm dev              # Start full stack
pnpm e2e:check        # Verify services
pnpm db:reset         # Reset to deterministic state

# Open browser via auto-login (sets flags + redirects through Keycloak)
"$PWCLI" open "http://localhost:5173/test/auto-login?flags=ENABLE_SERVICENOW&redirect=/settings/connections/itsm"
# Fill Keycloak form: fill e10 "testuser", fill e12 "test", click e15
```

## Authentication

The app uses Keycloak SSO for browser auth. **HttpOnly cookies can't be injected** via playwright-cli.

### Browser auth (for playwright-cli)
Use the **auto-login endpoint** which sets localStorage flags and redirects through Keycloak:
```
GET /test/auto-login?flags=FLAG1,FLAG2&redirect=/path
```
The agent then fills the Keycloak login form (3 commands).

### API auth (for curl/scripts)
Use `pnpm e2e:login` to get a session cookie for API-only testing:
```bash
pnpm e2e:login        # outputs Set-Cookie header
```

## Architecture

```
/test/auto-login?flags=...&redirect=...
  ├── Serve HTML page
  ├── Set localStorage feature flags (if any)
  └── Redirect browser to Keycloak auth URL
        ├── Agent fills username/password (3 commands)
        ├── Keycloak authenticates, sets SSO cookies
        └── Redirects to /test/auto-login-complete → final page

pnpm db:reset
  ├── Drop all tables (CASCADE)
  ├── Run all migrations
  ├── Execute base.sql seed (deterministic IDs)
  ├── Flush Valkey (sessions)
  └── Purge RabbitMQ queues

pnpm e2e:check
  └── Check: PostgreSQL, RabbitMQ, Valkey, Keycloak, API Server, Client
```

## Deterministic Test Data

See `packages/api-server/src/database/seed/constants.ts` for all fixed IDs.

| Entity | UUID |
|--------|------|
| Test Organization | `11111111-1111-1111-1111-111111111111` |
| Owner (testuser) | `22222222-2222-2222-2222-222222222222` |
| Member (testmember) | `33333333-3333-3333-3333-333333333333` |
| Conversation 1 | `44444444-4444-4444-4444-444444444444` |
| Conversation 2 | `55555555-5555-5555-5555-555555555555` |

## Test Accounts

| Username | Password | Role | Keycloak ID |
|----------|----------|------|-------------|
| testuser | test | owner | `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` |
| testmember | test | member | `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb` |

## Feature Flags

Two separate systems — see `.claude/skills/e2e-validate/SKILL.md` for the full reference.

- **Local flags** (localStorage): Set via auto-login `flags` param. Controls ITSM, tickets, etc.
- **Platform flags** (API): Set via `POST /test/feature-flags`. Controls autopilot, iframe dev tools.
