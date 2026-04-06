# LLM Service Data Models

Exact schemas from the OpenAPI specification.

---

## AgentMetadataApiData

```typescript
interface AgentMetadataApiData {
  id: number | null;
  eid: string | null;                    // UUID
  name: string | null;
  description: string | null;
  default_parameters: Record<string, any> | null;
  configs: Record<string, any> | null;   // includes llm_parameters
  active: boolean | null;
  markdown_text: string | null;          // full markdown agent definition
  tags: Record<string, any> | null;
  parameters: Record<string, any> | null; // detected {%placeholder} params from sub-tasks
  tenant: string | null;
  prompt_name: string | null;
  llm_parameters: Record<string, any> | null;
  sys_date_created: string | null;       // ISO datetime
  sys_date_updated: string | null;
  sys_created_by: string | null;         // typically IP address
  sys_updated_by: string | null;
}
```

## AgentTaskApiData

```typescript
interface AgentTaskApiData {
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
  tenant: string | null;
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
  thinking_label: string | null;
  sys_date_created: string | null;
  sys_date_updated: string | null;
  sys_created_by: string | null;
  sys_updated_by: string | null;
}
```

## AgentMessageApiData

```typescript
interface AgentMessageApiData {
  id: number | null;
  eid: string | null;                    // UUID
  execution_id: string | null;
  role: string | null;                   // "system", "user", "assistant"
  event_type: string | null;             // "execution_complete", etc.
  content: Record<string, any> | null;   // { conversation_id, status, raw }
  tenant: string | null;
  sys_date_created: string | null;
  sys_date_updated: string | null;
  sys_created_by: string | null;
  sys_updated_by: string | null;
}
```

## AgentStateApiData

```typescript
interface AgentStateApiData {
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
  tenant: string | null;
  sys_date_created: string | null;
  sys_date_updated: string | null;
  sys_created_by: string | null;
  sys_updated_by: string | null;
}
```

## AgentConversationApiData

```typescript
interface AgentConversationApiData {
  id: number | null;
  eid: string | null;
  execution_id: string | null;
  conversation_id: string | null;
  agent_metadata_id: string | null;
  data: Record<string, any> | null;
  stop_requested: boolean | null;
  tenant: string | null;
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
  query: Record<string, any>;  // required
  tenant?: string;
}
// query example:
// { agent_metadata_parameters: { agent_name: "HelloAgent", parameters: { utterance: "Hi!" } } }
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
