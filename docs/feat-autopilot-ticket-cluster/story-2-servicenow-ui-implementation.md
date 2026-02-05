# Story 2: ServiceNow UI Configuration - Implementation Plan

**Parent:** `technical-design-autopilot-tickets.md` (v1.17)
**Prerequisite:** Story 1 (Database Foundation) - Completed
**Focus:** Enable UI to configure ServiceNow connection for autopilot ticket sync

---

## Scope

Enable ServiceNow as ITSM connection source with:
1. Credential form (URL + email + API key)
2. Configuration view with time range picker (30/60/90 days)
3. Sync trigger for autopilot ticket ingestion
4. Real-time status updates via SSE

---

## Architecture Decision: ServiceNow Dual-Purpose Model

### Problem
ServiceNow can serve two purposes:
- **Knowledge Base source** - sync KB articles (like Confluence)
- **ITSM source** - sync tickets for autopilot clustering

### Decision: Same Record with Capability Flags

One `data_source_connections` record per ServiceNow instance with boolean capability columns:

```sql
ALTER TABLE data_source_connections ADD COLUMN kb_enabled BOOLEAN DEFAULT false;
ALTER TABLE data_source_connections ADD COLUMN itsm_enabled BOOLEAN DEFAULT false;
```

**Connection examples:**
| Type | kb_enabled | itsm_enabled |
|------|------------|--------------|
| confluence | true | false |
| servicenow (KB only) | true | false |
| servicenow (ITSM only) | false | true |
| servicenow (both) | true | true |
| jira | false | true |

### Different Sync Tracking Mechanisms

| Aspect | KB Sync | ITSM Sync |
|--------|---------|-----------|
| Tracking table | `data_source_connections` | `ingestion_runs` |
| Status fields | `status`, `last_sync_status`, `last_sync_at` | `status`, `records_processed`, `records_failed` |
| Webhook action | `trigger_sync` | `sync_tickets` |
| History | Only last sync retained | Full run history |
| RabbitMQ queue | `data_source_status` | `data_source_status` (type: `ticket_ingestion`) |

**Rationale:** ITSM sync is more complex (classification, clustering, metrics tracking) and benefits from detailed run history. KB sync is simpler (success/fail).

### Migration Required

```sql
-- Add capability columns to data_source_connections
ALTER TABLE data_source_connections
  ADD COLUMN kb_enabled BOOLEAN DEFAULT false,
  ADD COLUMN itsm_enabled BOOLEAN DEFAULT false;

-- Set defaults based on type
UPDATE data_source_connections SET kb_enabled = true WHERE type IN ('confluence', 'sharepoint');
UPDATE data_source_connections SET kb_enabled = true WHERE type = 'servicenow';
-- itsm_enabled stays false until user enables it
```

### Table Selection via `latest_options`

After verification, Workflow Platform returns available tables via RabbitMQ `data_source_status` queue (same pattern as Confluence spaces).

**Message structure:**
```typescript
{
  type: 'verification',
  connection_id: string,
  tenant_id: string,
  status: 'success' | 'failed',
  options: {
    // For ServiceNow - separate options for KB vs ITSM
    knowledge_base: [
      { title: "Engineering", sys_id: "kb_eng_001" },
      { title: "IT Support", sys_id: "kb_it_002" }
    ],
    itsm_tables: ["incident", "problem", "change_request", "sc_request"]
  }
}
```

**Stored in:** `data_source_connections.latest_options` (JSONB)

**UI display:**
- KB sync section: MultiSelect from `latest_options.knowledge_base` (displays title, uses sys_id)
- ITSM sync section: MultiSelect from `latest_options.itsm_tables`

**Comparison with Confluence:**
| Source | Options Field | Example |
|--------|---------------|---------|
| Confluence | `spaces` | `"ENG,PROD,DOCS"` |
| ServiceNow KB | `knowledge_base` | `[{title, sys_id}]` |
| ServiceNow ITSM | `itsm_tables` | `["incident","problem"]` |

---

## Webhook Payload Examples

### 1. Verify Credentials (Rita → WF)

