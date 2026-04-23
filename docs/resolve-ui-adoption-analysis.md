# resolve.ui Adoption Analysis for rita-client

## Summary

**Recommendation: Adopt `@resolve-ui/tokens` only. Do not adopt `@resolve-ui/components` or `@resolve-ui/react`.**

resolve.ui is a Lit web component library designed for cross-framework sharing (Angular + React + vanilla). rita-client is a React SPA built on shadcn/ui + Radix primitives. Replacing the UI layer with web component wrappers would remove composition patterns the app depends on heavily, slow feature development, and provide no visual benefit — the design tokens are already identical.

---

## 1. What resolve.ui Is

A monorepo with 4 packages:

| Package | Purpose |
|---|---|
| `@resolve-ui/tokens` | CSS custom properties (colors, typography, spacing, radius). No JS, no build step. |
| `@resolve-ui/components` | 54 Lit web components. Light DOM + Tailwind v4 + CVA. |
| `@resolve-ui/react` | ~151 auto-generated React wrappers (`React.createElement("resolve-button", {...})`) |
| `@resolve-ui/angular` | NgModule + 7 ControlValueAccessor directives for Angular forms |

The React wrappers are thin shims over custom elements — not React components with React composition patterns.

---

## 2. How the Two Stacks Differ

### 2.1 Composition: Compound Components vs Monolithic Elements

**rita-client uses Radix compound components everywhere.** This is the core of how features are built — small, composable pieces that nest declaratively.

**rita-client today** — Dropdown with contextual trigger:
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={handleRename}>
      <Pencil className="h-4 w-4 mr-2" />
      {t("actions.rename")}
    </DropdownMenuItem>
    <DropdownMenuItem variant="destructive" onClick={handleDelete}>
      <Trash2 className="h-4 w-4 mr-2" />
      {t("actions.delete")}
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**resolve.ui equivalent** — Flat, prop-driven:
```tsx
<ResolveDropdownMenu onMenuItemSelect={handleSelect}>
  <span slot="trigger">
    {/* No asChild — can't make Button the trigger */}
    <resolve-button variant="ghost" size="icon">⋯</resolve-button>
  </span>
  <ResolveDropdownMenuItem>
    {/* No onClick per item — must parse from a single onMenuItemSelect event */}
    Rename
  </ResolveDropdownMenuItem>
  <ResolveDropdownMenuItem variant="destructive">
    Delete
  </ResolveDropdownMenuItem>
</ResolveDropdownMenu>
```

**What breaks:**
- No `asChild` — the trigger must be a slotted child, not a composed React element
- No per-item `onClick` — the Lit component fires a single `menu-item-select` event; the wrapper maps it to `onMenuItemSelect`
- No `align`, `side`, `sideOffset` positioning — the Lit dropdown uses `absolute top-full left-0 mt-1`, hardcoded
- No portal rendering — Radix portals to `<body>` to avoid overflow clipping; Lit renders inline

**Scale of impact:** The app uses compound component patterns (e.g. `<SelectTrigger>`, `<DialogContent>`, `<SheetHeader>`, `<TabsList>`) in **652 call sites** across feature code. Every one would need to be rewritten.

### 2.2 `className` Overrides

shadcn components accept `className` and merge it with internal classes via `cn()`. Feature code relies on this for layout, spacing, and contextual styling.

**rita-client today:**
```tsx
<SheetContent className="flex w-full flex-col p-8 sm:max-w-lg" side="right">
<DialogContent className="max-h-[80vh] overflow-y-auto">
<Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover/item:opacity-100">
<Input className="col-span-3" />
```

**resolve.ui:** The Lit component renders its own root element with its own classes. The React wrapper passes `class` to the custom element's outer tag, but the styled element is *inside* the component's `render()`. There is no `className` merging path — the internal `<button>`, `<input>`, or `<div>` is not directly reachable.

**Scale of impact:** Feature code applies `className=` on UI primitives **1,625 times**.

### 2.3 `asChild` Pattern

`asChild` lets a component delegate its rendering to a child element — critical for routing, polymorphic triggers, and accessible links-as-buttons.

