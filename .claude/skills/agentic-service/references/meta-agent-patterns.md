# Meta-Agent Execution Patterns

Meta-agents are agents that modify other agents' configurations (improve instructions, generate conversation starters, etc.). They share the standard 3-param contract (`utterance`, `additional_information`, `transcript`) and return the Standard Response Format.

## Architecture

```
Client (React) --(POST)--> Rita API Server --(strategy)--> LLM Service Agentic API
                 <--(SSE)--                  <--(poll)--
```

The client never calls the LLM Service directly. Rita API server handles invocation, background polling, and relays results via SSE events.

## Execution Flow

```
1. Client calls Rita endpoint (e.g. POST /api/agents/improve-instructions)
2. Route handler parses Zod schema, calls strategy.execute()
3. Strategy invokes LLM Service POST /services/agentic with meta-agent name
4. Strategy polls in background (3s interval, max 100 attempts ≈ 5 min)
5. Progress/completion/failure relayed to client via SSE events
6. Client SSEContext routes events to Zustand store
7. Component reacts to store state changes
```

Returns HTTP 202 immediately with `{ executionRequestId }`. Results arrive asynchronously via SSE.

## Strategy Pattern

Interface: `MetaAgentStrategy` in `packages/api-server/src/services/metaAgentExecution/types.ts`

```typescript
interface MetaAgentStrategy {
  execute(params: MetaAgentExecuteParams): Promise<MetaAgentExecuteResult>;
  cancel(params: MetaAgentCancelParams): Promise<{ success: boolean }>;
}
```

### Implementations

| Strategy | Mode | Description |
|---|---|---|
| `DirectMetaAgentStrategy` | `"direct"` (default) | Calls LLM Service agentic API, polls for results, sends SSE |
| `WorkflowMetaAgentStrategy` | `"workflow"` | Phase 2 placeholder — delegates to external platform via webhook |

Controlled by `META_AGENT_MODE` env var. Factory: `getMetaAgentStrategy()` in `metaAgentExecution/index.ts`.

### Execute Parameters

```typescript
interface MetaAgentExecuteParams {
  agentName: string;              // e.g. "AgentInstructionsImprover"
  utterance: string;              // maps to {%utterance}
  additionalInformation?: string; // JSON string, maps to {%additional_information}
  transcript?: string;            // JSON string (typically "[]"), maps to {%transcript}
  userId: string;
  userEmail: string;
  organizationId: string;
}
```

## Rita API Endpoints

### Improve instructions
```
POST /api/agents/improve-instructions
Body: {
  instructions: string,          // current instructions to improve (→ utterance)
  agentConfig: {                 // agent context (→ additional_information as JSON)
    name?: string,
    role?: string,
    description?: string,
    agentType?: "answer" | "knowledge" | "workflow" | null,
    guardrails?: string[],
    conversationStarters?: string[],
    workflows?: string[],
    knowledgeSources?: string[],
    capabilities?: { webSearch?: boolean, imageGeneration?: boolean },
    responsibilities?: string,
    completionCriteria?: string
  }
}
→ 202 { executionRequestId: string }
```
Schema: `ImproveInstructionsBodySchema` in `packages/api-server/src/schemas/agent.ts`

### Cancel meta-agent
```
POST /api/agents/cancel-meta-agent
Body: { executionRequestId: string }  // UUID
→ 200 { success: boolean }
```
Schema: `CancelMetaAgentBodySchema` in `packages/api-server/src/schemas/agent.ts`

## SSE Event Types

Three event types for meta-agent execution, defined in `packages/api-server/src/services/sse.ts`:

### meta_agent_progress
Sent during execution polling when progress is detected.
```typescript
{
  type: "meta_agent_progress";
  data: {
    execution_request_id: string;
    agent_name: string;
    step_label: string;
    step_detail: string;
    timestamp: string;           // ISO datetime
  };
}
```

### meta_agent_completed
Sent when execution finishes successfully.
```typescript
{
  type: "meta_agent_completed";
  data: {
    execution_request_id: string;
    agent_name: string;
    content: string;             // raw output, format depends on agent
    success: boolean;
    timestamp: string;
  };
}
```

### meta_agent_failed
Sent on execution error or timeout.
```typescript
{
  type: "meta_agent_failed";
  data: {
    execution_request_id: string;
    agent_name: string;
    error: string;
    timestamp: string;
  };
}
```

## Content Parsers

Each meta-agent returns `content` in a different format. Parsers in `packages/api-server/src/services/metaAgentExecution/parsers.ts`:

### parseInstructionsImproverContent

Expects delimited sections:
```
---INSTRUCTIONS---
<improved instructions markdown>
---END_INSTRUCTIONS---

---DESCRIPTION---
<improved description>
---END_DESCRIPTION---
```

Returns: `{ instructions: string, description: string }`

### parseConversationStarterContent

Expects comma-separated list: `"Starter 1, Starter 2, Starter 3"`

Returns: `string[]`

**Note**: For the improve-instructions flow, parsing happens on the client side in `SSEContext.tsx` when handling the `meta_agent_completed` event.

## Client Integration

### API methods (`packages/client/src/services/api.ts`)
```typescript
agentApi.improveInstructions({ instructions, agentConfig }) → { executionRequestId: string }
agentApi.cancelMetaAgent({ executionRequestId }) → { success: boolean }
```

### Mutation hook (`packages/client/src/hooks/api/useAgents.ts`)
```typescript
useImproveInstructionsMutation() // wraps agentApi.improveInstructions
```

### Orchestration hook (`packages/client/src/hooks/useImproveInstructions.ts`)
```typescript
const { improve, status, isImproving, reset } = useImproveInstructions();
// improve(data) → calls mutation, sets up store, 120s client-side timeout
```

### Zustand store (`packages/client/src/stores/instructionsImprovementStore.ts`)
```
State:
  improvementId, status (idle|improving|success|error),
  progressSteps[], originalInstructions, originalDescription,
  improvedInstructions, improvedDescription, error

Actions:
  startImprovement(), setImprovementId(), receiveProgress(),
  receiveResult(), receiveError(), timeout(), reset()
```

### SSE event handling (`packages/client/src/contexts/SSEContext.tsx`)
```
meta_agent_progress  → store.receiveProgress(step)
meta_agent_completed → parse delimiters → store.receiveResult({ instructions, description })
meta_agent_failed    → store.receiveError(error)
```

## Timeout Safety Nets

| Layer | Timeout | Mechanism |
|---|---|---|
| Client | 120 seconds | `useImproveInstructions` setTimeout |
| Server (Direct strategy) | ~5 minutes | 100 poll attempts × 3s interval |
