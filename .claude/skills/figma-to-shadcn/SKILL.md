---
name: figma-to-shadcn
description: Generate React/TypeScript components from Figma designs using Tailwind CSS, ShadCN UI, and Lucide icons. Auto-triggers when Figma URLs (figma.com/design or figma.com/file) are detected in conversation. Splits repeated patterns into reusable components.
---

# Figma → ShadCN UI Component Generator

Automatically generates production-ready React/TypeScript components from Figma designs using your project's stack: Tailwind CSS, ShadCN UI, and Lucide icons.

## When This Skill Triggers

- User shares a Figma URL (figma.com/design/*, figma.com/file/*)
- User asks to "generate components from Figma"
- User mentions "Figma to code" or "implement this design"

## What It Does

1. **IMMEDIATELY extracts design context** using Figma MCP tools (auto-allowed, no permission needed)
2. **Shows design preview** and asks about component splitting preference
3. **Generates TypeScript components** following RITA Go standards
4. **Splits repeated patterns** into reusable components (if user confirms)
5. **Uses semantic naming** based on feature name (e.g., payments-dashboard → PaymentCard.tsx)

**IMPORTANT:** When a Figma URL is detected, IMMEDIATELY call `mcp__figma__get_design_context` and `mcp__figma__get_variable_defs` WITHOUT asking for permission. These tools are pre-authorized in settings.json.

## Quick Usage

**User shares Figma URL:**
```
User: "https://figma.com/design/abc123/MyFile?node-id=1-2"
```

**Skill IMMEDIATELY fetches design context (no permission prompt):**
```
Claude: [Calls mcp__figma__get_design_context and mcp__figma__get_variable_defs]
```

**THEN asks user:**
```
Claude: I've fetched the design. A few questions:
- Feature/page name? (e.g., "user-profile", "payments-dashboard")
- Split repeated patterns into reusable components? [Y/n]
```

**Generates components:**
```
packages/client/src/components/payments/
  ├── PaymentsDashboard.tsx
  ├── PaymentCard.tsx
  └── PaymentHeader.tsx
```

## Stack Requirements

**Always generate:**
- TypeScript React (.tsx)
- Tailwind CSS utilities (no inline styles)
- ShadCN UI components from `@/components/ui/*`
- Lucide icons from `lucide-react`
- Proper TypeScript interfaces

**Follow RITA Go standards:**
- Component-Based Architecture (CBA)
- Accessibility (ARIA labels, keyboard nav)
- Zod validation for forms
- SOC2 compliance (audit logging if needed)

**Use Design System Tokens (from packages/client/src/index.css):**
- `bg-background` / `text-foreground` - Base colors
- `bg-primary` / `text-primary-foreground` - Primary actions (blue)
- `bg-destructive` / `text-destructive-foreground` - Error states (NO manual red colors)
- `bg-muted` / `text-muted-foreground` - Subdued content
- `bg-accent` / `text-accent-foreground` - Highlights
- `border-border` - Borders (NO border-gray-*)
- `font-heading` - Headings (Season Mix)
- `font-sans` - Body text (Helvetica)

## Output Format

Generate complete, ready-to-use files with clear path comments:

```tsx
// File: packages/client/src/components/payments/PaymentsDashboard.tsx

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CreditCard } from "lucide-react"

interface PaymentsDashboardProps {
  userId: string
}

export function PaymentsDashboard({ userId }: PaymentsDashboardProps) {
  return (
    <div className="grid gap-4 p-6">
      {/* Component code */}
    </div>
  )
}
```

## Component Splitting (Default: ON)

When `split_components: true` (default):

**Before (monolithic):**
```tsx
// One giant 500-line component
```

**After (split):**
```tsx
// PaymentsDashboard.tsx (orchestrator)
// PaymentCard.tsx (reusable)
// PaymentHeader.tsx (reusable)
// PaymentStats.tsx (reusable)
```

**Naming conventions:**
- Use PascalCase for components
- Derive from feature name: `user-profile` → `UserProfileCard`
- Group by feature: `payments/`, `auth/`, `tickets/`

## Interactive Workflow

1. **User shares Figma URL** (with or without node-id)
2. **Skill IMMEDIATELY calls Figma MCP tools** (auto-allowed, no prompt)
3. **AFTER fetching design, skill asks:**
   - "What feature/page is this? (e.g., 'payments-dashboard')"
   - "Split repeated patterns into reusable components? [Y/n]"
4. **Skill generates** components in packages/client/src/components/
5. **Skill applies** ShadCN padding fixes and accessibility patterns

## Common ShadCN Patterns

**Sheet/Dialog with custom padding:**
```tsx
<SheetContent className="p-8">
  <SheetHeader className="p-0"> {/* Remove default p-4 */}
    <SheetTitle>Title</SheetTitle>
  </SheetHeader>
  {/* Content */}
  <SheetFooter className="p-0"> {/* Remove default p-4 */}
    <Button>Action</Button>
  </SheetFooter>
