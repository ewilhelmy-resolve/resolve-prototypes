- In all interactions and commit messages, be extremely concise and sacrifice
  grammar for the sake of concision.
- **Always use `pnpm` instead of `npm` or `yarn` for all package management commands.**
- **Never add Claude as author in git commit messages** (no `Co-authored-by: Claude`, no AI attribution).
- **Commit messages must follow Conventional Commits**: `type(scope): message`
  - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
  - Keep subject line under 50 chars, no period at end
  - Examples: `feat(chat): add SSE reconnect`, `fix(auth): handle token expiry`

## Plans

- At the end of each plan, give me a list of unresolved questions to answer,
  if any. Make the questions extremely concise. Sacrifice grammar for the sake
  of concision.

# Rita Project - Development Documentation

This is the Rita project with modern TypeScript/React architecture that replaces the POC v0.01 code (now in `legacy/` folder).

## Project Architecture

Rita is structured as a modern microservices architecture:
- `packages/api-server/` - TypeScript API server with Express, RabbitMQ and PostgreSQL
- `packages/client/` - **RITA Go** React/TypeScript/Shadcn/Tailwind/Zustand frontend with Keycloak authentication
- `packages/mock-service/` - Mock external service for development

## Frontend Development Standards (RITA Go)

### Default Agent Usage
The Rita project uses the **fe-enterprise-agent** as the default for ALL frontend development tasks in RITA Go (`packages/client/`). The agent enforces:

- **SOC2 Type II compliance** - Security, availability, processing integrity, confidentiality, privacy
- **WCAG 2.1 AA accessibility** - Full screen reader and keyboard navigation support
- **Component-Based Architecture (CBA)** - Modular, reusable, independently deployable components
- **Platform-Driven Architecture** - Thin frontend, backend-heavy business logic
- **Server-Sent Events (SSE)** - Real-time updates via EventSource API
- **RITA Go → Actions → Rabbit → RITA Go Pattern** - Asynchronous message flow for all user actions

### Required Technical Stack
- **React 18+** with **TypeScript 5+** (strict mode)
- **TanStack Query v5** for server state management
- **Zustand** for lightweight client state
- **React Hook Form** with **Zod** validation
- **Radix UI** for accessible component primitives
- **Tailwind CSS** for utility-first styling
- **shadcn/ui** for component library foundation
- **Figma-to-shadcn** for design system implementation

### Code Standards
- All components must include proper TypeScript interfaces
- All forms must have ARIA labels and accessibility attributes
- All user inputs must be validated with Zod schemas
- All real-time features must use Server-Sent Events
- All user actions must follow audit logging requirements
- All components must be tested for accessibility compliance

**Note**: These standards apply to all developers working on this project and are enforced automatically through the fe-enterprise-agent configuration.

## Development Workflow

### For New Development (RITA Go)

Both the client and server are run locally in development mode. The client runs on port 5173 and the server runs on port 3000, before trying to run them check that they are not already running.

1. **RITA Go Frontend Development** (packages/client/)
   ```bash
   cd packages/client
   pnpm install
   pnpm dev
   ```

2. **Backend Development** (packages/api-server/)
   ```bash
   cd packages/api-server
   pnpm install
   pnpm dev
   ```

3. **Full Stack Development**
   ```bash
   docker compose up -d
   # Runs all services together
   ```

### Important Rules
- Focus development on the Rita project packages/ architecture
- All new features go in RITA Go (packages/client/) and packages/api-server/
- RITA Go components must follow fe-enterprise-agent standards
- No commits until all tests pass

### Environment Variables
Check `.env.example` files in each package for required configuration.

### Command Shortcuts
- `pnpm dev:client` - Start client development server (port 5173)
- `pnpm dev:api` - Start API server (port 3000)
- `pnpm dev:mock` - Start mock service
- `pnpm dev:theme` - Start Keycloak theme development
- `pnpm dev:iframe-app` - Start iframe app host (port 5174)
- `pnpm test` - Run test suite
- `pnpm type-check` - Run TypeScript type checking across all packages
- `pnpm build` - Build API server and client for production
- `pnpm build:theme` - Build Keycloak theme
- `pnpm lint` - Run linting across all packages
- `docker compose up -d` - Start full stack with Docker

### Build Architecture Note
Client build (`packages/client`) uses `vite build` without `tsc`. Type checking runs separately via `type-check` script in CI. This prevents OOM errors during build - tsc requires ~4GB heap for full type checking.

### Iframe Embeddable Chat (Public Guest Access)

RITA Go includes an iframe-embeddable version for integration into host pages on the same domain.

**Key Features**:
- Minimal UI (no sidebar, no navigation)
- Public guest user access (no Keycloak login required)
- Intent tracking via `intent-eid` parameter
- Works without knowledge base files
- Same-domain deployment provides security

**Routes**:
- `/iframe/chat` - New public conversation
- `/iframe/chat/:conversationId` - Existing conversation
- `/iframe/chat?intent-eid=<value>` - With intent tracking

**How it Works**:
- All iframe users share a single `public-guest-user` account
- Session created automatically on page load
- No authentication UI or login required
- Conversations isolated by `conversationId`

**Quick Start**:
```bash
# Terminal 1: Start API server
npm run dev:api

# Terminal 2: Start client
npm run dev:client

# Terminal 3: Start iframe app host
npm run dev:iframe-app
# Opens http://localhost:5174
```

**Documentation**: See `packages/client/IFRAME.md` for integration guide

**Public User Restrictions** (future):
- No file uploads
- No data source connections
- Limited conversation history
- No org settings access

### Style & Reminders
- Prefer TypeScript strict mode for all new code
- Follow enterprise security and accessibility standards
- Use the fe-enterprise-agent for all frontend development
- Document components with proper JSDoc comments
- never add claude as author in git commit messages

## Documentation Strategy

Project docs organized by topic in `docs/`:

| Folder | Purpose |
|--------|---------|
| `core/` | System fundamentals (auth, db, messages, tech design) |
| `architecture/` | Infrastructure (RabbitMQ, file storage, data sources) |
| `features/<name>/` | Feature docs grouped by feature |
| `frontend/` | Client/UI guides (stack, figma workflow) |
| `setup/` | Environment & config (keycloak, staging, email) |
| `archived/` | Shipped implementation plans |
| `feat-<name>/` | Large feature clusters |

**When writing docs:**
- New features → `docs/features/<feature-name>/`
- Implementation plans → archive after shipping to `docs/archived/`
- Package-specific → `packages/<pkg>/docs/`
- See `docs/README.md` for full index