# ServiceNow Connection Split: KB and ITSM

**Created:** 2026-01-19  
**Updated:** 2026-01-19 (incorporated review feedback)  
**Status:** Planning  
**Supersedes:** `docs/feat-autopilot-ticket-cluster/story-3-connection-sources-split.md` (ServiceNow-specific parts)

---

## Problem

Currently, ServiceNow KB and ITSM share a single `data_source_connections` record:

- Single `status`, `last_sync_status`, `last_sync_at` for both features
- Shared credentials (can't use different ServiceNow instances)
- KB sync failure affects ITSM display (and vice versa)
- Can't enable ITSM-only without KB configuration

---

## Solution

Split into two independent connection types:

| Type | Purpose | Credentials |
|------|---------|-------------|
| `servicenow` | Knowledge Base articles | Independent |
| `servicenow_itsm` | ITSM tickets for Autopilot | Independent |

Each has:
- Own `data_source_connections` record
- Independent verification flow
- Independent sync status
- Own credentials stored externally via `(tenant_id, connection_id, connection_type)`

---

## Migration Strategy

- **Existing `servicenow` records** → remain as KB connections (no data migration)
- **New `servicenow_itsm` records** → created by existing seed mechanism (`POST /api/data-sources/seed`)
- Users configure ITSM credentials independently
- Existing ITSM test configs not migrated; must reconfigure

---

## Implementation Steps

### Step 1: Database Migration

**File:** `packages/api-server/src/database/migrations/XXX_update_itsm_system_type_constraint.sql`

The `credential_delegation_tokens` table has a CHECK constraint that must be updated:

```sql
-- Migration: Update itsm_system_type CHECK constraint
-- Allows 'servicenow_itsm' instead of 'servicenow' for ITSM delegations

-- Drop existing CHECK constraint
ALTER TABLE credential_delegation_tokens
  DROP CONSTRAINT IF EXISTS credential_delegation_tokens_itsm_system_type_check;

-- Add updated CHECK constraint
ALTER TABLE credential_delegation_tokens
  ADD CONSTRAINT credential_delegation_tokens_itsm_system_type_check
  CHECK (itsm_system_type IN ('servicenow_itsm', 'jira'));

-- Note: Existing 'servicenow' values in DB will violate new constraint.
-- If there are existing rows, migrate them first:
-- UPDATE credential_delegation_tokens SET itsm_system_type = 'servicenow_itsm' WHERE itsm_system_type = 'servicenow';
```

**Note:** This changes the semantic meaning of `itsm_system_type` from "vendor" to "connection type". This aligns with how the code uses it.

---

### Step 2: Backend Constants

**File:** `packages/api-server/src/constants/dataSources.ts`

```typescript
export const ALLOWED_DATA_SOURCE_TYPES = [
  'confluence',
  'servicenow',       // KB only
  'servicenow_itsm',  // ITSM only (NEW)
  'sharepoint',
  'websearch',
  'jira'
] as const;

export const DEFAULT_DATA_SOURCES = [
  {
    type: 'confluence',
    name: 'Confluence',
    description: 'Connect your Atlassian Confluence workspace'
  },
  {
    type: 'servicenow',
    name: 'ServiceNow Knowledge',  // Updated name
    description: 'Connect your ServiceNow knowledge base'
  },
  {
    type: 'servicenow_itsm',  // NEW
    name: 'ServiceNow ITSM',
    description: 'Import tickets from ServiceNow for Autopilot'
  },
  {
    type: 'sharepoint',
    name: 'SharePoint',
    description: 'Connect your Microsoft SharePoint'
  },
  {
    type: 'websearch',
    name: 'Web Search',
    description: 'Search the public web'
  },
  {
    type: 'jira',
    name: 'Jira',
    description: 'Connect your Atlassian Jira instance'
  }
] as const;
```

---

### Step 3: Backend Route Validation

**File:** `packages/api-server/src/routes/dataSourceWebhooks.ts`

Update sync-tickets endpoint validation and error message:

```typescript
// Before
if (!['servicenow', 'jira'].includes(dataSource.type)) {
  return res.status(400).json({
    error: 'Invalid data source type',
    message: 'Ticket sync is only supported for ServiceNow and Jira connections'
  });
}

// After
if (!['servicenow_itsm', 'jira'].includes(dataSource.type)) {
  return res.status(400).json({
    error: 'Invalid data source type',
    message: 'Ticket sync is only supported for ServiceNow ITSM and Jira connections'
  });
}
```

---

### Step 4: Backend Credential Delegation Types

**File:** `packages/api-server/src/types/credentialDelegation.ts`

```typescript
// Before
export type ItsmSystemType = 'servicenow' | 'jira';

// After
export type ItsmSystemType = 'servicenow_itsm' | 'jira';
```

---

### Step 5: Backend Credential Delegation Service

**File:** `packages/api-server/src/services/CredentialDelegationService.ts`

Update type validation:

```typescript
// Before (createDelegation method)
if (!['servicenow', 'jira'].includes(itsmSystemType)) {
  throw new Error('Invalid ITSM system type');
}

// After
if (!['servicenow_itsm', 'jira'].includes(itsmSystemType)) {
  throw new Error('Invalid ITSM system type');
}
```

Update validateCredentials method:

```typescript
// Before
if (systemType === 'servicenow') {

// After
if (systemType === 'servicenow_itsm') {
```

---

### Step 6: Backend Credential Delegation Route

**File:** `packages/api-server/src/routes/credentialDelegations.ts`

Update validation in create endpoint:

```typescript
// Before
if (!itsm_system_type || !['servicenow', 'jira'].includes(itsm_system_type)) {
  return res.status(400).json({
    error: 'itsm_system_type is required and must be one of: servicenow, jira',
  });
}

// After
if (!itsm_system_type || !['servicenow_itsm', 'jira'].includes(itsm_system_type)) {
  return res.status(400).json({
    error: 'itsm_system_type is required and must be one of: servicenow_itsm, jira',
  });
}
```

---

### Step 7: Frontend Type Definitions

**File:** `packages/client/src/types/dataSource.ts`

```typescript
// Before
export type DataSourceType = 'confluence' | 'servicenow' | 'sharepoint' | 'websearch' | 'jira';

// After
export type DataSourceType = 
  | 'confluence' 
  | 'servicenow'       // KB
  | 'servicenow_itsm'  // ITSM
  | 'sharepoint' 
  | 'websearch' 
  | 'jira';
```

---

### Step 8: Frontend Connection Constants

**File:** `packages/client/src/constants/connectionSources.ts`

```typescript
export const SOURCES = {
  CONFLUENCE: 'confluence',
  SHAREPOINT: 'sharepoint',
  SERVICENOW: 'servicenow',
  SERVICENOW_ITSM: 'servicenow_itsm',  // NEW
  WEB_SEARCH: 'websearch',
  JIRA: 'jira',
} as const;

// Knowledge Sources - KB articles only
export const KNOWLEDGE_SOURCE_TYPES = [
  'confluence',
  'sharepoint',
  'servicenow',  // KB only
  'websearch',
] as const;

// ITSM Sources - tickets for Autopilot
export const ITSM_SOURCE_TYPES = [
  'servicenow_itsm',  // Changed from 'servicenow'
  'jira'
] as const;

export const KNOWLEDGE_SOURCES_ORDER = [
  'confluence',
  'sharepoint',
  'servicenow',
  'websearch',
];

export const ITSM_SOURCES_ORDER = [
  'servicenow_itsm',  // Changed from 'servicenow'
  'jira'
];

export const SOURCE_METADATA: Record<string, { title: string; description?: string }> = {
  confluence: {
    title: 'Confluence',
  },
  servicenow: {
    title: 'ServiceNow Knowledge',  // Clarified
  },
  servicenow_itsm: {  // NEW
    title: 'ServiceNow ITSM',
    description: 'Import tickets for Autopilot clustering.',
  },
  sharepoint: {
    title: 'SharePoint',
  },
  websearch: {
    title: 'Web Search (LGA)',
    description: 'Use web results to supplement answers when knowledge isn\'t found.',
  },
  jira: {
    title: 'Jira',
    description: 'Import tickets from Jira for autopilot clustering.',
  },
};
```

---

### Step 9: Frontend Page Registry

**File:** `packages/client/src/pages/ConnectionSourceDetailPage.tsx`

```typescript
// Forms - reuse ServiceNowForm for both
const FORM_REGISTRY: Record<string, React.ComponentType<...>> = {
  [SOURCES.CONFLUENCE]: ConfluenceForm,
  [SOURCES.SHAREPOINT]: SharePointForm,
  [SOURCES.SERVICENOW]: ServiceNowForm,
  [SOURCES.SERVICENOW_ITSM]: ServiceNowForm,  // NEW - same form
  [SOURCES.WEB_SEARCH]: WebSearchForm,
  [SOURCES.JIRA]: JiraForm,
};

// KB config - servicenow only (not servicenow_itsm)
const KB_CONFIGURATION_REGISTRY: Record<string, React.ComponentType<...>> = {
  [SOURCES.CONFLUENCE]: ConfluenceConfiguration,
  [SOURCES.SHAREPOINT]: SharePointConfiguration,
  [SOURCES.SERVICENOW]: ServiceNowKBConfiguration,
  [SOURCES.WEB_SEARCH]: WebSearchConfiguration,
};

// ITSM config - servicenow_itsm (not servicenow)
const ITSM_CONFIGURATION_REGISTRY: Record<string, React.ComponentType<...>> = {
  [SOURCES.SERVICENOW_ITSM]: ServiceNowItsmConfiguration,  // Changed key
  [SOURCES.JIRA]: JiraItsmConfiguration,
};
```

---

### Step 10: Frontend Credential Delegation Hook

**File:** `packages/client/src/hooks/api/useCredentialDelegations.ts`

```typescript
// Before
export type ItsmSystemType = 'servicenow' | 'jira';

// After
export type ItsmSystemType = 'servicenow_itsm' | 'jira';
```

---

### Step 11: Frontend i18n (if applicable)

**File:** `packages/client/public/locales/en/credentialDelegation.json` (or similar)

Add translation key for new system type:

```json
{
  "systems": {
    "servicenow_itsm": {
      "title": "ServiceNow ITSM"
    }
  }
}
```

---

### Step 12: Icon Asset

**Location:** `packages/client/public/connections/`

Copy existing icon:
```bash
cp icon_servicenow.svg icon_servicenow_itsm.svg
```

Same icon for both types.

---

## Files Changed Summary

| # | File | Change |
|---|------|--------|
| 1 | `packages/api-server/src/database/migrations/XXX_update_itsm_system_type_constraint.sql` | **NEW** - Update CHECK constraint |
| 2 | `packages/api-server/src/constants/dataSources.ts` | Add type, update seed entries |
| 3 | `packages/api-server/src/routes/dataSourceWebhooks.ts` | Update ITSM type validation + error msg |
| 4 | `packages/api-server/src/types/credentialDelegation.ts` | Update `ItsmSystemType` |
| 5 | `packages/api-server/src/services/CredentialDelegationService.ts` | Update type validation (2 places) |
| 6 | `packages/api-server/src/routes/credentialDelegations.ts` | Update validation + error msg |
| 7 | `packages/client/src/types/dataSource.ts` | Add `servicenow_itsm` type |
| 8 | `packages/client/src/constants/connectionSources.ts` | Update all constants |
| 9 | `packages/client/src/pages/ConnectionSourceDetailPage.tsx` | Update registries |
| 10 | `packages/client/src/hooks/api/useCredentialDelegations.ts` | Update type |
| 11 | `packages/client/public/locales/*/credentialDelegation.json` | Add i18n key (if exists) |
| 12 | `packages/client/public/connections/icon_servicenow_itsm.svg` | Copy icon |

---

## No Changes Needed

These files are type-agnostic and work automatically:

- `data_source_connections` table schema (TEXT column, no enum)
- `DataSourceService.ts` (operates on any type)
- `DataSourceWebhookService.ts` (passes `connectionType` dynamically)
- `DataSourceStatusConsumer.ts` (discriminates by `connection_id`)
- `ServiceNowForm.tsx` (reused for both types)
- `ServiceNowKBConfiguration.tsx` (already KB-specific)
- `ServiceNowItsmConfiguration.tsx` (already ITSM-specific)
- `DelegationInviteBox.tsx` (receives `itsmSource` prop, type-agnostic)

---

## External Dependencies

**Platform Team:**
- Must support `servicenow_itsm` as `connection_type` in webhook payloads
- Credential lookup uses new composite key: `(tenant_id, connection_id, 'servicenow_itsm')`
- Status: Waiting for this change

---

## Testing Checklist

### Database
- [ ] Migration runs without error
- [ ] Existing `servicenow` delegation tokens migrated (if any exist)
- [ ] New `servicenow_itsm` delegations can be created

### Seeding
- [ ] New org seeds both `servicenow` and `servicenow_itsm`
- [ ] Existing org keeps `servicenow` record unchanged
- [ ] Existing org gets `servicenow_itsm` after seed endpoint called

### UI Display
- [ ] Knowledge Sources page shows `servicenow` (not `servicenow_itsm`)
- [ ] ITSM Sources page shows `servicenow_itsm` (not `servicenow`)
- [ ] Correct titles: "ServiceNow Knowledge" vs "ServiceNow ITSM"
- [ ] Icons render for both types

### Independent Operations
- [ ] KB verification works independently
- [ ] ITSM verification works independently
- [ ] KB sync doesn't affect ITSM status
- [ ] ITSM ticket sync doesn't affect KB status
- [ ] Different credentials can be used for each

### Credential Delegation
- [ ] Delegation invite works for `servicenow_itsm`
- [ ] Delegation form shows correct system type name
- [ ] Existing `servicenow` delegations (if any) still work or are migrated

---

## Rollback Plan

If issues arise:
1. Revert frontend changes (hide `servicenow_itsm` from UI)
2. Revert DB migration (restore old CHECK constraint)
3. Backend continues accepting the type but users can't create new ones
4. Existing `servicenow_itsm` records remain but are inaccessible

---

## Future Considerations

- May want similar split for Jira (KB vs ITSM) if Jira KB sync is added
- Consider generic pattern for dual-purpose connectors
