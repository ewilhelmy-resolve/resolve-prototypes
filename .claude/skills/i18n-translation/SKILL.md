---
name: i18n-translation
description: Extract strings, generate translation keys, validate completeness, add es-MX translations. Auto-triggers on "translate", "i18n", "localization", component creation with hardcoded strings, adding Spanish translations, or any new feature with user-facing text. Also use when creating new pages, forms, or UI components that display text to users — even if the user doesn't mention i18n explicitly.
---

# i18n Translation Manager

Manage internationalization for RITA React components using i18next.

## Translation Structure

```
packages/client/src/i18n/
├── index.ts              # i18next config, resources, language persistence
├── types.ts              # TypeScript module augmentation for type-safe keys
└── locales/
    ├── en/
    │   ├── common.json
    │   ├── errors.json
    │   ├── toast.json
    │   ├── settings.json
    │   ├── connections.json
    │   ├── chat.json
    │   ├── auth.json
    │   ├── validation.json
    │   ├── kbs.json
    │   ├── tickets.json
    │   ├── dialogs.json
    │   └── credentialDelegation.json
    └── es-MX/            # Partial — falls back to en for missing keys
        ├── common.json   # Imported in index.ts
        ├── chat.json     # Imported in index.ts
        └── kbs.json      # EXISTS but NOT imported (dead code!)
```

## Config Details

- **Default namespace:** `common`
- **Supported languages:** `en`, `es-MX`
- **Language persistence:** `localStorage` key `rita_language`
- **Fallback:** English (`en`) for any missing key or namespace
- **Type safety:** `types.ts` augments `i18next` module so `t()` calls are type-checked against `en` resources

When adding a new namespace:
1. Create the JSON file in `locales/en/`
2. Import it in `index.ts` and add to `resources.en`
3. Types update automatically via `typeof resources`

## Namespace Organization

| Namespace | Contents |
|-----------|----------|
| `common` | Buttons, labels, shared UI text |
| `errors` | Error messages |
| `toast` | Toast notifications |
| `settings` | Settings pages |
| `connections` | Data source forms |
| `chat` | Chat interface, sidebar, messages |
| `auth` | Auth/signup pages |
| `validation` | Form validation messages |
| `kbs` | Knowledge base / articles |
| `tickets` | Ticket management |
| `dialogs` | Shared dialog text |
| `credentialDelegation` | Credential delegation flows |

## Key Naming Convention

```
{namespace}:{section}.{element}
```

Keys use nested objects in JSON. Nesting can go 2-3 levels deep when grouping related content.

**Examples:**
- `chat:input.placeholder` → "Ask me anything..."
- `chat:deleteDialog.title` → "Delete Conversation"
- `kbs:errors.unsupportedFileType.title` → "Unsupported File Type"
- `settings:users.table.nameColumn` → "Name"
- `common:actions.save` → "Save"

## Execution Instructions

### 1. Extract Strings from Component

When user shares a component file:

1. **Identify** all hardcoded strings (JSX text, props like `placeholder`, `aria-label`, `alt`, toast messages)
2. **Choose** the right namespace based on the table above
3. **Generate** translation keys following naming convention
4. **Output** updated component code with `t()` or `<Trans>` calls
5. **Output** translation JSON entries for both `en` and `es-MX` (if Spanish translation is straightforward)

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

**Translation entries for `en/chat.json`:**
```json
{
  "input": {
    "placeholder": "Ask me anything...",
    "sendButton": "Send"
  }
}
```

### 2. Using `t()` vs `<Trans>`

Use `t()` for plain strings. Use `<Trans>` from `react-i18next` when the translated string contains embedded JSX elements (links, bold text, components):

```tsx
import { Trans, useTranslation } from 'react-i18next';

// Plain string — use t()
<p>{t('description')}</p>

// String with embedded JSX — use <Trans>
<Trans i18nKey="credentialDelegation:setup.terms">
  By continuing you agree to our <a href="/terms">Terms</a>
</Trans>
```

### 3. Interpolation

Use `{{variable}}` syntax for dynamic values:

```json
{
  "pagination": {
    "showing": "Showing {{start}}-{{end}} of {{total}} articles"
  }
}
```

```tsx
t('pagination.showing', { start: 1, end: 10, total: 50 })
```

### 4. Pluralization

Use `_plural` suffix for count-dependent strings:

```json
{
  "dragDrop": {
    "maxFiles": "Up to {{count}} file",
    "maxFiles_plural": "Up to {{count}} files"
  }
}
```

```tsx
t('dragDrop.maxFiles', { count: 5 }) // "Up to 5 files"
t('dragDrop.maxFiles', { count: 1 }) // "Up to 1 file"
```

### 5. Validate Translations

Run validation to find:
- Components with hardcoded strings
- Missing keys in `es-MX` translation files
- Unused translation keys
- **Locale files not imported in `index.ts`** — a file can exist on disk but have zero runtime effect if it's not imported and added to `resources` in `packages/client/src/i18n/index.ts`

**Known issue:** `es-MX/kbs.json` exists on disk with translations but is NOT imported in `index.ts` — those translations are dead code at runtime. When validating, always cross-check that every `es-MX/*.json` file has a matching import and entry in `resources["es-MX"]`.

**Search patterns for hardcoded strings:**
```bash
# JSX text content
grep -rn ">[A-Z][^<{]*</" packages/client/src/components/ --include="*.tsx"

# String props
grep -rn 'placeholder="[^{]' packages/client/src/ --include="*.tsx"
grep -rn 'aria-label="[^{]' packages/client/src/ --include="*.tsx"
grep -rn 'title="[^{]' packages/client/src/ --include="*.tsx"
```

### 6. Add New Language

When user requests new language:

1. Create new locale folder (e.g., `locales/fr/`)
2. Copy English JSON files as starting templates
3. Import in `index.ts` and add to `resources`
4. Add to `SUPPORTED_LANGUAGES` array in `index.ts`
5. Types update automatically

Note: `es-MX` is partially translated — only `common` and `chat` are imported and active. `kbs` has a file on disk but is **not imported** in `index.ts` (dead code). All other namespaces fall back to English.

**Always verify** that new locale files are both created AND imported in `index.ts` with an entry in `resources`.

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

// Error/toast messages
toast.error("Failed to save")       // BAD
toast.error(t('errors.saveFailed')) // GOOD
```

**Exceptions (don't translate):**
```typescript
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
5. Add `es-MX` translations if possible

---
**Token budget:** ~2k (Level 2)
**Last updated:** 2026-03-05
