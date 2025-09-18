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

## Frontend Development Standards

### Default Agent Usage
This project uses the **fe-enterprise-agent** as the default for ALL frontend development tasks. The agent enforces:

- **SOC2 Type II compliance** - Security, availability, processing integrity, confidentiality, privacy
- **WCAG 2.1 AA accessibility** - Full screen reader and keyboard navigation support
- **Component-Based Architecture (CBA)** - Modular, reusable, independently deployable components
- **Platform-Driven Architecture** - Thin frontend, backend-heavy business logic
- **Server-Sent Events (SSE)** - Real-time updates via EventSource API
- **Rita → Actions → Rabbit → Rita Pattern** - Asynchronous message flow for all user actions

### Required Technical Stack
- **React 18+** with **TypeScript 5+** (strict mode)
- **TanStack Query v5** for server state management
- **Zustand** for lightweight client state
- **React Hook Form** with **Zod** validation
- **Radix UI** for accessible component primitives
- **Tailwind CSS** for utility-first styling

### Code Standards
- All components must include proper TypeScript interfaces
- All forms must have ARIA labels and accessibility attributes
- All user inputs must be validated with Zod schemas
- All real-time features must use Server-Sent Events
- All user actions must follow audit logging requirements
- All components must be tested for accessibility compliance

**Note**: These standards apply to all developers working on this project and are enforced automatically through the fe-enterprise-agent configuration.