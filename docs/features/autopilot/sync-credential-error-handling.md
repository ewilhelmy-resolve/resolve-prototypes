# Sync Credential Error Handling

**Status:** Implemented
**Ticket:** RG-702

## Overview

When ITSM credentials are revoked or permissions change after initial verification, sync operations (KB sync and ticket ingestion) now report proper failures instead of misleading "success" with empty data. Users see inline error alerts with a "Re-verify credentials" action.

Covers all connection types: Confluence, SharePoint, ServiceNow KB, ServiceNow ITSM, Jira ITSM, Ivanti ITSM, Freshdesk ITSM.

## Error Code Convention

Known error types use `error_message` as a **structured error code**, not a human-readable string. The frontend maps error codes to translated messages via i18n. Supplementary data goes in `error_detail`. Unknown/generic errors can still use human-readable strings in `error_message`.

This is the same pattern used by `tickets_below_threshold` and `warning:no_documents_found`.

| Error Code | `error_message` | `error_detail` | Applies to |
|---|---|---|---|
| Authentication failed | `"authentication_failed"` | *(none)* | KB sync, ticket ingestion |
| Permission denied | `"permission_denied"` | *(none)* | KB sync, ticket ingestion |
| Tickets below threshold | `"tickets_below_threshold"` | `{ current_total_tickets, needed_total_tickets }` | ticket ingestion |
| No documents found | `"warning:no_documents_found"` | *(none)* | KB sync (set internally, not from platform) |

## Flows

### KB Sync — Credential Failure

```
Platform attempts KB sync with invalid credentials
       ↓
Publishes to RabbitMQ queue: data_source_status
Payload: { type: "sync", status: "sync_failed", error_message: "authentication_failed" }
       ↓
DataSourceStatusConsumer.processSyncStatus()
       ↓
1. Set data_source_connection status to "idle", last_sync_status to "failed"
2. Persist error_message in last_sync_error column
       ↓
SSE event: data_source_update (last_sync_status: "failed", last_sync_error: "authentication_failed")
       ↓
Frontend: SyncErrorAlert maps error code to i18n + shows "Re-verify credentials" button
```

### Ticket Ingestion — Credential Failure

```
Platform attempts ticket sync with invalid credentials
       ↓
Publishes to RabbitMQ queue: data_source_status
Payload: { type: "ticket_ingestion", status: "failed", error_message: "authentication_failed" }
       ↓
DataSourceStatusConsumer.processTicketIngestionStatus()
       ↓
1. Mark ingestion_runs as "failed" with error_message
2. Set data_source_connection status to "idle", last_sync_status to "failed"
       ↓
SSE event: ingestion_run_update (status: "failed", error_message: "authentication_failed")
       ↓
Frontend: IngestionErrorAlert with translated message + "Re-verify credentials" button
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

### KB Sync Failure — Authentication

```json
{
  "type": "sync",
  "connection_id": "conn-uuid",
  "tenant_id": "org-uuid",
  "status": "sync_failed",
  "error_message": "authentication_failed",
  "timestamp": "2026-03-09T00:00:00.000Z"
}
```

### KB Sync Failure — Permission Denied

```json
{
  "type": "sync",
  "connection_id": "conn-uuid",
  "tenant_id": "org-uuid",
  "status": "sync_failed",
  "error_message": "permission_denied",
  "timestamp": "2026-03-09T00:00:00.000Z"
}
```

### Ticket Ingestion Failure — Authentication

`error_message` is the **error code**. Frontend maps it to a translated message.

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
  "error_message": "authentication_failed",
  "timestamp": "2026-03-09T00:00:00.000Z"
}
```

### Ticket Ingestion Failure — Permission Denied

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
  "error_message": "permission_denied",
  "timestamp": "2026-03-09T00:00:00.000Z"
}
```

### Ticket Ingestion Failure — Tickets Below Threshold

Same pattern: error code in `error_message`, supplementary data in `error_detail`.

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
  "error_message": "tickets_below_threshold",
  "error_detail": {
    "current_total_tickets": 42,
    "needed_total_tickets": 100
  },
  "timestamp": "2026-03-09T00:00:00.000Z"
}
```

### `error_detail` Reference

| Field | Type | Description |
|---|---|---|
| `current_total_tickets` | `number` | Current ticket count (used with `tickets_below_threshold`) |
| `needed_total_tickets` | `number` | Required ticket count (used with `tickets_below_threshold`) |

Only used for `tickets_below_threshold`. Credential/permission errors don't need `error_detail`.

## Detection Logic

Both KB sync and ticket ingestion use the same `isCredentialError` function:

1. **Error code check:** `error_message === "authentication_failed"` or `"permission_denied"` → credential error
2. **Keyword fallback (backward compat):** `error_message` contains (case-insensitive): `"authentication"`, `"permission"`, `"unauthorized"`, or `"access denied"` → credential error
3. **Otherwise:** generic failure (no re-verify button)

`isCredentialIngestionError` is a convenience wrapper that extracts `error_message` from an `IngestionRun` and delegates to `isCredentialError`.

## Frontend Behavior

### Credential/Permission Error
- **Component:** `SyncErrorAlert` (KB sync) or `IngestionErrorAlert` (ticket ingestion)
- **Variant:** Error (red)
- **Title:** "Sync failed due to credential issue"
- **Body:** Error code mapped to translated string via `syncError.authentication_failed` / `syncError.permission_denied` i18n keys. Old-style human-readable messages shown as-is (backward compat).
- **Action:** "Re-verify credentials" button → switches to credential form
- **Detection:** See [Detection Logic](#detection-logic)

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
- For ticket ingestion: `ingestion_runs.status` → `"failed"`, `ingestion_runs.error_message` → error code string, `data_source_connections.status` → `"idle"`, `data_source_connections.last_sync_status` → `"failed"`

### DB Changes on Zero Documents
- `data_source_connections.last_sync_error` → `"warning:no_documents_found"`
- `data_source_connections.last_sync_status` → `"completed"`

### Key Files
- `packages/api-server/src/consumers/DataSourceStatusConsumer.ts` — consumer handler
- `packages/api-server/src/services/DataSourceService.ts` — `updateDataSourceStatus` with `lastSyncError` param
- `packages/api-server/src/types/dataSource.ts` — `SyncStatusMessage`, `IngestionStatusMessage`
- `packages/client/src/components/connection-sources/SyncErrorAlert.tsx` — KB sync error alert
- `packages/client/src/components/connection-sources/IngestionErrorAlert.tsx` — ticket ingestion error alert
- `packages/client/src/components/connection-sources/utils.ts` — `isCredentialError`, `isCredentialIngestionError`
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

Both KB sync and ticket ingestion publish the error code (`"authentication_failed"` / `"permission_denied"`) as `error_message`.

### Manual via RabbitMQ

Publish directly to `data_source_status` queue using the message formats above. See the platform scripts at `platform_scripts/rita_messages/send_data_source_status/`.

### Verify

1. Inline error alert appears on the connection config page
2. Translated error description is displayed (not the raw error code)
3. "Re-verify credentials" button appears for credential/permission errors
4. Clicking re-verify switches to credential form
5. DB: `last_sync_error` column populated (KB sync) or `ingestion_runs.error_message` populated (ticket ingestion)
