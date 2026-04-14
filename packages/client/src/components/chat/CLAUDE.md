# Chat V2 — Pure Message Rendering Layer

Extracted from `ChatV1Content` to enable message rendering across multiple entry points without coupling to SSE, auth, or stores.

## Architecture

```
ChatV2MessageRenderer  (pure — props only, no hooks/stores)
  └── Used by:
      ├── ChatV2Content       (orchestrator — connects to Zustand store)
      └── JarvisSharePage     (read-only — fetches from /api/share, groups locally)
```

### ChatV2MessageRenderer

**Pure component.** Takes `chatMessages: ChatMessage[]` and renders the full message thread. Zero side effects.

| Prop | Type | Purpose |
|------|------|---------|
| `chatMessages` | `ChatMessage[]` | Pre-grouped messages (from `groupMessages()`) |
| `isStreaming` | `boolean` | Shows spinner on last assistant message |
| `readOnly` | `boolean` | Hides copy buttons, actions, timestamps, interactive features |
| `onCopy` | `(text, id) => void` | Copy handler (omit in readOnly mode) |
| `conversationId` | `string \| null` | Required for SchemaRenderer / form actions |
| `interactive` | `ChatV2InteractiveCallbacks` | Callbacks for schema actions, form submit/cancel, postMessage |

Renders: `Message`, `Reasoning`, `Response`, `CompletionCard`, `Citations`, `Task`.

When `interactive` is provided (non-readOnly mode), also renders:
- `SchemaRenderer` — dynamic UI from platform JSON schema
- `ResponseWithInlineCitations` — markdown with inline citation markers
- `InlineFormRequest` — non-interrupt form requests inline in chat
- `InterruptFormDialog` — interrupt form requests with 3-tier modal fallback

When `interactive` is undefined (readOnly / share page), all interactive elements are suppressed.

### InterruptFormDialog

Extracted component for interrupt-mode form requests. Implements 3-tier fallback:
- **Tier 0**: Same-origin iframe — inject modal into host DOM
- **Tier 1**: Cross-origin iframe + embed script — postMessage with ACK
- **Tier 2**: Fallback — in-iframe Dialog with InlineFormRequest

### ChatV2Content

**Orchestrator.** Wraps `ChatV2MessageRenderer` with:
- `useConversationStore` for `chatMessages` and streaming state
- `navigator.clipboard.writeText` for copy
- `conversationId` from store or prop

### groupMessages() — `lib/messageGrouping.ts`

Pure utility extracted from `conversationStore.ts`. Converts flat `Message[]` to UI-ready `ChatMessage[]`:
- Groups by `response_group_id`
- Merges consecutive reasoning messages (content joined with `\n\n`)
- Standalone messages with metadata → `GroupedChatMessage`
- Plain text → `SimpleChatMessage`

Store re-exports both functions for backward compatibility.

## Chat Entry Points

Rita has multiple ways to render chat, each with different auth and capabilities:

| Entry Point | Route | Auth | Component | Features |
|-------------|-------|------|-----------|----------|
| **Rita Go** | `/chat` | Keycloak | `ChatV1Content` | Full: SSE, sidebar, file upload, schema renderer, form requests |
| **Iframe** | `/iframe/chat` | Valkey session | `ChatV1Content` | SSE, minimal UI, no sidebar, custom title/placeholder |
| **Share** | `/jarvis/:shareId` | None (public) | `JarvisSharePage` → `ChatV2MessageRenderer` | Read-only, static fetch from snapshot, no SSE |

### Data Flow Per Entry Point

**Rita Go / Iframe (live):**
```
SSE new_message → conversationStore.addMessage() → groupMessages() → chatMessages → ChatV1Content
```

**Share (snapshot):**
```
Enable:  POST /api/conversations/:id/share/enable (auth + ownership)
         → snapshot messages into shared_conversations (JSONB)
         → returns { shareUrl: "/jarvis/{shareId}", shareId }

Read:    GET /api/share/:shareId (no auth)
         → SELECT FROM shared_conversations WHERE share_id = $1
         → 404 if not found, else { conversation, messages }
         → groupMessages() locally → ChatV2MessageRenderer (readOnly)

Disable: POST /api/conversations/:id/share/disable (auth + ownership)
         → DELETE FROM shared_conversations WHERE conversation_id = $1
         → URL immediately 404s
```

Why snapshot (not live pointer):
- Revoke = DELETE row → instant, no flag to forget to check
- No access control on public read path (if row exists, it's public)
- New messages after share don't leak automatically (frozen at share time)
- Public reads never touch live `conversations` / `messages` tables
- Can be edge-cached / CDN-cached (frozen data)
- 404 for both "never shared" and "un-shared" — no existence leak

## Adding a New Entry Point

1. Decide if it's **live** (needs SSE/store) or **static** (fetch once)
2. Live → use `ChatV2Content` (connects to store automatically)
3. Static → fetch messages, call `groupMessages()`, pass to `ChatV2MessageRenderer` with `readOnly`
4. Add route in `router.tsx` — use `ProtectedRoute` only if auth required

## Migration Plan (ChatV1 → ChatV2)

ChatV1Content still handles all interactive features (schema renderer, form requests, inline citations, file upload). After those are ported:

1. Switch `/chat` and `/iframe/chat` to `ChatV2Content`
2. Run baseline tests from `tests/e2e/baseline/`
3. Delete `ChatV1Content.tsx`, rename `chat/` to `chat/`

## Anti-patterns (from accordion bug)

- No deep wrapper chains for interactive state
- No `useControllableState` from third-party libs for simple toggles
- Keep state at DOM leaf, not 3 layers up
- Pure components take data as props, never from hooks/contexts
