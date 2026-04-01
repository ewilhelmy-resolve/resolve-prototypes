# API Server

Express + TypeScript backend with PostgreSQL (pgvector), RabbitMQ, Valkey.

## Commands

```bash
pnpm --filter rita-api-server dev          # Dev server (port 3000)
pnpm --filter rita-api-server test:run     # Run all tests
pnpm --filter rita-api-server test:run -- <path>  # Run single test file
pnpm --filter rita-api-server migrate      # Run DB migrations
pnpm --filter rita-api-server docs:generate  # Regenerate OpenAPI spec
```

## Database

- **pg Pool** (`config/database.ts`) — raw SQL queries via `pool.query()`
- **Kysely** (`config/kyselyContext.ts`) — type-safe query builder, used in newer services
- **RLS** — `withOrgContext(userId, organizationId, callback)` sets `app.current_user_id` and `app.current_organization_id` session variables. Kysely variant: `withKyselyOrgContext`. Pool is captured internally, not passed as param.
- **Migrations** — SQL files in `src/database/migrations/`, run with `pnpm migrate`

## Patterns

### Services
Class-based with pool/kysely injected. Most are instantiated directly in route files. A few use singleton getters (`getRabbitMQService()`, `getSSEService()`, `getSessionService()`, `getFeatureFlagService()`).
```typescript
// Direct instantiation (most services)
const memberService = new MemberService(pool);

// Singleton getter (shared stateful services)
export const getRabbitMQService = () => instance;
```

### Routes
Express Router + OpenAPI registration + Zod validation in handler.
```typescript
registry.registerPath({ method: "post", path: "/api/foo", request: { body: { content: { "application/json": { schema: FooSchema } } } }, responses: { ... } });
router.post("/", authenticateUser, async (req, res) => {
  const data = FooSchema.parse(req.body);
});
```

### Consumers
RabbitMQ consumers with queue name from env var. Discriminate message type via `type` field.
```typescript
class FooConsumer {
  private readonly queueName = process.env.FOO_QUEUE || "foo.events";
  async startConsumer(channel: Channel) {
    await channel.assertQueue(this.queueName, { durable: true });
    await channel.consume(this.queueName, async (msg) => { ... });
  }
}
```

### Webhooks
`WebhookService.sendEventToUrl()` with retry. Iframe uses `sendTenantMessageEvent()` which spreads full Valkey config.

## Testing

- **Framework**: vitest
- **Route tests**: supertest + `vi.mock` services
- **Service tests**: `vi.mock` database + dependencies, use `vi.hoisted` for mock variables
- **Location**: `__tests__/` directory next to source files

## Key Directories

| Directory | Contains |
|-----------|----------|
| `src/routes/` | Express routers + OpenAPI registration |
| `src/services/` | Business logic classes |
| `src/consumers/` | RabbitMQ message handlers |
| `src/middleware/` | Auth, logging, error handling |
| `src/schemas/` | Zod schemas (request/response validation) |
| `src/database/migrations/` | SQL migration files |
| `src/types/` | TypeScript type definitions |