**rita-client today:**
```tsx
<DropdownMenuTrigger asChild>
  <Button variant="ghost">...</Button>
</DropdownMenuTrigger>

<BreadcrumbLink asChild>
  <Link to="/settings">Settings</Link>
</BreadcrumbLink>
```

**resolve.ui:** No `asChild` equivalent. Lit components render their own internal markup. You cannot tell `<resolve-button>` to render as a `<Link>` or `<a>`.

**Scale of impact:** Used in **89 call sites** across the app.

### 2.4 React Hooks Inside Components

shadcn components can use React hooks because they *are* React components.

**rita-client today** — Dialog uses `useTranslation()` internally:
```tsx
// Inside dialog.tsx
const DialogContent = forwardRef(({ children, showCloseButton, ...props }, ref) => {
  const { t } = useTranslation("common");
  return (
    // ...
    <span className="sr-only">{t("accessibility.close")}</span>
    // ...
  );
});
```

**resolve.ui:** Lit components cannot call React hooks. Every translated string, every context value, every derived state must be passed as a prop from the outside.

### 2.5 Form Integration

rita-client uses `react-hook-form` with `register()` spread directly onto `<Input>`:

**rita-client today:**
```tsx
<Input
  id="url"
  type="url"
  placeholder={t("form.placeholders.confluenceUrl")}
  {...register("url", {
    required: t("form.validation.urlRequired"),
    pattern: { value: /^https?:\/\//, message: t("form.validation.invalidUrl") },
  })}
/>
```

`register()` returns `{ onChange, onBlur, ref, name }`. These are native React callback refs and event handlers.

**resolve.ui:** The React wrapper passes props to `React.createElement("resolve-input", {...})`. The `ref` from `register()` would point to the custom element, not the inner `<input>`. `onChange` expects a React `SyntheticEvent` but gets a `CustomEvent`. The Angular package has CVA directives to solve this exact problem — but there is no React equivalent.

### 2.6 Accessibility Gap

Radix primitives provide battle-tested a11y: focus traps, `aria-expanded`, `aria-controls`, roving tabindex, screen reader announcements, portal focus return.

resolve.ui components hand-roll keyboard navigation. For example, the dropdown menu implements `ArrowUp`/`ArrowDown` via manual DOM queries (`this.querySelector`), with no roving tabindex, no `aria-activedescendant`, and no focus trap.

---

## 3. By the Numbers

| Metric | Value |
|---|---|
| Total app source (non-test, non-story) | ~50,000 lines |
| `components/ui/` (what resolve.ui would replace) | ~5,300 lines (10%) |
| Feature components using UI primitives | ~22,000 lines |
| `className=` on UI components in feature code | 1,625 call sites |
| Compound component usage (`<SelectItem>`, `<DialogContent>`, etc.) | 652 call sites |
| `asChild` usage | 89 call sites |
| `useTranslation()` inside components | 228 files |
| `react-hook-form` integration | 5+ form components with `register()` spread |

Replacing the 10% primitive layer forces rewriting the 90% feature layer that depends on its composition patterns.

---

## 4. Recommendation: Shared Tokens Only

### What to adopt

**`@resolve-ui/tokens`** — the CSS-only package. It contains the exact same design tokens the app already uses (verified value-by-value).

### Current state: duplicated tokens

The app's `index.css` inlines **188 lines** of tokens, font-faces, and Tailwind theme mappings that are **identical** to what `@resolve-ui/tokens` provides:

```
App index.css                     @resolve-ui/tokens
─────────────────────────────     ─────────────────────────────
--primary: rgba(0, 80, 199, 1)   --primary: rgba(0, 80, 199, 1)    ✓ identical
--background: oklch(1 0 0)        --background: oklch(1 0 0)        ✓ identical
--radius: 0.625rem                --radius: 0.625rem                ✓ identical
--font-heading: 'Season Mix'      --font-heading: "Season Mix"      ✓ identical
(... all 40+ tokens match)
```

### How it would work

