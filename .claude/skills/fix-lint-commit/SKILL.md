---
name: fix-lint-commit
description: Fix lint errors blocking a commit after a merge. Use when a commit fails due to biome/lint-staged errors on staged files, especially after merging branches. Triggers on "fix lint", "lint commit failed", "biome check failed", "lint-staged failed", "commit failed lint", or when a merge commit is blocked by pre-commit hooks.
---

## Context

After merging branches (especially large merges like pull-onboarding), `git commit` triggers lint-staged which runs `biome check --write` on ALL staged files. This often fails because merged code has lint/format issues. This skill fixes those issues and retries the commit.

## Workflow

### 1. Identify the Situation

```bash
git status
```

- Confirm we're in a merge state or have staged files ready to commit
- Note if there's a MERGE_MSG (indicating an in-progress merge)

### 2. Run Biome Fix on All Staged Files

Run biome check with auto-fix on the entire project to resolve formatting and lint issues:

```bash
pnpm biome check --write --no-errors-on-unmatched --files-ignore-unknown=true packages/
```

- This fixes formatting, import ordering, and auto-fixable lint issues
- If biome reports errors that can't be auto-fixed, list them for manual resolution

### 3. Handle Remaining Errors

If biome still reports errors after auto-fix:

1. Read each failing file
2. Fix the specific lint errors (unused imports, type errors, etc.)
3. Re-run biome to confirm fixes:
   ```bash
   pnpm biome check --no-errors-on-unmatched --files-ignore-unknown=true packages/
   ```

### 4. Run Type Check

```bash
pnpm run type-check
```

- If type errors exist, fix them before proceeding
- Common post-merge type errors: missing imports, renamed types, conflicting interfaces

### 5. Stage Fixed Files

```bash
git add -u
```

- Only update already-tracked files — don't add new untracked files without user approval

### 6. Retry the Commit

If there was a merge in progress (MERGE_MSG exists):
```bash
git commit --no-edit
```

If this was a regular commit, ask the user for the commit message or use the one they previously provided.

### 7. If Pre-commit Hooks Fail Again

If the commit still fails due to lint-staged:

1. **Do NOT use `--no-verify`** — that violates project conventions
2. Read the specific error output
3. Fix the exact files/lines mentioned in the error
4. Stage and retry

### 8. Verify Success

```bash
git log --oneline -3
```

- Confirm the commit landed
- Report what was fixed (number of files, types of fixes)

## Common Fix Patterns

| Error | Fix |
|-------|-----|
| Unused imports | Remove the import |
| Import ordering | Biome auto-fixes this |
| Formatting (indentation, trailing commas) | Biome auto-fixes this |
| Duplicate object keys | Remove the duplicate |
| Missing semicolons | Biome auto-fixes this |
| Type errors from merge | Update types/imports to match merged code |

## Principles

- Never use `--no-verify` to bypass hooks
- Fix the actual issues, don't suppress them
- If fixes are extensive, summarize what changed so the user can review
- After fixing, the repo should be in a clean, buildable state
