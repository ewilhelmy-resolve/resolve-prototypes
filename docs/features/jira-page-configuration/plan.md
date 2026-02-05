# Jira ITSM Connection Page Configuration (jira_itsm)

**Created:** 2026-01-20  
**Status:** ✅ Complete

---

## Problem

We need a Jira ITSM connection settings page so orgs can configure + verify Jira creds and then trigger ticket sync for Autopilot. Must behave same as ServiceNow ITSM tickets flow, but using Jira.

Constraints:
- Jira ITSM should be **ITSM Sources only** (not Knowledge Sources)
- Use **manual creds** (api token + email) for now; delegation later
- External automation/sync service already supports Jira flows; only **connection_type** and settings payload differ

---

## Solution

Introduce new connection type `jira_itsm` (separate from existing `jira` type).

- `data_source_connections.type = 'jira_itsm'`
- Seed `jira_itsm` via existing `POST /api/data-sources/seed`
- Frontend shows Jira ITSM only under `/settings/connections/itsm`
- Detail route `/settings/connections/itsm/:id` uses Jira ITSM configuration component

This mirrors ServiceNow KB vs ITSM split pattern.

---

## UX / Flow

1. User opens Settings → Connection Sources → ITSM Sources
2. User selects Jira
3. User enters:
   - base_url (e.g. `https://company.atlassian.net`)
   - email
   - api_token
4. User clicks **Verify**
   - Rita sets connection `status='verifying'`
   - Rita sends webhook to external svc with credentials + settings
   - External svc stores creds by `(tenant_id, connection_id, connection_type='jira_itsm')`
   - External svc publishes verification result to RabbitMQ `data_source_status`
   - Rita consumer updates `latest_options`, `last_verification_*`, sets `status='idle'`, emits SSE `data_source_update`
5. User clicks **Sync tickets**
   - Rita sets `status='syncing'` (via ingestion_runs)
   - Rita sends webhook `sync_tickets` for `jira_itsm` (no creds; external svc looks up by composite key)
   - External svc pulls tickets, emits status to RabbitMQ
   - Rita updates status + SSE; UI reflects progress

---

## Data Model

### data_source_connections
Use existing table; only new `type`.

**settings (stored in DB, sent to external svc on verify + sync):**
```json
{
  "base_url": "https://company.atlassian.net",
  "email": "user@company.com"
}
```

**Credentials (never stored in Rita; sent only during verify):**
```json
{
  "email": "user@company.com",
  "api_token": "ATATT..."
}
```

**config (v1):**
- Keep empty for v1 (no ingestion filters yet). Reserve for later selectors (projects/JQL/lookback).
```json
{}
```

**latest_options (expected from verify; stored as JSONB, UI ignores v1):**
```json
{
  "projects": [
    { "key": "IT", "name": "IT Support" }
  ],
  "issue_types": [
    { "id": "10001", "name": "Incident" }
  ],
  "statuses": [
    { "id": "1", "name": "To Do" }
  ]
}
```

---

## Backend Plan

### Step 1: Add new data source type `jira_itsm`

**File:** `packages/api-server/src/constants/dataSources.ts`

```typescript
export const ALLOWED_DATA_SOURCE_TYPES = [
  'confluence',
  'servicenow',
  'sharepoint',
  'websearch',
  'jira',
  'jira_itsm',  // ADD
] as const;

export const DEFAULT_DATA_SOURCES = [
  // ... existing entries ...
  {
    type: 'jira' as DataSourceType,
    name: 'Jira',
    description: 'Connect your Atlassian Jira instance'
  },
  {
    type: 'jira_itsm' as DataSourceType,  // ADD
    name: 'Jira ITSM',
    description: 'Import tickets from Jira for Autopilot clustering'
  }
] as const;
```

### Step 2: Update ticket sync endpoint validation

**File:** `packages/api-server/src/routes/dataSourceWebhooks.ts`

Current code (line ~295):
```typescript
if (!['servicenow', 'jira'].includes(dataSource.type)) {
```

