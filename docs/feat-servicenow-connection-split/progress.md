# ServiceNow Connection Split - Progress

## Status: ✅ COMPLETE

---

## 2026-01-19: Implementation Complete

### Completed
- All backend changes
- All frontend changes
- Type checks pass
- Lint passes

### Files Modified

**Backend (7 files):**
1. `packages/api-server/src/database/migrations/149_update_itsm_system_type_constraint.sql` - NEW
2. `packages/api-server/src/database/migrations/150_drop_capability_columns.sql` - NEW (drop obsolete kb_enabled/itsm_enabled)
3. `packages/api-server/src/constants/dataSources.ts` - Added type + seed entry
4. `packages/api-server/src/routes/dataSourceWebhooks.ts` - Updated validation
5. `packages/api-server/src/routes/credentialDelegations.ts` - Updated validation
6. `packages/api-server/src/types/credentialDelegation.ts` - Updated type
7. `packages/api-server/src/services/CredentialDelegationService.ts` - Updated 2 validations

**Frontend (9 files):**
1. `packages/client/src/types/dataSource.ts` - Added type
2. `packages/client/src/constants/connectionSources.ts` - Updated constants
3. `packages/client/src/pages/ConnectionSourceDetailPage.tsx` - Updated registries
4. `packages/client/src/hooks/api/useCredentialDelegations.ts` - Updated type
5. `packages/client/src/i18n/locales/en/credentialDelegation.json` - Updated i18n key
6. `packages/client/src/pages/CredentialSetupPage.tsx` - Updated 3 places (icons + conditionals)
7. `packages/client/src/pages/settings/ItsmSources.tsx` - Updated enabledItsmSources to use SERVICENOW_ITSM
8. `packages/client/src/components/connection-sources/ConnectionStatusCard.tsx` - Added SERVICENOW_ITSM to field display conditionals
9. `packages/client/public/connections/icon_servicenow_itsm.svg` - Copied icon

**Mock Service (1 file):**
1. `packages/mock-service/src/index.ts` - Added `servicenow_itsm` verification options

### Discoveries During Implementation

**Additional file found:** `CredentialSetupPage.tsx` also needed updates:
- `SYSTEM_ICONS` map keyed by ItsmSystemType
- Conditional rendering based on `systemType === "servicenow"`
- Settings object conditional based on system type

These were caught by TypeScript type checking after updating `ItsmSystemType`.

### Key Learnings

1. **TypeScript catches dependent changes** - Changing `ItsmSystemType` union type flagged all usages
2. **i18n keys follow type names** - `systems.servicenow_itsm.title` pattern
3. **Migration order matters** - UPDATE existing rows BEFORE dropping/recreating CHECK constraint

---

## 2026-01-19: Initial Planning

### Key Findings

**Database:**
- `data_source_connections.type` is TEXT (no enum) - no migration needed for new type
- `credential_delegation_tokens.itsm_system_type` has CHECK constraint - NEEDS migration
- Unique constraint `(organization_id, type)` allows new types automatically

**Code Locations (backend):**
- `constants/dataSources.ts` - type allowlist + seed definitions
- `routes/dataSourceWebhooks.ts` - sync-tickets endpoint validates type
- `routes/credentialDelegations.ts` - create endpoint validates type
- `services/CredentialDelegationService.ts` - validates in 2 places: `createDelegation` + `validateCredentials`
- `types/credentialDelegation.ts` - TypeScript type definition

**Code Locations (frontend):**
- `types/dataSource.ts` - TypeScript type
- `constants/connectionSources.ts` - UI constants, metadata, display order
- `pages/ConnectionSourceDetailPage.tsx` - form + config registries
- `hooks/api/useCredentialDelegations.ts` - TypeScript type
- `pages/CredentialSetupPage.tsx` - public credential setup page (discovered during impl)

**No changes needed:**
- `DataSourceService.ts` - type-agnostic
- `DataSourceWebhookService.ts` - passes connectionType dynamically
- `DataSourceStatusConsumer.ts` - discriminates by connection_id
- `ServiceNowForm.tsx` - reusable for both types
- `ServiceNowKBConfiguration.tsx` - already KB-specific
- `ServiceNowItsmConfiguration.tsx` - already ITSM-specific

### Decisions Made
1. Keep `servicenow` for KB, add `servicenow_itsm` for ITSM
2. Same icon for both types
3. Reuse `ServiceNowForm` for both
4. Independent credentials (different instances allowed)
5. Seed mechanism creates both on `POST /api/data-sources/seed`
6. Existing servicenow records stay as KB (no data migration)

