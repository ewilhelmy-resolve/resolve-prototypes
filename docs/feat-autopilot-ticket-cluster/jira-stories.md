# RITA Autopilot - JIRA Stories

> **Split into two epics:**
> - **Epic A: Autopilot Ingestion** - Core ticket clustering (Stories 1-3, 6-10)
> - **Epic B: Credential Delegation** - ITSM credential setup (Stories D1-D4, future)

---

# Epic A: Autopilot Ingestion

## Story 1: Database Foundation ✅ DONE

**Type:** Task
**Priority:** Highest
**Estimate:** 3 points
**Status:** ✅ COMPLETED

### Acceptance Criteria
- [x] Add `jira` to `ALLOWED_DATA_SOURCE_TYPES` in `packages/api-server/src/constants/dataSources.ts`
- [x] Add `jira` to `DEFAULT_DATA_SOURCES` array
- [x] Migration file creates 6 tables: clusters, tickets, analytics_cluster_daily, knowledge_articles, ingestion_runs, credential_delegation_tokens
- [x] clusters table uses `external_cluster_id` (TEXT) + internal auto-gen `id` (UUID)
- [x] Unique constraint on clusters: `(organization_id, external_cluster_id)`
- [x] Unique constraint on tickets: `(organization_id, external_id)`
- [x] RLS policies enforced on all tables
- [x] All indexes created
- [x] Auto-timestamp triggers

**Completed:** Migration `138_add_autopilot_tables.sql`

---

## Story 2: Core Ingestion Flow (Backend)

**Type:** Story
**Priority:** High
**Estimate:** 5 points
**Sprint:** 1

### Description
Implement trigger endpoint and notification consumer. WF owns DB writes via 2-workflow architecture; Rita emits SSE only.

### Acceptance Criteria
- [ ] POST /api/ingest/trigger endpoint
  - Validates admin/owner role
  - Creates ingestion_run record (status='pending')
  - Sends sync_tickets webhook with `rebuild_model` flag
  - Returns 202 with ingestion_run_id
- [ ] DataSourceStatusConsumer handles `ticket_ingestion` messages in `data_source_status` queue
  - Emits SSE event: `ingestion_run_update`
  - NO database writes (WF owns DB)
  - Logs errors to message_processing_failures
- [ ] Audit log created: trigger_ticket_sync
- [ ] Unit tests for endpoint + consumer
- [ ] Integration test with mock RabbitMQ

### Dependencies
- Story 1 (Database Foundation)

### Technical Notes
```typescript
// Webhook payload (includes rebuild_model flag):
await webhookService.sendGenericEvent({
  source: 'rita-chat',
  action: 'sync_tickets',
  additionalData: {
    ingestion_run_id,
    connection_id,
    connection_type,
    rebuild_model: false,  // true = retrain classification model
    settings
  }
});

// Consumer only emits SSE - no DB writes:
await sseService.sendToUser(userId, tenantId, {
  type: 'ingestion_run_update',
  data: { ingestion_run_id, status, records_processed }
});
```

**WF 2-Workflow Architecture:**
1. Ticket Pull: fetches from ITSM → writes tickets with `cluster_id=NULL`
2. Classification: assigns clusters → sends `ticket_ingestion` to `data_source_status`

Reference: Section 4.1 Webhook Payloads, Section 5.1 Backend Worker Logic

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

### Description
Implement cluster config update endpoint for enabling automation toggles with audit logging.

### Acceptance Criteria
- [ ] PATCH /api/clusters/:id/config endpoint
  - Payload: { auto_respond: boolean, auto_populate: boolean }
  - Updates cluster.config JSONB
  - Sets automation_enabled_by, automation_enabled_at on first enable
  - Emits SSE event: cluster_updated
  - Logs to audit_logs: enable_cluster_automation or update_cluster_config
- [ ] Authorization: admin/owner role required
- [ ] Unit tests for config validation
- [ ] Integration test for audit logging

### Dependencies
- Story 6 (Cluster Detail Backend)

### Technical Notes
```sql
-- Config update:
UPDATE clusters
SET config = jsonb_set(config, '{auto_respond}', $1::text::jsonb),
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

### Description
Build cluster config panel with automation toggles and real-time status updates via SSE.

### Acceptance Criteria
- [ ] Config panel in cluster detail page
- [ ] Toggle switches: "Auto-respond to tickets", "Auto-populate knowledge"
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
  aria-describedby="auto-respond-help"
/>
```

Reference: Section 4.2 Frontend API Endpoints

---

## Story 10: Integration & E2E Testing

**Type:** Task
**Priority:** High
**Estimate:** 4 points
**Sprint:** 2

### Description
Remove frontend mocks, wire real APIs, implement end-to-end test scenarios covering autopilot ingestion workflows.

### Acceptance Criteria
- [ ] Remove MSW mocks from frontend
- [ ] Wire all API calls to real backend endpoints
- [ ] Fix any contract mismatches discovered
- [ ] E2E test: Full ingestion flow
  - Owner clicks "Sync Tickets"
  - Mock RabbitMQ publishes `ticket_ingestion` to `data_source_status`
  - Dashboard updates with new clusters
  - Verify SSE event received
- [ ] E2E test: Validation workflow
  - User opens cluster detail
  - Approves validation sample
  - Validation counter increments
  - SSE event updates UI
