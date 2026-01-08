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
        └── files.json
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

### Phase 2: Toast & Errors

- [ ] Create toast.json, errors.json
- [ ] Update toast helper
- [ ] Migrate SSEContext toasts

### Phase 3: Settings Pages

- [ ] Create settings.json
- [ ] Migrate ProfilePage
- [ ] Migrate SettingsUsers

### Phase 4: Connection Forms

- [ ] Create connections.json
- [ ] Migrate connection forms

### Phase 5: Dialogs

- [ ] Migrate dialogs

### Phase 6: Auth Pages

- [ ] Create auth.json
- [ ] Migrate auth pages

### Phase 7: Chat Interface

- [ ] Create chat.json
- [ ] Migrate chat components

### Phase 8: Validation

- [ ] Create validation.json
- [ ] Update Zod schemas

### Phase 9: Files

- [ ] Create files.json
- [ ] Migrate file components

### Phase 10: Audit

- [ ] Grep remaining hardcoded strings
- [ ] Update tests
- [ ] Final documentation

## Current Checkpoint

**Status**: Phase 1 - COMPLETE
**Next Step**: Phase 2 - Toast & Errors migration
**Last Updated**: 2026-01-07

## Related Docs

- Agent: `.claude/agents/fe-enterprise-agent.md` (i18n section)
- Skill: `.claude/skills/i18n-translation/SKILL.md`