Change to:
```typescript
if (!['servicenow', 'jira_itsm'].includes(dataSource.type)) {
```

Also update error message accordingly.

### Step 3: Webhook payload (no changes needed)

Existing `DataSourceWebhookService` already uses `connection.type` dynamically. No code changes required—`jira_itsm` will flow through automatically.

### Step 4: Credential delegation type constraints

Defer. No changes to delegation types/CHECK constraints in this feature.

### Step 5: Backend types (optional cleanup)

**File:** `packages/api-server/src/types/dataSource.ts`

`DataSourceType` is derived from `ALLOWED_DATA_SOURCE_TYPES`, so it auto-updates. No manual change needed.

---

## Frontend Plan

### Step 1: Add new DataSourceType

**File:** `packages/client/src/types/dataSource.ts`

```typescript
// Before
export type DataSourceType = 'confluence' | 'servicenow' | 'sharepoint' | 'websearch' | 'jira';

// After
export type DataSourceType = 'confluence' | 'servicenow' | 'sharepoint' | 'websearch' | 'jira' | 'jira_itsm';
```

### Step 2: Update connection source constants

**File:** `packages/client/src/constants/connectionSources.ts`

```typescript
export const SOURCES = {
  CONFLUENCE: "confluence",
  SHAREPOINT: "sharepoint",
  SERVICENOW: "servicenow",
  WEB_SEARCH: "websearch",
  JIRA: "jira",
  JIRA_ITSM: "jira_itsm",  // ADD
  FRESHDESK: "freshdesk",
} as const;

// ITSM Sources - update to use jira_itsm instead of jira
export const ITSM_SOURCE_TYPES = ["servicenow", "jira_itsm", "freshdesk"] as const;

export const ITSM_SOURCES_ORDER = ["servicenow", "jira_itsm", "freshdesk"];

// Add metadata
export const SOURCE_METADATA: Record<string, { title: string; description?: string }> = {
  // ... existing ...
  jira: {
    title: "Jira",
    description: "Import tickets from Jira for autopilot clustering.",
  },
  jira_itsm: {  // ADD
    title: "Jira",
    description: "Import tickets from Jira for Autopilot clustering.",
  },
  // ...
};
```

### Step 3: Create JiraForm component

**File:** `packages/client/src/components/connection-sources/connection-forms/JiraForm.tsx` (NEW)

Model after `ServiceNowForm.tsx`. Fields:
- base_url (text input, required)
- email (text input, required)
- api_token (password input, required)
- Verify button

Use same patterns:
- `useVerifyDataSource` hook
- `useConnectionSource` context
- Zod validation schema
- i18n keys in `connections` namespace

### Step 4: Create JiraItsmConfiguration component

**File:** `packages/client/src/components/connection-sources/connection-details/JiraItsmConfiguration.tsx` (NEW)

Model after `ServiceNowItsmConfiguration.tsx`. Features:
- ConnectionStatusCard
- ConnectionActionsMenu (edit button)
- Time range selector (30/60/90 days)
- "Import Tickets" button → `useSyncTickets` hook
- "Cancel" button → `useCancelIngestion` hook
- Progress bar during sync
- Last sync info display

### Step 5: Register form + config in detail page

**File:** `packages/client/src/pages/ConnectionSourceDetailPage.tsx`

```typescript
import JiraForm from "@/components/connection-sources/connection-forms/JiraForm";
import JiraItsmConfiguration from "@/components/connection-sources/connection-details/JiraItsmConfiguration";

// Add to FORM_REGISTRY
const FORM_REGISTRY = {
  // ... existing ...
  [SOURCES.JIRA_ITSM]: JiraForm,  // ADD
};

// Add to ITSM_CONFIGURATION_REGISTRY
const ITSM_CONFIGURATION_REGISTRY = {
  [SOURCES.SERVICENOW]: ServiceNowItsmConfiguration,
  [SOURCES.JIRA_ITSM]: JiraItsmConfiguration,  // ADD
  [SOURCES.FRESHDESK]: FreshdeskItsmConfiguration,
};
```

### Step 6: Export JiraForm from index

