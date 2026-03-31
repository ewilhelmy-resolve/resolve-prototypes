# Spec Engine

CLI tool that extracts metadata from the Rita codebase and generates a living specification site.

## Commands

```bash
pnpm spec:build       # Full pipeline: extract → generate all artifacts
pnpm spec:extract     # Extract only → lexicon.json
pnpm spec:generate    # Generate from existing lexicon.json
pnpm spec:check all   # Validate links, frontmatter, vocabulary
pnpm docs:dev         # Preview Docusaurus site (port 3000 or 4000)
```

## Architecture

```
Source code → 10 extractors → lexicon.json → 6 generators → docs/discover/
```

### Extractors (`src/extractors/`)

Each extractor follows this pattern:
```typescript
export interface FooData { items: Item[] }
export async function extractFoo(rootDir: string): Promise<FooData> {
  const files = await glob("packages/*/src/**/*.ts", { cwd: rootDir });
  // parse files, return structured data
}
```

| Extractor | What it extracts |
|-----------|-----------------|
| `ts-extractor` | Actors, views, constraints, journeys from file classification + JSDoc |
| `test-extractor` | Journeys from describe/it blocks with assertions |
| `schema-extractor` | Constraints from Zod schemas with field rules |
| `route-schema-extractor` | API endpoints with request/response schemas + auth |
| `sse-extractor` | SSE event types + emission sites |
| `hook-extractor` | React hooks with API calls + cache keys |
| `dependency-extractor` | Service-to-service import edges |
| `rabbitmq-extractor` | Queue definitions + message types |
| `story-extractor` | Storybook paths for views |
| `component-extractor` | React component props |

### Generators (`src/generators/`)

Read `lexicon.json`, write markdown to `docs/discover/`.

| Generator | Output |
|-----------|--------|
| `avcj-docs` | Individual actor/view/journey/constraint markdown files |
| `glossary` | A-Z term index |
| `matrix` | Traceability matrix (journeys × actors/views) |
| `dashboard` | Coverage stats |
| `inventory` | Full codebase listing by category |
| `api-reference` | REST endpoints, SSE events, hooks, deps, RabbitMQ |

### Adding a New Extractor

1. Create `src/extractors/foo-extractor.ts` with `FooData` interface and `extractFoo()` function
2. Import and call in `src/commands/extract.ts`
3. Add `FooData` parameter to `mergeLexicon()` in `src/utils/merge-lexicon.ts`
4. Add type to `src/types/lexicon.ts` if adding new top-level data
5. Update generator if the data should appear in docs

## Key Files

| File | Purpose |
|------|---------|
| `src/cli.ts` | Commander CLI entry point |
| `src/commands/extract.ts` | Orchestrates all extractors |
| `src/commands/generate.ts` | Orchestrates all generators |
| `src/utils/merge-lexicon.ts` | Combines extractor outputs into lexicon |
| `src/types/avcj.ts` | Zod schemas for Actor, View, Journey, Constraint |
| `src/types/lexicon.ts` | Zod schema for the full lexicon structure |
| `data/terms.json` | Controlled vocabulary seed |
