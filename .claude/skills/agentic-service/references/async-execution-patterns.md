# Async Agent Execution Patterns

Agent execution is asynchronous. The caller invokes, then polls for results.

## Execution Flow

```
1. Invoke agent → get execution_id
2. Poll for messages → check status
3. If need_inputs → collect user input → continue execution
4. If execution_complete → process result
```

## 1. Invoke Agent

```
POST /services/agentic
{
  "query": {
    "agent_metadata_parameters": {
      "agent_name": "HelloAgent",
      "parameters": {
        "utterance": "Hi!"
      }
    }
  }
}
```

Response:
```json
{
  "result": {
    "conversation_id": "8be49aa3-...",
    "execution_id": "5e7e7877-...",
    "agent_metadata_id": "38567f8b-...",
    "status": "started",
    "message": "Execution submitted to thread pool"
  },
  "status": "success",
  "tenant": "default"
}
```

Save `execution_id` and `conversation_id` for polling.

## 2. Poll for Messages

### Raw messages
```
GET /agents/messages/execution/{execution_id}
```

### UI-formatted messages (recommended for frontend)
```
GET /agents/messages/execution/poll/{execution_id}
```

### All messages for a conversation (across executions)
```
GET /agents/messages/conversation/poll/{conversation_id}
```

### Check execution state
```
GET /agents/states/execution/{execution_id}
→ AgentStateApiData with state field
```

## 3. Handle Execution Results

The agent's response is in the message with `event_type: "execution_complete"`. The `content.raw` field contains the JSON output (may be wrapped in markdown code fences).

### Check for need_inputs

If the JSON output has a non-empty `need_inputs` array, the agent needs user input:

```json
{
  "success": false,
  "need_inputs": [
    {
      "name": "user_name",
      "description": "Please share your name so I can greet you personally."
    }
  ]
}
```

### Check for terminate

If the task config has `exit_if_terminate: true` and the output has `"terminate": true`, execution stops without proceeding to the next task.

### Check for success

```json
{
  "success": true,
  "message": "Hello Bob!"
}
```

## 4. Continue Execution with User Input

Pass `prev_execution_id` to reference the previous execution and include the updated transcript:

```
POST /services/agentic
{
  "query": {
    "agent_metadata_parameters": {
      "agent_name": "HelloAgent",
      "prev_execution_id": "5e7e7877-...",
      "parameters": {
        "utterance": "Hi!",
        "transcript": "[{\"role\": \"user\", \"content\": \"hi\"}, {\"role\": \"assistant\", \"content\": \"Please share your name...\"}, {\"role\": \"user\", \"content\": \"bob\"}]"
      }
    }
  }
}
```

This returns a **new** `execution_id` but the **same** `conversation_id`.

## 5. Stop Execution

```
POST /agents/request_stop_agent
{ "execution_id": "5e7e7877-..." }
```

## Polling Strategy for Rita

For Rita's SSE-based architecture, the recommended approach:

1. **Backend polling**: Rita API server polls the LLM service on behalf of the client
2. **SSE forwarding**: Forward execution status updates to the client via existing SSE infrastructure
3. **Fallback**: Client can poll Rita API server endpoint which proxies to LLM service poll endpoints

## Multi-Task Agents

Agents can have multiple sub-tasks that execute sequentially. Each task:
- Has its own role, goal, backstory, prompt
- Can reference tools
- Can depend on other tasks (`depends_on_tasks`)
- Runs in order specified by `order` field
- Early termination if `need_inputs` is non-empty or `terminate` is true (when configured)

The output of dependent tasks is passed as input context to subsequent tasks.

## Meta-Agent Execution

For meta-agent patterns (agents that modify other agents' configurations — improve instructions, generate conversation starters, etc.), see `references/meta-agent-patterns.md`.
