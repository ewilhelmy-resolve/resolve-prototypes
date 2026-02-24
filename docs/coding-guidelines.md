# Coding Guidelines

## Code Style

- **Formatter/Linter**: Biome (not ESLint/Prettier)
- **Indentation**: Tabs (configured in `biome.json`)
- **Quotes**: Double quotes (not explicitly configured)
- **Semicolons**: Default (not explicitly configured)
- **Line length**: 120 chars (Biome default, not overridden)
- **Config**: Root `biome.json` applies to all packages

### Auto-fix

```bash
# Fix lint + format in one pass
pnpm --filter <package> check:fix

# Or separately
pnpm --filter <package> lint:fix
pnpm --filter <package> format:fix
```

### Pre-commit Hook

Husky runs automatically on `git commit`:
1. `npx lint-staged` — runs `biome check --write` + `biome lint` on staged files
2. `npm run type-check` — TypeScript check all packages
3. If api-server files staged: `pnpm --filter rita-api-server docs:generate` + auto-stage `openapi.json`

## Error Handling

### API Server
- Express error middleware catches all thrown errors
- Zod schemas validate request bodies at route level
- Pino structured logging (`LOG_LEVEL` env var)
- Rollbar for production error tracking

### Client
- TanStack Query handles API error states
- Zod validates API response shapes
- React Error Boundaries for component-level failures
- Toast notifications for user-facing errors (shadcn/ui)

## Naming Conventions

### Files

| Type | Pattern | Example |
|------|---------|---------|
| React component | PascalCase | `ChatInput.tsx` |
| React page | PascalCase | `SettingsPage.tsx` |
| Hook | camelCase, `use` prefix | `useConversation.ts` |
| Store (Zustand) | camelCase | `chatStore.ts` |
| Service | camelCase | `apiService.ts` |
| Schema (Zod) | camelCase | `conversationSchema.ts` |
| Test | same as source + `.test` | `ChatInput.test.tsx` |
| Story | same as source + `.stories` | `ChatInput.stories.tsx` |
| Translation | language code | `en.json`, `es-MX.json` |
| DB migration | numbered | `001_create_users.ts` |

### Code

- **Components**: PascalCase (`ChatInput`, `SettingsPage`)
- **Hooks**: camelCase with `use` prefix (`useConversation`, `useSSE`)
- **Stores**: camelCase with `Store` suffix (`useChatStore`)
- **API routes**: kebab-case (`/api/data-sources`, `/api/conversations`)
- **DB columns**: snake_case (`created_at`, `user_id`)
- **TypeScript types**: PascalCase (`Conversation`, `MessageType`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`, `SSE_RETRY_INTERVAL`)

## TypeScript

- **Strict mode** enabled in all packages (except mock-service)
- **Target**: ES2020
- **Module**: ESNext with Node resolution
- **No `any`**: use `unknown` + type guards
- **Interfaces** for component props
- **Zod inference** for validated types (`z.infer<typeof schema>`)

## Imports

- Biome manages import ordering automatically
- Path aliases: `@/` maps to `src/` in client package
- Avoid circular imports between services

## Documentation

- JSDoc for exported functions in `packages/api-server/`
- Inline comments only when logic isn't self-evident
- Storybook stories for all reusable client components
- OpenAPI spec auto-generated from Zod schemas (api-server)

## Accessibility

- All form inputs must have ARIA labels
- All interactive elements must be keyboard navigable
- Use Radix UI primitives for accessible behavior
- Test with screen reader before shipping
- Follow WCAG 2.1 AA guidelines

## i18n

- All user-facing strings through `i18next`
- Locales: `en` (default, 13 files), `es-MX` (partial — 2 of 13 files translated)
- Translation files: `packages/client/src/i18n/`
- Use `useTranslation()` hook in components
