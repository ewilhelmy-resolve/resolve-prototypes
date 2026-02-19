# Testing

## Running Tests

```bash
# Client unit tests (single run)
pnpm test

# Client watch mode
pnpm --filter rita-client test:unit

# Client with browser UI
pnpm --filter rita-client test:unit:ui

# API server tests
pnpm --filter rita-api-server test:run

# API server watch mode
pnpm --filter rita-api-server test

# API server with coverage
pnpm --filter rita-api-server test:coverage

# Type checking (all packages)
pnpm type-check
```

## Test Framework

- **Vitest** for both client and api-server
- **@testing-library/react** for component tests
- **jsdom** environment for client tests
- **Node** environment for api-server tests

## Test Conventions

### File Location

- Client: tests alongside source files (`ChatInput.test.tsx` next to `ChatInput.tsx`)
- API Server: `src/**/*.test.ts` or `src/**/__tests__/**/*.ts`

### Naming

- Test files: `<source-file>.test.ts(x)`
- Describe blocks: component/function name
- Test names: describe behavior, not implementation

```typescript
describe("ChatInput", () => {
  it("sends message on Enter key press", () => { ... });
  it("disables send button when input is empty", () => { ... });
});
```

### Patterns

**Client components** — render, interact, assert:

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatInput } from "./ChatInput";

it("calls onSend with input value", () => {
  const onSend = vi.fn();
  render(<ChatInput onSend={onSend} />);

  fireEvent.change(screen.getByRole("textbox"), { target: { value: "hello" } });
  fireEvent.click(screen.getByRole("button", { name: /send/i }));

  expect(onSend).toHaveBeenCalledWith("hello");
});
```

**API Server services** — mock dependencies, test logic:

```typescript
import { describe, it, expect, vi } from "vitest";

describe("ConversationService", () => {
  it("creates conversation with correct source", async () => {
    const mockRepo = { create: vi.fn().mockResolvedValue({ id: "123" }) };
    const service = new ConversationService(mockRepo);

    const result = await service.create({ userId: "u1", source: "rita-chat" });
    expect(result.id).toBe("123");
  });
});
```

## Coverage

### Client
- Coverage thresholds enforced: **60%** (statements, branches, functions, lines)
- Provider: v8
- No dedicated coverage script — run with `--coverage` flag: `pnpm --filter rita-client test:unit:run -- --coverage`

### API Server
- Coverage provider: v8
- Run: `pnpm --filter rita-api-server test:coverage`
- Excludes: node_modules, dist, test files

## Setup Files

- **Client**: `packages/client/src/test/setup.ts` — global test setup (jsdom, testing-library matchers)
- **API Server**: `packages/api-server/vitest.config.ts` — globals enabled, node environment

## Storybook

Not a test framework per se, but used for visual component documentation:

```bash
pnpm storybook        # Dev mode at http://localhost:6006
pnpm build-storybook  # Static build
pnpm deploy-storybook # Deploy to GitHub Pages
```

Story files: `*.stories.tsx` alongside components.

## CI Testing

GitHub Actions (`test.yml`) runs on every push/PR to main:
1. `pnpm --filter rita-api-server type-check` — API server TypeScript check
2. `pnpm --filter rita-client type-check` — Client TypeScript check (with `NODE_OPTIONS=--max-old-space-size=4096`)
3. `pnpm -r run lint` — Biome lint all packages
4. `pnpm --filter rita-api-server docs:generate` + `git diff --exit-code` — OpenAPI spec drift check
5. `pnpm --filter rita-api-server test:run` — API server unit tests
6. `pnpm --filter rita-client test:unit` — Client unit tests
