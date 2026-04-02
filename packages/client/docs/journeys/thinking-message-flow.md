---
type: journey
id: thinking-message-flow
name: "Thinking Message Flow"
actors: ["actions-platform", "rabbitmq-service", "sse-service", "conversation-store", "reasoning"]
views: ["reasoning", "reasoning-steps", "reasoning-trigger", "reasoning-content"]
constraints: ["turn-complete-protocol"]
tags: ["iframe", "jarvis", "workflow"]
---

# Thinking Message Flow

How a workflow progress step travels from Actions Platform to the "Thinking..." accordion in the UI.

## End-to-End Flow

```
Actions Platform → Webhook → Rita API → RabbitMQ → SSE → Store → Reasoning UI
```

## Steps

1. **actions-platform** — Workflow step completes on Actions Platform
   > Platform runs a workflow (e.g., "Requirements Analyst is working..."). Each step produces a status update.

2. **actions-platform** — Platform sends webhook to Rita (`POST /api/Webhooks/postEvent/{tenantId}`)
   > Payload includes the RabbitMQ routing fields: `message_id`, `conversation_id`, `tenant_id`, and a `response` field containing the reasoning text.

3. **rabbitmq-service** — Rita API receives webhook, publishes to `chat.responses` queue
   > `packages/api-server/src/services/rabbitmq.ts` — the webhook handler parses the response and publishes to RabbitMQ.

4. **rabbitmq-service** — RabbitMQ consumer processes message, creates assistant message in DB
   > `packages/api-server/src/services/rabbitmq.ts:587` — creates a new message with `metadata.reasoning.content` set to the step text. Sets `turn_complete: false` to signal more messages are coming.

5. **sse-service** — Sends `new_message` SSE event to the user's iframe connection
   > `packages/api-server/src/services/rabbitmq.ts:599` — calls `getSSEService().sendToUser()` with the message data. SSE event type: `new_message`.

6. **conversation-store** — Frontend SSE handler receives event, adds message to store
   > `packages/client/src/contexts/SSEContext.tsx:94` — `handleMessage()` creates a `Message` object with `metadata.reasoning` and calls `addMessage()`.

7. **conversation-store** — Store merges consecutive reasoning messages into one part
   > `packages/client/src/stores/conversationStore.ts:126` — `mergeConsecutiveReasoning()` combines multiple reasoning-only messages into a single part with newline-separated content.

8. **reasoning** — Reasoning accordion renders with structured steps
   > `packages/client/src/components/ai-elements/reasoning.tsx` — the `<Reasoning>` component renders a collapsible accordion. While streaming, shows animated clock icon and "Thinking..." title.

9. **reasoning-steps** — Each line parsed into a visual step with icon and status
   > `packages/client/src/components/ai-elements/reasoning-steps.tsx` — parses newline-separated content. Classifies each line by keywords (agent → Bot icon, verify → Search icon, code → Code icon). Active step shows spinner. Duplicates collapsed with ×N badge. UUIDs hidden.

10. **actions-platform** — Final message arrives with `turn_complete: true`
    > Last SSE event has `message` text (the actual response) and `metadata.turn_complete: true`. No `reasoning` field on the final message.

11. **reasoning** — Accordion auto-closes, shows "Thought for N seconds"
    > 1 second after streaming ends, the accordion collapses. Trigger text changes from "Thinking..." to "Thought for N seconds". Response text renders below.

## SSE Event Format

Each reasoning step is a separate SSE event:

```json
{
  "type": "new_message",
  "data": {
    "messageId": "uuid",
    "conversationId": "uuid",
    "role": "assistant",
    "message": "",
    "metadata": {
      "reasoning": {
        "content": "Requirements Analyst is working...",
        "title": "Thinking..."
      },
      "turn_complete": false
    }
  }
}
```

Final message (no reasoning, has response text):

```json
{
  "type": "new_message",
  "data": {
    "messageId": "uuid",
    "conversationId": "uuid",
    "role": "assistant",
    "message": "Activity 'MultiplyTwoNumbers' created with ID 3261.",
    "metadata": {
      "turn_complete": true
    }
  }
}
```

## Step Text → Icon Mapping

| Keywords in step text | Icon | Example |
|----------------------|------|---------|
| "is working", "analyst", "developer" | Bot | "Requirements Analyst is working..." |
| "verifying", "checking", "searching" | Search | "Verifying if activity exists" |
| "generate", "code", "build" | Code | "Using generate_python_code..." |
| "starting", "running", "trigger" | Zap | "Starting agent" |
| "polling", "execution status" | Workflow | "Polling for status updates" |

## Data Transformations (Verified)

| Stage | What happens | Field |
|-------|-------------|-------|
| Platform → Queue | Each step is a separate message | `metadata.reasoning.content` = single step text |
| Queue → DB | One DB row per queue message | `metadata` stored as JSONB unchanged |
| DB → SSE | Passthrough — no transformation | `event.data.metadata` = DB metadata |
| SSE → Store | Passthrough — no transformation | `Message.metadata` = event metadata |
| Store merge | Consecutive reasoning `.content` joined with `\n\n` | `mergeConsecutiveReasoning()` |
| Render | Multi-line string split by `\n`, classified by keywords | `ReasoningSteps` component |

**Key insight:** `metadata` is opaque — flows unchanged from Platform through Queue → DB → SSE → Frontend. Only the store merge step transforms it (joining content strings).

## RTL / Internationalization

The reasoning steps UI supports RTL languages (Hebrew, Arabic):
- Layout uses `flex` with `gap` (direction-neutral)
- Margin uses `ms-` (margin-inline-start) not `ml-`
- Animations use direction-neutral `fade-in` (no `slide-from-left`)
- Text alignment follows document `dir` attribute

## Key Files

| Layer | File | What it does |
|-------|------|-------------|
| API webhook handler | `api-server/src/services/rabbitmq.ts` | Receives Platform webhook, publishes to RabbitMQ, sends SSE |
| SSE service | `api-server/src/services/sse.ts` | Routes events to user's iframe connection |
| SSE client handler | `client/src/contexts/SSEContext.tsx` | Receives SSE events, dispatches to store |
| Message store | `client/src/stores/conversationStore.ts` | Merges consecutive reasoning, groups messages |
| Reasoning accordion | `client/src/components/ai-elements/reasoning.tsx` | Collapsible panel with auto-close |
| Step renderer | `client/src/components/ai-elements/reasoning-steps.tsx` | Parses text, assigns icons, dedup, UUID hiding |
| Integration guide | `client/docs/THINKING_MESSAGES_GUIDE.md` | Full API contract for Platform developers |
