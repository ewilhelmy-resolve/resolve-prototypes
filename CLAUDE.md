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

### UI Component Strategy (Figma-to-shadcn)

Rita Go uses a **Figma-to-shadcn workflow** for implementing UX designs:

#### Installing Design System Components
When UX provides Figma-to-shadcn component URLs:

1. **Attempt shadcn CLI Installation**:
   ```bash
   cd packages/client
   npx shadcn add https://[figma-to-shadcn-url].json
   ```

2. **Manual Installation** (recommended for reliability):
   ```bash
   # Download and inspect component definition
   curl -s https://[figma-to-shadcn-url].json

   # Extract the component code from the JSON
   # Create src/components/[ComponentName].tsx with the code
   # Update router.tsx to use the new component
   ```

#### What Happened with RitaLayout
The current RitaLayout was installed following this process:

1. **URL Provided**: `https://rdhlrr8yducbb6dq.public.blob.vercel-storage.com/figma-to-shadcn/RitaLayout-nC4xjmqj08N0LSWPCC3rHEHG2azW4y.json`
2. **CLI Installation Issues**: The `npx shadcn add` command had path detection issues
3. **Manual Installation**: Downloaded the JSON, extracted the component code, created `src/components/RitaLayout.tsx`
4. **Router Integration**: Updated `/v1` routes to use `<RitaLayout />` with `<ProtectedRoute>`

#### Handling Future UX Updates

**For Component Updates**:
1. **New URL from UX**: Download the updated component JSON
2. **Compare Changes**: Use git diff to see what changed in the component code
3. **Update Component**: Replace the old component code with new version
4. **Test Integration**: Ensure routing and authentication still work
5. **Commit Changes**: Document what was updated from UX

**For New Components**:
1. Follow the same installation process
2. Create new component file in `src/components/`
3. Integrate with existing routing/authentication as needed

**Version Control Strategy**:
- Each UX update gets its own commit with clear message
- Document the source URL in component comments
- Keep track of component version/date for future reference

3. **Component Integration**:
   - Components are pre-built with proper responsive design
   - Include mobile-first breakpoints and accessibility features
   - Follow established layout patterns (sticky inputs, proper height constraints)
   - Integrate with existing authentication and routing systems

#### Layout Architecture
Current implementation uses:
- **RitaLayout**: Main application layout from Figma design
- **Responsive Design**: Mobile sheet navigation, desktop sidebars
- **Proper Height Management**: `min-h-screen` with flex layouts preventing scroll issues
- **Component-Based**: Modular sections (sidebar, main content, right panel)

#### Integration Example
```typescript
// Route integration with authentication
{
  path: '/v1',
  element: (
    <ProtectedRoute>
      <RitaLayout />
    </ProtectedRoute>
  )
}
```

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