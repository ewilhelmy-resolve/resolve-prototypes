# RITA Autopilot - JIRA Stories

## Story 1: Database Foundation

**Type:** Task
**Priority:** Highest
**Estimate:** 3 points
**Sprint:** 1

### Description
Create database schema for RITA Autopilot including all tables, RLS policies, indexes, and constraints. Foundation for all backend work.

### Acceptance Criteria
- [ ] Add `jira` to `ALLOWED_DATA_SOURCE_TYPES` in `packages/api-server/src/constants/dataSources.ts`
- [ ] Add `jira` to `DEFAULT_DATA_SOURCES` array
- [ ] Migration file creates 6 tables: clusters, tickets, analytics_cluster_daily, knowledge_articles, ingestion_runs, credential_delegation_tokens
- [ ] clusters table uses `external_cluster_id` (TEXT) + internal auto-gen `id` (UUID)
- [ ] clusters.created_by/updated_by nullable (for system-generated records)
- [ ] Unique constraint on clusters: `(organization_id, external_cluster_id)`
- [ ] Unique constraint on tickets: `(organization_id, external_id)`
- [ ] RLS policies enforced on all tables using app.current_organization_id
- [ ] All indexes created (org_id, cluster_id, external_cluster_id, status, timestamps)
- [ ] Foreign key constraints with proper ON DELETE actions
- [ ] Unique constraints (delegation token)
- [ ] Auto-timestamp triggers (updated_at)
- [ ] Migration runs successfully on dev/staging
- [ ] Rollback script tested

### Dependencies
None - must complete first

### Technical Notes
```sql
-- Key tables:
CREATE TABLE clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- Internal ID
  external_cluster_id TEXT NOT NULL,  -- From Workflow Platform
  created_by UUID REFERENCES user_profiles(user_id),  -- Nullable for system
  ...
  CONSTRAINT uq_clusters_external_id_org UNIQUE (organization_id, external_cluster_id)
);

CREATE TABLE tickets (
  ...
  CONSTRAINT uq_tickets_external_id_org UNIQUE (organization_id, external_id)
);

-- RLS pattern:
ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_access_own_organization_clusters" ON clusters
  FOR ALL USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
```

Reference: docs/feat-autopilot-ticket-cluster/technical-design-autopilot-tickets.md Section 7.1

---

## Story 2: Core Ingestion Flow (Backend)

**Type:** Story
**Priority:** High
**Estimate:** 5 points
**Sprint:** 1
**Assignee:** Backend Pair A

### Description
Implement ticket ingestion pipeline: trigger sync via webhook, consume batch messages from RabbitMQ, store clusters/tickets, emit SSE events.

### Acceptance Criteria
- [ ] POST /api/ingest/trigger endpoint created
  - Validates admin/owner role
  - Creates ingestion_run record
  - Sends sync_tickets webhook to Workflow Platform
  - Returns 202 with ingestion_run_id
- [ ] TicketBatchConsumer processes `ticket_batch_processed` queue
  - Upserts clusters using `ON CONFLICT (organization_id, external_cluster_id)`
  - Upserts tickets using `ON CONFLICT (organization_id, external_id)`
  - Updates analytics_cluster_daily
  - Commits transaction on success
  - Logs errors to message_processing_failures
- [ ] SSE event emitted on sync completion: `ingestion_run_update`
- [ ] Audit log created: trigger_ticket_sync
- [ ] Unit tests for consumer logic
- [ ] Integration test with mock RabbitMQ

### Dependencies
- Story 1 (Database Foundation)

### Technical Notes
```typescript
// Webhook payload:
await webhookService.sendGenericEvent({
  source: 'rita-chat',
  action: 'sync_tickets',
  additionalData: {
    ingestion_run_id, connection_id, connection_type, settings
  }
});

// Consumer idempotency (use unique constraints, not auto-gen IDs):
INSERT INTO clusters (...) ON CONFLICT (organization_id, external_cluster_id) DO UPDATE SET ...
INSERT INTO tickets (...) ON CONFLICT (organization_id, external_id) DO UPDATE SET ...
```

Reference: Section 5.1 Backend Worker Logic, Section 4.2 API Endpoints

---

## Story 3: Core Ingestion Flow (Frontend)

**Type:** Story
**Priority:** High
**Estimate:** 5 points
**Sprint:** 1
**Assignee:** Frontend Pair A

### Description
Build dashboard view showing cluster grid, stats cards, and sync trigger with real-time SSE updates.

