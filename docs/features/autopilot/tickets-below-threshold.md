# Tickets Below Threshold

**Status:** Implemented

## Overview

When an ITSM instance has too few tickets to train a clustering model, the platform sends a `ticket_ingestion` failure with `error_message: "tickets_below_threshold"`. Rita handles this by marking the ingestion run as failed, stopping the sync, and showing a specific error in the UI.

## Flow

```
Platform detects insufficient tickets
       ↓
Publishes to RabbitMQ queue: data_source_status
Payload: { type: "ticket_ingestion", status: "failed", error_message: "tickets_below_threshold", error_detail: {...} }
       ↓
DataSourceStatusConsumer.processTicketIngestionStatus()
       ↓
1. Mark ingestion_runs as "failed" with error_detail in metadata
2. Stop sync: set data_source_connection status to "idle", last_sync_status to "failed"
       ↓
SSE event: ingestion_run_update (status: "failed", error_detail included)
       ↓
Frontend: toast notification + error state in TicketGroups page
```

## RabbitMQ Message

**Queue:** `data_source_status` (env: `DATA_SOURCE_STATUS_QUEUE`)

```json
{
  "type": "ticket_ingestion",
  "tenant_id": "org-uuid",
  "ingestion_run_id": "run-uuid",
  "connection_id": "conn-uuid",
  "status": "failed",
  "records_processed": 0,
  "records_failed": 0,
  "error_message": "tickets_below_threshold",
  "error_detail": {
    "current_total_tickets": 10,
    "needed_total_tickets": 100
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

## SSE Event

**Type:** `ingestion_run_update`

```json
{
  "type": "ingestion_run_update",
  "data": {
    "ingestion_run_id": "run-uuid",
    "connection_id": "conn-uuid",
    "status": "failed",
    "records_processed": 0,
    "records_failed": 0,
    "error_message": "tickets_below_threshold",
    "error_detail": {
      "current_total_tickets": 10,
      "needed_total_tickets": 100
    },
    "timestamp": "2025-01-01T00:00:00.000Z"
  }
}
```

## Frontend Behavior

### Toast Notification
Error toast shown immediately on SSE event:
- **Title:** "Not enough tickets"
- **Description:** "Found 10 tickets, minimum 100 required to train a model."

### TicketGroups Page
Error state shown when `latestRun.error_message === "tickets_below_threshold"`:
- Red error banner: "There are 10 tickets in your instance but at least 100 are required to train a model. Add more tickets and sync again."
- Link to ITSM Connections settings
- Search input disabled
- Empty state below banner

### Recovery
User adds more tickets to their ITSM instance, then triggers a new sync from the ITSM Connections page. The new ingestion run replaces the failed one.

## Backend Details

### DB Changes
- `ingestion_runs.status` → `"failed"`
- `ingestion_runs.error_message` → `"tickets_below_threshold"`
- `ingestion_runs.metadata.error_detail` → `{ current_total_tickets, needed_total_tickets }`
- `data_source_connections.status` → `"idle"`
- `data_source_connections.last_sync_status` → `"failed"`

### Key Files
- `packages/api-server/src/types/dataSource.ts` — `IngestionStatusMessage.error_detail`
- `packages/api-server/src/consumers/DataSourceStatusConsumer.ts` — consumer handler
- `packages/api-server/src/services/sse.ts` — `IngestionRunUpdateEvent.error_detail`
- `packages/client/src/contexts/SSEContext.tsx` — toast logic
- `packages/client/src/hooks/useIsIngesting.ts` — `isBelowThreshold` flag
- `packages/client/src/components/tickets/TicketGroups.tsx` — error state UI

## Testing

### Manual via RabbitMQ

Publish to `data_source_status` queue:

```json
{
  "type": "ticket_ingestion",
  "tenant_id": "<your-org-id>",
  "ingestion_run_id": "<active-run-id>",
  "connection_id": "<itsm-connection-id>",
  "status": "failed",
  "records_processed": 0,
  "records_failed": 0,
  "error_message": "tickets_below_threshold",
  "error_detail": {
    "current_total_tickets": 10,
    "needed_total_tickets": 100
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

**Verify:**
1. Toast appears with "Not enough tickets"
2. TicketGroups page shows error banner with counts
3. `ingestion_runs` row has `status = 'failed'`, `error_message = 'tickets_below_threshold'`
4. `data_source_connections` row has `status = 'idle'`, `last_sync_status = 'failed'`

### Mock Service

The mock service simulates this error in two ways:

1. **Deterministic:** Set ITSM connection username to `mock-threshold` — always triggers below-threshold
2. **Random:** For non-mock usernames, 10% chance of triggering on each sync

When triggered, the mock waits 1.5s then publishes a `ticket_ingestion` failed message with `error_message: "tickets_below_threshold"` and a random `current_total_tickets` between 5-84.

**File:** `packages/mock-service/src/index.ts` (sync_tickets handler)

### Storybook

Story: `Features/Tickets/Ticket Groups` → `TicketsBelowThreshold`
