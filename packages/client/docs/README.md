# Rita Go (Client) Documentation

This directory contains documentation specific to the Rita Go frontend application (`packages/client/`).

## Structure

Package-specific docs live here. For project-wide documentation, see [`docs/`](../../../docs/):
- `architecture/` - Infrastructure & integrations
- `core/` - System fundamentals
- `features/` - Feature implementations
- `frontend/` - Client/UI docs
- `setup/` - Environment & config
- `archived/` - Shipped implementation plans

## Overview

Rita Go is the enterprise frontend for Rita, built with:
- **React 18+** with **TypeScript 5+** (strict mode)
- **TanStack Query v5** for server state management
- **Zustand** for lightweight client state
- **React Router v6** for navigation
- **Radix UI** for accessible component primitives
- **Tailwind CSS** for utility-first styling
- **shadcn/ui** for component library foundation
- **Keycloak** for SSO authentication

## Quick Links

### Core Documentation
- [Main Project Docs](../../../docs/) - Root-level documentation
- [Frontend Stack Guide](../../../docs/frontend/guide_frontend_stack.md) - Technology overview
- [Figma to React Workflow](../../../docs/frontend/figma_to_react_workflow.md) - Design-to-code process
- [Figma to Code Process](../../../docs/frontend/figma-to-code-process.md) - shadcn/ui integration

### Rita Go Specific
- `src/components/` - React components (UI, layouts, feature components)
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utilities and helpers
- `src/pages/` - Top-level page components
- `src/types/` - TypeScript type definitions

## Development

### Running Locally
```bash
cd packages/client
npm install
npm run dev
```

### Environment Variables
See `.env.example` for required configuration:
- `VITE_API_BASE_URL` - API server URL
- `VITE_KEYCLOAK_URL` - Keycloak server URL
- `VITE_KEYCLOAK_REALM` - Keycloak realm name
- `VITE_KEYCLOAK_CLIENT_ID` - Keycloak client ID

### Testing
```bash
npm run test              # Run all tests
npm run test:unit         # Unit tests
npm run type-check        # TypeScript type checking
npm run lint              # ESLint
```

### Building
```bash
npm run build             # Production build
npm run preview           # Preview production build locally
```

## Key Concepts

### Component-Based Architecture (CBA)
Rita Go follows strict CBA principles:
- **Modular Components**: Single responsibility, reusable
- **Composition**: Build complex UIs from simple components
- **Accessibility**: WCAG 2.1 AA compliance
- **Type Safety**: Full TypeScript coverage

### Platform-Driven Architecture
- **Thin Frontend**: Minimal business logic in client
- **Backend-Heavy**: API server handles validation, authorization, business rules
- **Real-Time Updates**: Server-Sent Events (SSE) for live data
- **Optimistic UI**: Immediate feedback with background sync

### Server-Sent Events (SSE)
Real-time communication pattern:
```typescript
// SSE connection managed by hooks
const { messages } = useConversation(conversationId)
// Automatically updates when server sends new messages
```

### State Management Strategy
- **Server State**: TanStack Query (caching, refetching, optimistic updates)
- **Client State**: Zustand (UI state, local preferences)
- **Form State**: React Hook Form with Zod validation
- **Route State**: React Router location state

### Authentication Flow
1. User navigates to protected route
2. `ProtectedRoute` wrapper checks Keycloak auth
3. Redirect to Keycloak login if unauthenticated
4. Return with token, store in Keycloak context
5. API requests include token in Authorization header

## Internationalization (i18n)

Rita Go uses `react-i18next` for internationalization with namespace-based organization.

### Namespace Organization

Translation files are located in `src/i18n/locales/en/`:

| Namespace | Purpose |
|-----------|---------|
| `auth` | Authentication pages (login, signup, invite, verify email) |
| `chat` | Chat interface and messages |
| `common` | Shared UI elements (buttons, labels) |
| `connections` | Data source connections |
| `dialogs` | Modal dialogs (invite users, welcome) |
| `errors` | Error messages |
| `files` | File upload/management |
| `settings` | Settings pages |
| `tickets` | Ticket-related UI |
| `toast` | Toast notifications |
| `validation` | Form validation messages |

### Usage Patterns

**Basic translation:**
```tsx
const { t } = useTranslation("auth");
return <h1>{t("invite.title")}</h1>;
```

**With interpolation:**
```tsx
t("validation.passwordMinLength", { count: 8 })
// "Password must be at least 8 characters"
```

**Zod validation with i18n (pattern for translated validation messages):**
```tsx
// Create validation messages outside schema
const validationMessages = useMemo(() => ({
  passwordMinLength: t("validation.passwordMinLength", { count: MIN_PASSWORD_LENGTH }),
  passwordComplexity: t("validation.passwordComplexity"),
}), [t]);

// Use in schema
const schema = useMemo(() => z.object({
  password: z.string().min(MIN_PASSWORD_LENGTH, validationMessages.passwordMinLength),
}), [validationMessages]);
```

### Testing

Tests mock `react-i18next` to return keys without namespace prefix:
```tsx
// In component: t("invite.verifying")
// Renders as: "invite.verifying" (not "auth.invite.verifying")

// Test assertion:
expect(screen.getByText("invite.verifying")).toBeInTheDocument();
```

## Feature Flags

Rita Go uses a multi-scope feature flag system for controlling features:
- **Local**: Development flags (localStorage)
- **Tenant**: Organization-level flags (future: API-based)
- **User**: User-level flags (future: API-based)

See `src/types/featureFlags.ts` and `src/hooks/useFeatureFlags.ts`.

Access DevTools at `/devtools` to toggle local flags.

## UI Component Strategy

### shadcn/ui + Figma-to-shadcn
Rita Go uses shadcn/ui as the component foundation:

```bash
# Install components from shadcn registry
npx shadcn@latest add button card dialog

# Install v0.app components
npx shadcn@latest add "https://v0.app/chat/b/[component-id]"
```

**Important**: shadcn uses "generate and copy" approach - components are copied into your source tree, not installed as npm dependencies.

See [Figma to Code Process](../../../docs/frontend/figma-to-code-process.md) for details.

## SOC2 Type II Compliance

Rita Go is built for SOC2 certification:
- **Security**: Keycloak SSO, token-based auth, secure HTTP-only cookies
- **Availability**: Error boundaries, graceful degradation, loading states
- **Processing Integrity**: Form validation, optimistic UI with rollback
- **Confidentiality**: No sensitive data in localStorage, secure token handling
- **Privacy**: GDPR-compliant data handling, user consent flows

## Contributing

When adding new features:
1. Create documentation in `docs/features/<feature-name>/`
2. Follow CBA and accessibility standards
3. Use TypeScript strict mode
4. Add unit tests for complex logic
5. Test accessibility with screen readers
6. Update this README if needed

### Enterprise Standards
All Rita Go development must follow **fe-enterprise-agent** standards (see [CLAUDE.md](../../../CLAUDE.md)):
- SOC2 Type II compliance
- WCAG 2.1 AA accessibility
- Component-Based Architecture
- Platform-Driven Architecture
- Real-time SSE communication

For documentation standards, see [Main Docs README](../../../docs/README.md).
