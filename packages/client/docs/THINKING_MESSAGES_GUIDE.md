# Thinking Messages Guide

How the "Thinking..." accordion works, how to send thinking messages from the API, and how to customize the visual presentation.

## How It Works

When the API sends an SSE message with `metadata.reasoning`, the chat UI renders a collapsible "Thinking..." accordion. Multiple consecutive reasoning messages are merged into a single accordion with each line rendered as a structured step.

```
API sends SSE events → reasoning messages merged → accordion renders structured steps
```

## Sending Thinking Messages (API / Platform)

Each thinking step is a separate SSE `new_message` event. The frontend merges consecutive reasoning-only messages automatically.

### Basic Step

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
        "content": "Starting agent",
        "title": "Thinking...",
        "state": "done"
      },
      "turn_complete": false
    }
  }
}
```

### Key Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `metadata.reasoning.content` | string | Yes | The step text displayed in the accordion |
| `metadata.reasoning.title` | string | No | Custom accordion title (default: "Thinking...") |
| `metadata.reasoning.state` | string | No | Step state — currently unused by UI but available |
| `metadata.reasoning.duration` | number | No | Seconds spent thinking (shown after collapse) |
| `metadata.turn_complete` | boolean | Yes | `false` = more messages coming, `true` = final message |

### Sequence Example (Real Workflow)

Send these as separate SSE events, each ~1-5 seconds apart:

```
1. { reasoning: { content: "Starting agent" }, turn_complete: false }
2. { reasoning: { content: "Requirements Analyst is working..." }, turn_complete: false }
3. { reasoning: { content: "Verifying if activity exists" }, turn_complete: false }
4. { reasoning: { content: "Software Developer is working..." }, turn_complete: false }
5. { reasoning: { content: "Using generate_python_code..." }, turn_complete: false }
6. { message: "Activity created successfully!", turn_complete: true }  ← final (no reasoning)
```

The frontend merges steps 1-5 into one accordion, then shows step 6 as the response text.

### Custom Title

Override the accordion header text:

```json
{
  "reasoning": {
    "content": "Analyzing code structure...",
    "title": "Research & Analysis"
  }
}
```

This shows "Research & Analysis" instead of "Thinking..." in the accordion trigger.

## Frontend Step Classification

### Option A: Keyword Classification (Default)

The UI classifies each step line by keywords and assigns an icon automatically:

| Pattern in text | Icon | Example |
|----------------|------|---------|
| "is working", "analyst", "developer", "agent" | Bot | "Requirements Analyst is working..." |
| "polling", "execution status", "waiting" | Workflow | "Polling for execution status updates" |
| "verifying", "checking", "validating", "searching" | Search | "Verifying if activity exists" |
| "generate", "code", "compil", "build" | Code | "Using generate_python_code..." |
| "starting", "running", "execut", "trigger" | Zap | "Starting agent" |
| everything else | Zap | — |

### Option B: Explicit Icon and Color (Recommended)

Prefix the step text with `[icon:name]` or `[icon:name,color:value]` to control exactly what appears:

```json
{ "reasoning": { "content": "[icon:shield,color:green] Validating security credentials" } }
```

The directive prefix is stripped from display — user only sees "Validating security credentials" with a green Shield icon.

**Available icons:**

| Name | Icon | Best for |
|------|------|----------|
| `bot` | Bot | AI agents working |
| `search` | Search | Verification, lookup |
| `code` | Code | Code generation, compilation |
| `zap` | Zap | Initialization, execution |
| `workflow` | Workflow | Polling, orchestration |
| `shield` | Shield | Security, validation |
| `database` | Database | Data queries, storage |
| `globe` | Globe | External API calls |
| `file` | File | File operations, manifests |
| `settings` | Settings | Configuration |
| `alert` | Alert | Warnings, attention |
| `clock` | Clock | Timing, scheduling |

**Available indicator colors:**

| Name | Color | Use for |
|------|-------|---------|
| `primary` | Blue (default) | Normal processing |
| `green` | Green | Security passed, success |
| `amber` | Amber | Warnings, external calls |
| `red` | Red | Errors, critical steps |
| `purple` | Purple | Data/AI operations |

**Examples:**
```
[icon:zap] Initializing workflow engine
[icon:shield,color:green] Validating security credentials
[icon:database,color:purple] Querying knowledge base
[icon:globe,color:amber] Calling external API
[icon:bot,color:primary] AI Agent analyzing results
[icon:code,color:green] Generating solution code
```

Without any `[...]` prefix → falls back to keyword classification (Option A). Fully backward compatible.

### Writing Better Step Messages

For the best visual result:

**Do:**
- Use agent names: "Requirements Analyst is working..."
- Use action verbs: "Verifying...", "Generating...", "Starting..."
- Keep lines short (< 80 chars)
- Change the agent name when the workflow phase changes

**Don't:**
- Include raw UUIDs (they get auto-hidden but it's cleaner without)
- Repeat the same line many times (they get deduped with ×N badge, but it looks better with unique messages)
- Send empty content strings

## Deduplication

If the same step text appears consecutively, the UI collapses them:

```
"Verifying if activity exists"     → shown once with "×4" badge
"Verifying if activity exists"
"Verifying if activity exists"
"Verifying if activity exists"
```

## UUID Hiding

Technical IDs in parentheses are auto-hidden from display but available on hover:

```
Input:   "Polling for execution status updates (execution_id: 48479a88-fe39-4d36-b274-556949ade62c)"
Display: "Polling for execution status updates"
Hover:   Shows full text as tooltip
```

## Completion State

When the final message arrives with `turn_complete: true` and no `reasoning`, the accordion auto-closes (1 second delay) and shows "Thought for N seconds" in the trigger.

### Rich Completion Card (Optional)

To trigger a styled completion card instead of plain text, include a `completion` object in the final message metadata:

```json
{
  "type": "new_message",
  "data": {
    "messageId": "uuid",
    "conversationId": "uuid",
    "role": "assistant",
    "message": "Activity 'MultiplyTwoNumbers' has been successfully created with ID 3261.",
    "metadata": {
      "turn_complete": true,
      "completion": {
        "status": "success",
        "title": "Activity created successfully",
        "details": {
          "name": "MultiplyTwoNumbers",
          "id": "3261",
          "steps_completed": 8
        }
      }
    }
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `completion.status` | `"success"` \| `"error"` \| `"warning"` | Yes | Controls card color (green/red/amber) |
| `completion.title` | string | Yes | Card heading text |
| `completion.details` | `Record<string, string \| number>` | No | Key-value pairs shown below the heading |
| `completion.confetti` | boolean | No | Fire confetti animation (default: `true` for first success) |

**Without `completion`:** The response renders as plain markdown (current behavior, fully backward compatible).

**With `completion`:** The response renders inside a styled card with icon, color, and optional details — making the result feel like a completed achievement rather than just another chat message.

### Error Completion

```json
{
  "metadata": {
    "turn_complete": true,
    "completion": {
      "status": "error",
      "title": "Activity creation failed",
      "details": {
        "error": "Name already exists",
        "suggestion": "Try a different activity name"
      }
    }
  }
}
```

## N-1 Compatibility

All changes are backward compatible:

- **Old messages** (single-line reasoning or no reasoning) render exactly as before via the `<Response>` markdown renderer
- **New structured rendering** only activates when `reasoning.content` has multiple newline-separated lines
- **No API contract changes** — same SSE event format, same metadata fields
- **No new required fields** — everything is optional

## Storybook Preview

```bash
pnpm storybook
# → Rita > Chat Flow Demo > Full Flow       (interactive simulation)
# → Rita > Reasoning Steps > Streaming Live  (step-by-step animation)
# → Rita > Loading States > All Options      (all indicator variants)
```
