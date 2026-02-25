---
name: commit
description: Safe commit workflow with conflict marker checks, type checking, and build verification before committing.
version: 1.0.0
---

## Safe Commit Workflow

Execute these steps in order. Stop immediately if any step fails.

### 1. Check for conflict markers
```bash
grep -r '<<<<<<<' packages/ && echo "CONFLICT MARKERS FOUND — fix before committing" && exit 1 || echo "No conflict markers"
```
- If conflict markers found, list the files and STOP. Do not commit.

### 2. Run type checking
```bash
cd /Users/ericawilhelmy/Documents/resolve-onboarding && pnpm type-check 2>&1 | tail -30
```
- If TypeScript errors found, list them and STOP. Ask user if they want to fix.

### 3. Run lint
```bash
cd /Users/ericawilhelmy/Documents/resolve-onboarding && pnpm lint 2>&1 | tail -30
```
- If lint errors found, list them and STOP. Ask user if they want to fix.

### 4. Show staged changes
```bash
git diff --cached --stat
git diff --stat
```
- Show the user what will be committed.
- Ask user to confirm which files to stage if not all are staged.

### 5. Stage and commit
- Stage relevant files (prefer specific files over `git add -A`).
- Write a conventional commit message: `type(scope): message`
- Keep subject under 50 chars, no period.
- **Never** add `Co-authored-by: Claude` or any AI attribution.
- Commit.

### 6. Post-commit
```bash
git status
git log --oneline -3
```
- Show the result. Ask if user wants to push.
