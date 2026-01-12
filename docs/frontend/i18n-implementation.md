# i18n Implementation

## Overview

Internationalization system for RITA Go using react-i18next with feature-based namespace organization.

## Tech Stack

- **Library**: react-i18next + i18next
- **Loading**: Bundled (all namespaces loaded upfront)
- **Languages**: English only (structure ready for expansion)

## Architecture

### Folder Structure

```
packages/client/src/i18n/
├── index.ts           # Config & initialization
├── types.ts           # TypeScript declarations
└── locales/
    └── en/
        ├── common.json
        ├── errors.json
        ├── toast.json
        ├── settings.json
        ├── connections.json
        ├── chat.json
        ├── auth.json
        ├── validation.json
        ├── files.json
        ├── tickets.json
        └── dialogs.json
```

### Namespaces

| Namespace | Purpose |
|-----------|---------|
| common | Buttons, labels, shared UI |
| errors | Error messages |
| toast | Toast notifications |
| settings | Settings pages |
| connections | Data source forms |
| chat | Chat interface |
| auth | Auth pages |
| validation | Form validation |
| files | Knowledge base |
| tickets | Ticket groups, review, automation |
| dialogs | Dialog components (confirm, invite, welcome) |

### Key Naming Convention

```
{namespace}.{component}.{element}
```

Examples:
- `common.actions.save`
- `settings.profile.title`
- `validation.required.email`

## Usage

### Basic

```typescript
import { useTranslation } from 'react-i18next';

const { t } = useTranslation('settings');

<h1>{t('profile.title')}</h1>
```

### Multi-Namespace

```typescript
const { t } = useTranslation(['settings', 'common']);

<Button>{t('common:actions.save')}</Button>
```

### Interpolation

```typescript
t('welcome.greeting', { name: 'John' }) // "Welcome, {{name}}"
```

## Implementation Progress

### Phase 1: Foundation

- [x] Install dependencies
- [x] Create i18n config
- [x] Add I18nextProvider
- [x] Migrate CrashPage (proof)

### Phase 2: Common & UI Components

- [x] Expand common.json with UI keys
- [x] Migrate UI components (spinner, multi-select, feedback-banner, etc.)
- [x] Update test setup to mock i18n

### Phase 3: Tickets Feature

- [x] Create tickets.json (~180 keys)
- [x] Migrate all ticket components (16 files)
- [x] TicketGroups, ReviewView, FeedbackSection, CompletionView, etc.

### Phase 4: Toast & Errors

- [x] Expand toast.json with all notification keys
- [x] Migrate connection form toasts (Confluence, ServiceNow, SharePoint, WebSearch)
- [x] Migrate ConfluenceConfiguration toasts
- [x] Migrate ProfilePage, useMembers, InviteUsersDialog toasts
- [x] Migrate FilesV1Content, ChatV1Content toasts
- [x] Migrate SSEContext toasts
- [x] Update tests to expect translation keys

### Phase 5: Settings Pages

- [x] Expand settings.json with profile, users, connection sources, knowledge sources, itsm keys
- [x] Migrate ProfilePage.tsx (form labels, buttons, delete account dialog, validation)
- [x] Migrate SettingsUsers.tsx (title, tabs)
- [x] Migrate ConnectionSources.tsx (title, description, loading, error states, buttons)
- [x] Migrate KnowledgeSources.tsx (title, description, loading, error states, buttons)
- [x] Migrate ItsmSources.tsx (title, description, loading, error states, buttons)
- [x] Update ConnectionSources.test.tsx to expect translation keys

### Phase 6: Connection Forms

- [x] Expand connections.json with form keys (sections, labels, placeholders, validation, buttons, alerts, descriptions)
- [x] Migrate ConfluenceForm.tsx (labels, placeholders, validation messages, buttons, alerts)
- [x] Migrate ServiceNowForm.tsx (labels, placeholders, validation messages, buttons, alerts)
- [x] Migrate SharePointForm.tsx (labels, placeholders, validation messages, buttons)
- [x] Migrate WebSearchForm.tsx (section title, description, buttons)
- [x] Update ConfluenceForm.test.tsx to expect translation keys

### Phase 7: Dialogs

- [x] Create dialogs.json (~40 keys)
- [x] Migrate ConfirmDialog.tsx (default button labels)
- [x] Migrate ConfirmFormDialog.tsx (default action/cancel labels)
- [x] Migrate InviteUsersDialog.tsx (all UI strings, error messages)
- [x] Migrate WelcomeDialog.tsx (role-based welcome content)
- [x] Update dialog test files to expect translation keys

### Phase 8: Auth Pages

- [ ] Create auth.json
- [ ] Migrate auth pages

### Phase 9: Chat Interface

- [ ] Create chat.json
- [ ] Migrate chat components

### Phase 10: Validation

- [ ] Create validation.json
- [ ] Update Zod schemas

### Phase 11: Files

- [x] Expand files.json with UI strings (~95 keys)
- [x] Migrate FilesV1Content.tsx (header, dropdown, search, filters, table, pagination, dialogs)
- [x] Migrate EmptyFilesState.tsx (empty state messaging)
- [x] Migrate FileUploadRequirements.tsx (file type/size requirements)
- [x] Update FilesV1Content.test.tsx to expect translation keys

### Phase 12: Audit

- [ ] Grep remaining hardcoded strings
- [ ] Update tests
- [ ] Final documentation

## Current Checkpoint

**Status**: Phase 11 - COMPLETE
**Next Step**: Phase 12 - Final audit
**Last Updated**: 2026-01-12

## Related Docs

- Agent: `.claude/agents/fe-enterprise-agent.md` (i18n section)
- Skill: `.claude/skills/i18n-translation/SKILL.md`
