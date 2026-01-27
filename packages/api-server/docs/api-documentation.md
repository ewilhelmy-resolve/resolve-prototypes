# API Documentation Guide

Interactive API documentation for the Rita API Server.

## Quick Start

```bash
# Start server
pnpm dev

# View Swagger UI
open http://localhost:3000/api-docs

# Get JSON spec
curl http://localhost:3000/api-docs/openapi.json
```

## Overview

We use two complementary specs:

| Spec | Purpose | Location |
|------|---------|----------|
| **OpenAPI 3.1** | REST endpoints | `/api-docs` (Swagger UI) |
| **AsyncAPI 3.0** | SSE, RabbitMQ, Webhooks | [asyncapi.yaml](./asyncapi.yaml) |

## Tools

| Tool | Purpose |
|------|---------|
| `@asteasolutions/zod-to-openapi` | Generate OpenAPI from Zod schemas |
| `swagger-ui-express` | Interactive API docs at `/api-docs` |
| `@apidevtools/swagger-parser` | Validate spec in CI |

**Why zod-to-openapi?**
- Extends existing Zod validation schemas
- Type-safe - schema changes auto-update docs
- No JSDoc comments or separate spec files to maintain

## Scripts

```bash
pnpm docs:validate  # Validate OpenAPI spec (CI)
pnpm docs:generate  # Regenerate openapi.json
```

## File Structure

```
packages/api-server/
├── openapi.json                    # Generated spec (committed)
├── docs/
│   ├── api-documentation.md        # This file
│   └── asyncapi.yaml               # SSE/RabbitMQ/Webhooks spec
├── scripts/
│   ├── generate-openapi.ts
│   └── validate-openapi.ts
└── src/docs/
    ├── openapi.ts                  # Registry + generator
    ├── schemas/                    # Zod schemas with OpenAPI metadata
    │   ├── common.ts               # Error, pagination
    │   ├── cluster.ts
    │   ├── conversation.ts
    │   └── dataSource.ts
    └── routes/                     # Route registrations
        ├── clusters.docs.ts
        ├── conversations.docs.ts
        └── dataSources.docs.ts
```

## Documentation Progress

### REST Endpoints

| Route Group | Endpoints | Status | File |
|-------------|-----------|--------|------|
| `/api/clusters` | 4 | ✅ Done | `clusters.docs.ts` |
| `/api/data-sources` | 9 | ✅ Done | `dataSources.docs.ts` |
| `/api/conversations` | 6 | ✅ Done | `conversations.docs.ts` |
| `/auth` | 8 | ⬜ TODO | - |
| `/api/files` | 6 | ⬜ TODO | - |
| `/api/organizations/members` | 7 | ⬜ TODO | - |
| `/api/organizations` | 5 | ⬜ TODO | - |
| `/api/invitations` | 5 | ⬜ TODO | - |
| `/api/credential-delegations` | 6 | ⬜ TODO | - |
| `/api/feature-flags` | 3 | ⬜ TODO | - |
| `/api/sse` | 2 | ⬜ TODO | - |
| `/api/workflows` | 1 | ⬜ TODO | - |
| `/api/iframe` | 4 | ⬜ TODO | - |
| `/health` | 1 | ⬜ TODO | - |

**Progress: 19/67 endpoints (28%)**

### AsyncAPI (Async Communication)

| Channel | Status |
|---------|--------|
| SSE Events (12 types) | ✅ Done |
| RabbitMQ Queues (4) | ✅ Done |
| Outgoing Webhooks (6) | ✅ Done |

---

## Adding New Endpoint Docs

### 1. Create schema file (if needed)

```typescript
// src/docs/schemas/conversation.ts
import { z } from "../openapi.js";

export const ConversationSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  // ...
}).openapi("Conversation");
```

### 2. Create route docs file

```typescript
// src/docs/routes/conversations.docs.ts
import { registry, z } from "../openapi.js";
import { ConversationSchema } from "../schemas/conversation.js";
import { ErrorResponseSchema } from "../schemas/common.js";

registry.registerPath({
  method: "get",
  path: "/api/conversations",
  tags: ["Conversations"],
  summary: "List conversations",
  description: "List user's conversations",
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  responses: {
    200: {
      description: "List of conversations",
      content: {
        "application/json": {
          schema: z.object({ data: z.array(ConversationSchema) }),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});
```

### 3. Import in docs.ts

```typescript
// src/routes/docs.ts
import "../docs/routes/conversations.docs.js";
```

### 4. Regenerate spec

```bash
pnpm docs:generate
```

---

## CI Integration

Add to CI pipeline:

```yaml
- name: Validate API docs
  run: pnpm docs:validate
```

---

## AsyncAPI Viewing

View AsyncAPI spec with [AsyncAPI Studio](https://studio.asyncapi.com/):
1. Open https://studio.asyncapi.com/
2. Import `docs/asyncapi.yaml`

Or generate HTML docs:
```bash
npx @asyncapi/cli generate fromTemplate docs/asyncapi.yaml @asyncapi/html-template -o docs/async-html
```

---

## Why Two Specs?

**OpenAPI** is designed for request/response REST APIs. It doesn't handle:
- Server-Sent Events (push from server)
- Message queues (RabbitMQ)
- Outgoing webhooks (what we send to others)

**AsyncAPI** is purpose-built for event-driven APIs:
- Native support for SSE, WebSocket, AMQP
- Documents message schemas with discriminators
- Describes both publish (outgoing) and subscribe (incoming) operations
