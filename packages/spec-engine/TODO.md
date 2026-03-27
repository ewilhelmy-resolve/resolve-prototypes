# Spec Engine — Next Steps

## Pre-commit Hook

Wire `spec-engine heal --fix` into the pre-commit hook to auto-fix:
- TOC sync in README.md
- Missing frontmatter defaults
- Trivial link renames

Only unfixable issues should block the commit. Requires implementing the `heal` command first (currently a stub in `src/commands/heal.ts`).

## CI Pipeline Stages

The recipe calls for 5 CI stages. Currently only build + deploy are implemented.

Missing stages for `deploy-docs.yml`:
1. **verify-spec** — run `spec:check all` before building (link integrity, template conformance, vocabulary)
2. **generate-livingdoc** — extract BDD scenarios from test files (vitest/playwright) into journey docs
3. **generate-changelog** — generate changelog from conventional commits (could use `conventional-changelog`)

## Journey Enrichment

Journeys are currently route-only shells with no steps, actors, or views. Two approaches:

**Option A — JSDoc annotations:** Add `@journey` / `@step` tags in source code, parse in ts-extractor.

**Option B — Standalone YAML specs:** Create `journeys/*.yaml` files with step definitions. Cross-reference against lexicon for drift detection.

Option B is faster to get value from. Option A is better long-term.

## Heal Command

`src/commands/heal.ts` is a stub. Implement:
- TOC sync (regenerate README.md table of contents)
- Missing frontmatter (add defaults for docs missing required fields)
- Broken link repair (suggest corrections for broken relative links)
- Vocabulary suggestions (flag terms not in terms.json)
