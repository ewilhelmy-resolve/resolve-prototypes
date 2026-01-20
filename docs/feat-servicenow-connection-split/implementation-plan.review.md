# Review: ServiceNow Connection Split (KB vs ITSM)

Created: 2026-01-19
Scope: Review `implementation-plan.md` for correctness/gaps.

## TL;DR
Plan direction solid: split by `data_source_connections.type` into `servicenow` (KB) and `servicenow_itsm` (ITSM). Main missing item: DB CHECK constraint on `credential_delegation_tokens.itsm_system_type` must be updated to allow `servicenow_itsm`. Also align seeding wording (seed endpoint uses `DEFAULT_DATA_SOURCES`).

## What makes sense
- Using separate `data_source_connections` rows per feature solves shared status/credentials coupling.
- Keeping existing `servicenow` as KB avoids risky migration.
- Unique-per-org already enforced by DB constraint `(organization_id, type)`.
- Sync-tickets route already gates on type; switching allowlist to `servicenow_itsm` is correct.
- Reuse `ServiceNowForm` OK given current requirement (same fields).

## Required fixes / missing steps

### 1) DB migration: `credential_delegation_tokens.itsm_system_type` CHECK
Migration `138_add_autopilot_tables.sql` defines:

- `credential_delegation_tokens.itsm_system_type TEXT NOT NULL CHECK (itsm_system_type IN ('servicenow', 'jira', 'confluence'))`

If backend/frontend change `ItsmSystemType` to include `servicenow_itsm` (and exclude `servicenow`), inserts will fail until DB constraint updated.

Add a new migration that:
- Drops the existing CHECK constraint on `credential_delegation_tokens.itsm_system_type`
- Recreates it including `servicenow_itsm`

Decision note: this effectively redefines what `itsm_system_type` means (now equals *connection type* not *vendor*). That matches the code plan; just document it.

### 2) Seeding wording: remove “seed on ITSM page visit”
Actual mechanism:
- Endpoint: `POST /api/data-sources/seed` (`packages/api-server/src/routes/dataSources.ts`)
- Implementation: `DataSourceService.seedDefaultDataSources()` iterates `DEFAULT_DATA_SOURCES` and inserts idempotently.

So:
- Keep Step 1 edits to `DEFAULT_DATA_SOURCES` (good)
- Update plan text to reflect: `servicenow_itsm` appears when seed endpoint runs (same as other sources), not page-specific seeding.

### 3) Update sync-tickets error copy
File: `packages/api-server/src/routes/dataSourceWebhooks.ts`
- After changing allowlist to `servicenow_itsm`, update message from “ServiceNow and Jira connections” to “ServiceNow ITSM and Jira connections” (or similar) to avoid confusion.

## Confirmed non-issues (based on current schema)
- `data_source_connections.type` is `TEXT` with no enum/check constraint. No migration needed for that.
- DB already enforces one connection per org per type via `unique_org_data_source`.

## Additional checks recommended (quick greps)
These aren’t proven broken, but are common miss spots:
- Backend: any other allowlists for ITSM systems/types beyond:
  - `routes/dataSourceWebhooks.ts` (sync-tickets)
  - `CredentialDelegationService` and `types/credentialDelegation.ts`
- Frontend: any ITSM UI using hardcoded `'servicenow'` rather than `ITSM_SOURCE_TYPES`.
- Analytics/telemetry: if connector type strings are used for events/dashboards, add/update for `servicenow_itsm`.

## Suggested plan edits (minimal)
1. Add step: DB migration updating `credential_delegation_tokens.itsm_system_type` CHECK constraint.
2. Replace Migration Strategy section to:
   - Existing `servicenow` remains KB.
   - `servicenow_itsm` created by existing seed mechanism (`POST /api/data-sources/seed`).
   - Existing ITSM test configs not migrated; must reconfigure.
3. In Step 2 include: update error message copy in sync-tickets handler.

## Open questions
None blocking given your answers; only decision is semantic naming for `itsm_system_type` (vendor vs connection type). If keeping vendor semantics, alternative is keeping `'servicenow'` in delegation tokens while using `connection_type='servicenow_itsm'` elsewhere.
