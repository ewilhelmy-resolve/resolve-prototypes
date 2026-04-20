# Chat V2 — Pure Message Rendering Layer

Extracted from `ChatV1Content` to enable message rendering across multiple entry points without coupling to SSE, auth, or stores.

## Architecture

```
ChatV2MessageRenderer  (pure — props only, no hooks/stores)
  └── Used by:
      ├── ChatV2Content       (orchestrator — connects to Zustand store)
      └── JarvisSharePage     (shared conversation with participant support)
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

When `interactive` is undefined, interactive elements are suppressed. Note: the Jarvis share page may provide `interactive` callbacks for participant features.

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
| **Rita Go** | `/chat` | Keycloak | `ChatV1Page` → `ChatV2Content` | Full: SSE, sidebar, file upload, schema renderer, form requests |
| **Jarvis (iframe)** | `/iframe/chat` | Valkey session | `IframeChatPage` → `ChatV2Content` | SSE, minimal UI, no sidebar, custom title/placeholder |
| **Jarvis (share)** | `/jarvis/:shareId` | Participant or public | `JarvisSharePage` → `ChatV2MessageRenderer` | Shared conversation with participant support, SSE for live follow-ups |

### Data Flow Per Entry Point

**Rita Go / Jarvis iframe (live):**
```
SSE new_message → conversationStore.addMessage() → groupMessages() → chatMessages → ChatV2Content → ChatV2MessageRenderer
```

**Jarvis share (live with participants):**
```
Enable:  POST /api/conversations/:id/share/enable (auth + ownership)
         → creates shared_conversations entry + participant table
         → returns { shareUrl: "/jarvis/{shareId}", shareId }

Join:    GET /jarvis/:shareId (participant or public)
         → loads conversation + messages via participant API
         → SSE for real-time follow-up messages
         → ChatV2MessageRenderer with interactive callbacks

Disable: POST /api/conversations/:id/share/disable (auth + ownership)
         → hibernates share, URL returns 404
```

## Adding a New Entry Point

1. Decide if it's **live** (needs SSE/store) or **static** (fetch once)
2. Live → use `ChatV2Content` (connects to store automatically)
3. Static → fetch messages, call `groupMessages()`, pass to `ChatV2MessageRenderer` with `readOnly`
4. Add route in `router.tsx` — use `ProtectedRoute` only if auth required

## Migration Status (ChatV1 → ChatV2) — COMPLETE

Migration completed. ChatV1Content deleted, `chat-v2/` renamed to `chat/`.
All routes now use ChatV2Content with ChatV2MessageRenderer. Page-level
concerns (ChatInput, pagination, empty state) live in the page components.

## Anti-patterns (from accordion bug)

- No deep wrapper chains for interactive state
- No `useControllableState` from third-party libs for simple toggles
- Keep state at DOM leaf, not 3 layers up
- Pure components take data as props, never from hooks/contexts
