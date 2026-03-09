# Sync Credential Error Handling

**Status:** Implemented
**Ticket:** RG-702

## Overview

When ITSM credentials are revoked or permissions change after initial verification, sync operations (KB sync and ticket ingestion) now report proper failures instead of misleading "success" with empty data. Users see inline error alerts with a "Re-verify credentials" action.

Covers all connection types: Confluence, SharePoint, ServiceNow KB, ServiceNow ITSM, Jira ITSM, Ivanti ITSM, Freshdesk ITSM.

## Flows

### KB Sync — Credential Failure

```
Platform attempts KB sync with invalid credentials
       ↓
Publishes to RabbitMQ queue: data_source_status
Payload: { type: "sync", status: "sync_failed", error_message: "Authentication failed: ..." }
       ↓
DataSourceStatusConsumer.processSyncStatus()
       ↓
1. Set data_source_connection status to "idle", last_sync_status to "failed"
2. Persist error_message in last_sync_error column
       ↓
SSE event: data_source_update (last_sync_status: "failed", last_sync_error: "...")
       ↓
Frontend: SyncErrorAlert with "Re-verify credentials" button
```

### Ticket Ingestion — Credential Failure

```
Platform attempts ticket sync with invalid credentials
       ↓
Publishes to RabbitMQ queue: data_source_status
Payload: { type: "ticket_ingestion", status: "failed", error_message: "Authentication failed: ..." }
       ↓
DataSourceStatusConsumer.processTicketIngestionStatus()
       ↓
1. Mark ingestion_runs as "failed" with error_message
2. Set data_source_connection status to "idle", last_sync_status to "failed"
       ↓
SSE event: ingestion_run_update (status: "failed", error_message: "...")
       ↓
Frontend: IngestionErrorAlert with "Re-verify credentials" button
```

### KB Sync — Zero Documents Warning

```
Platform completes KB sync but finds 0 documents
       ↓
Publishes: { type: "sync", status: "sync_completed", documents_processed: 0 }
       ↓
DataSourceStatusConsumer.processSyncStatus()
       ↓
1. Set status to "idle", last_sync_status to "completed"
2. Store "warning:no_documents_found" in last_sync_error
       ↓
Frontend: SyncErrorAlert shows warning (not error)
```

## RabbitMQ Messages

**Queue:** `data_source_status` (env: `DATA_SOURCE_STATUS_QUEUE`)

### KB Sync Failure (Credential Error)

```json
{
  "type": "sync",
  "connection_id": "conn-uuid",
  "tenant_id": "org-uuid",
  "status": "sync_failed",
  "error_message": "Authentication failed: invalid or expired credentials. Please re-verify your connection credentials.",
  "timestamp": "2026-03-09T00:00:00.000Z"
}
```

### Ticket Ingestion Failure (Credential Error)

```json
{
  "type": "ticket_ingestion",
  "tenant_id": "org-uuid",
  "user_id": "user-uuid",
  "ingestion_run_id": "run-uuid",
  "connection_id": "conn-uuid",
  "status": "failed",
  "records_processed": 0,
  "records_failed": 0,
  "error_message": "Authentication failed: invalid or expired credentials. Please re-verify your connection credentials.",
  "error_detail": { "error_code": "authentication_failed" },
  "timestamp": "2026-03-09T00:00:00.000Z"
}
```

### Permission Denied Variants

Same as above but with:
- `error_message`: `"Permission denied: the service account does not have sufficient permissions to read the requested resources."`
- `error_detail.error_code`: `"permission_denied"` (ticket ingestion only)

## Frontend Behavior

### Credential/Permission Error
- **Component:** `SyncErrorAlert` (KB sync) or `IngestionErrorAlert` (ticket ingestion)
- **Variant:** Error (red)
- **Title:** "Sync failed due to credential issue"
- **Body:** The `error_message` from the platform
- **Action:** "Re-verify credentials" button → switches to credential form
- **Detection:** `error_message` contains "authentication" or "permission" (case-insensitive)

### Generic Sync Failure
- **Title:** "Sync failed" / "Ticket import failed"
- **Body:** The `error_message`
- **No re-verify button** (not a credential issue)

### Zero Documents Warning
- **Variant:** Warning (amber)
- **Title:** "No documents found"
- **Body:** Informational message suggesting configuration check
- **Shown when:** `last_sync_status = "completed"` and `last_sync_error = "warning:no_documents_found"`

### Recovery
User clicks "Re-verify credentials" → credential form opens → re-submit credentials → verification runs → if successful, user can sync again. Successful sync with documents clears the error.

## Backend Details

### DB Changes on Credential Failure
- `data_source_connections.status` → `"idle"`
- `data_source_connections.last_sync_status` → `"failed"`
- `data_source_connections.last_sync_error` → error message string
- For ticket ingestion: `ingestion_runs.status` → `"failed"`, `ingestion_runs.error_message` → error string

### DB Changes on Zero Documents
- `data_source_connections.last_sync_error` → `"warning:no_documents_found"`
- `data_source_connections.last_sync_status` → `"completed"`

### Key Files
- `packages/api-server/src/consumers/DataSourceStatusConsumer.ts` — consumer handler
- `packages/api-server/src/services/DataSourceService.ts` — `updateDataSourceStatus` with `lastSyncError` param
- `packages/api-server/src/types/dataSource.ts` — `SyncStatusMessage`, `IngestionStatusMessage`
- `packages/client/src/components/connection-sources/SyncErrorAlert.tsx` — KB sync error alert
- `packages/client/src/components/connection-sources/IngestionErrorAlert.tsx` — ticket ingestion error alert
- `packages/client/src/i18n/locales/en/connections.json` — `syncError.*` keys
- `packages/mock-service/src/index.ts` — mock credential error scenarios

## Testing

### Mock Service

Trigger credential errors by setting the connection's username/email:

| Username/Email | Behavior |
|---|---|
| `mock-auth-error` | Authentication failure (both KB sync and ticket ingestion) |
| `mock-auth-error@test.com` | Same (uses `startsWith` matching, works with email fields) |
| `mock-permission-denied` | Permission denied failure |

Confluence uses `settings.email`, ITSM types use `settings.username`.

After a 2s delay, the mock publishes the appropriate failure message to RabbitMQ.

### Manual via RabbitMQ

Publish directly to `data_source_status` queue using the message formats above. See the platform scripts at `platform_scripts/rita_messages/send_data_source_status/`.

### Verify

1. Inline error alert appears on the connection config page
2. Error message from platform is displayed
3. "Re-verify credentials" button appears for credential/permission errors
4. Clicking re-verify switches to credential form
5. DB: `last_sync_error` column populated (KB sync) or `ingestion_runs.error_message` populated (ticket ingestion)
