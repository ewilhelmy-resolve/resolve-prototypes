---
name: run-application
description: Start the RITA dev environment — Docker infra, API server (port 3000), and client (port 5173). Kills existing processes on those ports first. Use when user says "start the app", "run application", "restart server", "start dev", "spin up the app", "launch servers", or wants to get their local environment running.
version: 1.0.0
---

## Context

- API server: port 3000 (`pnpm dev:api`)
- Client: port 5173 (`pnpm dev:client`)
- Demo mode bypasses Keycloak auth (DEMO_MODE=true in .env, VITE_DEMO_MODE=true in packages/client/.env)
- Docker services (postgres, rabbitmq, valkey, mailpit) may already be running from resolve-onboarding — reuse them

## Workflow

### 1. Kill Existing Processes on Ports
```bash
lsof -ti :5173 | xargs kill -9 2>/dev/null; lsof -ti :3000 | xargs kill -9 2>/dev/null; echo "ports cleared"
```

### 2. Clear Vite Cache
```bash
rm -rf packages/client/node_modules/.vite
```

### 3. Check Docker Services
```bash
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep -E "5432|5672|6379"
```
- If postgres (5432), rabbitmq (5672), and valkey (6379) are running (from any project), **skip Docker start**
- If missing, start only needed services (skip Keycloak in demo mode):
  ```bash
  docker compose up -d postgres rabbitmq valkey mailpit
  ```
- Wait for health checks before proceeding

### 4. Install Dependencies (if needed)
```bash
pnpm install
```

### 5. Start API Server (background)
```bash
pnpm dev:api
```
- Run in background
- Wait for health check: `curl -s http://localhost:3000/health`

### 6. Start Client (background)
```bash
pnpm dev:client
```
- Run in background
- Wait for: `curl -s http://localhost:5173`

### 7. Verify Both Servers
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173
```
- Both must return 200

### 8. Report
- Confirm both servers running with URLs
- Note demo mode status (Keycloak bypassed or not)
- If either server failed, show the error output
