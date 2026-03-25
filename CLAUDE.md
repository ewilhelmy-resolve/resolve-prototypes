# Rita

AI chat assistant for IT service desk

- Be extremely concise, sacrifice grammar for concision
- **Always use `pnpm`** — never npm or yarn
- **Never add Claude as author** in git commit messages (no Co-authored-by, no AI attribution)

## Plans

- List unresolved questions at end of each plan. Extremely concise.

## Commands

```bash
# Development
pnpm dev              # Full stack (docker + all services)
pnpm dev:client       # Client dev server (port 5173)
pnpm dev:api          # API server (port 3000)
pnpm dev:mock         # Mock service
pnpm dev:theme        # Keycloak theme dev
pnpm dev:iframe-app   # Iframe host (port 5174)
pnpm setup            # Initial project setup

# E2E Validation (agent-driven)
pnpm e2e:check        # Verify all services running
pnpm db:reset         # Reset DB to deterministic seed
pnpm e2e:login        # Get session cookie for playwright-cli
pnpm e2e:login testmember test  # Login as member
pnpm e2e:reset-keycloak  # Re-import Keycloak realm

# Build
pnpm build            # Build api-server + client
pnpm build:theme      # Build Keycloak theme

# Quality
pnpm test             # Client unit tests (vitest)
pnpm type-check       # TypeScript check (all packages)
pnpm lint             # Lint all packages (biome)
pnpm storybook        # Storybook (port 6006)

# API Server
pnpm --filter rita-api-server test:run       # API tests
pnpm --filter rita-api-server migrate        # DB migrations
pnpm --filter rita-api-server docs:generate  # Regenerate OpenAPI spec

# Client
pnpm --filter rita-client test:unit          # Client tests
pnpm --filter rita-client check:fix          # Auto-fix lint+format (⚠️ formats ALL files, ask user before running)

# Infrastructure
docker compose up -d  # Start all Docker services
pnpm docker:stop      # Stop Docker services
```

## Documentation

| Document | Purpose |
|----------|---------|
| [Architecture](docs/architecture.md) | System design, data flow, package responsibilities |
| [Development](docs/development.md) | Prerequisites, setup, daily workflow |
| [Coding Guidelines](docs/coding-guidelines.md) | Code style, error handling, naming conventions |
| [Testing](docs/testing.md) | Test commands, conventions, patterns |
| [PR Workflow](docs/pr-workflow.md) | Commits, PRs, branch naming, review process |
| [docs/README.md](docs/README.md) | Full documentation index (61 docs) |

## Core Principles

1. **Platform-driven** — thin frontend, backend-heavy logic. RITA → Actions → Rabbit → RITA for all user actions.
2. **SOC2 compliance** — audit all user actions, secure data handling, no PII in logs or webhooks.
3. **Accessibility first** — WCAG 2.1 AA, ARIA labels on all forms, keyboard navigable.
4. **Async messaging** — inter-service communication via RabbitMQ. Real-time updates via SSE.
5. **Type safety** — strict TypeScript everywhere. Zod validation at all boundaries.

## Commits

Format: `<type>(<scope>): <description>`

Types: feat, fix, docs, refactor, test, chore, perf

Subject line under 50 chars, no period.

Examples:
- `feat(autopilot): add org-level settings`
- `fix(session): cookie max-age handling`
- `refactor(iframe): use Valkey IDs directly`

## External Dependencies

| Service | Purpose | Verify |
|---------|---------|--------|
| PostgreSQL (pgvector) | Primary DB | `docker compose ps postgres` |
| RabbitMQ | Message broker | http://localhost:15672 (guest/guest) |
| Valkey | Cache/sessions | `docker compose ps valkey` |
| Keycloak | Identity/auth | http://localhost:8080 |
| Mailpit | Dev email | http://localhost:8025 |

All start via `docker compose up -d`.

## Debugging

