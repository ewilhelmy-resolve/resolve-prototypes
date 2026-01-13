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
        ├── kbs.json
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
| kbs | Knowledge base |
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

- [x] Expand auth.json (~65 keys: validation, signup, verifyEmail, verifyEmailSent, invite sections)
- [x] Migrate InviteAcceptPage.tsx (Zod schema with i18n, error messages, UI strings)
- [x] Migrate VerifyEmailPage.tsx (status messages, buttons)
- [x] Migrate VerifyEmailSentPage.tsx (verification flow UI)
- [x] Migrate SignUpPage.tsx (form labels, validation, buttons)
- [x] Update InviteAcceptPage.test.tsx to expect translation keys

**Zod i18n Pattern**: To avoid TS 5.2.2 compiler bug with complex generics, validation messages are extracted via `useMemo` first, then used in the schema:

```tsx
const validationMessages = useMemo(() => ({
  passwordMinLength: t("validation.passwordMinLength", { count: MIN_PASSWORD_LENGTH }),
}), [t]);

const schema = useMemo(() => z.object({
  password: z.string().min(MIN_PASSWORD_LENGTH, validationMessages.passwordMinLength),
}), [validationMessages]);
```

### Phase 9: Chat Interface

- [x] Expand chat.json with ~40 keys (input, emptyState, sidebar, messages, deleteDialog, actions, dragDrop, iframe, citations)
- [x] Migrate ConversationSidebar.tsx (sidebar nav, delete dialog, tooltips)
- [x] Migrate ChatV1Content.tsx (multi-namespace: chat + toast, empty states, pagination)
- [x] Migrate ChatInput.tsx (placeholder, knowledge warnings with fallback pattern)
- [x] Migrate DragDropOverlay.tsx (drop zone UI)
- [x] Migrate IframeChatPage.tsx (error states, loading)
- [x] Migrate ResponseWithInlineCitations.tsx (citations UI, modal content)
- [x] Update ChatV1Content.test.tsx to expect translation keys
- [x] Update ResponseWithInlineCitations.test.tsx to expect translation keys

**Multi-Namespace Pattern**: Components needing multiple namespaces use array syntax with prefixed keys:

```tsx
const { t } = useTranslation(["chat", "toast"]);
// Toast keys: t("toast:success.messageCopied")
// Chat keys: t("emptyState.title") // default namespace
```

**Fallback Pattern**: For optional i18n props with defaults:

```tsx
const resolvedPlaceholder = placeholder ?? t("input.placeholder");
```

### Phase 10: Validation

- [x] validation.json already exists with required.*, format.*, length.*, confirm.*, form.* keys
- [x] Expand validation.json with password validation keys (required.password, format.password, password.minLength/uppercase/lowercase/number/mismatch)
- [x] Zod schemas in auth pages use auth.json validation keys (Phase 8 pattern)
- [x] lib/validation.ts - skipped (utility functions, no React hooks access)

### Phase 11: Knowledge Base (kbs)

- [x] Create kbs.json (~95 keys, renamed from files.json)
- [x] Migrate FilesV1Content.tsx (header, dropdown, search, filters, table, pagination, dialogs)
- [x] Migrate EmptyFilesState.tsx (empty state messaging)
- [x] Migrate FileUploadRequirements.tsx (file type/size requirements)
- [x] Update FilesV1Content.test.tsx to expect translation keys

### Phase 12: Complete Migration (Group by Group)

- [x] Group 1: Pages (HelpPage, ConnectionSourceDetailPage, ClusterDetailPage) → common, connections, tickets namespaces
- [x] Group 2: Chat UI (ChatUIv1) - deleted (unused component)
- [x] Group 3: Tickets/Automation (7 files) → tickets namespace expansion
  - EnableAutoPopulateSheet, EnableAutoRespondModal, ClusterDetailTable
  - TicketTrendsChart, AutomationMetricsCard, AutomationReadinessMeter, KnowledgeTab
- [x] Group 4: User Management (3 files) → settings namespace expansion
  - EditUserSheet, PendingInvitationsTable, UsersTable
- [x] Group 5: Connection Configs (5 files) → connections namespace expansion
  - SharePointConfiguration, WebSearchConfiguration, ConfluenceConfiguration
  - ServiceNowKBConfiguration, ServiceNowItsmConfiguration
- [x] Group 6: UI Components (3 files) → common namespace expansion
  - BulkActions, web-preview, prompt-input
- [x] Update ConfluenceConfiguration.test.tsx to expect translation keys
- [x] Update BulkActions.test.tsx to expect translation keys

**Exclusions**: DevToolsPage.tsx (internal dev tool, no translation needed)

## Current Checkpoint

**Status**: ALL PHASES COMPLETE (1-12)
**Next Step**: None - i18n migration complete
**Last Updated**: 2026-01-12

## Related Docs

- Agent: `.claude/agents/fe-enterprise-agent.md` (i18n section)
- Skill: `.claude/skills/i18n-translation/SKILL.md`
