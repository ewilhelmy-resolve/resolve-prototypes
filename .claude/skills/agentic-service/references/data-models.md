# LLM Service Data Models

Exact schemas from the OpenAPI specification. Every entity exposes `reference_id` + `tenant` at the top of the payload (skipped in the interfaces below when already shown) and the standard `sys_date_created / sys_date_updated / sys_created_by / sys_updated_by` audit quartet.

## Contents

**Persisted entities**
- [AgentMetadataApiData](#agentmetadataapidata) — agent definition; lifecycle fields (`state`, `conversation_starters`, `guardrails`, `admin_type`)
- [AgentTaskApiData](#agenttaskapidata) — sub-tasks with `tools` and `configs`
- [ToolApiData](#toolapidata) — tools + `state`/`admin_type` lifecycle
- [ToolGroupApiData](#toolgroupapidata), [ToolGroupAssociationApiData](#toolgroupassociationapidata) — tool grouping
- [AgentMessageApiData](#agentmessageapidata), [AgentStateApiData](#agentstateapidata), [AgentConversationApiData](#agentconversationapidata) — execution-time records

**Request / response wrappers**
- [AgenticRequest](#agenticrequest-invoke), [ServiceResponse](#serviceresponse)
- [DeleteResponse](#deleteresponse), [BulkDeleteResponse](#bulkdeleteresponse)
- [DuplicateAgentRequest](#duplicateagentrequest) / [Response](#duplicateagentresponse), [DuplicateToolRequest](#duplicatetoolrequest)
- [PrepareAgentDefinitionsRequest](#prepareagentdefinitionsrequest), [CleanupAgentMessagesRequest](#cleanupagentmessagesrequest), [CleanupResponse](#cleanupresponse)
- [RetrieveDataFromDatasourceRequest](#retrievedatafromdatasourcerequest) / [Response](#retrievedatafromdatasourceresponse)
- [RequestStopAgentRequest](#requeststopagentrequest)
- [ExecutePythonScriptRequest](#executepythonscriptrequest) / [Response](#executepythonscriptresponse)
- [ToolInvokeRequest](#toolinvokerequest) / [Response](#toolinvokeresponse)
- [SelectAgentRequest](#selectagentrequest) / [Response](#selectagentresponse)

**Meta-agent types** → see [`meta-agent-patterns.md`](./meta-agent-patterns.md)

---

## AgentMetadataApiData

```typescript
interface AgentMetadataApiData {
  reference_id: string | null;           // optional correlation id echoed back
  tenant: string | null;
  id: number | null;
  eid: string | null;                    // UUID
  name: string | null;
  description: string | null;
  default_parameters: Record<string, any> | null;
  configs: Record<string, any> | null;   // REQUIRED at exec time: { llm_parameters: { model }, verbose }
  active: boolean | null;                // LEGACY. `state` is source of truth for lifecycle.
  markdown_text: string | null;          // full markdown agent definition
  tags: Record<string, any> | null;
  parameters: Record<string, any> | null; // detected {%placeholder} params from sub-tasks
  state: string | null;                  // "DRAFT" | "PUBLISHED" | "RETIRED" | "TESTING" — lifecycle
  conversation_starters: any[] | null;   // array of suggested opening prompts shown in UI
  guardrails: any[] | null;              // array of guardrail rules applied at execution
  ui_configs: Record<string, any> | null; // UI state — { icon, icon_color }
  admin_type: string | null;             // "user" (builder-created) | "system" (platform-owned)
  prompt_name: string | null;
  llm_parameters: Record<string, any> | null; // REQUIRED at execution time; e.g. { model: "claude-opus-4-5-20251101" }
  sys_date_created: string | null;       // ISO datetime
  sys_date_updated: string | null;
  sys_created_by: string | null;         // typically IP address
  sys_updated_by: string | null;
}
```

**Lifecycle notes:**
- `state` is the source of truth for draft/published/retired/testing. `active` is kept for backward compat and is typically `true` for new agents.
- New agents default to `state: "DRAFT"` and `admin_type: "user"` when created from the builder.
- `conversation_starters` and `guardrails` are returned as arrays on the record — the Rita client defaults to `[]` when absent.

## AgentTaskApiData

```typescript
interface AgentTaskApiData {
  reference_id: string | null;
  tenant: string | null;
  id: number | null;
  eid: string | null;                    // UUID
  name: string | null;
  agent_metadata_id: string | null;      // UUID of parent agent
  role: string | null;
  description: string | null;
  goal: string | null;
  backstory: string | null;
  task: string | null;                   // detailed task description/prompt
  expected_output: string | null;
  tools: any[] | null;                   // e.g. ["retrieve_tickets_for_knowledge", "ai_search_tavily"]
  depends_on_tasks: any[] | null;        // names of prerequisite tasks
  configs: Record<string, any> | null;   // e.g. { exit_if_need_inputs: true, exit_if_terminate: true }
  order: number | null;
  active: boolean | null;
  admin_type: string | null;             // "user" | "system" — inherited from parent agent
  sys_date_created: string | null;
  sys_date_updated: string | null;
  sys_created_by: string | null;
  sys_updated_by: string | null;
}
```

## ToolApiData

```typescript
interface ToolApiData {
  reference_id: string | null;
  tenant: string | null;
  id: number | null;
  eid: string | null;                    // UUID
  name: string | null;
  description: string | null;
  default_inputs: Record<string, any> | null;
  inputs: any[] | null;                  // [{ name, description, type }]
  outputs: any[] | null;                 // attribute names
  info_statement: string | null;
  pre_python: string | null;             // pre-processing script
  pre_llm_script: Record<string, any> | null;
  tool_config: Record<string, any> | null;
  post_python: string | null;            // post-processing script
  post_llm_script: Record<string, any> | null;
  active: boolean | null;
  mcp_exposed: boolean | null;
  type: string | null;                   // URL, PYTHON, WORKFLOW, LLM
  state: string | null;                  // "DRAFT" | "PUBLISHED" | "RETIRED" | "TESTING"
  thinking_label: string | null;
  admin_type: string | null;             // "user" | "system"
  sys_date_created: string | null;
  sys_date_updated: string | null;
  sys_created_by: string | null;
  sys_updated_by: string | null;
}
```

## ToolGroupApiData

```typescript
interface ToolGroupApiData {
  reference_id: string | null;
  tenant: string | null;
  id: number | null;
  eid: string | null;
  name: string | null;
  description: string | null;
  active: boolean | null;
  admin_type: string | null;
  sys_date_created: string | null;
  sys_date_updated: string | null;
  sys_created_by: string | null;
  sys_updated_by: string | null;
}
```

## ToolGroupAssociationApiData

```typescript
interface ToolGroupAssociationApiData {
  reference_id: string | null;
  tenant: string | null;
  id: number | null;
  eid: string | null;
  tool: string | null;                   // tool name
  group: string | null;                  // group name
  active: boolean | null;
  admin_type: string | null;
  sys_date_created: string | null;
  sys_date_updated: string | null;
  sys_created_by: string | null;
  sys_updated_by: string | null;
}
```

## AgentMessageApiData

```typescript
interface AgentMessageApiData {
  reference_id: string | null;
  tenant: string | null;
  id: number | null;
  eid: string | null;                    // UUID
  execution_id: string | null;
  role: string | null;                   // "system", "user", "assistant"
  event_type: string | null;             // "execution_complete", etc.
  content: Record<string, any> | null;   // { conversation_id, status, raw }
  sys_date_created: string | null;
  sys_date_updated: string | null;
  sys_created_by: string | null;
  sys_updated_by: string | null;
}
```

## AgentStateApiData

```typescript
interface AgentStateApiData {
  reference_id: string | null;
  tenant: string | null;
  id: number | null;
  eid: string | null;
  execution_id: string | null;
  conversation_id: string | null;
  agent_name: string | null;
  agent_metadata_id: string | null;
  prev_execution_id: string | null;
  stop_requested: boolean | null;
  state: string | null;                  // execution state
  data_start: Record<string, any> | null;
  data_end: Record<string, any> | null;
  custom_data: Record<string, any> | null;
  sys_date_created: string | null;
  sys_date_updated: string | null;
  sys_created_by: string | null;
  sys_updated_by: string | null;
}
```

## AgentConversationApiData

```typescript
interface AgentConversationApiData {
  reference_id: string | null;
  tenant: string | null;
  id: number | null;
  eid: string | null;
  execution_id: string | null;
  conversation_id: string | null;
  agent_metadata_id: string | null;
  data: Record<string, any> | null;
  stop_requested: boolean | null;
  sys_date_created: string | null;
  sys_date_updated: string | null;
  sys_created_by: string | null;
  sys_updated_by: string | null;
}
```

## Request/Response Types

### AgenticRequest (invoke)
```typescript
interface AgenticRequest {
  query: {
    agent_metadata_parameters?: {
      agent_metadata_id?: string;       // EID of the agent
      agent_name?: string;              // alternative to agent_metadata_id
      prev_execution_id?: string;       // continue an existing execution
      parameters?: Record<string, any>; // { utterance, transcript, additional_information, ... }
      configs?: Record<string, any>;    // per-invocation config overrides
      callback?: Record<string, any>;   // callback descriptor (optional)
      matching_text?: string;           // used by agent selection paths
    };
    agents?: any[];                     // inline agent defs (advanced)
    tasks?: any[];                      // inline task defs (advanced)
    tools?: any[];                      // inline tool defs (advanced)
  };
  tenant?: string;
}
```

Minimal example:
```json
{ "query": { "agent_metadata_parameters": { "agent_name": "HelloAgent", "parameters": { "utterance": "Hi!" } } } }
```

### ServiceResponse
```typescript
interface ServiceResponse {
  result: Record<string, any>;
  status: string;
  tenant?: string;
}
```

### DeleteResponse
```typescript
interface DeleteResponse {
  success: boolean;
  message: string;
  count?: number;
}
```

### BulkDeleteResponse
```typescript
interface BulkDeleteResponse {
  success: boolean;
  message: string;
  count: number;
}
```

### DuplicateAgentRequest
```typescript
interface DuplicateAgentRequest {
  existing_name: string;
  new_name: string;
  tenant?: string;
  sys_created_by?: string;
}
```

### DuplicateAgentResponse
```typescript
interface DuplicateAgentResponse {
  agent: AgentMetadataApiData;
  tasks: AgentTaskApiData[];
}
```

### PrepareAgentDefinitionsRequest
```typescript
interface PrepareAgentDefinitionsRequest {
  agent_metadata_id: string;           // required
  parameters?: Record<string, any>;
  configs?: Record<string, any>;
}
```

### CleanupAgentMessagesRequest
```typescript
interface CleanupAgentMessagesRequest {
  batch_time_window?: number | string;  // default: 10
}
```

### CleanupResponse
```typescript
interface CleanupResponse {
  success: boolean;
  message: string;
}
```

### RetrieveDataFromDatasourceRequest
```typescript
interface RetrieveDataFromDatasourceRequest {
  ds_config?: Record<string, any>;
  sql_parameters?: Record<string, any>;
  randomize?: boolean;                  // default: false
  n?: number;                           // default: -1 (all)
}
```

### RetrieveDataFromDatasourceResponse
```typescript
interface RetrieveDataFromDatasourceResponse {
  success: boolean;
  data?: any[];
  count: number;                        // default: 0
  message?: string;
}
```

### RequestStopAgentRequest
```typescript
interface RequestStopAgentRequest {
  execution_id: string;                 // required
  tenant?: string;
  sys_updated_by?: string;
}
```

### DuplicateToolRequest
```typescript
interface DuplicateToolRequest {
  existing_name: string;                // required
  new_name: string;                     // required
  reference_id?: string;
  tenant?: string;
  sys_created_by?: string;
}
```

### ExecutePythonScriptRequest
```typescript
interface ExecutePythonScriptRequest {
  script: string;                       // required — must define `def script(inputs, params)`
  inputs?: Record<string, any>;
  params?: Record<string, any>;
  reference_id?: string;
  tenant?: string;
}
```

### ExecutePythonScriptResponse
```typescript
interface ExecutePythonScriptResponse {
  success: boolean;
  output?: string | Record<string, any>;
  error?: string;
  reference_id?: string;
  tenant?: string;
}
```

### ToolInvokeRequest
```typescript
interface ToolInvokeRequest {
  tool_name: string;                    // required
  input?: Record<string, any>;
  for_agent?: boolean;                  // default: true
  verbose?: boolean;                    // default: false
  reference_id?: string;
  tenant?: string;
}
```

### ToolInvokeResponse
```typescript
interface ToolInvokeResponse {
  success: boolean;
  output?: string | Record<string, any>;
  error?: string;
  reference_id?: string;
  tenant?: string;
}
```

### SelectAgentRequest
```typescript
interface SelectAgentRequest {
  parameters?: Record<string, any>;
  tool_name?: string;
  prompt_name?: string;
  verbose?: boolean;
  reference_id?: string;
  tenant?: string;
}
```

### SelectAgentResponse
```typescript
interface SelectAgentResponse {
  success: boolean;
  selected_agent?: Record<string, any>;
}
```

---

## Meta-Agent Types

Meta-agent request, result, parser, and SSE event payload shapes live with their flow documentation in [`meta-agent-patterns.md`](./meta-agent-patterns.md) to keep the definition next to the usage. Types defined there: `MetaAgentExecuteParams`, `MetaAgentExecuteResult`, `ImprovedInstructions`, `ImproveInstructionsBody`, `CancelMetaAgentBody`, `MetaAgentProgressEvent`, `MetaAgentCompletedEvent`, `MetaAgentFailedEvent`.
