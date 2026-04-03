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
User sends message
     ↓
Rita API sends webhook TO Platform (POST /api/Webhooks/postEvent/{tenantId})
     ↓
Platform processes workflow (multiple steps)
     ↓
Platform publishes each step directly to RabbitMQ (chat.responses queue)
     ↓
Rita RabbitMQ consumer → DB → SSE → Frontend Store → Reasoning UI
```

Rita does NOT receive a webhook back. Platform writes directly to the shared RabbitMQ instance.

## Steps

1. **user** — Sends a message in the iframe chat
   > Message is created in DB, webhook sent to Platform via `WebhookService.sendTenantMessageEvent()`.

2. **rita-api** — Sends `workflow_trigger` webhook to Actions Platform
   > `POST {actionsApiBaseUrl}/api/Webhooks/postEvent/{tenantId}` with the full Valkey config (tokens, context, conversation_id, message_id, customer_message).

3. **actions-platform** — Receives webhook, starts workflow execution
   > Platform runs the workflow. Each step (agent working, verifying, generating code) produces a status update published directly to RabbitMQ.

4. **actions-platform** — Publishes each reasoning step to `chat.responses` RabbitMQ queue
   > Each step is a separate message with `metadata.reasoning.content` set to the step text and `turn_complete: false`. Platform writes directly to the shared RabbitMQ instance — no webhook back to Rita.

5. **rabbitmq-service** — Rita consumer picks up message, creates assistant message in DB
   > `packages/api-server/src/services/rabbitmq.ts` — one DB row per queue message, metadata stored as JSONB unchanged.

6. **sse-service** — Sends `new_message` SSE event to the user's iframe connection
   > `getSSEService().sendToUser()` routes the event by userId + organizationId from the session.

7. **conversation-store** — Frontend SSE handler receives event, adds message to store
   > `packages/client/src/contexts/SSEContext.tsx` — creates a `Message` object with `metadata.reasoning` and calls `addMessage()`.

8. **conversation-store** — Store merges consecutive reasoning messages into one part
   > `mergeConsecutiveReasoning()` joins multiple `reasoning.content` strings with `\n\n` into one multi-line string.

9. **reasoning** — Reasoning accordion renders with structured steps
   > `<Reasoning>` component renders a collapsible accordion. While streaming, shows animated clock icon and "Thinking..." title.

10. **reasoning-steps** — Each line parsed into a visual step with icon and status
    > Parses newline-separated content. API-specified icons via `[icon:name,color:value]` prefix, or keyword classification fallback. Active step shows spinner. Duplicates collapsed with ×N badge. UUIDs hidden.

11. **actions-platform** — Final message arrives with `turn_complete: true`
    > Last queue message has response text and optional `metadata.completion` for styled result card. No `reasoning` field on the final message.

12. **reasoning + completion-card** — Accordion auto-closes, completion card renders
    > Accordion collapses after 2s, shows "Thought for N seconds". If `metadata.completion` present, renders styled card (green/red/amber) instead of plain text. Confetti on first success.

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

Final message — plain text (backward compatible):

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

Final message — with rich completion card (optional, recommended):

```json
{
  "type": "new_message",
  "data": {
    "messageId": "uuid",
    "conversationId": "uuid",
    "role": "assistant",
    "message": "Activity 'MultiplyTwoNumbers' created with ID 3261.",
    "metadata": {
      "turn_complete": true,
      "completion": {
        "status": "success",
        "title": "Activity created successfully",
        "details": { "name": "MultiplyTwoNumbers", "id": "3261", "steps_completed": 8 }
      }
    }
  }
}
```

The `completion` field is optional. Without it, the response renders as plain markdown. With it, the UI renders a styled card (green for success, red for error, amber for warning) with confetti on first success.

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
| RabbitMQ consumer | `api-server/src/services/rabbitmq.ts` | Consumes messages from queue (published by Platform), creates DB rows, sends SSE |
| SSE service | `api-server/src/services/sse.ts` | Routes events to user's iframe connection |
| SSE client handler | `client/src/contexts/SSEContext.tsx` | Receives SSE events, dispatches to store |
| Message store | `client/src/stores/conversationStore.ts` | Merges consecutive reasoning, groups messages |
| Reasoning accordion | `client/src/components/ai-elements/reasoning.tsx` | Collapsible panel with auto-close |
| Step renderer | `client/src/components/ai-elements/reasoning-steps.tsx` | Parses text, assigns icons, dedup, UUID hiding |
| Integration guide | `client/docs/THINKING_MESSAGES_GUIDE.md` | Full API contract for Platform developers |