---

## 2026-01-19: Migration Complete

### Migration Fix
Initial migration failed - UPDATE ran before DROP CONSTRAINT, so the old constraint blocked `servicenow_itsm` value.

**Fix:** Reordered steps:
1. DROP CONSTRAINT first
2. UPDATE rows
3. ADD new CONSTRAINT

Migration now passes ✅

---

---

## 2026-01-21: Credential Sync Planning

### What we did
- Discussed UX for syncing credentials between KB and ITSM connections
- Created `credential-sync-plan.md` with full technical design
- Updated `todo.md` with Phase 2 tasks

### Key decisions
- **Checkbox placement:** Above Connect button on both forms
- **Direction:** Bidirectional (KB→ITSM and ITSM→KB)
- **Sync behavior:** One-time copy, connections independent after
- **Overwrite:** Yes, no warning (user opted in)
- **Credentials only:** `instance_url`, `username`, `password` (not spaces/kb selection)
- **Lookup:** Simple 1:1 by org + type, no matching on instance_url or enabled status
- **Error handling:** Primary always succeeds, related failure just logged
- **API field:** `apply_to_related?: boolean` in verify request

### Useful info for next agent
- Plan doc: `docs/feat-servicenow-connection-split/credential-sync-plan.md`
- ServiceNow form: `packages/client/src/components/connection-sources/connection-forms/ServiceNowForm.tsx`
- Verify endpoint: `packages/api-server/src/routes/data-sources.ts`
- Related lookup: `servicenow` ↔ `servicenow_itsm` by `organization_id` + `type`

### Next steps
- ~~Implement frontend checkbox in `ServiceNowForm.tsx`~~ ✅
- ~~Update verify mutation payload~~ ✅
- ~~Add backend `apply_to_related` handling in verify endpoint~~ ✅
- ~~Manual testing of credential sync flow~~ ✅

---

## 2026-01-21: Credential Sync Bug Fix

### What we did
- Fixed bug where related connection settings weren't persisted to DB
- Added `updateDataSource()` call after successful webhook for related connection

### Issue
Webhook was sending credentials to external service, but settings (instanceUrl, username) weren't being saved to the related connection's `data_source_connections` row.

### Fix
After related webhook succeeds, call `dataSourceService.updateDataSource()` to persist:
- `instanceUrl` from `validated.settings`
- `username` from `validated.credentials`
- `enabled: true`

### Verified
- Both `servicenow` and `servicenow_itsm` connections now have matching settings after sync
- Tested KB → ITSM and ITSM → KB directions

---

## 2026-01-21: Credential Sync Implementation

### What we did
- Implemented frontend checkbox in `ServiceNowForm.tsx`
- Added `apply_to_related` field to `VerifyDataSourceRequest` type
- Added i18n keys for checkbox label
- Updated backend verify endpoint with parallel verification logic
- Added `getDataSourceByType()` method to `DataSourceService`

### Files modified

**Frontend (3 files):**
1. `packages/client/src/components/connection-sources/connection-forms/ServiceNowForm.tsx`
   - Added `applyToRelated` state
   - Added checkbox UI above Connect button
   - Pass `apply_to_related` to verify mutation
2. `packages/client/src/types/dataSource.ts`
   - Added `apply_to_related?: boolean` to `VerifyDataSourceRequest`
3. `packages/client/src/i18n/locales/en/connections.json`
   - Added `servicenow.applyToRelated`, `servicenow.knowledgeBase`, `servicenow.itsm`
   - Added `servicenow_itsm` source metadata

**Backend (2 files):**
1. `packages/api-server/src/routes/dataSourceWebhooks.ts`
   - Added `apply_to_related` to schema
   - Added validation for ServiceNow types only
   - Added related connection lookup
   - Implemented parallel webhook calls
   - Added logging for related sync results
2. `packages/api-server/src/services/DataSourceService.ts`
   - Added `getDataSourceByType()` method

### Key implementation details
- Checkbox determines `isItsmForm` from `source.type === "servicenow_itsm"`
- Related type lookup: `servicenow` ↔ `servicenow_itsm`
- Both webhooks run in parallel via `Promise.all()`
- Primary failure → revert both statuses, return error
- Related failure → log warning, revert related status, primary still succeeds
- No related connection → log info, continue with primary only

### Next steps
- Manual testing of credential sync flow
- Add unit tests for new backend logic
