---
name: pull-onboarding
description: Pull latest changes from the resolve-onboarding design/prototypes branch into the current branch. Use when user says "pull onboarding", "pull prototypes", "sync onboarding", "pull design/prototypes", or wants latest from the onboarding repo.
version: 1.0.0
---

## Context

- Remote: `onboarding` → `https://github.com/resolve-io/resolve-onboarding.git`
- Branch: `design/prototypes`
- Merge commit style: `merge: pull design/prototypes from resolve-onboarding`

## Workflow

Execute these steps in order:

### 1. Verify Clean Working Tree
```bash
git status --porcelain
```
- If there are uncommitted changes, **stop** and ask the user to commit or stash first

### 2. Ensure Remote Exists
```bash
git remote get-url onboarding 2>/dev/null || git remote add onboarding https://github.com/resolve-io/resolve-onboarding.git
```

### 3. Fetch Latest from Remote
```bash
git fetch onboarding design/prototypes
```

### 4. Merge with Commit Message
```bash
git merge onboarding/design/prototypes --no-edit -m "merge: pull design/prototypes from resolve-onboarding"
```

### 5. Handle Conflicts
- If merge conflicts occur, list them and ask the user how to proceed
- Do NOT auto-resolve conflicts — show the conflicting files and let the user decide

### 6. Fix Lint Before Committing

After resolving conflicts (or if the merge auto-completed but commit fails due to lint-staged), run the **fix-lint-commit** skill workflow:

1. Run biome auto-fix on all packages:
   ```bash
   pnpm biome check --write --no-errors-on-unmatched --files-ignore-unknown=true packages/
   ```
2. Fix any remaining errors that biome can't auto-fix
3. Run `pnpm run type-check` to catch post-merge type issues
4. Stage all fixes: `git add -u`
5. Retry the commit — never use `--no-verify`

This step is critical for large merges where lint-staged runs on hundreds of staged files.

### 7. Verify
```bash
git log --oneline -3
```
- Confirm the merge commit appears at HEAD
- Report summary: files changed, insertions, deletions

### 8. Report
- Show a concise summary of what was pulled in
- Note: does NOT push — user must push manually when ready
