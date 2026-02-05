# Dynamic Workflow Builder - Integration

**Status:** Implemented
**Branch:** `feature/hrita`

## Flow

```
User enters query → Click "Generate Workflow"
       ↓
POST to webhook: https://actions-api-staging.resolve.io/api/Webhooks/postEvent/{GUID}
Payload: { action: "generate_dynamic_workflow", tenant_id, user_email, user_id, query, index_name }
       ↓
Julian's service processes, publishes to RabbitMQ queue
       ↓
API Server consumes, sends SSE event 'dynamic_workflow'
       ↓
Client receives SSE, renders workflow visualization
```

---

## SSE Event Structure

**Type:** `dynamic_workflow`

```json
{
  "type": "dynamic_workflow",
  "data": {
    "action": "workflow_created | workflow_executed | progress_update",
    "workflow": [...],      // for workflow_created
    "mappings": {...},      // for workflow_created
    "visualization": "...", // optional
    "result": {...},        // for workflow_executed
    "progress": "...",      // for progress_update
    "error": "..."          // on failure
  }
}
```

### Action Types
- `workflow_created` - Workflow generated successfully (contains `workflow` array)
- `workflow_executed` - Workflow ran successfully (contains `result`)
- `progress_update` - In-progress status update (contains `progress` string)

---

## Implementation

### 1. Workflow API Service
**File:** `packages/client/src/services/workflowApi.ts`

```ts
const ACTIONS_API_URL = import.meta.env.VITE_ACTIONS_API_URL ||
  "https://actions-api-staging.resolve.io";
const WORKFLOW_CREATOR_GUID = "00F4F67D-3B92-4FD2-A574-7BE22C6BE796";

export interface GenerateWorkflowPayload {
  action: "generate_dynamic_workflow";
  tenant_id: string;
  user_email: string;
  user_id: string;
  query: string;
  index_name: string;
}

export const workflowApi = {
  generateWorkflow: async (payload: GenerateWorkflowPayload): Promise<void> => {
    const url = `${ACTIONS_API_URL}/api/Webhooks/postEvent/${WORKFLOW_CREATOR_GUID}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Workflow webhook failed: ${response.status}`);
  },
};
```

### 2. SSE Event Type
**File:** `packages/client/src/services/EventSourceSSEClient.ts`

```ts
export interface DynamicWorkflowEvent {
  type: 'dynamic_workflow';
  data: {
    action: 'workflow_created' | 'workflow_executed' | 'progress_update';
    workflow?: WorkflowTask[];
    mappings?: Record<string, Record<string, string>>;
    visualization?: string;
    result?: any;
    progress?: string;
    error?: string;
  };
}
```

### 3. SSE Handler
**File:** `packages/client/src/contexts/SSEContext.tsx`

```ts
} else if (event.type === "dynamic_workflow") {
  const workflowEvent = new CustomEvent("workflow:event", {
    detail: event.data,
  });
  window.dispatchEvent(workflowEvent);
}
```

### 4. WorkflowsPage Listener
**File:** `packages/client/src/pages/WorkflowsPage.tsx`

- Uses `useProfile()` to get tenant/user info
- Calls `workflowApi.generateWorkflow()` on form submit
- Listens for `workflow:event` CustomEvent to receive SSE data
- Handles all three action types: `workflow_created`, `workflow_executed`, `progress_update`
- New "Generate" tab as default for workflow creation

---

## Files Modified

| File | Change |
|------|--------|
| `packages/client/src/services/workflowApi.ts` | **New** - webhook client |
| `packages/client/src/services/EventSourceSSEClient.ts` | Add `DynamicWorkflowEvent` type |
| `packages/client/src/contexts/SSEContext.tsx` | Add `dynamic_workflow` handler |
| `packages/client/src/pages/WorkflowsPage.tsx` | Add webhook call, SSE listener, Generate tab |

---

## Usage

1. Navigate to `/jirita` (requires `ENABLE_WORKFLOWS` feature flag in localStorage)
2. On "Generate" tab, enter workflow description
3. Click "Generate Workflow"
4. Wait for SSE response to render workflow steps

---

## Backend Dependency (Julian)
- RabbitMQ consumer listening for workflow generation requests
- Publishes `dynamic_workflow` events back via SSE
- Queue coordination: workflow.responses
