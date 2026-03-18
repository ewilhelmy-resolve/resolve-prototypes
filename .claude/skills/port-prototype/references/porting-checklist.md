# Porting Checklist

Use this checklist to ensure nothing is missed during a prototype port.

## Pre-Port

- [ ] Source branch identified and confirmed with user
- [ ] `git fetch origin` run to get latest
- [ ] `git diff main...origin/<branch> --stat` analyzed
- [ ] Files categorized (Foundation / Component / Container / New / Polish / Out of Scope)
- [ ] Scope agreed with user — in-scope vs out-of-scope files listed
- [ ] Feature branch created from main (or working on existing feature branch)
- [ ] Ticket number confirmed for commits

## Per-Phase Checklist

Repeat for each phase (Foundation → Components → Containers → New → Polish):

### Before Starting Phase
- [ ] All dependencies from previous phases are in place
- [ ] Phase scope is clear (which files, what changes)

### Per-File
- [ ] Read source version: `git show origin/<branch>:<path>`
- [ ] Read current version on working branch
- [ ] Identified differences and potential conflicts
- [ ] Checked: does source use different patterns than current branch? (pagination, data fetching, state management)
- [ ] Adapted code following porting rules:
  - [ ] New props are optional with `?` suffix
  - [ ] Conditional rendering for optional data (`!= null` checks)
  - [ ] Mock/hardcoded data removed
  - [ ] Current branch error handling preserved
  - [ ] Shared logic extracted to `lib/` if used by multiple components
- [ ] Added i18n keys for any new user-facing strings (both `en` and `es-MX`)
- [ ] File compiles: `pnpm type-check`

### After Phase
- [ ] All files in phase are complete
- [ ] TypeScript compiles across the package
- [ ] No regressions in existing functionality

## Post-Port

### Code Quality
- [ ] `pnpm type-check` — no TypeScript errors
- [ ] `pnpm lint` — Biome passes (formatting + linting)
- [ ] `pnpm test` — all existing tests pass

### Tests
- [ ] Existing tests updated for changed component APIs (new/removed props, changed mocks)
- [ ] New tests added for new components with testable logic
- [ ] Skeleton/loading components updated to match new layouts
- [ ] Mock data in tests matches new data shapes

### i18n
- [ ] All new strings use `t()` translation function
- [ ] Keys added to `en/tickets.json` (or relevant namespace)
- [ ] Placeholder keys added to `es-MX/tickets.json`

### Visual Verification
- [ ] `pnpm dev:client` — app renders without console errors
- [ ] New UI elements visible and interactive
- [ ] Graceful degradation verified (components render correctly with missing optional data)
- [ ] Existing functionality still works (navigation, filters, pagination)

### Documentation
- [ ] Out-of-scope items noted for future work
- [ ] Any architectural decisions documented in commit message or PR description
