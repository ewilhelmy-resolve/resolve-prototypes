# Plan: Remove external_cluster_id from clusters table + add active model flag

**Status:** Draft
**Date:** January 23, 2026

## Problem

1. `clusters.external_cluster_id` doesn't map to WF reality - topics come from CSV without remote IDs. Field is `NOT NULL` with unique constraint, blocking WF from inserting clusters.
2. No way to mark which `ml_models` record is the active model for an org (orgs can have multiple trained models).

## Current State

**clusters table:**
```sql
external_cluster_id TEXT NOT NULL
model_id UUID (nullable, ON DELETE SET NULL)
CONSTRAINT uq_clusters_external_id_org UNIQUE (organization_id, external_cluster_id)
INDEX idx_clusters_external_cluster_id
INDEX idx_clusters_model_id
```

**ml_models table:**
```sql
-- No active flag currently
-- Has: id, organization_id, external_model_id, model_name, training dates, metadata
-- UNIQUE (organization_id, external_model_id)
```

**Rita codebase:**
- `external_cluster_id` in type definitions only (`Cluster`, `ClusterDetails`)
- No ml_models types exist (no TypeScript interface)
- `ClusterService.ts` doesn't use `model_id` or `external_cluster_id` in queries
- Data: 0 rows in both clusters and ml_models tables

**WF:** Confirmed current schema blocks their workflow

## Solution

1. Replace `external_cluster_id` with natural key constraint: `(organization_id, model_id, name, subcluster_name)`
2. Add `active` boolean to `ml_models` (only one active per org, enforced by WF)

### WF Confirmed Requirements

| Question | Answer |
|----------|--------|
| `model_id` always present? | ✅ Yes, make NOT NULL |
| Same parent name + different subclusters? | ✅ Yes (e.g., "Network" + "VPN Issues", "Network" + "WiFi Access") |
| Duplicate names in same model? | ❌ No, never duplicates |
| Duplicate NULL subclusters for same name? | ❌ No, app guarantees uniqueness |

### Data Model Example

```
model_id=1, name="Network", subcluster_name=NULL           -- parent
model_id=1, name="Network", subcluster_name="VPN Issues"   -- subcluster
model_id=1, name="Network", subcluster_name="WiFi Access"  -- subcluster
model_id=1, name="Account", subcluster_name=NULL           -- parent
model_id=1, name="Account", subcluster_name="Password Reset"
```

## Migration

**File:** `packages/api-server/src/database/migrations/153_remove_external_cluster_id.sql`

> Note: 152 already exists (`152_drop_capability_columns.sql`)

```sql
-- Migration: Remove external_cluster_id, add natural key constraint, add active model flag
-- Reason: external_cluster_id has no equivalent in ML model (topics from CSV)

-- =============================================================================
-- 1. CLUSTERS: Remove external_cluster_id
-- =============================================================================

DROP INDEX IF EXISTS idx_clusters_external_cluster_id;
ALTER TABLE clusters DROP CONSTRAINT IF EXISTS uq_clusters_external_id_org;
ALTER TABLE clusters DROP COLUMN IF EXISTS external_cluster_id;

-- =============================================================================
-- 2. CLUSTERS: Make model_id required
-- =============================================================================

ALTER TABLE clusters ALTER COLUMN model_id SET NOT NULL;

-- Change FK to CASCADE (delete clusters when model deleted)
ALTER TABLE clusters DROP CONSTRAINT clusters_model_id_fkey;
ALTER TABLE clusters ADD CONSTRAINT clusters_model_id_fkey 
  FOREIGN KEY (model_id) REFERENCES ml_models(id) ON DELETE CASCADE;

-- =============================================================================
-- 3. CLUSTERS: Add natural key constraint for idempotent upserts
-- =============================================================================

-- COALESCE handles NULL subcluster_name (treats as empty string for uniqueness)
CREATE UNIQUE INDEX uq_clusters_org_model_name_subcluster
  ON clusters (organization_id, model_id, name, COALESCE(subcluster_name, ''));

COMMENT ON COLUMN clusters.model_id IS 'ML model that generated this cluster (required)';
COMMENT ON INDEX uq_clusters_org_model_name_subcluster IS 'Natural key for idempotent upsert by WF';

-- =============================================================================
-- 4. ML_MODELS: Add active flag
-- =============================================================================

ALTER TABLE ml_models ADD COLUMN active BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_ml_models_active ON ml_models(organization_id, active) WHERE active = true;

COMMENT ON COLUMN ml_models.active IS 'Whether this is the active model for the org (one per org, enforced by WF)';
```

### Rollback

```sql
-- Rollback (if needed)

-- ml_models
DROP INDEX IF EXISTS idx_ml_models_active;
ALTER TABLE ml_models DROP COLUMN IF EXISTS active;

-- clusters
DROP INDEX IF EXISTS uq_clusters_org_model_name_subcluster;

ALTER TABLE clusters DROP CONSTRAINT clusters_model_id_fkey;
ALTER TABLE clusters ADD CONSTRAINT clusters_model_id_fkey 
  FOREIGN KEY (model_id) REFERENCES ml_models(id) ON DELETE SET NULL;
ALTER TABLE clusters ALTER COLUMN model_id DROP NOT NULL;

ALTER TABLE clusters ADD COLUMN external_cluster_id TEXT;
-- Cannot restore NOT NULL or UNIQUE without data
CREATE INDEX idx_clusters_external_cluster_id ON clusters(external_cluster_id);
ALTER TABLE clusters ADD CONSTRAINT uq_clusters_external_id_org 
  UNIQUE (organization_id, external_cluster_id);
```

