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

## Architecture: Single Source of Truth

Zod schemas serve as **single source of truth** for both validation AND documentation:

```
src/
├── schemas/                    # SINGLE SOURCE - Zod + .openapi() metadata
│   ├── common.ts               # Error, pagination, helpers
│   ├── cluster.ts              # Cluster schemas
│   ├── conversation.ts         # Conversation schemas
│   └── dataSource.ts           # Data source schemas
├── routes/
│   ├── clusters.ts             # Route handlers + colocated docs
│   ├── conversations.ts        # Route handlers + colocated docs
│   ├── dataSources.ts          # Route handlers + colocated docs
│   └── docs.ts                 # Serves Swagger UI
└── docs/
    └── openapi.ts              # Registry singleton
```

**Benefits:**
- No schema duplication between validation and docs
- Changes auto-sync - modify once, updates everywhere
- Type-safe validation AND documentation
- Docs live next to the routes they document

## Tools

| Tool | Purpose |
|------|---------|
| `@asteasolutions/zod-to-openapi` | Generate OpenAPI from Zod schemas |
| `swagger-ui-express` | Interactive API docs at `/api-docs` |
| `@apidevtools/swagger-parser` | Validate spec in CI |

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
└── src/
    ├── docs/
    │   └── openapi.ts              # Registry + generator
    ├── schemas/                    # Shared Zod schemas
    │   ├── common.ts               # Error, pagination
    │   ├── cluster.ts
    │   ├── conversation.ts
    │   └── dataSource.ts
    └── routes/                     # Routes with colocated docs
        ├── clusters.ts
        ├── conversations.ts
        └── dataSources.ts
```

## Documentation Progress

### REST Endpoints

| Route Group | Endpoints | Status | File |
|-------------|-----------|--------|------|
| `/api/clusters` | 4 | ✅ Done | `clusters.ts` |
| `/api/data-sources` | 9 | ✅ Done | `dataSources.ts` |
| `/api/conversations` | 6 | ✅ Done | `conversations.ts` |
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

### 1. Create/update schema file

```typescript
// src/schemas/myFeature.ts
import { z } from "../docs/openapi.js";

// Request schema - used for BOTH validation and docs
export const CreateMyFeatureSchema = z.object({
  name: z.string().min(1).max(255).openapi({ example: "My Feature" }),
  enabled: z.boolean().optional().openapi({ default: true }),
}).openapi("CreateMyFeatureRequest");

// Response schema
export const MyFeatureSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  enabled: z.boolean(),
  created_at: z.string().datetime(),
}).openapi("MyFeature");

export const MyFeatureResponseSchema = z.object({
  data: MyFeatureSchema,
}).openapi("MyFeatureResponse");
```

### 2. Add route with colocated docs

```typescript
// src/routes/myFeature.ts
import express from "express";
import { z } from "zod";
import { registry } from "../docs/openapi.js";
import { ErrorResponseSchema, ValidationErrorSchema } from "../schemas/common.js";
import { CreateMyFeatureSchema, MyFeatureResponseSchema } from "../schemas/myFeature.js";

const router = express.Router();

// ============================================================================
// OpenAPI Documentation Registration
// ============================================================================

registry.registerPath({
  method: "post",
  path: "/api/my-feature",
  tags: ["MyFeature"],
  summary: "Create my feature",
  description: "Create a new feature instance",
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    body: { content: { "application/json": { schema: CreateMyFeatureSchema } } },
  },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: MyFeatureResponseSchema } } },
    400: { description: "Validation error", content: { "application/json": { schema: ValidationErrorSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponseSchema } } },
    500: { description: "Server error", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

// ============================================================================
// Route Handlers
// ============================================================================

router.post("/", async (req, res) => {
  try {
    // Same schema validates request AND documents API
    const validated = CreateMyFeatureSchema.parse(req.body);
    // ... handler logic
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.issues });
    }
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
```

### 3. Update scripts (if new route file)

Add import to `scripts/generate-openapi.ts` and `scripts/validate-openapi.ts`:

```typescript
import "../src/routes/myFeature.js";
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

## Known Issues

### Missing Auth Middleware (TODO)

Some routes use `authReq.user` but don't have `authenticateUser` middleware. They may rely on app-level auth or this could be a bug:

| Route | File | Issue |
|-------|------|-------|
| `GET /api/clusters` | `clusters.ts:158` | No `authenticateUser` |
| `GET /api/clusters/:id/details` | `clusters.ts:191` | No `authenticateUser` |
| `GET /api/clusters/:id/tickets` | `clusters.ts:220` | No `authenticateUser` |
| `GET /api/clusters/:id/kb-articles` | `clusters.ts:273` | No `authenticateUser` |
| `GET /api/tickets/:id` | `tickets.ts:12` | No `authenticateUser` |

**Action:** Verify if these routes should require auth, and add middleware if needed.

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
