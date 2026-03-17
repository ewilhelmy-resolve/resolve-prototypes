---
name: port-prototype
description: Port coded design prototypes from a source branch into the current feature branch. Auto-triggers on "port from", "bring over designs", "port prototype", "cherry-pick design", "design branch to feature", "port from prototype", "merge design changes", "bring changes from branch", or when user references a design/prototype branch with code to port. Also use when user says "port", "bring over", or "pull in" changes from another branch into the working branch.
---

# Port Prototype Branch

Selectively port coded design prototypes from a source branch into the current feature branch. This is NOT a git merge — it's a guided, phase-by-phase adaptation that preserves current branch patterns while bringing in new designs.

## Why This Exists

Design branches often contain exploratory code: mock data, simplified error handling, different data-fetching patterns, and out-of-scope changes mixed in with the actual design work. Blindly merging breaks things. This skill guides a careful, phased port that adapts source code to fit the target branch.

## Step 1: Gather Context

Before touching any code, collect three things:

1. **Source branch** — ask the user if not obvious (e.g., `origin/design/prototypes`)
2. **Target scope** — which components/pages to port (e.g., "ticket group cards and list view")
3. **Ticket number** — for commits and PR (e.g., `RG-725`)

Then fetch and analyze:

```bash
git fetch origin
git diff main...origin/<source-branch> --stat
git diff main...origin/<source-branch> --name-status
```

## Step 2: Categorize Files

Group every changed file from the diff into one of these categories:

| Category | Examples | Port Order |
|----------|----------|------------|
| **Foundation** | Stores, utility libs, types, shared helpers | 1st |
| **Component Redesign** | Existing components with new props/layout | 2nd |
| **Container Integration** | Parent components with new controls (sort, filter, toggle) | 3rd |
| **New Components** | Entirely new views or widgets | 4th |
| **Polish** | Tests, i18n keys, skeleton loaders | 5th |
| **Out of Scope** | Unrelated changes, mock data files, config | Skip |

Present the categorized list to the user and get explicit approval on what's in-scope vs out-of-scope before proceeding.

## Step 3: Execute Phase by Phase

For each file, always follow this sequence:

1. **Read the source** — `git show origin/<branch>:<filepath>` to see what the design branch has
2. **Read the current** — read the working branch version of the same file
3. **Diff mentally** — identify what's new, what's changed, what's removed
4. **Adapt** — apply changes following the porting rules below
5. **Verify** — `pnpm type-check` after each phase to catch issues early

Work through phases in order (Foundation → Components → Containers → New → Polish). This ensures dependencies exist before consumers.

## Porting Rules

These rules prevent the most common problems when porting from design branches:

### 1. Preserve Current Branch Patterns
The source branch may use different data-fetching, pagination, or state management patterns. Always keep what's on the current branch.

**Example:** Source uses `useInfiniteQuery` with auto-fetch-all, but current branch uses `useQuery` with offset pagination → keep offset pagination, wire new UI controls into it.

### 2. Graceful Degradation
New props and metrics must be optional. The UI must render correctly even when data is missing.

```tsx
// Source branch (hardcoded):
mttr: MOCK_MTTR_MAP[cluster.id] ?? 15

// Adapted (optional):
mttr?: number  // only render when provided
{mttr != null && <span>{mttr}m</span>}
```

### 3. Skip Mock Data
Design branches often include hardcoded maps, fake metrics, or sample data to make the prototype look complete. Never port these — make the field optional instead.

### 4. Preserve Error Handling
If the current branch handles error states (below-threshold warnings, failed training banners, etc.) that the design branch removed, keep them. Design branches often simplify for visual prototyping.

### 5. Extract Shared Utilities
When porting logic that multiple components will use, extract it to a shared module first:
- Date formatting → `lib/date-utils.ts`
- Business logic → `lib/<domain>/` (e.g., `lib/tickets/prioritization.ts`)
- Stores → `stores/<name>Store.ts`

### 6. i18n Immediately
Every new user-facing string gets a translation key. Don't hardcode strings with the intent to "add i18n later." Add keys to both `en` and `es-MX` locale files (es-MX can use placeholder English text initially).

### 7. Scope Discipline
Only port what the user requested. When you encounter interesting changes outside the agreed scope, note them as "future work" but don't implement them.

## Step 4: Update Tests

After all implementation phases:

1. Update existing tests for changed components (new mocks, new assertions)
2. Add tests for new components if they have testable logic
3. Update skeleton/loading components to match new layouts
4. Run the full test suite: `pnpm test`

## Step 5: Verify

Run all verification steps:

```bash
pnpm type-check    # TypeScript compiles
pnpm lint          # Biome passes
pnpm test          # All tests pass
pnpm dev:client    # Visual check (ask user to verify)
```

See [./references/porting-checklist.md] for a detailed pre/per-file/post checklist.

## Common Adaptation Patterns

| Source Branch Pattern | How to Adapt |
|---|---|
| Infinite scroll pagination | Keep target's offset pagination, wire new UI into it |
| Hardcoded mock MTTR/metrics | Make field `undefined`, render conditionally with `!= null` |
| Removed error state handling | Preserve existing error states from current branch |
| Multiple unrelated changes in one file | Port only the relevant sections |
| New component with inline shared logic | Extract shared logic to `lib/` first, then create component |
| New Zustand store | Create with persist middleware + devtools, use localStorage key convention |
| New i18n keys scattered in JSX | Collect all keys, add to locale JSON first, then use `t()` calls |
| Design uses different UI library components | Map to project's existing component library (shadcn/ui) |
