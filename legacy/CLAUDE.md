## Development Workflow

### Validation Process
When asked to validate a change, execute the following steps in order:

1. **Rebuild the Docker app**
   ```bash
   docker compose build --pull
   docker compose up -d
   ```

2. **Wait for service health**
   ```bash
   # Wait for app and postgres services to be healthy
   docker compose ps
   # Verify health status shows (healthy) for both services
   ```

3. **Validate with Playwright-MCP** 
   - Use the mcp__playwright__browser tools to navigate and test the application
   - Test signup flow, signin flow, and dashboard access

4. **Run all end-to-end tests**
   ```bash
   npm test
   # or
   playwright test
   ```
   
   Available test files:
   - `tests/dashboard.spec.js` - Dashboard functionality tests
   - `tests/onboarding-journey.spec.js` - Complete onboarding flow tests

### Important Rules
- If any step fails, stop immediately, surface the failing logs, and report the cause
- **No new commits or pushes should be created until all e2e tests pass**
- When asked to "prepare a check-in," first re-run the e2e suite; do not proceed if any tests are failing
- **Remember there is only one single docker-compose do not add new ones**
- Do not mess with either the docker-compose.yml or the github action unless explicitly told to
- **All screenshots from Playwright MCP should be saved to `.playwright-mcp/` directory (ignored by git)**

### Environment Variables (Configurable Defaults)
- `APP_SERVICE` = docker compose service name (default: `app`)
- `POSTGRES_SERVICE` = postgres service name (default: `postgres`)
- `COMPOSE_FILE` = compose file path (default: `docker-compose.yml`)
- `TEST_CMD` = e2e test command (default: `npm test`)
- `PORT` = application port (default: `5000`)

### Command Shortcuts
- When "single command" or "validate-change" is mentioned, run the full validation sequence above
- `npm test` runs all Playwright tests
- `npm run test:ui` opens Playwright UI mode
- `npm run test:headed` runs tests with browser visible

### Style & Reminders
- Prefer concise status updates with clear pass/fail signals
- Always show where the failure occurred and the next action to fix it
- Application runs on port 5000 to avoid Keycloak conflict on 8080