### Acceptance Criteria
- [ ] Dashboard page route created
- [ ] Stats cards display: total_tickets, automated_count, kb_gap_count, clusters_total
- [ ] Cluster grid with columns: name, tickets, automation status, KB status, trend
- [ ] "Sync Tickets" button triggers POST /api/ingest/trigger
- [ ] Progress indicator during sync (status: SYNCING)
- [ ] SSE connection established on mount
- [ ] sync_completed event refreshes dashboard data
- [ ] Error handling for failed sync
- [ ] Loading states for all data fetches
- [ ] Responsive design (mobile-friendly)
- [ ] Accessibility: ARIA labels, keyboard navigation

### Dependencies
- None (use mocks initially, integrate after Story 2)

### Technical Notes
```typescript
// SSE connection:
const eventSource = new EventSource('/api/sse');
eventSource.addEventListener('sync_completed', (event) => {
  queryClient.invalidateQueries(['dashboard']);
});

// Mock data with MSW:
rest.get('/api/dashboard/stats', (req, res, ctx) => {
  return res(ctx.json(mockStats));
});
```

Reference: Section 4.2 Frontend API Endpoints, Section 5.2 Frontend State

---

## Story 4: Credential Delegation Flow (Backend)

**Type:** Story
**Priority:** High
**Estimate:** 5 points
**Sprint:** 1
**Assignee:** Backend Pair B

### Description
Implement delegated ITSM credential setup: RITA Owner sends magic link to IT Admin who submits credentials via public page with polling for verification status.

### Acceptance Criteria
- [ ] POST /api/credential-delegations/create endpoint
  - Generates 64-char token (crypto.randomBytes)
  - Inserts credential_delegation_tokens record
  - Sends send_delegation_email webhook
  - Returns delegation_id, expires_at
- [ ] GET /api/credential-delegations/verify/:token endpoint (public)
  - Validates token not expired, status='pending'
  - Returns org_name, system_type
- [ ] POST /api/credential-delegations/submit endpoint (public)
  - Atomic single-use enforcement (status='used')
  - **UPSERT data_source_connections BEFORE webhook** (to get connection_id)
  - Links delegation token to connection_id
  - Sends verify_credentials webhook (password base64 encoded)
  - Returns 202 with polling_url
- [ ] GET /api/credential-delegations/status/:token endpoint (public)
  - Returns status: verifying|success|failed
  - Rate limited: 20 req/min per token
- [ ] DataSourceStatusConsumer updated
  - Consumes data_source_status queue
  - Updates credential_delegation_tokens on verification (status='verified')
  - Updates data_source_connections (status='idle', enabled=true, latest_options)
  - Emits `data_source_update` SSE event (reuses existing event type)
  - Logs to audit_logs
- [ ] Unit tests for token generation, single-use enforcement
- [ ] Integration test with mock Workflow Platform

### Dependencies
- Story 1 (Database Foundation)

### Technical Notes
```typescript
// Token generation:
const token = crypto.randomBytes(32).toString('hex');

// Single-use enforcement + connection creation (in transaction):
BEGIN;
UPDATE credential_delegation_tokens
SET status='used', credentials_received_at=NOW()
WHERE token=$1 AND status='pending' RETURNING id;
// If 0 rows: ROLLBACK + 409 Conflict

// Create/update connection BEFORE webhook to get connection_id:
INSERT INTO data_source_connections (organization_id, type, status, ...)
VALUES ($org, $type, 'verifying', ...)
ON CONFLICT (organization_id, type) DO UPDATE SET status='verifying'
RETURNING id AS connection_id;

// Link delegation to connection:
UPDATE credential_delegation_tokens SET connection_id=$conn WHERE id=$del_id;
COMMIT;

// Webhook payload (now has connection_id):
{
  source: 'rita-chat',
  action: 'verify_credentials',
  connection_id: connection_id,  // From upsert above
  connection_type: 'servicenow',
  credentials: { username, password: base64(pwd) }
}
```

Reference: Section 2.3 Delegated ITSM Credential Setup, Section 4.2 API Endpoints

---

## Story 5: Credential Delegation Flow (Frontend)

**Type:** Story
**Priority:** High
**Estimate:** 5 points
**Sprint:** 1
**Assignee:** Frontend Pair B

### Description
Build RITA Owner delegation page and public IT Admin credential submission page with polling for real-time feedback.

### Acceptance Criteria
- [ ] Owner delegation page
  - Form: admin_email, admin_name, itsm_system_type dropdown
  - "Send Invitation" button calls POST /api/credential-delegations/create
  - Success toast: "Invitation sent to {email}"
  - Error handling for duplicate pending invitations