**Endpoint:** `POST {AUTOMATION_WEBHOOK_URL}`
**Action:** `verify_credentials`

```json
{
  "source": "rita-chat",
  "action": "verify_credentials",
  "tenant_id": "org-uuid-123",
  "user_id": "user-uuid-456",
  "user_email": "analyst@company.com",
  "connection_id": "conn-uuid-abc",
  "connection_type": "servicenow",
  "credentials": {
    "password": "sn_password_xxxxx"
  },
  "settings": {
    "instanceUrl": "https://company.service-now.com",
    "username": "service_account"
  },
  "timestamp": "2025-12-03T10:00:00Z"
}
```

**Response:** WF validates credentials, then publishes to `data_source_status` RabbitMQ queue.

---

### 2. Verify Response (WF → Rita via RabbitMQ)

**Queue:** `data_source_status`

```json
{
  "type": "verification",
  "connection_id": "conn-uuid-abc",
  "tenant_id": "org-uuid-123",
  "status": "success",
  "options": {
    "knowledge_base": [
      { "title": "Engineering", "sys_id": "kb_eng_001" },
      { "title": "IT Support", "sys_id": "kb_it_002" }
    ],
    "itsm_tables": ["incident", "problem", "change_request", "sc_request"]
  },
  "error": null
}
```

---

### 3. KB Sync Trigger (Rita → WF)

**Endpoint:** `POST {AUTOMATION_WEBHOOK_URL}`
**Action:** `trigger_sync` (existing pattern)

```json
{
  "source": "rita-chat",
  "action": "trigger_sync",
  "tenant_id": "org-uuid-123",
  "user_id": "user-uuid-456",
  "user_email": "analyst@company.com",
  "connection_id": "conn-uuid-abc",
  "connection_type": "servicenow",
  "settings": {
    "instanceUrl": "https://company.service-now.com",
    "username": "service_account",
    "knowledge_base": [
      { "title": "Engineering", "sys_id": "kb_eng_001" }
    ]
  },
  "timestamp": "2025-12-03T10:00:00Z"
}
```

**Response:** WF syncs KB articles, then publishes to `data_source_status` queue with `type: 'sync'`.

---

### 4. ITSM Sync Tickets (Rita → WF)

**Endpoint:** `POST {AUTOMATION_WEBHOOK_URL}`
**Action:** `sync_tickets` (NEW - for autopilot)

```json
{
  "source": "rita-chat",
  "action": "sync_tickets",
  "tenant_id": "org-uuid-123",
  "user_id": "user-uuid-456",
  "user_email": "analyst@company.com",
  "connection_id": "conn-uuid-abc",
  "connection_type": "servicenow",
  "ingestion_run_id": "run-uuid-789",
  "settings": {
    "instanceUrl": "https://company.service-now.com",
    "itsm_tables": ["incident", "problem"],
    "time_range_days": 30
  },
  "timestamp": "2025-12-03T10:00:00Z"
}
```

**Response:** WF syncs tickets, classifies into clusters, then publishes to `data_source_status` queue (type: `ticket_ingestion`).

---

### 5. ITSM Sync Response (WF → Rita via RabbitMQ)

**Queue:** `data_source_status`

```json
{
  "type": "ticket_ingestion",
  "tenant_id": "org-uuid-123",
  "user_id": "user-uuid-456",
  "ingestion_run_id": "run-uuid-789",
  "status": "completed",
  "records_processed": 150,
  "records_failed": 2,
  "timestamp": "2025-12-03T10:05:00Z"
}
```

---

## UI Navigation Changes

### Settings Sidebar Menu Update

Current sidebar shows "Connection Sources" as single item. Update to split by purpose:

**Before:**
```
Settings
├── Connection Sources  ← single list
└── ...
```

**After:**
```
Settings
├── Knowledge Sources   ← connections with kb_enabled=true
├── ITSM Sources        ← connections with itsm_enabled=true
└── ...
```

