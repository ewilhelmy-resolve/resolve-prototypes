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
| `readOnly` | `boolean` | Hides copy buttons, actions, timestamps |
| `conversationId` | `string` | For future schema renderer support |
| `onCopy` | `(text, id) => void` | Copy handler (omit in readOnly mode) |

Renders: `Message`, `Reasoning`, `Response`, `CompletionCard`, `Citations`, `Task`.

Does NOT render: `SchemaRenderer`, `ResponseWithInlineCitations`, `InlineFormRequest` — those are interactive-only features that stay in ChatV1Content.

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
| **Share** | `/jarvis/:conversationId` | None (public) | `JarvisSharePage` → `ChatV2MessageRenderer` | Read-only, static fetch, no SSE |

### Data Flow Per Entry Point

**Rita Go / Iframe (live):**
```
SSE new_message → conversationStore.addMessage() → groupMessages() → chatMessages → ChatV1Content
```

**Share (static):**
```
fetch /api/share/:id → groupMessages() locally → ChatV2MessageRenderer (readOnly)
```

## Adding a New Entry Point

1. Decide if it's **live** (needs SSE/store) or **static** (fetch once)
2. Live → use `ChatV2Content` (connects to store automatically)
3. Static → fetch messages, call `groupMessages()`, pass to `ChatV2MessageRenderer` with `readOnly`
4. Add route in `router.tsx` — use `ProtectedRoute` only if auth required

## Migration Plan (ChatV1 → ChatV2)

ChatV1Content still handles all interactive features (schema renderer, form requests, inline citations, file upload). After those are ported:

1. Switch `/chat` and `/iframe/chat` to `ChatV2Content`
2. Run baseline tests from `tests/e2e/baseline/`
3. Delete `ChatV1Content.tsx`, rename `chat-v2/` to `chat/`

## Anti-patterns (from accordion bug)

- No deep wrapper chains for interactive state
- No `useControllableState` from third-party libs for simple toggles
- Keep state at DOM leaf, not 3 layers up
- Pure components take data as props, never from hooks/contexts