- [ ] IT Admin public page /credential-setup?token=xxx
  - Validates token via GET /api/credential-delegations/verify/:token
  - Shows expired message for invalid tokens
  - Form: ServiceNow URL, username, password
  - "Verify Credentials" button calls POST /api/credential-delegations/submit
  - Starts polling GET /api/credential-delegations/status/:token every 3s
  - Shows spinner: "Verifying credentials..."
  - Success: Green checkmark + "Credentials verified!"
  - Failure: Error message + retry button (form re-enabled)
  - Timeout (30s): "We'll email you when verification completes"
- [ ] Polling cleanup on unmount
- [ ] Form validation (required fields, email format, URL format)
- [ ] Accessibility: form labels, error announcements
- [ ] Responsive design

### Dependencies
- None (use mocks initially, integrate after Story 4)

### Technical Notes
```typescript
// Polling logic:
const MAX_POLLS = 10; // 30 seconds
const interval = setInterval(async () => {
  const { status } = await fetch(`/status/${token}`).then(r => r.json());
  if (status === 'success') {
    clearInterval(interval);
    showSuccess();
  } else if (status === 'failed') {
    clearInterval(interval);
    showError();
  } else if (++attempts >= MAX_POLLS) {
    clearInterval(interval);
    showTimeout();
  }
}, 3000);
```

Reference: Section 2.3 Delegated ITSM Credential Setup, Section 5.2 Frontend State

---

## Story 6: Cluster Detail & Validation (Backend)

**Type:** Story
**Priority:** Medium
**Estimate:** 4 points
**Sprint:** 2
**Assignee:** Backend Pair A

### Description
Implement cluster detail endpoints and ticket validation logic for sample approval workflow.

### Acceptance Criteria
- [ ] GET /api/clusters/:id/details endpoint
  - Returns cluster metadata, config, validation progress
  - Includes automation_enabled_by, automation_enabled_at
- [ ] GET /api/clusters/:id/tickets endpoint
  - Query params: tab=needs_response|completed|validation_pending
  - Returns tickets with validation status
  - Includes validation_result, validated_by, validated_at
- [ ] GET /api/clusters/:id/knowledge endpoint
  - Returns knowledge_articles with relevance scores
  - Sorted by relevance DESC
- [ ] POST /api/tickets/:id/validate endpoint
  - Payload: { validation_result: 'APPROVED'|'REJECTED' }
  - Updates ticket: validated_by, validated_at
  - Increments cluster.validation_current if APPROVED
  - Emits SSE event: ticket_validated
- [ ] Unit tests for validation logic
- [ ] Integration test for ticket list filtering

### Dependencies
- Story 2 (Core Ingestion Flow Backend)

### Technical Notes
```sql
-- Validation update:
UPDATE tickets
SET validation_result = $1,
    validated_by = $2,
    validated_at = NOW()
WHERE id = $3;

-- Increment validation counter:
UPDATE clusters
SET validation_current = validation_current + 1
WHERE id = $4 AND validation_current < validation_target;
```

Reference: Section 4.2 Frontend API Endpoints

---

## Story 7: Cluster Detail & Validation (Frontend)

**Type:** Story
**Priority:** Medium
**Estimate:** 4 points
**Sprint:** 2
**Assignee:** Frontend Pair A

### Description
Build cluster detail page with tabs for tickets, knowledge, and validation UI for approving sample tickets.

### Acceptance Criteria
- [ ] Cluster detail page route /clusters/:id
- [ ] Cluster header: name, ticket count, automation status, KB badge
- [ ] Tabs: Tickets, Knowledge, Activity (stub for now)
- [ ] Tickets tab
  - Sub-tabs: Needs Response, Validation Pending, Completed
  - Ticket list with expand/collapse
  - Validation buttons (✓ Approve, ✗ Reject) for validation samples
  - Optimistic UI update on validation
  - SSE event ticket_validated refreshes list
- [ ] Knowledge tab
  - Article cards with title, URL, relevance score
  - "How to update Outlook signature" style content
  - Empty state: "No knowledge articles yet"
- [ ] Validation progress bar
  - Shows X/Y samples validated
  - Updates in real-time via SSE
- [ ] Error handling for failed validation
- [ ] Loading states for tab switching
- [ ] Accessibility: tab navigation, button labels

### Dependencies
- Story 3 (Core Ingestion Flow Frontend) for navigation
- Use mocks initially, integrate after Story 6

