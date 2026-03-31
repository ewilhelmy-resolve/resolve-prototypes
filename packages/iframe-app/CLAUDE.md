# Iframe App

Vite host for the embeddable chat iframe. Minimal shell — the actual iframe chat UI lives in `packages/client/src/pages/IframeChatPage.tsx`.

## Commands

```bash
pnpm --filter @rita/iframe-app dev    # Dev server (port 5174)
pnpm --filter @rita/iframe-app build  # Production build
```

## Key Facts

- Public guest access — no Keycloak authentication
- Session identity comes from Valkey (`rita:session:{guid}`)
- Iframe is embedded in host pages (Jarvis/Platform) via `<iframe>`
- Routes: `/iframe/chat`, `/iframe/chat/:conversationId`
- Dev tools behind `ENABLE_IFRAME_DEV_TOOLS` feature flag (wrench menu)
- All iframe users share `public-guest-user` account internally

## Valkey Session Flow

1. Host page writes session data to Valkey (`rita:session:{guid}`)
2. Iframe opens with `?sessionKey={guid}` URL param
3. Rita reads Valkey via `HGET rita:session:{guid} data`
4. Session contains: tenantId, userGuid, tokens, context, uiConfig
5. Rita re-reads Valkey before every webhook (`refreshSessionFromValkey`)

See `packages/client/IFRAME.md` for integration guide.
