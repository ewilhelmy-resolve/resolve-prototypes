# Meeting Plan: Autopilot Schema & Data Flow Alignment

## Context
- **Rita Team** owns DB migrations (migration 138 already created)
- **WF Team 1** - Ticket ingestion (ITSM fetch, clustering)
- **WF Team 2** - Cluster enrichment (KB search, article linking)
- **Key Risk**: WF has direct DB access; schema changes after deployment = breaking
- **Scope**: Autopilot tables only. Credential delegation = separate meeting.

---

## Meeting Agenda (60-90 min)

### 1. Schema Walkthrough (25 min)

#### Tables by Owner

| Table | WF Team | Operations | Conflict Target |
|-------|---------|------------|-----------------|
| `clusters` | Team 1 | INSERT/UPDATE | `(organization_id, external_cluster_id)` |
| `tickets` | Team 1 | INSERT/UPDATE | `(organization_id, external_id)` |
| `analytics_cluster_daily` | Team 1 | UPSERT | `(organization_id, cluster_id, day)` |
| `ingestion_runs` | Team 1 | UPDATE only | `id` (Rita creates row) |
| `knowledge_articles` | Team 2 | INSERT/UPDATE | `(organization_id, external_id)` |
| `clusters.kb_status` | Team 2 | UPDATE only | `id` |

#### Schema Validation Checklist

**clusters table:**
- [x] `external_cluster_id` TEXT - WF provides stable ID
- [x] `config` JSONB - `{auto_respond, auto_populate}`
- [x] `kb_status` CHECK constraint: `PENDING|FOUND|GAP`
- [ ] **ASK**: Is `name TEXT NOT NULL` always available from WF?
- [ ] **ASK**: `validation_target` nullable - WF ever sets this?
  > *Note: `validation_target` = # of tickets humans must approve before automation unlocks (e.g., "0/16 progress"). `validation_current` tracks progress. Nullable because product hasn't defined default.*

**tickets table:**
- [x] `external_id` TEXT - ITSM ticket ID (INC-123)
- [x] `subject` TEXT NOT NULL
- [x] `external_status` TEXT NOT NULL
- [x] `source_metadata` JSONB - raw ITSM properties
- [ ] **ASK**: What fields guaranteed in `source_metadata`?
- [ ] **ASK**: `data_source_connection_id` - WF knows this UUID?

**analytics_cluster_daily:**
- [x] Composite PK `(org_id, cluster_id, day)`
- [x] Counters: `total_tickets`, `automated_count`, `kb_gap_count`
- [ ] **ASK**: How is `automated_count` calculated?
- [ ] **ASK**: How is `kb_gap_count` calculated?

**knowledge_articles:**
- [x] `external_id` TEXT - WF provides for upsert
- [x] `relevance_score` FLOAT 0-1
- [x] `status` CHECK: `active|broken|archived`
- [ ] **ASK**: Who sets `status`? WF or Rita?

**ingestion_runs:**
- [x] Rita creates with `status='pending'`, `started_by`
- [x] WF updates: `status`, `records_processed`, `records_failed`, `completed_at`
- [ ] **ASK**: WF needs UPDATE without knowing `started_by`?

---

### 2. WF Database Access (10 min)

**Current RLS policies use:**
```sql
current_setting('app.current_organization_id', true)::uuid
```

**Options for WF:**
1. **Superuser/table owner** - bypasses RLS entirely
2. **Dedicated role with BYPASSRLS** privilege
3. **Direct org_id filter** in all queries (recommended in doc)

**Decision needed:** Which approach? Rita team needs to provision credentials.

---

### 3. Data Flow Contracts (15 min)

#### Rita → WF Webhook (sync_tickets)

```json
{
  "source": "rita-chat",
  "action": "sync_tickets",
  "tenant_id": "<organization_id>",
  "user_id": "<keycloak_user_id>",
  "ingestion_run_id": "<uuid from ingestion_runs>",
  "connection_id": "<data_source_connections.id>",
  "connection_type": "servicenow|jira",
  "settings": { /* from data_source_connections.latest_options */ }
}
```

**Questions:**
- [ ] WF credential lookup: `(tenant_id, connection_id, connection_type)`?
- [ ] `settings` shape per connection_type?
- [ ] Webhook auth mechanism?

#### WF → Rita RabbitMQ (notifications only)

| Queue | Payload | Rita Action |
|-------|---------|-------------|
| `data_source_status` | `{type: 'ticket_ingestion', tenant_id, user_id, ingestion_run_id, status, records_processed}` | SSE emit |
| `cluster_notification` | `{type, tenant_id, cluster_id, action}` | SSE emit |
| `enrichment_notification` | `{type, tenant_id, cluster_id, kb_status, articles_count}` | SSE emit |

**Key point:** Rita consumers do NO DB writes - WF already wrote data.

---

### 4. Transaction Boundaries (10 min)