</SheetContent>
```

**Form with validation:**
```tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const schema = z.object({
  email: z.string().email()
})

const form = useForm({
  resolver: zodResolver(schema)
})
```

## Detailed References

For advanced usage, see:
- [./reference/color-mapping.md](./reference/color-mapping.md) - **Figma color → design token mapping (START HERE)**
- [./reference/examples.md](./reference/examples.md) - Full component generation examples
- [./reference/shadcn-patterns.md](./reference/shadcn-patterns.md) - ShadCN best practices and common fixes
- [./reference/troubleshooting.md](./reference/troubleshooting.md) - Common issues and solutions

## Execution Instructions

When this skill triggers:

1. **Extract Figma URL** from conversation (parse fileKey and nodeId from URL)
2. **Check for node-id** - if missing, ask user to select a frame in Figma
3. **IMMEDIATELY call Figma MCP tools** (these are auto-allowed, DO NOT ask permission):
   - `mcp__figma__get_design_context` with extracted fileKey and nodeId
   - `mcp__figma__get_variable_defs` for design tokens
4. **AFTER fetching context, ask user:**
   - Feature name: `"What should I name this feature? (e.g., 'user-settings')"`
   - Split components: `"Split repeated patterns into reusable components? [Y/n]"` (default: yes)
5. **Map Figma colors to design tokens:**
   - Red/error colors → `variant="destructive"` or `bg-destructive`
   - Blue/primary → `variant="default"` or `bg-primary`
   - Gray borders → `border-border`
   - Muted text → `text-muted-foreground`
6. **Check dependencies before generating:**
   - Verify ShadCN components exist in `packages/client/src/components/ui/`
   - If missing, run: `npx shadcn@latest add [component-name]` (e.g., `select`, `dialog`, `table`)
   - Check Lucide icons are installed: `lucide-react` in package.json
   - Verify form dependencies: `react-hook-form`, `@hookform/resolvers`, `zod`
7. **Generate components** following stack requirements above
8. **Output complete files** with path comments
9. **Provide installation commands** if components missing

## Dependency Management

Before generating components, verify and install required dependencies:

### ShadCN UI Components

**Check if component exists:**
```bash
ls packages/client/src/components/ui/[component].tsx
```

**If missing, install:**
```bash
cd packages/client
npx shadcn@latest add [component-name]
```

**Common components needed:**
- `button`, `card`, `input`, `label`, `textarea`
- `select`, `checkbox`, `radio-group`, `switch`
- `dialog`, `sheet`, `dropdown-menu`, `popover`, `hover-card`
- `table`, `tabs`, `badge`, `avatar`, `separator`
- `form` (includes react-hook-form integration)
- `toast`, `alert`, `skeleton`, `scroll-area`

### NPM Dependencies

**Check package.json for:**
```json
{
  "lucide-react": "^0.x.x",           // Icons
  "react-hook-form": "^7.x.x",        // Forms
  "@hookform/resolvers": "^3.x.x",    // Form validation
  "zod": "^3.x.x"                      // Schema validation
}
```

**If missing, install:**
```bash
cd packages/client
npm install lucide-react react-hook-form @hookform/resolvers zod
```

### Installation Workflow

1. **Analyze generated code** - identify imports needed
2. **Check existence** - verify files/packages present
3. **Install missing** - run commands before presenting code
4. **Inform user** - list what was installed

## Error Handling

**Missing node-id:**
```
"I need a specific frame/component. Please select a frame in Figma and copy the URL with node-id."
```

**Invalid URL:**
```
"Please provide a valid Figma URL (figma.com/design/* or figma.com/file/*)"
```

**MCP tool errors:**
```
"Figma MCP error: [error message]. Check if Figma desktop app is open and file is accessible."
```

**Missing dependencies:**
```
"Installing required ShadCN components: [list]
Run: cd packages/client && npx shadcn@latest add [components]"
```

---

**Token budget:** ~1.4k (Level 2)
**Last updated:** 2025-11-26