### Technical Notes
```typescript
// Optimistic update:
const { mutate } = useMutation({
  mutationFn: (result) => validateTicket(ticketId, result),
  onMutate: async (result) => {
    await queryClient.cancelQueries(['tickets']);
    const previous = queryClient.getQueryData(['tickets']);
    queryClient.setQueryData(['tickets'], (old) =>
      updateTicketOptimistically(old, ticketId, result)
    );
    return { previous };
  },
  onError: (err, vars, context) => {
    queryClient.setQueryData(['tickets'], context.previous);
  }
});
```

Reference: Section 4.2 Frontend API Endpoints

---

## Story 8: Cluster Configuration (Backend)

**Type:** Story
**Priority:** Medium
**Estimate:** 3 points
**Sprint:** 2
**Assignee:** Backend Pair B

### Description
Implement cluster config update endpoint for enabling automation toggles with audit logging.

### Acceptance Criteria
- [ ] PATCH /api/clusters/:id/config endpoint
  - Payload: { auto_respond: boolean, auto_populate: boolean }
  - Updates cluster.automation_config
  - Sets automation_enabled_by, automation_enabled_at on first enable
  - Emits SSE event: cluster_updated
  - Logs to audit_logs: enable_cluster_automation or update_cluster_config
- [ ] Authorization: admin/owner role required
- [ ] Validation: cannot enable without verified data source
- [ ] Unit tests for config validation
- [ ] Integration test for audit logging

### Dependencies
- Story 4 (Credential Delegation Backend) for data_source_connections check

### Technical Notes
```sql
-- Config update:
UPDATE clusters
SET automation_config = jsonb_set(automation_config, '{auto_respond}', $1::text::jsonb),
    automation_enabled_by = CASE WHEN automation_enabled_by IS NULL THEN $2 ELSE automation_enabled_by END,
    automation_enabled_at = CASE WHEN automation_enabled_at IS NULL THEN NOW() ELSE automation_enabled_at END
WHERE id = $3;

-- Audit log:
INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, metadata)
VALUES ($1, $2, 'enable_cluster_automation', 'cluster', $3, $4);
```

Reference: Section 5.3 Audit Integration

---

## Story 9: Cluster Configuration (Frontend)

**Type:** Story
**Priority:** Medium
**Estimate:** 3 points
**Sprint:** 2
**Assignee:** Frontend Pair B

### Description
Build cluster config panel with automation toggles and real-time status updates via SSE.

### Acceptance Criteria
- [ ] Config panel in cluster detail page
- [ ] Toggle switches: "Auto-respond to tickets", "Auto-populate knowledge"
- [ ] Disabled state if data source not connected
  - Tooltip: "Connect ServiceNow first"
  - Link to credential delegation page
- [ ] Optimistic UI update on toggle
- [ ] SSE event cluster_updated refreshes config state
- [ ] Confirmation dialog for disabling automation
  - "Are you sure? X tickets will no longer auto-respond."
- [ ] Success toast on save
- [ ] Error handling for failed updates
- [ ] Shows "Automation enabled by {user} on {date}" metadata
- [ ] Accessibility: toggle labels, confirmation dialog

### Dependencies
- Story 7 (Cluster Detail Frontend) for page layout
- Use mocks initially, integrate after Story 8

### Technical Notes
```typescript
// Toggle component:
<ToggleSwitch
  label="Auto-respond to tickets"
  checked={config.auto_respond}
  onChange={handleToggle}
  disabled={!dataSourceConnected}
  aria-describedby="auto-respond-help"
/>
{!dataSourceConnected && (
  <Tooltip id="auto-respond-help">
    Connect ServiceNow to enable automation
  </Tooltip>
)}
```

Reference: Section 4.2 Frontend API Endpoints

---

## Story 10: Integration & E2E Testing

**Type:** Task
**Priority:** High
**Estimate:** 5 points
**Sprint:** 2
**Assignee:** All

### Description
Remove frontend mocks, wire real APIs, implement end-to-end test scenarios covering full user workflows.

### Acceptance Criteria
- [ ] Remove MSW mocks from frontend
- [ ] Wire all API calls to real backend endpoints
- [ ] Fix any contract mismatches discovered
- [ ] E2E test: Full ingestion flow
  - Owner clicks "Sync Tickets"
  - Mock RabbitMQ publishes `ticket_batch_processed`
  - Dashboard updates with new clusters
  - Verify SSE event received
- [ ] E2E test: Credential delegation flow
  - Owner creates delegation
  - IT Admin receives email (check webhook call)
  - IT Admin submits credentials
  - Verify data_source_connection created BEFORE webhook sent
  - Polling returns success
  - Connection status updated to 'idle', enabled=true
