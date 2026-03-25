# Figma to ShadCN - Troubleshooting

## Figma MCP Not Working

- Figma desktop app must be running (MCP connects via desktop, not web)
- File must be accessible (you need view/edit access)
- Check MCP config: `cat ~/.config/claude/mcp_settings.json`

## Missing node-id

Select a frame in Figma -> Right-click -> "Copy link to selection" (not "Copy link to file").
URL must contain `?node-id=X-Y`.

## Missing ShadCN Components

Check installed: `ls packages/client/src/components/ui/`

Install missing:
```bash
cd packages/client && pnpm dlx shadcn@latest add button card select dialog table
```

Not in ShadCN (build from primitives): `data-table`, `command-palette`, `date-picker`, `color-picker`

## Missing NPM Dependencies

```bash
cd packages/client
pnpm add lucide-react react-hook-form @hookform/resolvers zod
```

## TypeScript Errors

Run `pnpm type-check` after generation. Common fixes:
- Ensure interfaces match prop usage
- Use `import type` for type-only imports

## Design Tokens Not Applied

If generated code has hardcoded colors (`bg-blue-500`, `bg-red-500`):
1. Check that `mcp__figma__get_variable_defs` was called
2. Map all colors to tokens per [./design-reference.md]

## Debug Workflow

1. Verify Figma desktop app running
2. Validate URL has `node-id`
3. Test MCP: "Get design context for node X:Y in file ABC"
4. Simplify: "Generate just the header, no splitting"
5. Check all imports resolve to existing files
6. Run `pnpm type-check`
