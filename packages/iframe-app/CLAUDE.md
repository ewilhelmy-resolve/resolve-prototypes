# Iframe App

Vite host for the embeddable chat iframe. Minimal shell — the actual iframe chat UI lives in `packages/client/src/pages/IframeChatPage.tsx`.

## Commands

```bash
pnpm --filter @rita/iframe-app dev    # Dev server (port 5174)
pnpm --filter @rita/iframe-app build  # Production build
```

## Key Facts

- Host-delegated authentication — user authenticates via shared Keycloak on the host (Actions Platform), not via Rita's login page
- Session identity comes from Valkey (`rita:session:{guid}`) written by the host app
- Requires: shared Keycloak instance, same domain (cookie sharing), Valkey accessible to both host and Rita
- Routes: `/iframe/chat`, `/iframe/chat/:conversationId`
- Dev tools behind `ENABLE_IFRAME_DEV_TOOLS` feature flag (wrench menu)

## How the Iframe is Consumed

The host page (Actions Platform / Jarvis) embeds Rita like this:

```html
<iframe
  src="https://your-domain.com/iframe/chat?sessionKey={valkey-guid}"
  style="width: 100%; height: 600px; border: none;"
></iframe>
```

PostMessage API for host ↔ iframe communication:
- Host → Iframe: `SEND_MESSAGE`, `GET_STATUS`, `CLEAR_CHAT`
- Iframe → Host: `READY`, `ACK`, `STATUS`

## Authentication Flow

1. User logs into host portal via shared Keycloak
2. Host writes session data to Valkey (`HSET rita:session:{guid} data '{...}'`)
3. Host embeds iframe with `?sessionKey={guid}` URL param
4. Rita reads Valkey via `HGET rita:session:{guid} data`
5. Valkey payload contains: tenantId, userGuid, tokens, context, uiConfig, webhook credentials
6. Rita creates internal session using Valkey IDs for SSE routing
7. Rita re-reads Valkey before every webhook to pick up mid-session updates (`refreshSessionFromValkey`)

The `sessionKey` IS the authentication — it proves the user was authenticated on the host and provides their identity. No separate Rita login is needed.

See `packages/client/IFRAME.md` for full integration guide.