**File:** `packages/client/src/components/connection-sources/connection-forms/index.ts`

```typescript
export { default as JiraForm } from "./JiraForm";
```

### Step 7: Icon asset

**File:** `packages/client/public/connections/icon_jira_itsm.svg`

Copy existing Jira icon:
```bash
cp packages/client/public/connections/icon_jira.svg packages/client/public/connections/icon_jira_itsm.svg
```

### Step 8: i18n translations

**File:** `packages/client/public/locales/en/connections.json`

Add keys for Jira form + config (mirror ServiceNow ITSM keys):
```json
{
  "jira": {
    "form": {
      "baseUrl": "Jira URL",
      "baseUrlPlaceholder": "https://company.atlassian.net",
      "email": "Email",
      "emailPlaceholder": "user@company.com",
      "apiToken": "API Token",
      "apiTokenPlaceholder": "Your Jira API token"
    }
  },
  "config": {
    "titles": {
      "jiraItsm": "Jira ITSM Configuration"
    }
  }
}
```

---

## Files Changed Summary

| # | File | Action |
|---|------|--------|
| 1 | `packages/api-server/src/constants/dataSources.ts` | Add `jira_itsm` type + seed entry |
| 2 | `packages/api-server/src/routes/dataSourceWebhooks.ts` | Update ITSM type validation |
| 3 | `packages/client/src/types/dataSource.ts` | Add `jira_itsm` to union |
| 4 | `packages/client/src/constants/connectionSources.ts` | Add SOURCES.JIRA_ITSM, update ITSM arrays, add metadata |
| 5 | `packages/client/src/components/connection-sources/connection-forms/JiraForm.tsx` | **CREATE** |
| 6 | `packages/client/src/components/connection-sources/connection-forms/index.ts` | Export JiraForm |
| 7 | `packages/client/src/components/connection-sources/connection-details/JiraItsmConfiguration.tsx` | **CREATE** |
| 8 | `packages/client/src/pages/ConnectionSourceDetailPage.tsx` | Register JiraForm + JiraItsmConfiguration |
| 9 | `packages/client/public/connections/icon_jira_itsm.svg` | **CREATE** (copy from icon_jira.svg) |
| 10 | `packages/client/public/locales/en/connections.json` | Add i18n keys |

---

## No Changes Needed

These work automatically:
- `DataSourceService.ts` (type-agnostic)
- `DataSourceWebhookService.ts` (uses `connection.type` dynamically)
- `DataSourceStatusConsumer.ts` (discriminates by `connection_id`)
- SSE events (type-agnostic)
- Hooks (`useDataSource`, `useSyncTickets`, etc.)

---

## Testing Checklist

### Backend
- [ ] `ALLOWED_DATA_SOURCE_TYPES` includes `jira_itsm`
- [ ] Seed endpoint creates `jira_itsm` record for new orgs
- [ ] `/sync-tickets` accepts `jira_itsm` type
- [ ] `/sync-tickets` rejects old `jira` type (if desired)
- [ ] Webhook payload has `connection_type: 'jira_itsm'`

### Frontend
- [ ] ITSM Sources page shows Jira card
- [ ] Clicking Jira navigates to `/settings/connections/itsm/:id`
- [ ] JiraForm renders with base_url, email, api_token fields
- [ ] Verify button sends correct payload, updates status via SSE
- [ ] After verify, JiraItsmConfiguration renders
- [ ] Time range selector works
- [ ] "Import Tickets" triggers sync, shows progress
- [ ] "Cancel" stops sync (UI-only)
- [ ] Last sync info displays correctly
- [ ] Errors render safely (no token leaks)
- [ ] Icon renders for jira_itsm

### Accessibility
- [ ] Form labels + ARIA attributes
- [ ] Keyboard navigation
- [ ] Focus states

---

## Rollback

- Remove `jira_itsm` from `ITSM_SOURCE_TYPES` (hides from UI)
- Keep backend type in `ALLOWED_DATA_SOURCE_TYPES` (safe)
- No DB migration needed; no prod data exists

---

## Unresolved Questions

None.