- [ ] E2E test: Duplicate delegation prevention
  - Owner creates delegation for admin@company.com + servicenow
  - Second delegation for same email+org+type returns 409
- [ ] E2E test: Validation workflow
  - User opens cluster detail
  - Approves validation sample
  - Validation counter increments
  - SSE event updates UI
- [ ] E2E test: Config update
  - User enables automation
  - Config saved with audit log
  - Cluster card shows "Automated" badge
- [ ] E2E test: Sync cancellation race condition
  - Start sync (status='syncing')
  - Cancel sync (status='cancelled')
  - RabbitMQ sends sync_completed
  - Verify status remains 'cancelled' (not overwritten)
- [ ] E2E test: Cluster idempotency
  - Sync same tickets twice with same external_cluster_id
  - Verify no duplicate clusters created
  - Verify tickets updated (not duplicated)
- [ ] Load testing: 100+ clusters, 1000+ tickets
- [ ] Error scenario testing: network failures, webhook timeouts
- [ ] Accessibility audit: axe-core scan
- [ ] Cross-browser testing: Chrome, Firefox, Safari

### Dependencies
- All previous stories

### Technical Notes
```typescript
// Playwright E2E test example:
test('Full ingestion flow', async ({ page }) => {
  await page.goto('/dashboard');
  await page.click('button:has-text("Sync Tickets")');

  // Mock RabbitMQ message
  await mockRabbitMQ.publish('ticket_batch_processed', mockBatch);

  // Wait for SSE event
  await page.waitForSelector('.cluster-card:has-text("Email Issues")');

  // Verify dashboard updated
  const clusterCount = await page.locator('.cluster-card').count();
  expect(clusterCount).toBeGreaterThan(0);
});
```

Reference: Full technical design document

---

## Epic Summary

**Epic:** RITA Autopilot - Ticket Clustering Dashboard
**Total Estimate:** 37 points (~2 sprints)
**Timeline:** ~10-12 days with parallelization

### Sprint 1 (Stories 1-5)
- Story 1: Database Foundation (3 pts)
- Story 2: Core Ingestion Backend (5 pts) - Pair A
- Story 3: Core Ingestion Frontend (5 pts) - Pair A
- Story 4: Credential Delegation Backend (5 pts) - Pair B
- Story 5: Credential Delegation Frontend (5 pts) - Pair B

**Sprint 1 Deliverables:**
- Working dashboard with real-time sync
- Complete ITSM credential delegation flow

### Sprint 2 (Stories 6-10)
- Story 6: Cluster Detail Backend (4 pts) - Pair A
- Story 7: Cluster Detail Frontend (4 pts) - Pair A
- Story 8: Cluster Config Backend (3 pts) - Pair B
- Story 9: Cluster Config Frontend (3 pts) - Pair B
- Story 10: Integration & E2E Testing (5 pts) - All

**Sprint 2 Deliverables:**
- Cluster detail views with validation
- Automation config management
- Production-ready system

---

## Definition of Done

All stories must meet:
- [ ] Code reviewed and approved
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests pass
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Accessibility: WCAG 2.1 AA compliant
- [ ] Mobile responsive
- [ ] Error handling implemented
- [ ] Loading states implemented
- [ ] Merged to main branch
- [ ] Deployed to staging
- [ ] Product owner acceptance

---

## Unresolved Questions

Before starting, resolve:
1. validation_target default value? (affects Story 6)
2. Analytics retention period? 30d/90d/1yr? (affects Story 1 indexing)
3. Rate limit for delegation? 10/day per org per doc (affects Story 4)
4. SSE debouncing strategy? (affects Stories 2, 6, 8)
5. Knowledge article max per cluster? (affects Story 6)
6. Queue naming convention - confirm with platform team: `ticket_batch_processed`, `ticket_cluster_enrichment`

## Resolved in v1.2

- ~~Cluster IDs~~ → Use `external_cluster_id` (TEXT) from Workflow Platform + internal auto-gen `id` (UUID)
- ~~Ticket upsert conflict~~ → Use `(organization_id, external_id)` unique constraint
- ~~Delegation → connection timing~~ → Create `data_source_connections` record BEFORE sending webhook
- ~~System user for clusters~~ → Make `created_by`/`updated_by` nullable for system-generated records
- ~~SSE event naming~~ → Follow existing pattern: `ingestion_run_update`, `cluster_update`, `data_source_update`
- ~~Jira type~~ → Add to `ALLOWED_DATA_SOURCE_TYPES` in Story 1
