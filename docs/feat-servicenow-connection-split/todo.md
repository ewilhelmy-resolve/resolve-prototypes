# ServiceNow Connection Split - TODO

## Backend

- [x] **DB Migration**: Create `146_update_itsm_system_type_constraint.sql`
  - Drop old CHECK constraint on `credential_delegation_tokens.itsm_system_type`
  - Add new CHECK allowing `('servicenow_itsm', 'jira')`
  - Migrate existing `servicenow` rows to `servicenow_itsm` if any

- [x] **Constants**: Update `packages/api-server/src/constants/dataSources.ts`
  - Add `'servicenow_itsm'` to `ALLOWED_DATA_SOURCE_TYPES`
  - Add `servicenow_itsm` entry to `DEFAULT_DATA_SOURCES`
  - Update `servicenow` name to "ServiceNow Knowledge"

- [x] **Routes - dataSourceWebhooks**: Update `packages/api-server/src/routes/dataSourceWebhooks.ts`
  - Change sync-tickets validation to `['servicenow_itsm', 'jira']`
  - Update error message to mention "ServiceNow ITSM"

- [x] **Routes - credentialDelegations**: Update `packages/api-server/src/routes/credentialDelegations.ts`
  - Change validation to `['servicenow_itsm', 'jira']`
  - Update error message

- [x] **Types**: Update `packages/api-server/src/types/credentialDelegation.ts`
  - Change `ItsmSystemType` to `'servicenow_itsm' | 'jira'`

- [x] **Service**: Update `packages/api-server/src/services/CredentialDelegationService.ts`
  - Update `createDelegation` validation to `['servicenow_itsm', 'jira']`
  - Update `validateCredentials` to check `systemType === 'servicenow_itsm'`

## Frontend

- [x] **Types**: Update `packages/client/src/types/dataSource.ts`
  - Add `'servicenow_itsm'` to `DataSourceType`

- [x] **Constants**: Update `packages/client/src/constants/connectionSources.ts`
  - Add `SOURCES.SERVICENOW_ITSM`
  - Update `ITSM_SOURCE_TYPES` to use `servicenow_itsm`
  - Update `ITSM_SOURCES_ORDER`
  - Add `SOURCE_METADATA['servicenow_itsm']`
  - Update `SOURCE_METADATA['servicenow']` title

- [x] **Page Registry**: Update `packages/client/src/pages/ConnectionSourceDetailPage.tsx`
  - Add `servicenow_itsm` to `FORM_REGISTRY` (reuse ServiceNowForm)
  - Update `ITSM_CONFIGURATION_REGISTRY` key to `servicenow_itsm`

- [x] **Hook**: Update `packages/client/src/hooks/api/useCredentialDelegations.ts`
  - Change `ItsmSystemType` to `'servicenow_itsm' | 'jira'`

- [x] **i18n**: Update translation files
  - Updated `systems.servicenow` to `systems.servicenow_itsm` in credentialDelegation.json

- [x] **Icon**: Copy `icon_servicenow.svg` → `icon_servicenow_itsm.svg`

- [x] **CredentialSetupPage**: Update `packages/client/src/pages/CredentialSetupPage.tsx`
  - Update SYSTEM_ICONS to use `servicenow_itsm`
  - Update conditional checks from `servicenow` to `servicenow_itsm`

## Testing

- [x] Verify migration runs cleanly
- [x] Test new org seeding (both types appear)
- [x] Test existing org (servicenow unchanged, servicenow_itsm added on seed)
- [x] Test KB verification independent of ITSM
- [x] Test ITSM verification independent of KB
- [x] Test credential delegation for servicenow_itsm
- [x] Verify UI displays correct titles and icons

---

## Phase 2: Credential Sync (KB ↔ ITSM)

> See `credential-sync-plan.md` for full details

### Frontend

- [x] Add `applyToRelated` checkbox to `ServiceNowForm.tsx`
  - State: `const [applyToRelated, setApplyToRelated] = useState(false)`
  - Placement: Above Connect button
  - Label: "Also apply credentials to {KB|ITSM} connection"
- [x] Update verify mutation payload in `useDataSources.ts`
  - Add `apply_to_related?: boolean` to payload type (in `dataSource.ts`)
- [x] Add i18n keys in `connections.json`
  - `servicenow.applyToRelated`
  - `servicenow.knowledgeBase`
  - `servicenow.itsm`
- [ ] Test checkbox appears on both KB and ITSM forms

### Backend

- [x] Add `apply_to_related` to verify endpoint request schema
- [x] Validate `apply_to_related` only allowed for `servicenow`/`servicenow_itsm` types
- [x] Implement related connection lookup (org + type)
  - Added `getDataSourceByType()` to `DataSourceService`
- [x] Implement parallel verification (both connections)
- [x] Update primary connection status (always)
- [x] Update related connection status (only if verify succeeded)
- [x] Add logging for related sync (success/failure/not-found)
- [ ] Add tests for credential sync flow

### Testing

- [x] Test ITSM form → checkbox syncs to KB
- [x] Test KB form → checkbox syncs to ITSM
- [ ] Test checkbox unchecked → only primary updated
- [ ] Test related connection not found → no-op, primary still works
- [ ] Test related verify fails → primary still succeeds