**Before** — `src/index.css` (188 lines, hand-maintained):
```css
@import 'tailwindcss';
@import 'tw-animate-css';

@custom-variant dark (&:is(.dark *));

@font-face {
    font-family: 'Season Mix';
    src: url('/fonts/SeasonMix-Regular.ttf') format('truetype');
    /* ... */
}

:root {
    --background: oklch(1 0 0);
    --foreground: oklch(0.145 0 0);
    /* ... 40+ more tokens ... */
}

.dark {
    --background: oklch(0.145 0 0);
    /* ... 20+ more tokens ... */
}

@theme inline {
    --font-sans: Helvetica, sans-serif;
    --color-background: var(--background);
    /* ... 40+ more mappings ... */
}

@layer base { /* ... */ }
```

**After** — `src/index.css` (~20 lines):
```css
@import 'tailwindcss';
@import 'tw-animate-css';
@import '@resolve-ui/tokens';

/* App-specific additions only */
@layer base {
    pre {
        white-space: pre-wrap !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
        max-width: 100% !important;
        overflow-x: hidden !important;
    }
    pre code {
        white-space: pre-wrap !important;
        word-break: break-word !important;
    }
}
```

**What this gives you:**
- Single source of truth for colors, typography, spacing, radius, dark mode
- When design updates a token (e.g. `--primary` changes), bump one dependency version — every app gets it
- No code changes to any component, page, or feature
- Fonts served from the tokens package (`@resolve-ui/tokens/fonts/*`)

**What stays the same:**
- All shadcn/Radix components remain untouched
- All `className=`, `asChild`, `react-hook-form`, `useTranslation()` patterns keep working
- No migration, no rewriting, no new abstractions

### Setup

1. Add dependency:
   ```
   pnpm add @resolve-ui/tokens@workspace:*
   ```

2. Replace `index.css` token block with single import (as shown above)

3. Copy fonts from `@resolve-ui/tokens/fonts/` to `public/fonts/` (or configure Vite to serve them)

---

## 5. Bug Risk: What Would Regress

Adopting resolve.ui components isn't just a migration cost — it introduces runtime bugs in areas that work correctly today. These stem from replacing Radix's managed behavior with hand-rolled global listeners and inline rendering.

### 5.1 Overlapping Global Listeners

Every resolve.ui interactive component registers its own `document.addEventListener("click")` and `document.addEventListener("keydown")` for outside-click dismissal and Escape handling:

| Component | Global listeners registered |
|---|---|
| `resolve-select` | `click` + `keydown` on `connectedCallback` (always active) |
| `resolve-dropdown-menu` | `click` + `keydown` on open |
| `resolve-dialog` | `keydown` on open |
| `resolve-popover` | `click` (capture) + `keydown` on open |
| `resolve-autocomplete` | `click` on `connectedCallback` (always active) |

**The bug:** When two interactive components are open simultaneously — or even just mounted on the same page — their global listeners compete. An Escape keypress intended to close a dropdown also closes the dialog behind it. An outside click on a dialog backdrop also dismisses a select that happens to be mounted elsewhere.

**This is a real pattern in the app.** `ConversationListItem` renders a `DropdownMenu` that opens an `AlertDialog` for rename/delete confirmation. `ClusterDetailTable` has 9 interactive component references in one file. `UsersTable` has 13. Radix handles this via a layered dismissal stack — each component knows its own layer. resolve.ui components all listen on the same `document` with no coordination.

### 5.2 No Portal Rendering — Overflow Clipping

Radix renders Dialogs, Selects, Dropdowns, Popovers, and Sheets through `<Portal>` — appending them to `<body>` so they're never clipped by parent `overflow: hidden/auto` containers.

resolve.ui renders everything inline in the DOM tree.

**The bug:** The app has **64 overflow-hidden/auto containers** in feature code. A `resolve-select` dropdown inside a scrollable table, card, or sidebar panel will be clipped at the container boundary — the options list gets cut off or hidden entirely. Today, Radix portals prevent this everywhere automatically.

### 5.3 Hardcoded `setTimeout` Animations

