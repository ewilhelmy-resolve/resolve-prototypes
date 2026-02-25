# PR Workflow

## Commit Conventions

Format: `<type>(<scope>): <description>`

Types: feat, fix, docs, refactor, test, chore, perf

Subject line under 50 chars, no period.

### Examples

```
feat(autopilot): add org-level settings
fix(session): cookie max-age handling
refactor(iframe): use Valkey IDs directly
test(ui-schema): add Stack/Card schema tests
docs(ui-form-request): add pipeline docs
chore(itsm): reorder Ivanti above Freshdesk
```

### Common Scopes

| Scope | Package/Area |
|-------|-------------|
| `chat` | Chat UI and messaging |
| `session` | Session/auth handling |
| `iframe` | Iframe embeddable chat |
| `autopilot` | Autopilot/ITSM features |
| `itsm` | ITSM connections |
| `ui-schema` | Dynamic UI schema renderer |
| `db` | Database migrations |
| `api-server` | API server general |
| `client` | Client general |
| `storybook` | Storybook stories |
| `ci` | CI/CD workflows |
| `keycloak` | Keycloak theme/config |
| `k8s` | Kubernetes/deployment |

## Branch Naming

Format: `<type>/<issue-number>-<short-kebab-description>`

### Examples

```
feat/CLIEN-45-iframe-chat-scroll
fix/RG-654-sidebar-console-errors
refactor/CLIEN-42-session-service-audit
```

Issue prefixes: `CLIEN-` (client tasks), `RG-` (general), `JAR-` (Jarvis/platform).

## PR Description Template

Use this structure for PR descriptions:

```markdown
<brief description of what the PR does>

<why these changes are being made — the motivation>

<alternative approaches considered, if any>

<any additional context reviewers need>

Refs <TICKET>
```

- Explain **what** and **why** — code shows the how
- Include ticket reference (`Refs RG-101`) at end of body
- Note areas that need careful review
- Do **not** include checklists, test plans, or AI attribution

### Example

```markdown
Add message reactions to chat

Users can react to messages with emoji. Reactions display below
the message with a count badge.

Considered inline reactions but below-message placement better
matches existing UI patterns.

Refs CLIEN-89
```

## PR Checklist

- [ ] Code follows [Coding Guidelines](coding-guidelines.md)
- [ ] Tests added/updated (see [Testing](testing.md))
- [ ] All tests pass (`pnpm test`)
- [ ] Type checking passes (`pnpm type-check`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Translations added for user-facing strings (en + es-MX)
- [ ] Storybook stories updated if UI changed
- [ ] Documentation updated if applicable
- [ ] CHANGELOG.md updated for user-facing changes
- [ ] No PII in logs or webhook payloads
- [ ] No Claude attribution in commit messages

## Pre-commit Hooks

Husky runs automatically on commit:
1. `npx lint-staged` — runs `biome check --write` + `biome lint` on staged files
2. `npm run type-check` — TypeScript check all packages
3. If api-server files staged: `pnpm --filter rita-api-server docs:generate` + auto-stage `openapi.json`

If hooks fail, fix the issue and commit again (do NOT use `--no-verify`).

## Review Process

1. Create branch from `main` with naming convention above
2. Make changes, commit with conventional format
3. Push and create PR against `main`
4. CI runs: type-check, lint, tests, OpenAPI validation
5. Request review
6. Address feedback, push fixes as new commits
7. Squash merge into `main`

## Deployment

- **Push to main** → auto-deploys to staging (`deploy-staging.yml`)
- **Push to non-main** → auto-deploys to dev (`deploy-dev.yml`)
- **Production** → manual or automated trigger via `deploy-prod.yml` (workflow_dispatch + repository_dispatch)
