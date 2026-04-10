# Agent Creation Workflow — Integration Spec

> Integration contract between RITA (API server + client) and the External Platform for the `create_agent` workflow.

---

## Overview

When a user creates an agent from the builder, RITA sends a webhook to the external platform. The platform delegates to an **agent-builder agent** (e.g. `https://llm-service-web-staging.resolve.io/new_ui/agents/<id>`) which uses the prompt to **create the agent directly** in the LLM Service. Progress updates and the final result (with the created agent's ID) are published to a RabbitMQ queue. RITA consumes the messages, delivers them to the user via SSE, and the client displays progress, then edit/test buttons on completion.

```
RITA                        External Platform               RabbitMQ
 |                                |                            |
 +-- POST webhook ---------------+|                            |
 |   action: create_agent         |                            |
 |                                +-- agent-builder agent      |
 |                                |   receives prompt          |
 |                                +-- publish ----------------+|
 |                                |   queue: agent.events      |
 |                                |   type: agent_creation_    |
 |                                |         progress           |
 |<-- consume --------------------+----------------------------+
 |   type: agent_creation_progress|                            |
 |                                |                            |
 |                                +-- agent creates agent      |
 |                                |   in LLM Service           |
 |                                +-- publish ----------------+|
 |                                |   type: agent_creation_    |
 |                                |         completed          |
 |<-- consume --------------------+----------------------------+
 |   type: agent_creation_        |                            |
 |         completed              |                            |
 |   (includes agent_id)          |                            |
 |                                |                            |
 |  (user clicks Edit or Test)    |                            |
 |  navigates to existing agent   |                            |
```

---

## 1. Webhook: `create_agent`

RITA sends this when the user clicks "Create with AI" in the agent builder.

### Request

```
POST <AUTOMATION_WEBHOOK_URL>
Authorization: <AUTOMATION_AUTH>
Content-Type: application/json
```

### Payload

```jsonc
{
  "source": "rita-chat",
  "action": "create_agent",
  "tenant_id": "uuid",              // organization ID (maps from organization_id)
  "user_id": "uuid",
  "user_email": "user@example.com",
  "creation_id": "uuid",            // correlation ID -- MUST be returned in all RabbitMQ responses
  "prompt": "Create an AI agent with the following specification:\n\nName: IT Help Desk Agent\nRole: First-line support agent\n...",
  "icon_id": "headphones",
  "icon_color_id": "blue",
  "conversation_starters": ["How can I help you today?", "Report an IT issue"],  // optional, array of starter prompts
  "guardrails": ["Do not discuss HR policies", "Do not share internal salary data"],  // optional, array of restricted topics
  "timestamp": "2026-04-09T12:00:00.000Z"
}
```

### Field Notes

| Field | Required | Notes |
|-------|----------|-------|
| `source` | yes | Always `"rita-chat"` |
| `action` | yes | Always `"create_agent"` |
| `tenant_id` | yes | Maps from `organization_id` in RITA's DB |
| `user_id` | yes | User who triggered the creation |
| `user_email` | yes | For audit/logging and user identification |
| `creation_id` | yes | **Correlation ID** (UUIDv4). Must be echoed back in all RabbitMQ responses |
| `prompt` | yes | Combined form data as natural language instruction (see section 1.1) |
| `icon_id` | yes | Icon identifier (e.g., `"bot"`, `"headphones"`) |
| `icon_color_id` | yes | Color identifier (e.g., `"slate"`, `"blue"`) |
| `conversation_starters` | no | Array of starter prompts. Also included in `prompt` for the AI workflow. Will be stored separately by the platform API |
| `guardrails` | no | Array of topics/requests the agent should refuse. Also included in `prompt`. Will be stored separately by the platform API |
| `timestamp` | yes | ISO 8601 |

> **All agent configuration fields** (name, description, instructions, role, agent type, knowledge sources, workflows, capabilities, conversation starters, guardrails) are included in the `prompt` field. The agent-builder agent on the platform side parses the prompt to create the agent. Additionally, `conversation_starters` and `guardrails` are sent as separate array fields so the platform can store them independently (API support pending).

> **Note on `icon_id`, `icon_color_id`, `conversation_starters`, `guardrails`:** These are sent as individual fields because they need to be stored as separate values in the platform API. `conversation_starters` and `guardrails` are also embedded in the `prompt` for the AI workflow to use during agent creation. Icon fields are currently stored inside `config` in the LLM API (which is incorrect) and will get proper top-level fields.

### 1.1 Prompt Field Format

The `prompt` field compiles all form data into a single natural language string. This is the primary input the AI workflow uses.

```
Create an AI agent with the following specification:

Name: {name}
Role: {role}
Type: {agentType}

Instructions:
{instructions}

Description:
{description}

Tools & Skills:
- Workflows: {workflows.join(", ") || "None"}
- Knowledge Sources: {knowledgeSources.join(", ") || "None"}
- Capabilities: Web Search={webSearch}, Image Generation={imageGeneration}

Conversation Starters:
- {conversationStarters[0]}
- {conversationStarters[1]}
...

Guardrails (topics/requests the agent should NOT handle):
- {guardrails[0]}
- {guardrails[1]}
...
```

The backend compiles this string from the validated request body. The client sends structured JSON; the backend builds the prompt.

---

## 2. Webhook: `cancel_agent_creation`

RITA sends this when the user explicitly clicks "Cancel" during agent creation.

### Payload

```jsonc
{
  "source": "rita-chat",
  "action": "cancel_agent_creation",
  "tenant_id": "uuid",
  "user_id": "uuid",
  "user_email": "user@example.com",
  "creation_id": "uuid",            // correlation ID of the creation to cancel
  "timestamp": "2026-04-09T12:00:30.000Z"
}
```

### Field Notes

| Field | Required | Notes |
|-------|----------|-------|
| `source` | yes | Always `"rita-chat"` |
| `action` | yes | Always `"cancel_agent_creation"` |
| `tenant_id` | yes | Same as original creation request |
| `user_id` | yes | Same as original creation request |
| `user_email` | yes | For audit |
| `creation_id` | yes | Correlation ID of the creation to abort |
| `timestamp` | yes | ISO 8601 |

> **Only triggered by explicit cancel action**, not by navigation. If the user navigates away, the creation continues on the platform side.

---

## 3. Webhook: `agent_creation_input`

RITA sends this when the user responds to an input request from the agent (after receiving `agent_creation_input_required`).

### Payload

```jsonc
{
  "source": "rita-chat",
  "action": "agent_creation_input",
  "tenant_id": "uuid",
  "user_id": "uuid",
  "user_email": "user@example.com",
  "creation_id": "uuid",            // same creation_id — correlates the entire creation flow
  "prev_execution_id": "5e7e7877-...",  // execution_id from the input_required message — platform uses this to resume
  "prompt": "It should handle only IT support tickets. HR requests should be escalated to the HR team.",
  "timestamp": "2026-04-09T12:00:35.000Z"
}
```

### Field Notes

| Field | Required | Notes |
|-------|----------|-------|
| `source` | yes | Always `"rita-chat"` |
| `action` | yes | Always `"agent_creation_input"` |
| `tenant_id` | yes | Same as original creation request |
| `user_id` | yes | Same as original creation request |
| `user_email` | yes | For audit |
| `creation_id` | yes | Same correlation ID — correlates the entire creation flow |
| `prev_execution_id` | yes | The `execution_id` received in the `agent_creation_input_required` message. Platform passes this to `POST /services/agentic` to resume the correct execution |
| `prompt` | yes | User's response to the agent's question |
| `timestamp` | yes | ISO 8601 |

After receiving this, the platform resumes the agent execution by calling:

```
POST /services/agentic
{
  "query": {
    "agent_metadata_parameters": {
      "agent_name": "<agent-builder-name>",
      "prev_execution_id": "<previous execution_id>",
      "parameters": {
        "utterance": "<user's response>",
        "transcript": "<accumulated conversation so far>"
      }
    }
  }
}
```

This returns a **new** `execution_id` but the **same** `conversation_id`. The platform then resumes polling and forwarding progress events. The `creation_id` remains the same throughout the entire conversation loop.

---

## 4. RabbitMQ Response Messages

After the AI workflow starts, the external platform publishes progress and result messages to RabbitMQ.

### Queue

| Property | Value |
|----------|-------|
| **Queue name** | `agent.events` |
| **Env var** | `AGENT_EVENTS_QUEUE` |
| **Durable** | yes |

> `agent.events` is a domain-scoped queue for agent lifecycle events (following the `cluster.events` pattern). Messages are discriminated by the `type` field.

### 4.1 Progress Message (Execution Steps)

Published for each execution step during the AI workflow. Maps to the step types visible in the LLM Service execution UI.

```jsonc
{
  "type": "agent_creation_progress",
  "tenant_id": "uuid",
  "user_id": "uuid",
  "creation_id": "uuid",            // MUST match webhook creation_id
  "step_type": "crew_step",         // execution step type (see table above)
  "step_label": "Agent Builder",    // agent or system name
  "step_detail": "Step Thought: Analyzing instructions to determine agent configuration...",
  "step_index": 3,                  // optional: current step number (1-based)
  "total_steps": 6                  // optional: total step count (if known)
}
```

**`execution_complete` step example** (last step, includes final response):

```jsonc
{
  "type": "agent_creation_progress",
  "tenant_id": "uuid",
  "user_id": "uuid",
  "creation_id": "uuid",
  "step_type": "execution_complete",
  "step_label": "system",
  "step_detail": "execution_complete",
  "final_response": {                // only present on execution_complete
    "success": true,
    "need_inputs": [],
    "terminate": false,
    "error_message": ""
  },
  "step_index": 6,
  "total_steps": 6
}
```

**Execution Step Types:**

These map to the `event_type` values from the LLM Service execution messages (polled via `GET /agents/messages/execution/poll/{execution_id}`).

| `step_type` | Description | Example `step_label` | Example `step_detail` |
|-------------|-------------|----------------------|-----------------------|
| `execution_start` | Workflow execution begins | `"system"` | `"execution_start"` |
| `agent_start` | An agent begins processing | `"Agent Builder"` | `"agent_start"` |
| `crew_step` | Intermediate thought/action step | `"Agent Builder"` | `"Step Thought: Analyzing instructions..."` |
| `task_end` | A task completes | `"task"` | `"task_end"` |
| `agent_end` | An agent finishes processing | `"Agent Builder"` | `"agent_end"` |
| `execution_complete` | Workflow execution finishes | `"system"` | `"execution_complete"` |

> **`execution_complete` is the last step in the list** and is rendered in the UI alongside the other steps. Its `content.raw` contains the final response JSON (`{ success, need_inputs, terminate, error_message }`). The platform uses this to determine whether to also publish an `agent_creation_completed`, `agent_creation_input_required`, or `agent_creation_failed` message.
>
> **Flow on the platform side:**
> 1. Platform invokes the agent-builder agent via `POST /services/agentic`
> 2. Platform polls `GET /agents/messages/execution/poll/{execution_id}` for UI-formatted step messages
> 3. Each step is forwarded to RabbitMQ as `agent_creation_progress`
> 4. On `execution_complete`, platform reads `content.raw`:
>    - `success: true` + `need_inputs: []` → publish `agent_creation_completed` with `agent_id`
>    - `need_inputs: [...]` (non-empty) → publish `agent_creation_input_required` with the agent's question
>    - `success: false` → publish `agent_creation_failed` with error
> 5. If input was required and user responds (via `agent_creation_input` webhook), platform continues execution with `prev_execution_id` and resumes from step 2

### 4.2 Input Required Message

Published when the agent needs additional information from the user to continue.

```jsonc
{
  "type": "agent_creation_input_required",
  "tenant_id": "uuid",
  "user_id": "uuid",
  "creation_id": "uuid",            // MUST match webhook creation_id
  "execution_id": "5e7e7877-...",   // current execution ID — MUST be passed back as prev_execution_id
  "message": "I need more details about the agent's role. Should it handle only IT support tickets, or also HR-related requests?",
  "need_inputs": ["role_scope"]     // input field identifiers the agent is requesting
}
```

The client should display the agent's `message` and show a chat input for the user to respond. The `execution_id` must be stored and sent back in the `agent_creation_input` webhook as `prev_execution_id` so the platform can resume the correct execution without maintaining state.

### 4.3 Success Message

Published once when the agent-builder agent has **created the agent** in the LLM Service.

```jsonc
{
  "type": "agent_creation_completed",
  "tenant_id": "uuid",
  "user_id": "uuid",
  "creation_id": "uuid",            // MUST match webhook creation_id
  "status": "success",
  "agent_id": "6efccc35-a41f-4c24-8b87-d4593754bc5f",   // ID of the created agent in LLM Service
  "agent_name": "IT Help Desk Agent"                      // for display in success toast
}
```

### 4.4 Failure Message

Published once if the AI workflow fails.

```jsonc
{
  "type": "agent_creation_failed",
  "tenant_id": "uuid",
  "user_id": "uuid",
  "creation_id": "uuid",            // MUST match webhook creation_id
  "status": "failed",
  "error_message": "Unable to generate agent configuration: insufficient context provided"
}
```

### Field Notes

| Field | Required | Notes |
|-------|----------|-------|
| `type` | yes | `"agent_creation_progress"`, `"agent_creation_input_required"`, `"agent_creation_completed"`, or `"agent_creation_failed"` |
| `tenant_id` | yes | Echo from webhook |
| `user_id` | yes | Echo from webhook -- used to route SSE to correct user |
| `creation_id` | yes | **Echo from webhook** -- critical for correlating request <-> response |
| `step_type` | on progress | Execution step type: `execution_start`, `agent_start`, `crew_step`, `task_end`, `agent_end`, `execution_complete` |
| `step_label` | on progress | Agent or system name for this step |
| `step_detail` | on progress | Human-readable step detail/thought |
| `step_index` | optional | Current step number (1-based) |
| `total_steps` | optional | Total steps (if known) |
| `final_response` | on `execution_complete` | Final JSON from agent: `{ success, need_inputs, terminate, error_message }` |
| `execution_id` | on input_required | Current execution ID — client must pass back as `prev_execution_id` in the input webhook |
| `message` | on input_required | Agent's question to the user |
| `need_inputs` | on input_required | Array of input field identifiers the agent needs |
| `status` | on completion | `"success"` or `"failed"` |
| `agent_id` | on success | ID of the created agent in LLM Service |
| `agent_name` | on success | Name of the created agent (for display) |
| `error_message` | on failure | Human-readable error description |

### Constraints

| Constraint | Value | Reason |
|------------|-------|--------|
| Max message size | 1 MB | RabbitMQ message size limit. Agent configs are small (KB range) |
| Expected response time | < 90 seconds | Client-side timeout. After 90s the user sees a timeout error and can retry |
| Message format | JSON | Standard across all RITA queues |

---

## 5. SSE Events

The `AgentEventsConsumer` consumes RabbitMQ messages and sends SSE events to the client.

### 5.1 `agent_creation_progress`

```jsonc
{
  "type": "agent_creation_progress",
  "data": {
    "creation_id": "uuid",
    "step_type": "crew_step",
    "step_label": "Agent Builder",
    "step_detail": "Step Thought: Analyzing instructions to determine agent configuration...",
    "step_index": 3,
    "total_steps": 6,
    "timestamp": "2026-04-09T12:00:05.000Z"
  }
}
```

**`execution_complete` variant** (last step, rendered in the steps list alongside others):

```jsonc
{
  "type": "agent_creation_progress",
  "data": {
    "creation_id": "uuid",
    "step_type": "execution_complete",
    "step_label": "system",
    "step_detail": "execution_complete",
    "final_response": {
      "success": true,
      "need_inputs": [],
      "terminate": false,
      "error_message": ""
    },
    "step_index": 6,
    "total_steps": 6,
    "timestamp": "2026-04-09T12:00:14.000Z"
  }
}
```

### 5.2 `agent_creation_input_required`

```jsonc
{
  "type": "agent_creation_input_required",
  "data": {
    "creation_id": "uuid",
    "execution_id": "5e7e7877-...",
    "message": "I need more details about the agent's role. Should it handle only IT support tickets, or also HR-related requests?",
    "need_inputs": ["role_scope"],
    "timestamp": "2026-04-09T12:00:08.000Z"
  }
}
```

### 5.3 `agent_creation_completed`

```jsonc
{
  "type": "agent_creation_completed",
  "data": {
    "creation_id": "uuid",
    "agent_id": "6efccc35-a41f-4c24-8b87-d4593754bc5f",
    "agent_name": "IT Help Desk Agent",
    "timestamp": "2026-04-09T12:00:15.000Z"
  }
}
```

### 5.4 `agent_creation_failed`

```jsonc
{
  "type": "agent_creation_failed",
  "data": {
    "creation_id": "uuid",
    "error": "Unable to generate agent configuration: insufficient context provided",
    "timestamp": "2026-04-09T12:00:10.000Z"
  }
}
```

---

## 6. Client State Machine

### 6.1 Zustand Store (`agentCreationStore`)

Follows the `knowledgeGenerationStore` pattern.

```
State:
  creationId: string | null
  executionId: string | null          // current execution_id, passed back as prev_execution_id on input
  status: "idle" | "creating" | "awaiting_input" | "success" | "error"
  executionSteps: ExecutionStep[]     // accumulated list of execution steps
  inputMessage: string | null         // agent's question when awaiting_input
  agentId: string | null              // ID of created agent on success
  agentName: string | null            // name for display on success
  error: string | null

  // ExecutionStep shape:
  // { stepType, stepLabel, stepDetail, stepIndex?, totalSteps?, timestamp }

Actions:
  startCreation(creationId)           // idle -> creating
  receiveProgress(step)               // append to executionSteps
  receiveInputRequired(message, executionId)  // creating -> awaiting_input, stores executionId
  resumeCreation()                    // awaiting_input -> creating (after user sends input)
  receiveResult(agentId, agentName)   // creating -> success
  receiveError(error)                 // creating -> error
  timeout()                           // creating -> error (after 90s)
  reset()                             // any -> idle
```

### 6.2 State Transitions

```
                       startCreation(id)
    idle ----------------------------------------> creating
                                                     |
                          receiveProgress()          |  timeout()
                             |<----------------------+-------> error
                             v                       |
                          creating <-----------------+
                             |                       |
                  receiveInputRequired()    resumeCreation()
                             |                       |
                             v                       |
                      awaiting_input ----------------+
                        (user responds)
                             
                          creating
                             |
               receiveResult()   receiveError()
                     |                |
                     v                v
                  success           error
                     |                |
                     |    reset()     |
                     +----------> idle <-----------+
```

### 6.3 UI Behavior by State

| State | UI | Toast |
|-------|-----|-------|
| `idle` | Normal agent builder form | -- |
| `creating` (no progress) | Overlay with spinner + "Creating your agent..." | -- |
| `creating` (with steps) | Execution steps list rendered like LLM Service UI (expandable, showing step type + label + detail). New steps append to list in real-time. | -- |
| `awaiting_input` | Execution steps list + agent's question displayed as a message + **chat input** for user to type response | -- |
| `success` | Overlay transitions to success. Show **"Edit Agent"** and **"Test Agent"** buttons | `ritaToast.success({ title: "Agent created successfully" })` |
| `error` | Overlay transitions to error with retry button | `ritaToast.error({ title: "Agent creation failed", description: error })` |
| `error` (timeout) | Same as error | `ritaToast.error({ title: "Agent creation timed out", description: "Please try again." })` |

### 6.4 Success Flow

On `success`, the agent has already been **created in the LLM Service** by the agent-builder agent. The response includes the `agent_id` of the created agent.

1. Shows success state with agent name
2. Shows **"Edit Agent"** button -> navigates to `/agents/{agent_id}/edit` (existing builder page in edit mode)
3. Shows **"Test Agent"** button -> navigates to `/agents/{agent_id}/test`
4. Client invalidates the agents list query cache so the new agent appears in the table

### 6.5 Cancel vs Navigate Away

**Cancel button click:**
1. Client calls `POST /api/agents/cancel-creation` with `creation_id`
2. Backend sends `cancel_agent_creation` webhook to platform
3. Platform aborts the workflow
4. Client resets store to `idle`

**Navigate away (no cancel):**
1. Agent creation **continues on the platform side**
2. Client resets store on unmount
3. Agent will appear in the agents list when the user returns

### 6.6 Timeout

- **90 seconds** from when `startCreation()` is called
- If `status` is still `"creating"` after 90s, call `store.timeout()`
- The agent creation continues on the platform side regardless — timeout only affects the client UI

---

## 7. Backend Endpoints

### 7.1 `POST /api/agents/generate`

Triggers agent creation workflow.

**Request Body:**

```jsonc
{
  "prompt": "Create an AI agent with the following specification:\n\nName: IT Help Desk Agent\n...",  // required
  "iconId": "headphones",                 // optional, default: "bot"
  "iconColorId": "blue",                  // optional, default: "slate"
  "conversationStarters": ["How can I help you today?", "Report an IT issue"],  // optional
  "guardrails": ["Do not discuss HR policies", "Do not share internal salary data"]  // optional
}
```

The client compiles all form fields (name, instructions, role, description, agent type, knowledge sources, workflows, capabilities, conversation starters, guardrails) into the `prompt` string before sending. `conversationStarters` and `guardrails` are also sent as separate arrays so the backend can forward them to the platform for independent storage (API support pending).

**Response:**

```jsonc
{
  "creation_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 7.2 `POST /api/agents/creation-input`

Sends user's response when the agent requests additional input.

**Request Body:**

```jsonc
{
  "creation_id": "550e8400-e29b-41d4-a716-446655440000",
  "prevExecutionId": "5e7e7877-...",
  "prompt": "It should handle only IT support tickets. HR requests should be escalated."
}
```

**Response:**

```jsonc
{
  "success": true
}
```

### 7.3 `POST /api/agents/cancel-creation`

Cancels an in-progress agent creation. Only called on explicit cancel button click (not on navigation away).

**Request Body:**

```jsonc
{
  "creation_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**

```jsonc
{
  "success": true
}
```

---

## 8. Sequence Diagram

```
User            RITA Client         RITA API Server       External Platform       RabbitMQ
 |                  |                     |                      |                   |
 +- Click "Create  >|                     |                      |                   |
 |  with AI"        |                     |                      |                   |
 |                  +- POST /api/agents/ >|                      |                   |
 |                  |  generate           |                      |                   |
 |                  |  {prompt, icon...}  |                      |                   |
 |                  |                     +- generate creation_id                    |
 |                  |                     +- POST webhook ------>|                   |
 |                  |                     |  create_agent        |                   |
 |                  |<- { creation_id } --+                      |                   |
 |  (loading UI)    |                     |                      |                   |
 |                  +- store.start        |                      |                   |
 |                  |  Creation(id)       |                      |                   |
 |                  +- start 90s timeout  |                      |                   |
 |                  |                     |                      |                   |
 |                  |                     |                      +- agent-builder    |
 |                  |                     |                      |  agent starts     |
 |                  |                     |                      +- publish -------->|
 |                  |                     |                      |  type: progress   |
 |                  |                     |                      |  step: exec_start |
 |                  |                     |<- consume -----------+-------------------+
 |                  |<--- SSE event ------+                      |                   |
 |  (step shown)    |                     |                      |                   |
 |                  |                     |                      +- publish -------->|
 |                  |                     |                      |  type: progress   |
 |                  |                     |                      |  step: crew_step  |
 |                  |                     |<- consume -----------+-------------------+
 |                  |<--- SSE event ------+                      |                   |
 |  (step appended) |                     |                      |                   |
 |                  |                     |                      |                   |
 |  --- (optional) agent needs input --------------------------------               |
 |                  |                     |                      +- publish -------->|
 |                  |                     |                      |  type: input_     |
 |                  |                     |                      |        required   |
 |                  |                     |<- consume -----------+-------------------+
 |                  |<--- SSE event ------+                      |                   |
 |  (chat input     |                     |                      |                   |
 |   shown)         |                     |                      |                   |
 +- Type response  >|                     |                      |                   |
 |                  +- POST /api/agents/ >|                      |                   |
 |                  |  creation-input     |                      |                   |
 |                  |  {creation_id,     |                      |                   |
 |                  |   prompt}          |                      |                   |
 |                  |                     +- POST webhook ------>|                   |
 |                  |                     |  agent_creation_     |                   |
 |                  |                     |  input               |                   |
 |                  |                     |                      +- agent resumes    |
 |  --- end optional input loop -----------------------------------------           |
 |                  |                     |                      |                   |
 |                  |                     |                      +- agent creates    |
 |                  |                     |                      |  agent in LLM Svc |
 |                  |                     |                      +- publish -------->|
 |                  |                     |                      |  type: completed  |
 |                  |                     |                      |  agent_id: "..."  |
 |                  |                     |<- consume -----------+-------------------+
 |                  |<--- SSE event ------+                      |                   |
 |  (success shown) |                     |                      |                   |
 |  Edit | Test     |                     |                      |                   |
 |                  |                     |                      |                   |
 +- Click "Edit"   >|                     |                      |                   |
 |                  +- navigate to        |                      |                   |
 |                  | /agents/{id}/edit   |                      |                   |
 |                  +- GET /api/agents/   |                      |                   |
 |                  |  {agent_id} ------->|                      |                   |
 |                  |                     +- fetch from LLM Svc  |                   |
 |                  |<- agent config -----+                      |                   |
 |  (edit form)     |                     |                      |                   |
```


---

## 9. Error Recovery & Edge Cases

| Scenario | Handling |
|----------|----------|
| Webhook POST fails (network/5xx) | `WebhookService` retry logic (3 attempts, exponential backoff). All fail -> return 500 to client. Store in `rag_webhook_failures`. |
| Platform returns error via RabbitMQ | `agent_creation_failed` SSE event. Client shows error toast + retry button. |
| SSE connection drops during creation | Client reconnects automatically (existing `useSSE` hook). Late event accepted if `creation_id` matches and store is still in `creating` state. |
| Timeout fires but result arrives late | Accept late success -- transition `error` -> `success` if `creation_id` matches. Better UX than ignoring a valid result. |
| User clicks Cancel | Cancel webhook sent. Platform aborts workflow. Store resets to idle. |
| User navigates away (no cancel) | Agent creation continues on platform. Store resets on unmount. Agent appears in agents list when user returns. |
| Duplicate `creation_id` messages | Idempotent: progress overwrites previous; completed/failed are terminal. |
| Unknown `type` on queue | Consumer logs error and nacks without requeue. |

---

## 10. Files to Create/Modify (Implementation Roadmap)

### New Files

| File | Description |
|------|-------------|
| `packages/api-server/src/consumers/AgentEventsConsumer.ts` | RabbitMQ consumer for `agent.events` queue (mirrors `ClusterEventsConsumer`) |
| `packages/api-server/src/types/agent-events.ts` | TypeScript types for agent event messages |
| `packages/client/src/stores/agentCreationStore.ts` | Zustand store for creation state machine (mirrors `knowledgeGenerationStore`) |

### Modified Files

| File | Change |
|------|--------|
| `packages/api-server/src/routes/agents.ts` | Add `POST /api/agents/generate`, `POST /api/agents/creation-input`, `POST /api/agents/cancel-creation` endpoints |
| `packages/api-server/src/schemas/agent.ts` | Add `AgentGenerateRequestSchema` Zod schema |
| `packages/api-server/src/types/webhook.ts` | Add `CreateAgentWebhookPayload`, `AgentCreationInputWebhookPayload`, `CancelAgentCreationWebhookPayload` |
| `packages/api-server/src/services/rabbitmq.ts` | Register `AgentEventsConsumer` in `startConsumer()` |
| `packages/api-server/src/services/sse.ts` | Add `agent_creation_progress`, `agent_creation_input_required`, `agent_creation_completed`, `agent_creation_failed` to SSE event union |
| `packages/client/src/contexts/SSEContext.tsx` | Add handlers for new agent creation SSE events |
| `packages/client/src/hooks/api/useAgents.ts` | Add `useGenerateAgent()`, `useAgentCreationInput()`, `useCancelAgentCreation()` mutation hooks |
| `packages/client/src/services/api.ts` | Add `agentApi.generate()`, `agentApi.sendCreationInput()`, `agentApi.cancelCreation()` methods |
| `packages/client/src/pages/AgentBuilderPage.tsx` | Add "Create with AI" button, wire to store, render overlay + success/error states |

### Implementation Order

1. Types: `agent-events.ts` (backend) + SSE event interfaces
2. Consumer: `AgentEventsConsumer.ts` + register in `rabbitmq.ts`
3. SSE: Add event types to `sse.ts`, add handlers in `SSEContext.tsx`
4. Backend routes: `POST /api/agents/generate` + `POST /api/agents/cancel-creation`
5. Client store: `agentCreationStore.ts`
6. Client API + hooks: `agentApi.generate()` + `useGenerateAgent()`
7. UI: "Create with AI" button + overlay + success/error states