**WF Team 1 - Ingestion:**
```sql
BEGIN
  -- UPSERTs: org_id in INSERT values, conflict on unique constraint
  INSERT INTO clusters (organization_id, external_cluster_id, name, ...)
    VALUES ($tenant_id, $external_cluster_id, $name, ...)
    ON CONFLICT (organization_id, external_cluster_id) DO UPDATE SET name = EXCLUDED.name, ...;

  INSERT INTO tickets (organization_id, cluster_id, external_id, subject, ...)
    VALUES ($tenant_id, $cluster_id, $external_id, $subject, ...)
    ON CONFLICT (organization_id, external_id) DO UPDATE SET cluster_id = EXCLUDED.cluster_id, ...;

  INSERT INTO analytics_cluster_daily (organization_id, cluster_id, day, total_tickets, ...)
    VALUES ($tenant_id, $cluster_id, CURRENT_DATE, $count, ...)
    ON CONFLICT (organization_id, cluster_id, day) DO UPDATE SET total_tickets = total_tickets + EXCLUDED.total_tickets;

  -- UPDATE: explicit WHERE with org_id
  UPDATE ingestion_runs
    SET status = 'completed', records_processed = $n, completed_at = NOW()
    WHERE id = $ingestion_run_id AND organization_id = $tenant_id;
COMMIT
-- Only publish AFTER commit succeeds
→ Publish ticket_ingestion to data_source_status queue
```

**WF Team 2 - Enrichment:**
```sql
BEGIN
  UPDATE clusters
    SET kb_status = $status, updated_at = NOW()
    WHERE id = $cluster_id AND organization_id = $tenant_id;

  INSERT INTO knowledge_articles (organization_id, cluster_id, external_id, title, url, relevance_score)
    VALUES ($tenant_id, $cluster_id, $external_id, $title, $url, $score)
    ON CONFLICT (organization_id, external_id) DO UPDATE SET
      cluster_id = EXCLUDED.cluster_id,
      relevance_score = EXCLUDED.relevance_score,
      updated_at = NOW();
COMMIT
→ Publish enrichment_notification to RabbitMQ
```

**Questions:**
- [ ] Batch size limits before commit?
- [ ] Team 2 waits for Team 1 or runs independently?
- [ ] Partial failure = rollback entire batch?

---

### 5. Potential Schema Adjustments (10 min)

Based on review, potential changes WF teams might request:

| Table | Field | Potential Issue |
|-------|-------|-----------------|
| `tickets` | `data_source_connection_id` | WF may not have this UUID |
| `ingestion_runs` | `started_by NOT NULL` | System-triggered syncs? |
| `clusters` | missing `created_by` | Audit trail for who created? |
| `analytics_cluster_daily` | no `updated_at` trigger | Has column but no auto-update |

**Note:** `analytics_cluster_daily` has `updated_at` column but migration doesn't create trigger. Already has `set_analytics_updated_at` trigger - this is fine.

---

### 6. Error Handling (5 min)

| Scenario | Owner | Behavior |
|----------|-------|----------|
| ITSM fetch fails | WF Team 1 | UPDATE ingestion_runs status='failed', error_message |
| Cluster UPSERT conflict | WF Team 1 | ON CONFLICT DO UPDATE |
| KB search timeout | WF Team 2 | kb_status stays 'PENDING', retry? |
| RabbitMQ publish fails | Both | Retry policy? Log where? |

---

### 7. Timeline & Environments (5 min)

- [ ] When is migration 138 deployed to shared env?
- [ ] WF teams need which env first (dev/staging)?
- [ ] Integration test plan - mock data or real ITSM?

---

## Key Outputs Needed

1. **Schema confirmed** or adjustments identified
2. **WF DB role** - credentials provisioned
3. **Queue names** - finalized
4. **Webhook contract** - signed off
5. **external_cluster_id format** - documented

---

## Pre-Meeting Questions for WF Teams

### For WF Team 1 (Ingestion):
1. `external_cluster_id` - what format/pattern do you generate?
2. `tickets.data_source_connection_id` - do you have this UUID or need it removed?
3. `source_metadata` - what ITSM fields will you include?
4. Batch size per transaction?
5. How do you handle cluster merging/splitting?

### For WF Team 2 (Enrichment):
1. `knowledge_articles.external_id` - what format?
2. Who manages `status` field (active/broken/archived)?
3. Do you wait for Team 1 to finish or run independently?
4. How many articles per cluster max?

### For Both:
1. Preferred DB access pattern (RLS bypass vs direct org_id filter)?
2. Error logging - own table or shared `message_processing_failures`?
3. Retry policies for failed operations?

---

## Meeting Flow Recommendation

```
[5 min]  Context + goals
[25 min] Schema walkthrough with WF teams - validate each table
[10 min] DB access pattern decision
[15 min] Data flow contracts (webhook + RabbitMQ)
[10 min] Transaction boundaries
[10 min] Error handling agreement
[5 min]  Timeline + next steps
[10 min] Buffer for questions
```

**Outcome:** Either confirm migration 138 works as-is, or identify specific ALTER TABLE changes needed before deployment.
