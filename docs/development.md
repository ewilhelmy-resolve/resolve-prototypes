# Development

## Prerequisites

- **Node.js** 20.x
- **pnpm** 9.15.0 (enforced via `packageManager` field)
- **Docker** + Docker Compose (for PostgreSQL, RabbitMQ, Valkey, Keycloak, Mailpit)
- **Git** with hooks support (husky)

## Setup

```bash
# 1. Clone the repo
git clone <repo-url> && cd rita-chat

# 2. Run setup (installs deps, starts Docker, runs migrations)
pnpm setup

# 3. Copy environment files
cp .env.example .env

# 4. Start everything
pnpm dev
```

`pnpm setup` runs `scripts/setup.js` which:
1. Checks Docker is running
2. Runs `pnpm install`
3. Starts Docker services (`docker compose up -d`)
4. Runs database migrations

`pnpm dev` runs `scripts/dev.js` which:
1. Starts Docker services
2. Runs api-server, client, and mock-service concurrently

## Daily Workflow

```bash
# Start full stack
pnpm dev

# Or start individual services
pnpm dev:client       # React app at http://localhost:5173
pnpm dev:api          # API at http://localhost:3000
pnpm dev:mock         # Mock service

# Run tests before committing
pnpm test             # Client unit tests
pnpm type-check       # TypeScript check all packages
pnpm lint             # Biome lint all packages

# Storybook for component dev
pnpm storybook        # http://localhost:6006
```

## Available Commands

### Root (monorepo)

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start full stack (docker + all services) |
| `pnpm dev:client` | Client dev server (port 5173) |
| `pnpm dev:api` | API server (port 3000) |
| `pnpm dev:mock` | Mock service |
| `pnpm dev:theme` | Keycloak theme dev (Tailwind watch) |
| `pnpm dev:iframe-app` | Iframe host (port 5174) |
| `pnpm dev:restart` | Stop docker + restart dev |
| `pnpm setup` | Initial project setup |
| `pnpm build` | Build api-server + client |
| `pnpm build:theme` | Build Keycloak theme |
| `pnpm test` | Client unit tests (vitest) |
| `pnpm type-check` | TypeScript check all packages |
| `pnpm lint` | Lint all packages (biome) |
| `pnpm migrate` | Run DB migrations |
| `pnpm storybook` | Start Storybook (port 6006) |
| `pnpm docker:stop` | Stop Docker services |

### API Server (`pnpm --filter rita-api-server <cmd>`)

| Command | Description |
|---------|-------------|
| `dev` | Start with tsx watch + dotenv |
| `build` | Compile TypeScript |
| `test` / `test:run` | Vitest (watch / single run) |
| `test:coverage` | Vitest with v8 coverage |
| `migrate` | Run Kysely migrations + codegen |
| `lint` / `lint:fix` | Biome lint |
| `format` / `format:fix` | Biome format |
| `check` / `check:fix` | Biome check (lint + format) |
| `type-check` | tsc --noEmit |
| `docs:generate` | Regenerate OpenAPI spec |
| `docs:validate` | Validate OpenAPI spec |
| `db:codegen` | Generate DB types from schema |
| `tail-logs` | Stream application logs |

### Client (`pnpm --filter rita-client <cmd>`)

| Command | Description |
|---------|-------------|
| `dev` | Vite dev server (port 5173) |
| `build` | Vite production build |
| `preview` | Preview production build |
| `test:unit` | Vitest watch mode |
| `test:unit:run` | Vitest single run |
| `test:unit:ui` | Vitest with browser UI |
| `lint` / `lint:fix` | Biome lint |
| `format` / `format:fix` | Biome format |
| `check` / `check:fix` | Biome check |
| `type-check` | tsc --noEmit |
| `storybook` | Storybook (port 6006) |
| `build-storybook` | Build static Storybook |
| `deploy-storybook` | Deploy to GitHub Pages |

## Environment Files

| File | Purpose |
|------|---------|
| `.env` | Local development (copy from `.env.example`) |
| `.env.example` | Template with development defaults |
| `.env.test.example` | Test environment template |
| `.env.prod.example` | Production variables reference |

## Ports

| Service | Port |
|---------|------|
| Client (Vite) | 5173 |
| API Server | 3000 |
| Iframe App | 5174 |
| Storybook | 6006 |
| PostgreSQL | 5432 |
| RabbitMQ (AMQP) | 5672 |
| RabbitMQ (UI) | 15672 |
| Valkey | 6379 |
| Keycloak | 8080 |
| Mailpit (SMTP) | 1025 |
| Mailpit (UI) | 8025 |