**Files to modify:**
- `packages/client/src/components/layout/SettingsSidebar.tsx` (or equivalent)
- `packages/client/src/pages/settings/ConnectionSources.tsx` - split into two pages or filter by type

**Filtering logic:**
- Knowledge Sources page: `WHERE kb_enabled = true`
- ITSM Sources page: `WHERE itsm_enabled = true`
- ServiceNow with both enabled appears in both lists

---

## Current State

### Backend (Ready)
- `servicenow` in `ALLOWED_DATA_SOURCE_TYPES` and `DEFAULT_DATA_SOURCES`
- `/api/data-sources/:id/verify` - generic, works for servicenow
- `/api/data-sources/:id/sync` - triggers KB sync webhook
- Migrations run: `138_add_autopilot_tables.sql`

### Frontend (Needs Update)
| Component | Current | Target |
|-----------|---------|--------|
| `ServiceNowForm.tsx` | username + password | URL + email + API key |
| `ServiceNowConfiguration.tsx` | status card only | KB sync + ITSM sync sections |

---

## Implementation Steps

### Step 1: Update ServiceNowForm.tsx

**File:** `packages/client/src/components/connection-sources/connection-forms/ServiceNowForm.tsx`

**Changes:**

1. Update interface:
```typescript
// Before
interface ServiceNowFormData {
  instanceUrl: string;
  username: string;
  password: string;
}

// After
interface ServiceNowFormData {
  instanceUrl: string;
  email: string;
  apiKey: string;
}
```

2. Add imports:
```typescript
import { Spinner } from "@/components/ui/spinner";
import { StatusAlert } from "@/components/ui/status-alert";
import { ritaToast } from "@/components/ui/rita-toast";
```

3. Add verification error display (pattern from ConfluenceForm):
```tsx
const verificationError = source.backendData?.last_verification_error;
const verificationFailed = !!verificationError;

// In JSX:
{verificationFailed && (
  <StatusAlert variant="error" className="mb-4">
    <p className="font-semibold">Verification Failed</p>
    <p>{verificationError}</p>
    <p className="text-sm mt-2">Please check your credentials and try again.</p>
  </StatusAlert>
)}
```

4. Update form fields:
   - `username` → `email` (with email validation pattern)
   - `password` → `apiKey`

5. Update credential payload:
```typescript
credentials: {
  apiKey: formData.apiKey,  // not username/password
}
```

6. Add `onSuccess` and `onFailure` props

7. Add loading spinner during verification

---

### Step 2: Create Backend Sync Tickets Endpoint

**File:** `packages/api-server/src/routes/dataSourceWebhooks.ts` (add to existing)

**Endpoint:** `POST /api/data-sources/:id/sync-tickets`

Follows same pattern as existing `/api/data-sources/:id/sync` (KB sync).

**Request:**
```typescript
{
  time_range_days: number;  // 30, 60, or 90
}
```

**Logic:**
1. Validate user has admin/owner role
2. Get data_source_connection by `:id` param
3. Validate connection has `itsm_enabled = true`
4. INSERT into `ingestion_runs`:
   ```sql
   INSERT INTO ingestion_runs (
     organization_id, started_by, status, data_source_connection_id, metadata
   ) VALUES ($1, $2, 'pending', $3, $4)
   RETURNING id;
   ```
5. Send webhook with `action: 'sync_tickets'`:
   ```typescript
   {
     source: 'rita-chat',
     action: 'sync_tickets',
     tenant_id: organizationId,
     user_id: userId,
     user_email: userEmail,
     ingestion_run_id: run.id,
     connection_id: connectionId,
     connection_type: 'servicenow',
     settings: { time_range_days },
     timestamp: new Date().toISOString()
   }
   ```
6. Return `202 { ingestion_run_id, status: "SYNCING" }`

---

### Step 3: Add Webhook Method

**File:** `packages/api-server/src/services/DataSourceWebhookService.ts`

Add `sendSyncTicketsEvent()` method for autopilot sync:

