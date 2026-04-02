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

The UI automatically classifies each step line and assigns an icon:

| Pattern in text | Type | Icon | Example |
|----------------|------|------|---------|
| "is working", "analyst", "developer", "agent" | agent | Bot | "Requirements Analyst is working..." |
| "polling", "execution status", "waiting" | poll | Workflow | "Polling for execution status updates" |
| "verifying", "checking", "validating", "searching" | verify | Search | "Verifying if activity exists" |
| "generate", "code", "compil", "build" | code | Code | "Using generate_python_code..." |
| "starting", "running", "execut", "trigger" | action | Zap | "Starting agent" |
| everything else | generic | Zap | — |

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
