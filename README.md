<p align="center">
  <strong>AI chat assistant for IT service desk</strong><br>
  Conversations that resolve — from onboarding to autopilot
</p>

<p align="center">
  <a href="docs/architecture.md">Architecture</a> &middot;
  <a href="docs/development.md">Development</a> &middot;
  <a href="docs/coding-guidelines.md">Guidelines</a> &middot;
  <a href="docs/testing.md">Testing</a> &middot;
  <a href="docs/pr-workflow.md">PR Workflow</a>
</p>

---

Rita is your organization's guide through the noise of IT service management — a knowledgeable companion that turns the maze of onboarding, ticketing, and ITSM setup into a single conversation. With autopilot capabilities for ITSM sources, Rita doesn't just assist — she learns your workflows and drives resolution autonomously.

---

## Quick Start

```bash
# Prerequisites: Node 20+, pnpm 9.15+, Docker

git clone <repo-url> && cd rita-chat
pnpm setup        # install deps, start docker, run migrations
cp .env.example .env
pnpm dev          # starts api-server, client, mock-service
```

Open http://localhost:5173

## Features

- **AI Chat Interface** — conversational IT support with SSE streaming
- **Multi-tenant Architecture** — org-level isolation with Keycloak auth
- **ITSM Integrations** — ServiceNow, Jira, Ivanti, Freshdesk connections
- **Autopilot** — autonomous ITSM source management and ticket clustering
- **Knowledge Base** — Confluence and file-based knowledge ingestion
- **Iframe Embeddable** — drop-in chat widget for host applications
- **Dynamic UI Schema** — platform-driven forms and modals via JSON schema
- **Credential Delegation** — secure ITSM admin credential flow via email
- **i18n** — English and Spanish (es-MX) localization
- **Storybook** — component documentation and visual testing

## Development

```bash
pnpm dev              # Full stack (docker + all services)
pnpm dev:client       # Client only (port 5173)
pnpm dev:api          # API only (port 3000)
pnpm test             # Unit tests
pnpm type-check       # TypeScript check
pnpm lint             # Biome lint
pnpm storybook        # Component stories (port 6006)
```

See [Development Guide](docs/development.md) for full setup instructions.

## Documentation

| Document | Purpose |
|----------|---------|
| [Architecture](docs/architecture.md) | System design and data flow |
| [Development](docs/development.md) | Setup and daily workflow |
| [Coding Guidelines](docs/coding-guidelines.md) | Code style and conventions |
| [Testing](docs/testing.md) | Test commands and patterns |
| [PR Workflow](docs/pr-workflow.md) | Commits, PRs, and review process |
| [docs/README.md](docs/README.md) | Full documentation index (61 docs) |