```typescript
async sendSyncTicketsEvent(params: {
  organizationId: string;
  userId: string;
  userEmail: string;
  connectionId: string;
  connectionType: string;
  ingestionRunId: string;
  settings: Record<string, unknown>;
}): Promise<WebhookResponse> {
  const payload = {
    source: 'rita-chat',
    action: 'sync_tickets',
    tenant_id: params.organizationId,
    user_id: params.userId,
    user_email: params.userEmail,
    ingestion_run_id: params.ingestionRunId,
    connection_id: params.connectionId,
    connection_type: params.connectionType,
    settings: params.settings,
    timestamp: new Date().toISOString()
  };

  return this.sendWebhook(payload);
}
```

---

### Step 4: Create Frontend Hook

**File:** `packages/client/src/hooks/useDataSources.ts` (add to existing)

```typescript
// Add to existing useDataSources.ts file

interface SyncTicketsParams {
  id: string;
  timeRangeDays: number;
}

interface SyncTicketsResponse {
  ingestion_run_id: string;
  status: string;
}

export function useSyncTickets() {
  return useMutation({
    mutationFn: async (params: SyncTicketsParams): Promise<SyncTicketsResponse> => {
      const response = await api.post(`/api/data-sources/${params.id}/sync-tickets`, {
        time_range_days: params.timeRangeDays,
      });
      return response.data;
    },
  });
}
```

Follows same pattern as existing `useTriggerSync()` hook.

---

### Step 5: Update ServiceNowConfiguration.tsx

**File:** `packages/client/src/components/connection-sources/connection-details/ServiceNowConfiguration.tsx`

**Changes:**

1. Parse available tables from `latest_options` (pattern from ConfluenceConfiguration):
```tsx
// Parse available ITSM tables from latest_options (discovered during verification)
const availableItsmTables: MultiSelectOption[] = useMemo(() => {
  const tables = source.backendData?.latest_options?.itsm_tables || [];
  return tables.map((table: string) => ({ label: table, value: table }));
}, [source.backendData?.latest_options]);

// Initialize selected tables from settings
const [selectedTables, setSelectedTables] = useState<string[]>([]);
useEffect(() => {
  const saved = source.backendData?.settings?.itsm_tables || [];
  if (saved.length > 0) setSelectedTables(saved);
}, [source.backendData?.settings]);
```

2. Add time range state:
```tsx
const TIME_RANGE_OPTIONS = [
  { label: "Last 30 days", value: 30 },
  { label: "Last 60 days", value: 60 },
  { label: "Last 90 days", value: 90 },
];

const [selectedTimeRange, setSelectedTimeRange] = useState(30);
```

3. Import and use hooks:
```tsx
import { useSyncTickets, useCancelSync, useUpdateDataSource } from "@/hooks/useDataSources";

const syncTickets = useSyncTickets();
const cancelMutation = useCancelSync();
const updateMutation = useUpdateDataSource();
```

4. Add sync handler (saves table selection then triggers sync):
```tsx
const handleSyncTickets = async () => {
  if (!source.backendData) return;

  try {
    // Step 1: Save selected tables to settings
    await updateMutation.mutateAsync({
      id: source.backendData.id,
      data: {
        settings: {
          ...source.backendData.settings,
          itsm_tables: selectedTables,
        },
      },
    });

    // Step 2: Trigger sync
    await syncTickets.mutateAsync({
      id: source.backendData.id,
      timeRangeDays: selectedTimeRange,
    });

    ritaToast.success({
      title: "Sync Started",
      description: "Your ServiceNow tickets are being synced",
    });
  } catch (error) {
    ritaToast.error({
      title: "Sync Failed",
      description: error instanceof Error ? error.message : "Failed to start sync",
    });
  }
};
```

5. Add UI components:
```tsx
{/* ITSM Section - only show if itsm_enabled */}
{source.backendData?.itsm_enabled && (
  <div className="border border-border bg-popover rounded-md p-4">
    <Label className="mb-2">Import tickets from tables:</Label>

    {/* Table MultiSelect */}
    <MultiSelect
      options={availableItsmTables}
      defaultValue={selectedTables}
      onValueChange={setSelectedTables}
      placeholder="Choose tables..."
      searchable={true}
    />

    {/* Time Range Selector */}
    <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
      <SelectTrigger>
        <SelectValue placeholder="Select time range" />
      </SelectTrigger>
      <SelectContent>
        {TIME_RANGE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    {/* Sync Button */}
    <Button onClick={handleSyncTickets} disabled={isSyncing}>
      {isSyncing ? "Syncing..." : "Sync Tickets"}
    </Button>
  </div>
)}
```