## Code Changes

### 1. Update api-server types

**packages/api-server/src/types/cluster.ts:**
```diff
 export interface Cluster {
   id: string;
   organization_id: string;
-  model_id: string | null;
-  external_cluster_id: string;
+  model_id: string;
   name: string;
   subcluster_name: string | null;
   config: ClusterConfig;
   kb_status: KBStatus;
   created_at: Date;
   updated_at: Date;
 }
```

Note: `ClusterDetails extends Cluster`, so it inherits the fix.

### 2. Update client types

**packages/client/src/types/cluster.ts:**
```diff
 export interface ClusterDetails {
   id: string;
   organization_id: string;
-  model_id: string | null;
-  external_cluster_id: string;
+  model_id: string;
   name: string;
   subcluster_name: string | null;
   config: ClusterConfig;
   kb_status: KBStatus;
   kb_articles_count: number;
   ticket_count: number;
   open_count: number;
   created_at: string;
   updated_at: string;
 }
```

Note: `ClusterListItem` doesn't have `model_id` or `external_cluster_id` - no change needed.

### 3. Update technical design doc

**docs/feat-autopilot-ticket-cluster/technical-design-autopilot-tickets.md:**
- Remove `external_cluster_id` from ERD
- Update clusters table schema  
- Add `active` to ml_models in ERD
- Update WF upsert pattern examples

## WF Upsert Pattern

```sql
INSERT INTO clusters (organization_id, model_id, name, subcluster_name, kb_status, config)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (organization_id, model_id, name, COALESCE(subcluster_name, ''))
DO UPDATE SET 
  kb_status = EXCLUDED.kb_status,
  config = EXCLUDED.config,
  updated_at = NOW();
```

## Tasks

- [x] Create migration `153_remove_external_cluster_id.sql`
- [x] Update `packages/api-server/src/types/cluster.ts` (remove external_cluster_id, model_id non-null)
- [x] Update `packages/client/src/types/cluster.ts` (remove external_cluster_id, model_id non-null)
- [x] Run migration locally and verify
- [x] Update `docs/feat-autopilot-ticket-cluster/technical-design-autopilot-tickets.md`
- [ ] Notify WF team of new upsert pattern and active flag

**Out of scope (no ml_models types exist in codebase currently):**
- ml_models TypeScript types - WF writes directly to DB, Rita doesn't query this table yet

## Testing

**Note:** Tests require valid UUIDs and FK references. Use actual org/model IDs from DB.

### 1. Run migration on local DB
```bash
# From api-server
npm run migrate
```

### 2. Verify schema changes
```sql
-- Check external_cluster_id is gone
\d clusters
-- Should NOT show external_cluster_id column
-- Should show model_id as NOT NULL

-- Check ml_models has active
\d ml_models  
-- Should show active BOOLEAN NOT NULL DEFAULT false
```

### 3. Test clusters constraint
```sql
-- Setup: create org and model first
INSERT INTO organizations (id, name) VALUES ('11111111-1111-1111-1111-111111111111', 'Test Org');
INSERT INTO ml_models (id, organization_id, external_model_id, model_name, active) 
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'ext-model-1', 'Model v1', true);

-- Should succeed: parent cluster
INSERT INTO clusters (organization_id, model_id, name, subcluster_name) 
VALUES ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Network', NULL);

-- Should succeed: subcluster with same parent name
INSERT INTO clusters (organization_id, model_id, name, subcluster_name) 
VALUES ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Network', 'VPN Issues');

-- Should FAIL (duplicate parent cluster)
INSERT INTO clusters (organization_id, model_id, name, subcluster_name) 
VALUES ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Network', NULL);
-- Expected error: duplicate key value violates unique constraint
```

### 4. Test upsert pattern
```sql
-- Should update existing row, not create duplicate
INSERT INTO clusters (organization_id, model_id, name, subcluster_name, kb_status)
VALUES ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Network', NULL, 'FOUND')
ON CONFLICT (organization_id, model_id, name, COALESCE(subcluster_name, ''))
DO UPDATE SET kb_status = EXCLUDED.kb_status, updated_at = NOW();

-- Verify only 1 row with kb_status = 'FOUND'
SELECT * FROM clusters WHERE name = 'Network' AND subcluster_name IS NULL;
```

### 5. Test CASCADE delete
```sql
-- Delete model should delete its clusters
DELETE FROM ml_models WHERE id = '22222222-2222-2222-2222-222222222222';

-- Verify clusters gone
SELECT * FROM clusters WHERE model_id = '22222222-2222-2222-2222-222222222222';
-- Should return 0 rows
```

### 6. Test TypeScript compilation
```bash
npm run type-check
```

### 7. Cleanup
```sql
DELETE FROM organizations WHERE id = '11111111-1111-1111-1111-111111111111';
```
