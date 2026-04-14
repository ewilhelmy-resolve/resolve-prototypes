# Iframe Entry Points Plan

## Current entry points

1. **Rita Go chat** — `/chat` — full app with Keycloak auth, sidebar, settings
2. **Iframe chat** — `/iframe/chat?sessionKey=xxx` — embedded in Actions Platform via iframe, Valkey session auth

## New entry points needed

### 1. Agent Test Page — `/agents/:id/test`

**Purpose:** Open an agent and bootstrap a test conversation. A programmer will later add code to seed the conversation with agent-specific context.

**Scope for now:**
- Route already exists as `AgentTestPage` (RoleProtectedRoute, owner/admin)
- Verify it works for testing agent conversations
- Ensure it accepts agent ID and loads the right context
- Later: additional bootstrap code to pre-seed conversation

### 2. Shareable Conversation Page — `/jarvis/:conversationId`

**Purpose:** Share a conversation from Actions Platform. Read-only for now (writing comes later).

**Two access modes:**

#### Public (Phase 1 — implement first)
- Anyone with the link can view
- No auth needed
- New route: `/jarvis/:conversationId`
- Read-only view: message history including reasoning steps, no input field
- New API: `GET /api/share/:conversationId` returns messages (no auth middleware)

#### Private (Phase 2)
- Only invited users who exist in Actions Platform can view
- User might NOT exist in Rita — they exist in Actions Platform (shared Keycloak)
- **Approach: signed share link**
  - Actions Platform generates: `/jarvis/:conversationId?token=signed-jwt`
  - JWT contains: `conversationId`, `tenantId`, `expiresAt`, `permissions: ["read"]`
  - Rita validates JWT signature (shared secret with Actions Platform)
  - No need for user to exist in Rita — just a valid token proves they were invited
  - Token can be revoked by Actions Platform by changing the conversation's share status
- **Alternative: Keycloak session check**
  - If user has valid Keycloak session in same realm → allow
  - Simpler for users already logged into Actions Platform
  - Requires Keycloak to be accessible from wherever the share page is served

### 3. Data Attribute Passing (deferred)

Enhancement to all iframe entry points — allow `data-*` attributes forwarded to webhooks. Implement after entry points work.

## Architecture: Shareable Conversation Page

```
Actions Platform user clicks "Share" on a conversation
         ↓
Platform generates link: https://rita.example.com/jarvis/{conversationId}
         ↓ (public)
Rita loads JarvisSharePage
         ↓
GET /api/share/{conversationId} (no auth)
         ↓
Returns conversation messages + metadata
         ↓
Renders read-only message thread (reuses existing chat message components)
```

### API: `GET /api/share/:conversationId`

```typescript
// No auth middleware — public access
router.get("/:conversationId", async (req, res) => {
  const { conversationId } = req.params;
  const token = req.query.token as string | undefined;

  // Phase 1: public — just fetch messages
  // Phase 2: if token present, validate JWT for private shares

  const messages = await pool.query(
    "SELECT id, role, message, metadata, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC",
    [conversationId]
  );

  // Get conversation title
  const conversation = await pool.query(
    "SELECT title, created_at FROM conversations WHERE id = $1",
    [conversationId]
  );

  if (!conversation.rows[0]) return res.status(404).json({ error: "Not found" });

  res.json({
    conversation: conversation.rows[0],
    messages: messages.rows,
  });
});
```

### Frontend: `JarvisSharePage.tsx`

```
/jarvis/:conversationId → JarvisSharePage
  ├── Fetch messages from /api/share/:conversationId
  ├── Render read-only message thread
  │   ├── User messages (right-aligned)
  │   ├── Assistant messages (left-aligned)
  │   ├── Reasoning accordions (collapsed by default)
  │   └── Completion cards (if present)
  ├── No input field (read-only)
  ├── Header: conversation title + "Shared conversation"
  └── Footer: "Powered by Rita" or branding
```

Reuses existing components:
- `Message` / `MessageContent` from ai-elements
- `Reasoning` / `ReasoningContent` for thinking steps
- `CompletionCard` if `metadata.completion` present
- `Response` for markdown rendering

### Private sharing — JWT token validation

```typescript
// Phase 2: validate token for private shares
function validateShareToken(token: string): { conversationId: string; tenantId: string; permissions: string[] } {
  const decoded = jwt.verify(token, process.env.SHARE_TOKEN_SECRET);
  return decoded as ShareTokenPayload;
}

// In route handler:
if (token) {
  const payload = validateShareToken(token);
  if (payload.conversationId !== conversationId) {
    return res.status(403).json({ error: "Token does not match conversation" });
  }
  // Token valid — user is authorized for this conversation
}
```

The invited user doesn't need a Rita account. The token proves Actions Platform authorized them.

## Implementation order

1. **`GET /api/share/:conversationId`** — public API endpoint (no auth)
2. **`JarvisSharePage.tsx`** — read-only conversation viewer
3. **Route in `router.tsx`** — `/jarvis/:conversationId` (public, no ProtectedRoute)
4. **Verify `/agents/:id/test`** — existing page works for agent testing
5. **Private token validation** — Phase 2
6. **Data attributes** — Phase 3

## Files to create/modify

| File | Action |
|------|--------|
| `packages/client/src/pages/JarvisSharePage.tsx` | Create — read-only conversation viewer |
| `packages/client/src/router.tsx` | Modify — add `/jarvis/:conversationId` |
| `packages/api-server/src/routes/share.routes.ts` | Create — public conversation API |
| `packages/api-server/src/index.ts` | Modify — mount share routes |

## Open questions

- Should `/jarvis` be the route, or `/share`?
- Should read-only view show reasoning accordions or just final text?
- Rate limiting on public endpoint?
- Should we add a "share" flag on conversations table to control which ones are shareable?
