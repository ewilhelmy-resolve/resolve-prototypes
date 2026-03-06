---
name: dev
description: Start the full dev environment (API + client). Checks Docker, ports, and health before reporting ready.
version: 1.0.0
---

## Start Dev Environment

Execute these steps in order:

### 1. Check Docker
```bash
docker info > /dev/null 2>&1 && echo "Docker OK" || echo "Docker NOT running"
```
- If Docker is not running, tell the user to start Docker Desktop and STOP. Do not continue.

### 2. Check for port conflicts
```bash
lsof -i :3000 -t 2>/dev/null && echo "PORT 3000 IN USE" || echo "Port 3000 free"
lsof -i :5173 -t 2>/dev/null && echo "PORT 5173 IN USE" || echo "Port 5173 free"
```
- If ports are in use, tell the user which ports are occupied and ask if they want to kill existing processes.

### 3. Start API server
```bash
cd /Users/ericawilhelmy/Documents/resolve-onboarding && pnpm dev:api &
```
- Wait 5 seconds, then health check:
```bash
curl -s http://localhost:3000/api/health || curl -s http://localhost:3000/health || echo "API not responding yet"
```
- If API doesn't respond after 10s, check logs for errors.

### 4. Start client (RITA — NOT iframe-app)
```bash
cd /Users/ericawilhelmy/Documents/resolve-onboarding && pnpm dev:client &
```
- Wait for Vite to report ready on port 5173.

### 5. Report status
Tell the user:
- **API server**: http://localhost:3000
- **RITA client**: http://localhost:5173
- **Current branch**: `git branch --show-current`
- **Uncommitted changes**: `git status --short`
- Both services ready
