# Architecture

Rita is an AI chat assistant for IT service desks — a pnpm monorepo with 5 packages running on Docker infrastructure.

## Project Structure

```
rita-chat/
├── packages/
│   ├── api-server/          # Express API + Kysely ORM + RabbitMQ consumers
│   │   ├── src/
│   │   │   ├── config/      # Environment, constants
│   │   │   ├── consumers/   # RabbitMQ message consumers
│   │   │   ├── database/    # Kysely migrations + codegen
│   │   │   ├── middleware/   # Auth, error handling, logging
│   │   │   ├── repositories/# Data access layer (Kysely queries)
│   │   │   ├── routes/      # Express route handlers
│   │   │   ├── schemas/     # Zod validation schemas
│   │   │   ├── services/    # Business logic layer
│   │   │   └── types/       # Generated DB types (kysely-codegen)
│   │   └── openapi.json     # Auto-generated OpenAPI spec
│   │
│   ├── client/              # React 18 + Vite + shadcn/ui
│   │   ├── src/
│   │   │   ├── components/  # UI components (shadcn/ui, custom, pages)
│   │   │   ├── contexts/    # React contexts (auth, theme)
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   ├── i18n/        # i18next translations (en, es-MX)
│   │   │   ├── pages/       # Route-level page components
│   │   │   ├── providers/   # Provider wrappers (query, auth, i18n)
│   │   │   ├── services/    # API client, SSE, feature flags
│   │   │   ├── stores/      # Zustand stores
│   │   │   └── types/       # Shared TypeScript types
│   │   └── .storybook/      # Storybook 8 config
│   │
│   ├── mock-service/        # Mock external service (Express)
│   └── iframe-app/          # Vite host for embeddable chat
│
├── keycloak/                # Custom Keycloak login theme (Tailwind)
├── docs/                    # Documentation files
├── .github/workflows/       # CI/CD (test, deploy-staging, deploy-prod, deploy-dev)
├── scripts/                 # dev.js (orchestrator), setup.js
├── docker-compose.yml       # Dev infrastructure
├── biome.json               # Linter/formatter config
└── pnpm-workspace.yaml      # Workspace definition
```

## Data Flow

### Chat Message Flow (RITA → Webhook → Rabbit → RITA)

```
User sends message
  → Client POST /api/conversations/:id/messages
    → API Server validates + stores user message in PostgreSQL (status=pending)
      → WebhookService sends HTTP POST to external service (AUTOMATION_WEBHOOK_URL)
        → External service (Actions API / mock-service) processes AI response
          → Publishes response to RabbitMQ queue: chat.responses
            → API Server RabbitMQService consumes from chat.responses
              → Updates user message status → completed
              → Creates assistant message in PostgreSQL
              → Creates audit log entry
              → SSEService pushes message_update + new_message events to client
```

Key details:
- **Outbound**: HTTP webhook (not RabbitMQ) — `WebhookService.sendMessageEvent()`
- **Inbound**: RabbitMQ `chat.responses` queue — `RabbitMQService.processMessage()`
- **user_id**: Always fetched from conversation in DB, not from the RabbitMQ payload
- **response_group_id**: Groups multi-part responses together
- **Other queues**: `data_source_status`, `document_processing_status`

### Iframe Flow

```
Host page embeds iframe
  → POST /api/iframe/validate-instantiation with sessionKey
    → Valkey lookup → tenant config, userId, webhook credentials
      → JIT user provisioning (create Rita user from Jarvis IDs)
        → Returns conversationId + UI config
          → Same message flow, but:
            - source = rita-chat-iframe
            - Webhook uses tenant-specific URL + HTTP Basic auth from Valkey
            - WebhookService.sendTenantMessageEvent() instead of sendMessageEvent()
```

### Authentication Flow

```
User visits Rita
  → Keycloak login (OpenID Connect)
    → JWT token issued (cookie-based session)
      → API validates JWT via JWKS endpoint (jose library)
        → Session created/resumed in Valkey
```

### SSE Connection

```
Client connects to GET /api/sse/events (EventSource with credentials)
  → API registers connection keyed by userId + organizationId
    → Heartbeat keeps connection alive
      → RabbitMQ consumer calls sseService.sendToUser() on new messages
        → Matches connections by userId + organizationId
          → Writes SSE data frames to response stream
```

## Package Responsibilities

| Package | Role | Key Tech |
|---------|------|----------|
| **api-server** | REST API, RabbitMQ consumers, SSE streaming, auth middleware | Express, Kysely, Pino, Jose, Zod |
| **client** | SPA frontend, chat UI, settings, data source management | React 18, Vite, shadcn/ui, Zustand, TanStack Query |
| **mock-service** | Simulates platform backend for local dev | Express, amqplib, nodemailer |
| **iframe-app** | Minimal host page for testing iframe embed | Vite |
| **keycloak** | Custom login theme matching Rita branding | Tailwind CSS |

## Infrastructure Services

| Service | Image | Purpose | Port |
|---------|-------|---------|------|
| PostgreSQL | pgvector/pgvector:pg15 | Primary DB with vector embeddings | 5432 |
| RabbitMQ | rabbitmq:3-management-alpine | Message broker | 5672 (AMQP), 15672 (UI) |
| Valkey | valkey:8-alpine | Session cache, feature flags, iframe config | 6379 |
| Keycloak | keycloak:24.0.4 | Identity provider (OIDC) | 8080 |
| Mailpit | axllent/mailpit:latest | SMTP + web UI for dev emails | 1025 (SMTP), 8025 (UI) |

## Key Architectural Decisions

- **Kysely over raw SQL** — type-safe query builder with codegen from DB schema
- **Biome over ESLint+Prettier** — single tool for lint+format, faster
- **Valkey over Redis** — open-source Redis fork, API-compatible
- **SSE over WebSockets** — simpler, sufficient for server→client push
- **pgvector** — native vector similarity for AI embeddings in PostgreSQL
- **Separate type-check from build** — vite build skips tsc to avoid OOM (~4GB heap)

See also:
- [Technical Design](core/technical_design.md) — full system overview
- [RabbitMQ Setup](architecture/rabbitmq-setup.md) — queue topology
- [Authentication Flow](core/authentication-flow.md) — detailed auth docs
- [Database Tables](core/database-tables.md) — complete schema reference
