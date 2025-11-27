# Figma Color → RITA Design Token Mapping

Quick reference for mapping Figma colors to RITA's design system (from `packages/client/src/index.css`).

## Primary Colors

| Figma Color | Design Token | Usage |
|-------------|--------------|-------|
| Blue (#0050C7) | `bg-primary` / `text-primary-foreground` | Primary actions, default buttons |
| Any blue variant | `variant="default"` on Button/Badge | Primary CTAs |

## Error/Destructive Colors

| Figma Color | Design Token | Usage |
|-------------|--------------|-------|
| Red (any shade) | `bg-destructive` / `text-destructive-foreground` | Error states, warnings |
| Error indicators | `variant="destructive"` on Button/Badge | Delete, cancel actions |

**NEVER use:** `bg-red-500`, `text-red-600`, or any hardcoded red classes

## Neutral/Background Colors

| Figma Color | Design Token | Usage |
|-------------|--------------|-------|
| White | `bg-background` | Page backgrounds |
| Black text | `text-foreground` | Primary text |
| Light gray | `bg-muted` | Subdued backgrounds |
| Gray text | `text-muted-foreground` | Secondary text, hints |
| Light gray bg | `bg-secondary` | Secondary actions |

**NEVER use:** `bg-white`, `bg-gray-100`, `text-black`, `text-gray-600`

## Borders

| Figma Color | Design Token | Usage |
|-------------|--------------|-------|
| Any gray border | `border-border` | All borders, dividers |
| Input borders | `border-input` | Form inputs |

**NEVER use:** `border-gray-200`, `border-gray-300`, etc.

## Secondary/Accent Colors

| Figma Color | Design Token | Usage |
|-------------|--------------|-------|
| Light gray background | `bg-secondary` | Headers, subdued panels, carousel headers |
| Secondary text | `text-secondary-foreground` | Text on secondary bg |
| Highlighted/active bg | `bg-accent` | Active menu items, hover states, selected items |
| Accent text | `text-accent-foreground` | Text on accent bg |

## Typography

| Figma Font | Design Token | Usage |
|------------|--------------|-------|
| Season Mix | `font-heading` | H1, H2, H3, H4 |
| Helvetica | `font-sans` | Body text, paragraphs |
| Monospace | `font-mono` | Code snippets |

**NEVER use:** `font-serif`, custom font classes

## Chart/Data Visualization Colors

| Token | Usage |
|-------|-------|
| `bg-chart-1` | First data series (orange) |
| `bg-chart-2` | Second data series (teal) |
| `bg-chart-3` | Third data series (blue) |
| `bg-chart-4` | Fourth data series (lime) |
| `bg-chart-5` | Fifth data series (yellow) |

**Use for:** Charts, graphs, data visualizations, color-coded categories

**Example:**
```tsx
<div className="bg-chart-1 h-4 w-full" />
<div className="bg-chart-2 h-4 w-full" />
```

---

## Quick Decision Tree

When converting Figma colors:

1. **Is it an error/delete action?**
   - YES → `variant="destructive"` or `bg-destructive`

2. **Is it a primary action/CTA?**
   - YES → `variant="default"` or `bg-primary`

3. **Is it an active/selected/hover state?**
   - YES → `bg-accent` with `text-accent-foreground`

4. **Is it a header/panel/subdued section?**
   - YES → `bg-secondary` with `text-secondary-foreground`

5. **Is it a border?**
   - YES → `border-border`

6. **Is it subdued/secondary text?**
   - YES → `text-muted-foreground`

7. **Is it a page background?**
   - YES → `bg-background` or `bg-muted`

8. **Is it body text?**
   - YES → `text-foreground`

**If unsure, ask yourself:** Does this exist in `packages/client/src/index.css`? If yes, use the token. If no, use closest semantic token.

---

## Examples

### ❌ WRONG - Manual Colors from Figma

```tsx
<Button className="bg-red-500 text-white">Delete</Button>
<div className="border-gray-200 bg-white">
  <p className="text-gray-600">Subtitle</p>
</div>
```

### ✅ CORRECT - Design Tokens

```tsx
<Button variant="destructive">Delete</Button>
<div className="border-border bg-background">
  <p className="text-muted-foreground">Subtitle</p>
</div>
```

---

## Real-World Examples from RITA Go

### Example 1: bg-secondary for Headers/Panels
From [packages/client/src/components/ai-elements/inline-citation.tsx](packages/client/src/components/ai-elements/inline-citation.tsx:155):

```tsx
// Carousel header with secondary background
<div className="flex items-center justify-between gap-2 rounded-t-md bg-secondary p-2">
  {/* Header content */}
</div>
```

**Use `bg-secondary` for:**
- Card/carousel headers
- Subdued panel backgrounds
- Section dividers
- Non-primary content areas

### Example 2: bg-accent for Active States
From [packages/client/src/components/layouts/RitaSettingsLayout.tsx](packages/client/src/components/layouts/RitaSettingsLayout.tsx:67):

```tsx
// Active menu item highlighting
<SidebarMenuButton
  className={cn(
    "p-2 h-8 rounded-md cursor-pointer",
    isProfileActive && "bg-accent text-accent-foreground"
  )}
>
  <span className="text-sm">Profile</span>
</SidebarMenuButton>
```

**Use `bg-accent` for:**
- Active navigation items
- Selected menu items
- Hover states on interactive elements
- Keyboard focus highlights

### Example 3: bg-accent for Hover Effects
From [packages/client/src/components/ai-elements/inline-citation.tsx](packages/client/src/components/ai-elements/inline-citation.tsx:45):

```tsx
// Text that highlights on hover
<span className="transition-colors group-hover:bg-accent">
  {/* Citation text */}
</span>
```

---

**Key Rule:** Never hardcode colors. Always use design system tokens or component variants.