- **Services not starting**: `docker compose ps` — all 5 must be healthy
- **Auth errors**: verify Keycloak running, check `.env` realm/client IDs
- **SSE not connecting**: check RabbitMQ management UI for queue bindings
- **DB migration issues**: `pnpm migrate` — check `packages/api-server/src/database/`
- **Build OOM**: client type-check runs separately from build (tsc needs ~4GB)
- **Iframe issues**: check Valkey session data, verify `sessionKey`

## Conventions

- **Package manager**: pnpm only (`packageManager` enforced in package.json)
- **Linter/formatter**: Biome — tab indentation, no ESLint/Prettier
- **Pre-commit**: husky + lint-staged → `biome check --write` + `biome lint` + `type-check` + OpenAPI regen
- **Never run `check:fix` without asking** — it reformats ALL files in the package, not just changed ones. Let pre-commit hooks handle formatting on staged files. If full reformat is needed, ask user first.
- **Client state**: Zustand (client), TanStack Query (server)
- **Forms**: React Hook Form + Zod
- **UI**: shadcn/ui + Radix + Tailwind CSS
- **i18n**: i18next (`es-MX`, `en`)
- **Frontend agent**: use fe-enterprise-agent for all `packages/client/` work

---

## Project Architecture

Rita is a pnpm monorepo with 5 packages:
- `packages/api-server/` — Express + Kysely + RabbitMQ + PostgreSQL (pgvector)
- `packages/client/` — React 18 + Vite + shadcn/ui + Zustand + TanStack Query + Keycloak auth
- `packages/mock-service/` — Mock external service for development
- `packages/iframe-app/` — Vite host for embeddable chat iframe
- `keycloak/` — Custom Keycloak login theme (Tailwind)

## Frontend Development Standards (RITA)

### Default Agent Usage
Use **fe-enterprise-agent** for ALL frontend tasks in `packages/client/`. Enforces:

- **SOC2 Type II compliance** — security, availability, processing integrity, confidentiality, privacy
- **WCAG 2.1 AA accessibility** — screen reader and keyboard navigation
- **Component-Based Architecture** — modular, reusable, independently deployable
- **Platform-Driven Architecture** — thin frontend, backend-heavy logic
- **SSE** — real-time updates via EventSource API
- **RITA → Actions → Rabbit → RITA** — async message flow for all actions

### Required Technical Stack
- React 18+ with TypeScript 5+ (strict)
- TanStack Query v5 for server state
- Zustand for client state
- React Hook Form + Zod validation
- Radix UI primitives
- Tailwind CSS + shadcn/ui
- Figma-to-shadcn for design system

### Code Standards
- All components must have TypeScript interfaces
- All forms must have ARIA labels
- All inputs validated with Zod
- All real-time features use SSE
- All user actions audit logged

## Development Workflow

Client runs on port 5173, server on port 3000. Check they're not already running before starting.

### Build Architecture Note
Client build uses `vite build` without `tsc`. Type checking runs separately via `type-check` in CI. Prevents OOM — tsc needs ~4GB heap.

### Iframe Embeddable Chat (Public Guest Access)

Iframe-embeddable version for host pages on same domain.

- Minimal UI (no sidebar/nav)
- Public guest access (no Keycloak)
- Intent tracking via `intent-eid` param
- Routes: `/iframe/chat`, `/iframe/chat/:conversationId`
- All iframe users share `public-guest-user` account
- See `packages/client/IFRAME.md` for integration guide

## Documentation Strategy

Project docs in `docs/`:

| Folder | Purpose |
|--------|---------|
| `core/` | System fundamentals (auth, db, messages, tech design) |
| `architecture/` | Infrastructure (RabbitMQ, file storage, data sources) |
| `features/<name>/` | Feature docs grouped by feature |
| `frontend/` | Client/UI guides (stack, figma workflow) |
| `setup/` | Environment & config (keycloak, staging, email) |
| `archived/` | Shipped implementation plans |
| `feat-<name>/` | Large feature clusters |

**When writing docs:**
- New features → `docs/features/<feature-name>/`
- Implementation plans → archive after shipping to `docs/archived/`
- Package-specific → `packages/<pkg>/docs/`
- See `docs/README.md` for full index
