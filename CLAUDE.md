# Rita Project - Development Documentation

This is the Rita project with modern TypeScript/React architecture that replaces the POC v0.01 code (now in `legacy/` folder).

## Project Architecture

Rita is structured as a modern microservices architecture:
- `packages/api-server/` - TypeScript API server with RabbitMQ and PostgreSQL
- `packages/client/` - **Rita Go** React/TypeScript frontend with Keycloak authentication
- `packages/mock-service/` - Mock external service for development

## Frontend Development Standards (Rita Go)

### Default Agent Usage
The Rita project uses the **fe-enterprise-agent** as the default for ALL frontend development tasks in Rita Go (`packages/client/`). The agent enforces:

- **SOC2 Type II compliance** - Security, availability, processing integrity, confidentiality, privacy
- **WCAG 2.1 AA accessibility** - Full screen reader and keyboard navigation support
- **Component-Based Architecture (CBA)** - Modular, reusable, independently deployable components
- **Platform-Driven Architecture** - Thin frontend, backend-heavy business logic
- **Server-Sent Events (SSE)** - Real-time updates via EventSource API
- **Rita Go → Actions → Rabbit → Rita Go Pattern** - Asynchronous message flow for all user actions

### Required Technical Stack
- **React 18+** with **TypeScript 5+** (strict mode)
- **TanStack Query v5** for server state management
- **Zustand** for lightweight client state
- **React Hook Form** with **Zod** validation
- **Radix UI** for accessible component primitives
- **Tailwind CSS** for utility-first styling

### Code Standards
- All components must include proper TypeScript interfaces
- All forms must have ARIA labels and accessibility attributes
- All user inputs must be validated with Zod schemas
- All real-time features must use Server-Sent Events
- All user actions must follow audit logging requirements
- All components must be tested for accessibility compliance

**Note**: These standards apply to all developers working on this project and are enforced automatically through the fe-enterprise-agent configuration.

## Development Workflow

### For New Development (Rita Go)

1. **Rita Go Frontend Development** (packages/client/)
   ```bash
   cd packages/client
   npm install
   npm run dev
   ```

2. **Backend Development** (packages/api-server/)
   ```bash
   cd packages/api-server
   npm install
   npm run dev
   ```

3. **Full Stack Development**
   ```bash
   docker compose up -d
   # Runs all services together
   ```

### Validation Process
When asked to validate a change, execute the following steps in order:

1. **Build and start all services**
   ```bash
   docker compose build --pull
   docker compose up -d
   ```

2. **Wait for service health**
   ```bash
   docker compose ps
   # Verify all services show (healthy)
   ```

3. **Run tests**
   ```bash
   npm test
   # Run all test suites
   ```

### Important Rules
- Focus development on the Rita project packages/ architecture
- Legacy code (legacy/ folder) is maintenance mode only
- All new features go in Rita Go (packages/client/) and packages/api-server/
- Rita Go components must follow fe-enterprise-agent standards
- No commits until all tests pass

### Environment Variables
Check `.env.example` files in each package for required configuration.

### Command Shortcuts
- `npm run dev` - Start development server
- `npm test` - Run test suite
- `npm run build` - Build for production
- `docker compose up -d` - Start full stack

### Style & Reminders
- Prefer TypeScript strict mode for all new code
- Follow enterprise security and accessibility standards
- Use the fe-enterprise-agent for all frontend development
- Document components with proper JSDoc comments