---

### Step 6: SSE Consumer (Implemented)

**File:** `packages/api-server/src/consumers/DataSourceStatusConsumer.ts` (existing)

Handles `ticket_ingestion` messages in `data_source_status` queue → emits SSE `ingestion_run_update` event.

Uses discriminator pattern (existing `sync`, `verification`, now `ticket_ingestion`):

```typescript
// In DataSourceStatusConsumer.ts
} else if (content.type === 'ticket_ingestion') {
  await this.processTicketIngestionStatus(content);
}

// processTicketIngestionStatus method
async processTicketIngestionStatus(message: IngestionStatusMessage): Promise<void> {
  await this.sseService.sendToOrganization(message.tenant_id, {
    type: 'ingestion_run_update',
    data: {
      ingestion_run_id: message.ingestion_run_id,
      connection_id: message.connection_id,
      status: message.status,
      records_processed: message.records_processed,
      timestamp: new Date().toISOString()
    }
  });
}
```

*Implemented in `DataSourceStatusConsumer.ts` - reuses existing consumer infrastructure.*

---

## File Summary

| File | Action | Priority |
|------|--------|----------|
| `packages/api-server/src/database/migrations/144_add_capability_columns.sql` | Create | 0 |
| `packages/client/src/components/connection-sources/connection-forms/ServiceNowForm.tsx` | Modify | 1 |
| `packages/client/src/components/layout/SettingsSidebar.tsx` | Modify (split menu) | 1 |
| `packages/client/src/pages/settings/ConnectionSources.tsx` | Modify (or split into KnowledgeSources + ItsmSources) | 1 |
| `packages/api-server/src/routes/dataSourceWebhooks.ts` | Modify (add sync-tickets) | 2 |
| `packages/api-server/src/services/DataSourceWebhookService.ts` | Modify (add sendSyncTicketsEvent) | 2 |
| `packages/client/src/hooks/useDataSources.ts` | Modify (add useSyncTickets) | 3 |
| `packages/client/src/components/connection-sources/connection-details/ServiceNowConfiguration.tsx` | Modify | 3 |
| `packages/api-server/src/consumers/DataSourceStatusConsumer.ts` | Modify (add ticket_ingestion handler) | 4 (done) |

---

## Execution Order

1. **Step 0** - Migration: add `kb_enabled`, `itsm_enabled` columns
2. **Step 1** - ServiceNowForm (FE only, backend verify already works)
3. **Steps 2+3** - Backend ingest endpoint + webhook method
4. **Step 4** - Frontend hook
5. **Step 5** - ServiceNowConfiguration (needs endpoint from Step 2)
6. **Step 6** - SSE consumer (optional, can parallel with Step 5)

---

## Testing Checklist

- [ ] ServiceNow form renders with URL, email, API key fields
- [ ] Form validation works (URL pattern, email pattern, required)
- [ ] Verification error displays correctly
- [ ] Connection saves after verification
- [ ] Configuration view shows time range dropdown (30/60/90 days)
- [ ] Sync trigger creates `ingestion_runs` record
- [ ] Webhook sends correct payload to Workflow Platform
- [ ] SSE updates status in UI (when consumer implemented)

---

## Dependencies

- Workflow Platform must handle `action: 'sync_tickets'` webhook
- RabbitMQ `data_source_status` queue handles ticket_ingestion messages for SSE updates

---

## Notes

- ServiceNow credentials: URL + email + API key (not username/password)
- Time range: dropdown preset (30/60/90 days), not custom date picker
- Rita creates `ingestion_runs` record before sending webhook
- Reuses existing data source verification endpoint for credential check
