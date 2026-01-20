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
