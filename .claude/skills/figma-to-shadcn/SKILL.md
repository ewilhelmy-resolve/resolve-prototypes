---
name: figma-to-shadcn
description: Generate React/TypeScript components from Figma designs using Tailwind CSS, ShadCN UI, and Lucide icons. Auto-triggers when Figma URLs (figma.com/design, figma.com/file) are detected, or user says "implement this design", "convert design", "build from Figma", "code from mockup", or "Figma to code". Splits repeated patterns into reusable components.
---

# Figma to ShadCN UI Component Generator

Generate production-ready React/TypeScript components from Figma designs using RITA's stack.

## Execution Flow

1. **Extract Figma URL** — parse `fileKey` and `nodeId` from URL
   - If missing `node-id`, ask user to select a frame and copy link
2. **IMMEDIATELY call Figma MCP tools** (auto-allowed, no permission prompt):
   - `mcp__figma__get_design_context` with fileKey + nodeId
   - `mcp__figma__get_variable_defs` for design tokens
3. **Ask user** (after fetching, not before):
   - Feature/page name? (e.g., "user-settings", "payments-dashboard")
   - Split repeated patterns into reusable components? [Y/n]
4. **Check dependencies** — verify ShadCN components exist in `packages/client/src/components/ui/`
   - Missing? Run: `cd packages/client && pnpm dlx shadcn@latest add [component]`
5. **Generate components** following rules below
6. **Output files** with path comments at `packages/client/src/components/{feature}/`

## Generation Rules

**Stack:** TypeScript React (.tsx), Tailwind CSS, ShadCN UI (`@/components/ui/*`), Lucide icons (`lucide-react`)

**RITA standards:**
- TypeScript interfaces for all props
- ARIA labels on all interactive elements, `sr-only` for icon-only buttons
- Zod + React Hook Form for any forms
- Design tokens only — NO hardcoded colors (see [./reference/design-reference.md])
- `font-heading` for headings (Season Mix), `font-sans` for body (Helvetica)

**Component splitting (default: ON):**
- PascalCase names derived from feature: `payments-dashboard` -> `PaymentCard.tsx`
- Group by feature folder: `payments/`, `auth/`, `tickets/`
- Orchestrator component + extracted reusable pieces

**Color mapping (quick rules, full reference in [./reference/design-reference.md]):**
- Error/delete -> `variant="destructive"` or `bg-destructive`
- Primary/CTA -> `variant="default"` or `bg-primary`
- Active/selected -> `bg-accent`
- Headers/panels -> `bg-secondary`
- Borders -> `border-border`
- Subdued text -> `text-muted-foreground`
- NEVER: `bg-red-*`, `bg-blue-*`, `bg-white`, `text-black`, `border-gray-*`

**ShadCN padding fix:** When parent has custom padding (e.g., `p-8`), add `className="p-0"` to `SheetHeader`/`SheetFooter`/`DialogHeader`/`DialogFooter` to prevent double padding.

## Output Format

```tsx
// File: packages/client/src/components/{feature}/{ComponentName}.tsx

import { Card } from "@/components/ui/card"
import { CreditCard } from "lucide-react"

interface ComponentNameProps {
  id: string
}

export function ComponentName({ id }: ComponentNameProps) {
  return (
    <div className="grid gap-4 p-6">
      {/* Component code */}
    </div>
  )
}
```

## Error Handling

- **Missing node-id:** "Select a frame in Figma and copy the URL with node-id."
- **Invalid URL:** "Provide a valid Figma URL (figma.com/design/* or figma.com/file/*)"
- **MCP error:** "Check if Figma desktop app is open and file is accessible."
- **Missing deps:** Install via `cd packages/client && pnpm dlx shadcn@latest add [components]`

## References (load on demand)

- [./reference/design-reference.md] — Color mapping, design tokens, ShadCN patterns
- [./reference/examples.md] — Full component generation example
- [./reference/troubleshooting.md] — Debug workflow and common issues