resolve.ui's dialog close animation uses:
```js
// resolve-dialog: _close()
this._state = "closing";
setTimeout(() => {
  this._state = "closed";
  this.open = false;
  this.dispatchEvent(new CustomEvent("close"));
}, 200);
```

The app's Radix dialog uses CSS-driven `data-[state]` animations:
```css
data-[state=open]:animate-in data-[state=closed]:animate-out
data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95
```

**The bug:** The `setTimeout(200)` is a race condition. If a user rapidly opens and closes a dialog (common on fast interactions or automated tests), the state machine can desync — the timeout fires after a re-open, closing a dialog that should be open. Radix's approach is declarative: the component is either `open` or `closed`, and CSS handles the visual transition tied to that state. No timer to race against.

### 5.4 Focus Management Gaps

Radix manages focus automatically:
- Dialog traps focus inside its content
- On close, focus returns to the trigger element
- Nested interactive layers (dropdown inside dialog) maintain their own focus scopes

resolve.ui components do none of this. The dialog sets no focus trap. The dropdown calls `firstItem.querySelector(...).focus()` via `requestAnimationFrame` — a best-effort approach that fails when the DOM isn't ready or when components are nested.

**The bug:** Open a dialog → tab through it → focus escapes behind the overlay into the page. Close a sheet → focus is lost (doesn't return to trigger). These are accessibility regressions that are also UX bugs — keyboard users lose their place, screen readers announce wrong context.

### 5.5 Event System Mismatch

Radix components dispatch React `SyntheticEvent`s. resolve.ui dispatches browser `CustomEvent`s that the React wrapper maps to callback props:

```js
// resolve.ui wrapper
useEventListener(ref, "menu-item-select", props.onMenuItemSelect);
```

**The bug:** `event.stopPropagation()` on a `CustomEvent` doesn't stop React's synthetic event bubbling, and vice versa. `event.preventDefault()` on the wrapper's callback doesn't prevent the Lit component's default behavior — the component already handled the event before React saw it. Code that relies on `e.stopPropagation()` in event handlers (the app does this in `ConversationListItem`, dropdown menus, and click handlers) will behave unpredictably.

---

## 6. Trade-off Summary

| Approach | Visual consistency | Dev speed | Migration cost | Risk |
|---|---|---|---|---|
| **Tokens only** (recommended) | ✅ Identical colors, fonts, spacing | ✅ Zero impact on feature development | ~1 hour | None |
| **Full resolve.ui adoption** | ✅ Same visual output | ❌ Loses composition, className, asChild, hooks, forms | Weeks. 652+ compound component rewrites, 1,625 className overrides, 89 asChild removals | High — hand-rolled a11y, no React ecosystem integration |

### Porting Individual Components Is Trivial

If a component exists in resolve.ui but not in the app (e.g. `resolve-editable`, `resolve-file-upload`), porting it is straightforward. The visual spec is already defined — same Tailwind classes, same tokens, same CVA variants. A coding agent (or a developer) can take the resolve.ui component as a reference and produce a native React + Radix equivalent in minutes, with proper `className` composition, `asChild`, hooks, and form integration built in. This is cheaper and safer than adopting the Lit wrapper and losing all React-native capabilities.

This also means resolve.ui serves as a **living visual spec** — you can always reference its Storybook and source for how a component should look and behave, without coupling your runtime to it.

### When resolve.ui components DO make sense

- **Angular apps** — can't use React/Radix components; Lit wrappers with CVA directives are a reasonable solution
- **Vanilla HTML pages** — no framework, just drop in `<script>` + `<resolve-button>`
- **Embeddable widgets** — the Actions Platform bundle (`actions-platform.js` + `actions-platform.css`) ships as a self-contained micro-frontend
- **Cross-framework shared surfaces** — a component rendered in both an Angular and React app simultaneously

rita-client is none of these. It is a single React SPA where shadcn/Radix gives strictly more capability than the web component wrappers.

---

*Analysis date: February 2026. Based on resolve.ui v0.1.0 and rita-client v1.0.0.*
