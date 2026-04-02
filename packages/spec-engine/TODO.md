# Spec Engine — Status & Next Steps

## Local Preview

```bash
# Generate all spec docs from source code
pnpm spec:build

# Copy generated docs into Docusaurus content directory
pnpm --filter @rita/docs-site prepare-content

# Start local dev server (use port 4000 if API server is on 3000)
pnpm --filter @rita/docs-site start -- --port 4000
# → http://localhost:4000/resolve-onboarding/docs/
```

### Best examples to show the team

| Category | URL path | Why |
|----------|----------|-----|
| Actor | `/actors/member-service` | Well-documented service with methods |
| View | `/views/add-knowledge-menu` | Component with props + Storybook link |
| Constraint | `/constraints/auth-user-schema` | Zod field rules (UUID, email, nullable) |
| Journey | `/journeys/test-members-routes---api-contracts` | Rich test journey with HTTP codes, error codes, request data |
| Dashboard | `/generated/dashboard` | Coverage stats, what's missing |
| API Reference | `/generated/api-reference` | 75 endpoints + SSE + hooks + deps + RabbitMQ |
| Glossary | `/generated/glossary` | A-Z term index |

## Remaining Requirements

| Requirement | Status | Notes |
|---|---|---|
| Source → metadata → lexicon.json | **Done** | ts-morph extraction |
| Five sections in docs/discover/ | **Done** | Actors, Views, Journeys, Constraints, Glossary |
| spec-engine CLI (check, build, heal, generate) | **Partial** | check/build/generate work, `heal` is a stub |
| Generators (glossary, matrix, dashboard, inventory) | **Done** | All produce output |
| API reference generator | **Done** | 75 endpoints, SSE events, hooks, deps, RabbitMQ |
| Test-based journey extraction | **Done** | 123 journeys from describe/it blocks with assertions |
| Zod schema enrichment | **Done** | 89 constraints have field-level validation rules |
| Route-to-schema linking | **Done** | 75 endpoints with request/response schemas + auth |
| SSE event mapping | **Done** | 13 event types, 19 emission sites |
| Hook → API mapping | **Done** | 35 hooks with API calls + cache keys |
| Service dependency graph | **Done** | 66 edges from imports + getter calls |
| RabbitMQ queue extraction | **Done** | 5 queues, 13 message types |
| CI: verify spec | **Done** | `spec:check all` in deploy-docs workflow |
| CI: build site + deploy | **Done** | Docusaurus → GitHub Pages |
| CI: generate living doc from tests | **Next** | Could run test extractor as separate CI step |
| CI: changelog from conventional commits | **Next** | Not started |
| Pre-commit hook (auto-fix) | **Next** | `heal` command not implemented |
| Journey enrichment (YAML specs) | **Next** | For hand-written journey definitions |
| Heal command | **Next** | Stub — needs TOC sync, frontmatter defaults, link repair |

## Heal Command (stub)

`src/commands/heal.ts` needs implementation:
- TOC sync (regenerate README.md table of contents)
- Missing frontmatter (add defaults for docs missing required fields)
- Broken link repair (suggest corrections for broken relative links)
- Vocabulary suggestions (flag terms not in terms.json)

## Pre-commit Hook

Wire `spec-engine heal --fix` into `.husky/pre-commit` to auto-fix trivial issues. Only unfixable issues should block commits.
