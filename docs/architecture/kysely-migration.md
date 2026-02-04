# Kysely Migration - api-server

Migrate 93+ raw pg queries across 11 files to type-safe Kysely.

## Decisions
- Repository layer pattern (new `*Repository.ts` files)
- Direct replacement (no feature flag)
- Commit generated types to repo

---

## Current Checkpoint (2025-01-30)

**Completed:**
- Phase 1: Foundation setup ✅
- `middleware/auth.ts` → AuthRepository (2 queries) ✅
- `routes/auth.ts` → AuthRepository (11 queries) ✅
- `services/ClusterService.ts` → ClusterService (6 methods, ~8 queries) ✅

**Files created:**
- `src/config/kysely.ts` - Kysely instance
- `src/config/kyselyContext.ts` - withKyselyOrgContext helper
- `src/types/database.ts` - Generated types (22 tables)
- `src/repositories/AuthRepository.ts` - Auth queries
- `src/repositories/index.ts` - Repository exports
- `src/services/ClusterService.ts` - Fully Kysely (no repository pattern)

---

## Phase 1: Foundation Setup

- [x] 1.1 Add dependencies to `packages/api-server/package.json`
- [x] 1.2 Create Kysely instance (`src/config/kysely.ts`)
- [x] 1.3 Configure codegen script, generate initial types (22 tables)
- [x] 1.4 Create `withKyselyOrgContext` helper (`src/config/kyselyContext.ts`)
- [x] 1.5 Create `src/repositories/` directory structure

---

## Phase 2: File Migration by Complexity

### Tier 1 - Simple (1-4 queries)

| Status | File | Repository | Queries | Notes |
|--------|------|------------|---------|-------|
| [ ] | `routes/files.ts` | FileRepository.ts | ~15 | Deferred - many queries inside withOrgContext |
| [x] | `middleware/auth.ts` | AuthRepository.ts | 2 | Role check queries |
| [x] | `routes/auth.ts` | AuthRepository.ts | 11 | Signup/verify/profile flow |

### Tier 2 - Medium (5-10 queries)

| Status | File | Repository | Queries | Notes |
|--------|------|------------|---------|-------|
| [ ] | `sessionService.ts` | SessionRepository.ts | 5 | User provisioning txn |
| [x] | `ClusterService.ts` | (inline) | 6 | Dynamic ORDER BY, JOINs, cursor pagination |
| [ ] | `IframeService.ts` | IframeRepository.ts | 10 | withOrgContext, JIT provision |

### Tier 3 - Complex (15+ queries)

| Status | File | Repository | Queries | Notes |
|--------|------|------------|---------|-------|
| [ ] | `memberService.ts` | MemberRepository.ts | 15 | Complex JOINs, txns |
| [ ] | `CredentialDelegationService.ts` | CredentialDelegationRepository.ts | 15 | Rate limiting, dynamic queries |
| [ ] | `InvitationService.ts` | InvitationRepository.ts | 16 | Multi-step txns |
| [ ] | `DataSourceService.ts` | DataSourceRepository.ts | 22 | Dynamic UPDATE builders |

---

## Phase 3: Code Patterns

### Simple SELECT
```typescript
// Before
const result = await pool.query('SELECT * FROM table WHERE id = $1', [id]);

// After
const result = await db.selectFrom('table').selectAll().where('id', '=', id).executeTakeFirst();
```

### Dynamic UPDATE
```typescript
let query = db.updateTable('data_source_connections').where('id', '=', id);
if (data.name !== undefined) query = query.set('name', data.name);
await query.set('updated_at', sql`NOW()`).execute();
```

### Dynamic ORDER BY
```typescript
query = sortOrder === 'desc'
  ? query.orderBy(sortColumn, 'desc')
  : query.orderBy(sortColumn, 'asc');
```

### INSERT ON CONFLICT
```typescript
await db.insertInto('table')
  .values({ ... })
  .onConflict(oc => oc.columns(['col1', 'col2']).doNothing())
  .execute();
```

### Transaction with RLS
```typescript
await withKyselyOrgContext(userId, orgId, async (trx) => {
  return await trx.insertInto('conversations').values({...}).returningAll().executeTakeFirstOrThrow();
});
```

### Composite Cursor Pagination (timestamp + id)
```typescript
// Parse cursor: "2024-01-15T10:00:00.000Z_uuid"
const separatorIndex = cursor.lastIndexOf("_");
const cursorTimestamp = cursor.substring(0, separatorIndex);
const cursorId = cursor.substring(separatorIndex + 1);

// Use date_trunc to handle JS Date millisecond precision vs PostgreSQL microseconds
query = query.where((eb) =>
  eb.or([
    eb(sql`date_trunc('milliseconds', c.created_at)`, "<", sql`${new Date(cursorTimestamp)}::timestamptz`),
    eb.and([
      eb(sql`date_trunc('milliseconds', c.created_at)`, "=", sql`${new Date(cursorTimestamp)}::timestamptz`),
      eb("c.id", "<", cursorId),
    ]),
  ]),
);

// Build cursor for response
const nextCursor = `${lastRow.created_at.toISOString()}_${lastRow.id}`;
```

---

## Phase 4: Verification

For each migrated file:
1. `npm run type-check` passes
2. `npm run lint` passes
3. Run existing integration tests
4. Manual API testing

---

## Critical Files

| File | Purpose |
|------|---------|
| `src/config/database.ts` | Existing pool, withOrgContext |
| `src/config/kysely.ts` | New Kysely instance |
| `src/config/kyselyContext.ts` | withKyselyOrgContext helper |
| `src/types/database.ts` | Codegen output |
| `src/repositories/` | New repository layer |

---

## Setup Commands

```bash
# Add dependencies
cd packages/api-server
pnpm add kysely
pnpm add -D kysely-codegen

# Generate types (requires DATABASE_URL)
pnpm run db:codegen
```

## npm scripts

```json
"db:codegen": "dotenv -e ../../.env -- kysely-codegen --out-file src/types/database.ts --dialect postgres",
"migrate": "dotenv -e ../../.env -- tsx src/database/migrate.ts && pnpm run db:codegen"
```

**Note:** After running migrations, `db:codegen` regenerates types to keep them in sync with schema changes.
