---
name: update-changelog
description: Update CHANGELOG.md with user-facing changes from recent commits. Use when the user has merged a PR, completed a release, or wants to document recent changes in the changelog. Supports Jira ticket linking and idempotent re-runs via commit marker.
allowed-tools: Read, Bash, Edit
---

# Update Changelog

Update CHANGELOG.md with user-facing changes from recent development work.
Follows [Keep a Changelog](https://keepachangelog.com) convention.

## Input

Optional: A date (YYYY-MM-DD) or commit hash to start from: $ARGUMENTS

If not provided, uses the `<!-- last-commit: hash -->` marker in CHANGELOG.md.

## Process

### Step 1: Read CHANGELOG.md

Read the existing `CHANGELOG.md`. If it doesn't exist, create it:

```markdown
<!-- last-commit: -->
# Changelog

All notable user-facing changes to this project will be documented in this file.

Changes are grouped by release date and category. Only user-facing changes are included — internal refactors, test updates, and CI changes are omitted.
```

Extract the `<!-- last-commit: hash -->` marker from the first line.
If no marker exists yet, it will be added on update.

### Step 2: Gather Recent Changes

```bash
# If marker has a hash:
git log --format="%h %s" <hash>..HEAD --no-merges

# If argument provided (overrides marker):
git log --format="%h %s" <arg>..HEAD --no-merges
# Or by date:
git log --format="%h %s" --since="<date>" --no-merges

# If no marker and no argument:
# Ask user for a starting point or use last month
git log --format="%h %s" --since="1 month ago" --no-merges
```

Also capture HEAD hash for updating the marker:
```bash
git rev-parse --short HEAD
```

### Step 3: Filter for User-Facing Changes

Include only changes that affect end users:

**Include:**
- `feat:` / `feat(scope):` — New features → **Added**
- `fix:` / `fix(scope):` — Bug fixes → **Fixed**
- `perf:` / `perf(scope):` — Performance → **Changed**
- Commits with `RG-xxx` refs that are clearly user-facing (even without conventional prefix)

**Exclude:**
- `refactor:` — Internal restructuring
- `test:` — Test changes
- `chore:` — Maintenance
- `ci:` — CI/CD changes
- `docs:` — Documentation (unless user-facing)
- `style:` — Code style changes
- Merge commits (filtered by `--no-merges`)
- Internal tooling, scripts, infra-only changes

### Step 4: Extract Jira References

For each commit, extract Jira ticket references matching `RG-\d+`.

Transform into links: `[RG-123](https://resolvesys.atlassian.net/browse/RG-123)`

Look in:
- Commit subject (e.g., `RG-666 New Ticket design`)
- After conventional scope (e.g., `feat(chat): RG-555 add feature`)

### Step 5: Group Changes by Category

Use **Keep a Changelog** categories:

- **Added** — New features (`feat:` commits)
- **Changed** — Changes to existing functionality (`perf:`, behavior changes)
- **Fixed** — Bug fixes (`fix:` commits)

Only include categories that have entries.

### Step 6: Write User-Friendly Descriptions

Transform commit messages into plain language:

**Rules:**
- Simple bullet format: `- Description [RG-xxx](link)`
- Use active, user-focused language
- Keep entries to one line
- Combine multiple commits for the same feature into one entry
- Append Jira link at end of entry (if present)
- Omit Jira link if no reference found

**Examples:**

| Commit | Changelog Entry |
|--------|----------------|
| `feat(auth): RG-100 add OAuth2 login` | `- OAuth2 login for Google accounts [RG-100](https://resolvesys.atlassian.net/browse/RG-100)` |
| `fix(iframe): RG-384 immediate overlay removal` | `- Iframe overlay now dismisses immediately [RG-384](https://resolvesys.atlassian.net/browse/RG-384)` |
| `feat(itsm): add auto-sync toggle` | `- Auto-sync toggle for ITSM connections` |
| `RG-666 New Ticket design and fields` | `- New ticket design with additional fields [RG-666](https://resolvesys.atlassian.net/browse/RG-666)` |
| `perf: optimize bundle size` | `- Reduced app bundle size for faster loading` |

### Step 7: Update CHANGELOG.md

Prepend a new date section. If no marker exists yet, add it on the first line.

**Output format:**

```markdown
<!-- last-commit: <new-HEAD-hash> -->
# Changelog

All notable user-facing changes to this project will be documented in this file.

Changes are grouped by release date and category. Only user-facing changes are included — internal refactors, test updates, and CI changes are omitted.

## YYYY-MM-DD

### Added
- New feature description [RG-xxx](https://resolvesys.atlassian.net/browse/RG-xxx)

### Changed
- Changed behavior description

### Fixed
- Bug fix description [RG-xxx](https://resolvesys.atlassian.net/browse/RG-xxx)

## Previous date section
...
```

**Formatting rules:**
- `<!-- last-commit: hash -->` on first line (update to current HEAD)
- `## YYYY-MM-DD` for single-date headers (today's date)
- `## YYYY-MM-DD — YYYY-MM-DD` for date ranges if covering a span
- `### Category` for grouping (Added, Changed, Fixed)
- Most recent at top
- Match existing entry style (simple bullets, no bold feature names)

### Step 8: Review and Verify

Before finishing, verify:
- [ ] Only user-facing changes included
- [ ] Jira links formatted correctly (`[RG-xxx](url)`)
- [ ] `<!-- last-commit: hash -->` updated to current HEAD
- [ ] Consistent formatting with existing entries
- [ ] No duplicate entries from previous changelog sections
- [ ] Categories only present when they have entries
- [ ] Entry style matches existing changelog (simple bullets)

## Important Guidelines

1. **User perspective** — Would a user notice or care about this change?
2. **No attribution** — Don't include author names or PR numbers
3. **Positive framing** — "Fixed X" not "X was broken"
4. **Combine related** — Multiple commits for one feature = one entry
5. **Skip internal** — Refactors, tests, CI, tooling are not user-facing
6. **Idempotent** — Re-running should not duplicate entries (marker prevents this)
7. **Match existing style** — Keep entry format consistent with what's already in CHANGELOG.md

## Usage

```
/update-changelog
/update-changelog 2026-01-01
/update-changelog abc1234
```
