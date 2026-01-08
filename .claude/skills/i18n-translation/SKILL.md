---
name: i18n-translation
description: Extract strings, generate translation keys, validate completeness. Auto-triggers on "translate", "i18n", "localization", or component creation with hardcoded strings.
---

# i18n Translation Manager

Manage internationalization for RITA Go React components.

## When This Skill Triggers

**Auto-trigger:**
- User mentions "translate", "i18n", "localization"
- User creates component with user-facing text
- User asks to "extract strings" or "add language support"

**Manual invocation:**
- `/i18n extract` - Extract hardcoded strings from file
- `/i18n validate` - Check for missing translations
- `/i18n add-lang <code>` - Add new language

## Translation Structure

```
packages/client/src/i18n/
├── index.ts           # i18next config
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

## Namespace Organization

| Namespace | Contents |
|-----------|----------|
| `common` | Buttons, labels, shared UI |
| `errors` | Error messages |
| `toast` | Toast notifications |
| `settings` | Settings pages |
| `connections` | Data source forms |
| `chat` | Chat interface |
| `auth` | Auth pages |
| `validation` | Form validation |
| `files` | Knowledge base |

## Key Naming Convention

```
{namespace}:{component}.{element}
```

**Examples:**
- `chat:input.placeholder` → "Ask me anything..."
- `settings:users.table.nameColumn` → "Name"
- `common:actions.save` → "Save"
- `validation:required.email` → "Email is required"

## Execution Instructions

### 1. Extract Strings from Component

When user shares a component file:

1. **Identify** all hardcoded strings (JSX text, props like `placeholder`, `aria-label`, `alt`)
2. **Generate** translation keys following naming convention
3. **Output** updated component code with `t()` calls
4. **Output** translation JSON entries

**Input:**
```tsx
export function ChatInput() {
  return (
    <div>
      <input placeholder="Ask me anything..." />
      <button>Send</button>
    </div>
  );
}
```

**Output:**
```tsx
import { useTranslation } from 'react-i18next';

export function ChatInput() {
  const { t } = useTranslation('chat');

  return (
    <div>
      <input placeholder={t('input.placeholder')} />
      <button>{t('input.sendButton')}</button>
    </div>
  );
}
```

**Translation entries for `chat.json`:**
```json
{
  "input": {
    "placeholder": "Ask me anything...",
    "sendButton": "Send"
  }
}
```

### 2. Validate Translations

Run validation to find:
- Components with hardcoded strings
- Missing keys in translation files
- Unused translation keys

**Search patterns for hardcoded strings:**
```bash
# JSX text content
grep -rn ">[A-Z][^<{]*</" packages/client/src/components/ --include="*.tsx"

# String props
grep -rn 'placeholder="[^{]' packages/client/src/ --include="*.tsx"
grep -rn 'aria-label="[^{]' packages/client/src/ --include="*.tsx"
grep -rn 'title="[^{]' packages/client/src/ --include="*.tsx"
```

### 3. Add New Language

When user requests new language:

1. **Copy** English locale folder structure
2. **Create** new language folder (e.g., `locales/es/`)
3. **Update** i18n config to include language
4. **List** files needing translation

## String Detection Patterns

**Must be translated:**
```typescript
// JSX text content
<h1>Welcome</h1>                    // BAD
<h1>{t('title')}</h1>               // GOOD

// Placeholder text
placeholder="Enter email"           // BAD
placeholder={t('emailPlaceholder')} // GOOD

// Button text
<Button>Submit</Button>             // BAD
<Button>{t('actions.submit')}</Button> // GOOD

// ARIA labels
aria-label="Close dialog"           // BAD
aria-label={t('dialog.closeLabel')} // GOOD

// Error messages
toast.error("Failed to save")       // BAD
toast.error(t('errors.saveFailed')) // GOOD
```

**Exceptions (don't translate):**
```typescript
// Technical identifiers
className="..."
data-testid="..."
id="..."
type="button"
variant="primary"
```

## Integration with figma-to-shadcn

When generating components from Figma:
1. Detect text content in design
2. Generate translation keys for all text
3. Create component with `t()` calls
4. Add translations to appropriate namespace JSON

## Error Handling

**Missing namespace:**
```
Translation namespace 'xyz' not found. Available: common, chat, settings, ...
```

**Invalid key format:**
```
Key 'myKey' doesn't follow convention. Use: {namespace}:{component}.{element}
```

---
**Token budget:** ~1.5k (Level 2)
**Last updated:** 2026-01-07