- [ ] E2E test: Config update
  - User enables automation
  - Config saved with audit log
  - Cluster card shows "Automated" badge
- [ ] E2E test: Cluster idempotency
  - Sync same tickets twice with same external_cluster_id
  - Verify no duplicate clusters created
  - Verify tickets updated (not duplicated)
- [ ] Load testing: 100+ clusters, 1000+ tickets
- [ ] Error scenario testing: network failures, webhook timeouts
- [ ] Accessibility audit: axe-core scan

### Dependencies
- All previous Epic A stories

### Technical Notes
```typescript
// Playwright E2E test example:
test('Full ingestion flow', async ({ page }) => {
  await page.goto('/dashboard');
  await page.click('button:has-text("Sync Tickets")');

  // Mock RabbitMQ message
  await mockRabbitMQ.publish('data_source_status', { type: 'ticket_ingestion', ...mockNotification });

  // Wait for SSE event
  await page.waitForSelector('.cluster-card:has-text("Email Issues")');

  // Verify dashboard updated
  const clusterCount = await page.locator('.cluster-card').count();
  expect(clusterCount).toBeGreaterThan(0);
});
```

Reference: Full technical design document

---

## Epic A Summary

**Epic:** RITA Autopilot - Ticket Clustering Dashboard
**Total Estimate:** 28 points (Story 1 done)

### Sprint 1 (Stories 2-3)
- Story 2: Core Ingestion Backend (5 pts)
- Story 3: Core Ingestion Frontend (5 pts)

### Sprint 2 (Stories 6-10)
- Story 6: Cluster Detail Backend (4 pts)
- Story 7: Cluster Detail Frontend (4 pts)
- Story 8: Cluster Config Backend (3 pts)
- Story 9: Cluster Config Frontend (3 pts)
- Story 10: Integration & E2E Testing (4 pts)

---

# Epic B: Credential Delegation (Future)

> **Note:** This epic is deferred. Data sources (ServiceNow/Jira) can be configured manually for now.

## Story D1: Credential Delegation Backend

**Type:** Story
**Priority:** Medium
**Estimate:** 5 points

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
  - UPSERT data_source_connections BEFORE webhook
  - Sends verify_credentials webhook
  - Returns 202 with polling_url
- [ ] GET /api/credential-delegations/status/:token endpoint (public)
  - Returns status: verifying|success|failed
  - Rate limited: 20 req/min per token
- [ ] DataSourceStatusConsumer processes verification results
- [ ] Unit tests for token generation, single-use enforcement

### Dependencies
- Story 1 (Database Foundation) ✅

---

## Story D2: Credential Delegation Frontend

**Type:** Story
**Priority:** Medium
**Estimate:** 5 points

### Description
Build RITA Owner delegation page and public IT Admin credential submission page with polling.

### Acceptance Criteria
- [ ] Owner delegation page
  - Form: admin_email, admin_name, itsm_system_type dropdown
  - "Send Invitation" button
  - Success/error toast messages
- [ ] IT Admin public page /credential-setup?token=xxx
  - Token validation
  - Form: ServiceNow URL, username, password
  - Polling for verification status (3s interval)
  - Success/failure/timeout states
- [ ] Form validation and accessibility

### Dependencies
- Use mocks initially, integrate after Story D1

---

## Story D3: Data Source Check Enhancement

**Type:** Story
**Priority:** Low
**Estimate:** 2 points

### Description
Add verified data source check to cluster config (optional guard).

### Acceptance Criteria
- [ ] Optional validation: warn if no verified data source when enabling automation
- [ ] Link to credential delegation page in warning

### Dependencies
- Story D1 (Delegation Backend)
- Story 8 (Cluster Config Backend)

---

## Story D4: Credential Delegation E2E Testing

**Type:** Task
**Priority:** Medium
**Estimate:** 2 points

### Description
E2E tests for complete credential delegation flow.

### Acceptance Criteria
- [ ] E2E test: Full delegation flow (create → submit → verify)
- [ ] E2E test: Duplicate delegation prevention (409)
- [ ] E2E test: Token expiration handling

### Dependencies
- Stories D1, D2, D3

---

## Epic B Summary

**Total Estimate:** 14 points

| Story | Name | Pts |
|-------|------|-----|
| D1 | Delegation Backend | 5 |
| D2 | Delegation Frontend | 5 |
| D3 | DS Check Enhancement | 2 |
| D4 | E2E Testing | 2 |

---

# Definition of Done

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

## Unresolved Questions (Epic A)

1. validation_target default value? (affects Story 6)
2. Analytics retention period? 30d/90d/1yr?
3. SSE debouncing strategy? (affects Stories 2, 6, 8)
4. Knowledge article max per cluster? (affects Story 6)
5. Queue naming convention - ✅ Resolved: `data_source_status` (type: `ticket_ingestion`), `cluster_notification`, `enrichment_notification`

## Resolved

- ~~Cluster IDs~~ → `external_cluster_id` (TEXT) + internal `id` (UUID)
- ~~Ticket upsert~~ → `(organization_id, external_id)` unique constraint
- ~~System user~~ → `automation_enabled_by` nullable for system-generated
- ~~SSE naming~~ → `ingestion_run_update`, `cluster_update`
- ~~Jira type~~ → Added to `ALLOWED_DATA_SOURCE_TYPES` ✅
- ~~Story 8 DS check~~ → Removed, DS configured manually
