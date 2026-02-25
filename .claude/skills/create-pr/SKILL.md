---
name: create-pr
description: ALWAYS use this skill when creating pull requests — never create a PR directly without it. Follows RITA conventions for PR titles, descriptions, and ticket references. Trigger on any create PR, open PR, submit PR, push and create PR, or prepare changes for review task.
---

# Create Pull Request

Create pull requests following RITA's engineering practices.

**Requires**: GitHub CLI (`gh`) authenticated and available.

## Prerequisites

Before creating a PR, ensure all changes are committed. If there are uncommitted changes, use the `commit` skill first.

```bash
git status --porcelain
```

If output shows uncommitted changes that should be included, invoke the `commit` skill before proceeding.

## Process

### Step 1: Verify Branch State

```bash
# Detect the default branch
gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'
```

```bash
# Check current branch and status (substitute detected branch name for BASE)
git status
git log BASE..HEAD --oneline
```

Ensure:
- All changes are committed
- Branch is not `main` or `master`
- Changes are rebased on the base branch if needed

### Step 2: Push Branch

```bash
git push -u origin HEAD
```

### Step 3: Analyze Changes

Review what will be in the PR:

```bash
# All commits in the PR (substitute detected branch name for BASE)
git log BASE..HEAD

# Full diff
git diff BASE...HEAD
```

Understand the scope and purpose of all changes before writing the description.

### Step 4: Extract Ticket Reference

Extract the ticket number from the branch name or commit messages:

```bash
# From branch name (e.g., feat/RG-101-update-profile → RG-101)
git branch --show-current | grep -oE '(RG|CLIEN|JAR)-[0-9]+'
```

If no ticket found in branch name, check commit messages:

```bash
git log BASE..HEAD --format="%B" | grep -oE '(RG|CLIEN|JAR)-[0-9]+' | head -1
```

### Step 5: Write the PR Description

Use this structure:

```markdown
<brief description of what the PR does>

<why these changes are being made — the motivation>

<alternative approaches considered, if any>

<any additional context reviewers need>

Refs <TICKET>
```

**Do NOT include:**
- PR checklists or test plan sections
- Checkbox lists of testing steps
- AI attribution of any kind
- Redundant summaries of the diff

**Do include:**
- Clear explanation of what and why
- Ticket reference in the body
- Context that isn't obvious from the code
- Notes on areas that need careful review

### Step 6: Create the PR

```bash
gh pr create --title "<type>(<scope>): <description>" --body "$(cat <<'EOF'
<description body here>

Refs <TICKET>
EOF
)"
```

**Title format** follows commit conventions:
- `feat(chat): add message reactions`
- `fix(session): handle cookie expiry`
- `refactor(iframe): extract session logic`

**No `--draft` flag** — PRs are created ready for review.

## PR Description Examples

### Feature PR

```markdown
Add Slack-style message reactions to chat

Users can now react to messages with emoji. Reactions display below
the message with a count badge showing how many users reacted.

Previously considered inline reactions but threading-style reactions
below the message better match the existing UI patterns.

Refs CLIEN-89
```

### Bug Fix PR

```markdown
Handle null response in user API endpoint

The user endpoint could return null for soft-deleted accounts,
causing dashboard crashes when accessing user properties. Adds
null check and returns proper 404 response.

Found while investigating sidebar rendering errors.

Refs RG-234
```

### Refactor PR

```markdown
Extract validation logic to shared module

Moves duplicate validation code from alerts, issues, and projects
endpoints into a shared validator class. No behavior change.

Prepares for adding new validation rules without duplicating logic
across endpoints.

Refs RG-150
```

## Editing Existing PRs

Use `gh api` to update PRs (more reliable than `gh pr edit`):

```bash
# Update description
gh api -X PATCH repos/{owner}/{repo}/pulls/PR_NUMBER -f body="$(cat <<'EOF'
Updated description here

Refs <TICKET>
EOF
)"

# Update title
gh api -X PATCH repos/{owner}/{repo}/pulls/PR_NUMBER -f title='feat(chat): updated title'

# Update both
gh api -X PATCH repos/{owner}/{repo}/pulls/PR_NUMBER \
  -f title='feat(chat): updated title' \
  -f body='Updated description'
```

## Guidelines

- **One PR per feature/fix** — don't bundle unrelated changes
- **Keep PRs reviewable** — smaller PRs get faster, better reviews
- **Explain the why** — code shows what; description explains why
- **No AI attribution** — never mention AI/Claude in PR title or body
- **Always include ticket ref** — `Refs <TICKET>` at end of body
