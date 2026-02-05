# Jira ITSM Configuration - Task Checklist

## Phase 1: Backend

- [x] Add `jira_itsm` to `ALLOWED_DATA_SOURCE_TYPES` in `packages/api-server/src/constants/dataSources.ts`
- [x] Add `jira_itsm` to `DEFAULT_DATA_SOURCES` seed array
- [x] Update `/sync-tickets` validation in `packages/api-server/src/routes/dataSourceWebhooks.ts`

## Phase 2: Frontend Types & Constants

- [x] Add `jira_itsm` to `DataSourceType` in `packages/client/src/types/dataSource.ts`
- [x] Add `SOURCES.JIRA_ITSM` to `packages/client/src/constants/connectionSources.ts`
- [x] Update `ITSM_SOURCE_TYPES` to use `jira_itsm`
- [x] Update `ITSM_SOURCES_ORDER` to use `jira_itsm`
- [x] Add `jira_itsm` to `SOURCE_METADATA`

## Phase 3: Frontend Components

- [x] Create `JiraForm.tsx` (model after ServiceNowForm)
- [x] Export `JiraForm` from `connection-forms/index.ts`
- [x] Create `JiraItsmConfiguration.tsx` (model after ServiceNowItsmConfiguration)
- [x] Register `JiraForm` in `FORM_REGISTRY` in `ConnectionSourceDetailPage.tsx`
- [x] Register `JiraItsmConfiguration` in `ITSM_CONFIGURATION_REGISTRY`

## Phase 4: Assets & i18n

- [x] Copy `icon_jira.svg` to `icon_jira_itsm.svg`
- [x] Add i18n keys for Jira form fields
- [x] Add i18n keys for Jira ITSM config
- [x] Add toast description for jiraConfigured
- [x] Add `ENABLE_JIRA` feature flag
- [x] Wire feature flag in ItsmSources.tsx
- [x] Add `jira_itsm` mock options in mock-service verify handler

## Phase 5: Testing

- [x] Verify seed creates `jira_itsm` record
- [x] Test verify flow end-to-end
- [x] Test sync tickets flow end-to-end
- [x] Test cancel sync
- [ ] Accessibility check (deferred)

## Additional Fixes

- [x] Fix ConnectionStatusCard to display `base_url` for jira_itsm
- [x] Clear error states (`last_verification_error`, `last_sync_status`, `last_sync_error`) when settings updated

## Code Quality (PR feedback)

- [x] Fix double `getStatusMessage()` call - compute once, render once
- [x] Extract `getDisplayFields()` helper for URL/email/password labels
- [x] Move hardcoded UI strings to i18n (`statusCard.*` keys)
