# LLM Service API Endpoints

Base URL: `https://llm-service-staging.resolve.io`

All endpoints return arrays directly (not wrapped in `{ data: [] }`). All list endpoints support `limit` and `offset` pagination.

---

## Agents Metadata (`/agents/metadata`)

### List agents
```
GET /agents/metadata?eid=&name=&description=&active=true&limit=50&offset=0
→ AgentMetadataApiData[]
```
Filters: `eid`, `name`, `description`, `active` (boolean), `limit`, `offset`

### Filter agents (advanced query syntax)
```
GET /agents/metadata/filter?query=<filter>&limit=&offset=&order_by=
→ AgentMetadataApiData[]
```
Django-like query syntax. See [Filter Query Syntax](#filter-query-syntax) section below.

Examples:
- `active__exact=true` — active agents
- `name__icontains="assistant"&active__exact=true` — active agents with "assistant" in name
- `configs.provider__exact="openai"` — agents using OpenAI provider

### Get by EID
```
GET /agents/metadata/eid/{eid}
→ AgentMetadataApiData
```

### Get by name
```
GET /agents/metadata/name/{name}
→ AgentMetadataApiData
```

### Get by ID
```
GET /agents/metadata/{metadata_id}
→ AgentMetadataApiData
```

### Create
```
POST /agents/metadata
Body: AgentMetadataApiData (with markdown_text for markdown-based creation)
→ 201 AgentMetadataApiData
```

### Update by EID
```
PUT /agents/metadata/eid/{eid}
Body: AgentMetadataApiData (partial)
→ AgentMetadataApiData
```

### Update by ID
```
PUT /agents/metadata/{metadata_id}
Body: AgentMetadataApiData (partial)
→ AgentMetadataApiData
```

### Delete by EID
```
DELETE /agents/metadata/eid/{eid}
→ { success: boolean, message: string, count?: number }
```

### Delete by ID
```
DELETE /agents/metadata/{metadata_id}
→ { success: boolean, message: string, count?: number }
```

### Duplicate agent
```
POST /agents/metadata/duplicate
Body: { existing_name: string, new_name: string, tenant?: string, sys_created_by?: string }
→ 201 { agent: AgentMetadataApiData, tasks: AgentTaskApiData[] }
```

### Update agent parameters from sub-tasks
```
POST /agents/metadata/eid/{eid}/update_parameters
→ object (detected parameters)
```
Scans sub-tasks for `{%placeholder}` patterns and updates the agent's `parameters` field.

### Update ALL agents' parameters from sub-tasks
```
POST /agents/metadata/update_all_agent_parameters?reset=false
→ object (detected parameters per agent)
```
Bulk version — scans all agents. Set `reset=true` to clear existing parameters before updating.

---

## Agent Tasks (`/agents/tasks`)

### List tasks
```
GET /agents/tasks?agent_metadata_id={eid}&name=&active=true&limit=50&offset=0
→ AgentTaskApiData[]
```
Filters: `name`, `agent_metadata_id` (UUID string), `active`, `limit`, `offset`

### Get by EID
```
GET /agents/tasks/eid/{eid}
→ AgentTaskApiData
```

### Get by name
```
GET /agents/tasks/name/{name}
→ AgentTaskApiData
```

### Get by ID
```
GET /agents/tasks/{task_id}
→ AgentTaskApiData
```

### Create
```
POST /agents/tasks
Body: AgentTaskApiData
→ 201 AgentTaskApiData
```

### Update by EID
```
PUT /agents/tasks/eid/{eid}
Body: AgentTaskApiData (partial)
→ AgentTaskApiData
```

### Update by ID
```
PUT /agents/tasks/{task_id}
Body: AgentTaskApiData (partial)
→ AgentTaskApiData
```

### Delete by EID
```
DELETE /agents/tasks/eid/{eid}
→ { success: boolean, message: string, count?: number }
```

### Delete by ID
```
DELETE /agents/tasks/{task_id}
→ { success: boolean, message: string, count?: number }
```

---

## Tools (`/tools/`)

### List tools
```
GET /tools/?name=&type=&active=true&limit=50&offset=0
→ ToolApiData[]
```
Filters: `name`, `type` (URL/PYTHON/WORKFLOW/LLM), `active`, `limit`, `offset`

### Filter tools (advanced query syntax)
```
GET /tools/filter?query=<filter>&limit=&offset=&order_by=
→ ToolApiData[]
```
Django-like query syntax. See [Filter Query Syntax](#filter-query-syntax) section below.

Examples:
- `active__exact=true` — active tools
- `type__in=["api", "script"]` — tools of specific types
- `tool_config__json_contains={"enabled": true}` — tools with specific config

### Get by EID / name / ID
```
GET /tools/eid/{eid}
GET /tools/name/{name}
GET /tools/{tool_id}
→ ToolApiData
```

### Create
```
POST /tools/
Body: ToolApiData
→ 201 ToolApiData
```

### Update by ID
```
PUT /tools/{tool_id}
Body: ToolApiData (partial)
→ ToolApiData
```

### Delete by ID
```
DELETE /tools/{tool_id}
→ { success: boolean, message: string, count?: number }
```

### Duplicate tool
```
POST /tools/duplicate
Body: { existing_name: string, new_name: string, reference_id?: string, tenant?: string, sys_created_by?: string }
→ 201 ToolApiData
```

### Invoke tool
```
POST /tools/invoke
Body: { tool_name: string, input?: object, for_agent?: boolean, verbose?: boolean, reference_id?: string, tenant?: string }
→ { success: boolean, output?: string|object, error?: string }
```

### Execute Python script
```
POST /tools/execute_python_script
Body: { script: string, inputs?: object, params?: object, reference_id?: string, tenant?: string }
→ { success: boolean, output?: string|object, error?: string }
```
The `script` string must define `def script(inputs, params)`.

### Tool Groups
```
POST /tools/groups                    → 201 ToolGroupApiData
GET  /tools/groups                    → ToolGroupApiData[]
GET  /tools/groups/{group_id}         → ToolGroupApiData
PUT  /tools/groups/{group_id}         → ToolGroupApiData
DELETE /tools/groups/{group_id}       → DeleteResponse
GET  /tools/groups/eid/{eid}          → ToolGroupApiData
DELETE /tools/groups/eid/{eid}        → DeleteResponse
GET  /tools/groups/name/{name}        → ToolGroupApiData
DELETE /tools/groups/name/{name}      → DeleteResponse
```

### Tool-Group Associations
```
POST /tools/associations                             → 201 ToolGroupAssociationApiData
GET  /tools/associations?tool=&group=&active=        → ToolGroupAssociationApiData[]
GET  /tools/associations/{association_id}             → ToolGroupAssociationApiData
PUT  /tools/associations/{association_id}             → ToolGroupAssociationApiData
DELETE /tools/associations/{association_id}           → DeleteResponse
GET  /tools/associations/eid/{eid}                   → ToolGroupAssociationApiData
DELETE /tools/associations/eid/{eid}                  → DeleteResponse
GET/DELETE /tools/associations/mapping?tool=&group=   → ToolGroupAssociationApiData / DeleteResponse
GET/DELETE /tools/associations/tool/{tool}            → ToolGroupAssociationApiData[] / BulkDeleteResponse
GET/DELETE /tools/associations/group/{group}          → ToolGroupAssociationApiData[] / BulkDeleteResponse
```

---

## Agent Execution (`/services/agentic`)

### Invoke agent
```
POST /services/agentic
Body: {
  query: {
    agent_metadata_parameters: {
      agent_name: string,
      prev_execution_id?: string,
      parameters: { utterance: string, transcript?: string, additional_information?: string }
    }
  },
  tenant?: string
}
→ { result: { conversation_id, execution_id, agent_metadata_id, status, message }, status: "success", tenant }
```

### Stop agent
```
POST /agents/request_stop_agent
Body: { execution_id: string, tenant?: string, sys_updated_by?: string }
→ { success: boolean, message: string }
```

---

## Agent Selection (`/agents/select-agent`)

### Select best matching agent
```
POST /agents/select-agent
Body: {
  parameters?: Record<string, any>,
  tool_name?: string,
  prompt_name?: string,
  verbose?: boolean,
  reference_id?: string,
  tenant?: string
}
→ { success: boolean, selected_agent?: object }
```
Selects the best matching agent based on provided criteria (parameters, tool name, prompt name).

---

## Agent Messages (`/agents/messages`)

### Create message
```
POST /agents/messages
Body: AgentMessageApiData
→ 201 AgentMessageApiData
```

### List messages with filters
```
GET /agents/messages?execution_id=&event_type=&role=&limit=&offset=
→ AgentMessageApiData[]
```

### Get message by ID
```
GET /agents/messages/{message_id}
→ AgentMessageApiData
```

### Get message by EID
```
GET /agents/messages/eid/{eid}
→ AgentMessageApiData
```

### Update message
```
PUT /agents/messages/{message_id}
Body: AgentMessageApiData (partial)
→ AgentMessageApiData
```

### Delete message by ID
```
DELETE /agents/messages/{message_id}
→ DeleteResponse
```

### Delete message by EID
```
DELETE /agents/messages/eid/{eid}
→ DeleteResponse
```

### Get execution messages (raw)
```
GET /agents/messages/execution/{execution_id}?limit=&offset=
→ AgentMessageApiData[]
```

### Delete all messages for an execution
```
DELETE /agents/messages/execution/{execution_id}
→ BulkDeleteResponse
```

### Poll execution messages (UI-formatted)
```
GET /agents/messages/execution/poll/{execution_id}?limit=&offset=
→ object[] (formatted for UI)
```

### Poll conversation messages (UI-formatted)
```
GET /agents/messages/conversation/poll/{conversation_id}?limit=&offset=
→ object[] (formatted for UI, across all executions)
```

---

## Agent State (`/agents/states`)

### Create state
```
POST /agents/states
Body: AgentStateApiData
→ 201 AgentStateApiData
```

### List states with filters
```
GET /agents/states?execution_id=&conversation_id=&agent_name=&agent_metadata_id=&prev_execution_id=&stop_requested=&state=&limit=&offset=
→ AgentStateApiData[]
```

### Get state by ID
```
GET /agents/states/{state_id}
→ AgentStateApiData
```

### Get state by EID
```
GET /agents/states/eid/{eid}
→ AgentStateApiData
```

### Get state by mapping (execution + conversation)
```
GET /agents/states/mapping?execution_id=&conversation_id=
→ AgentStateApiData
```

### Get execution state
```
GET /agents/states/execution/{execution_id}
→ AgentStateApiData
```

### Get states by conversation
```
GET /agents/states/conversation/{conversation_id}?limit=&offset=
→ AgentStateApiData[]
```

### Update state by ID
```
PUT /agents/states/{state_id}
Body: AgentStateApiData (partial)
→ AgentStateApiData
```

### Update state by EID
```
PUT /agents/states/eid/{eid}
Body: AgentStateApiData (partial)
→ AgentStateApiData
```

### Delete state by ID
```
DELETE /agents/states/{state_id}
→ DeleteResponse
```

### Delete state by EID
```
DELETE /agents/states/eid/{eid}
→ DeleteResponse
```

### Delete states by execution
```
DELETE /agents/states/execution/{execution_id}
→ BulkDeleteResponse
```

### Delete states by conversation
```
DELETE /agents/states/conversation/{conversation_id}
→ BulkDeleteResponse
```

---

## Agent Conversations (`/agents/conversations`)

### Create conversation
```
POST /agents/conversations
Body: AgentConversationApiData
→ 201 AgentConversationApiData
```

### List conversations
```
GET /agents/conversations?execution_id=&conversation_id=&agent_metadata_id=&limit=&offset=
→ AgentConversationApiData[]
```

### Get conversation by ID
```
GET /agents/conversations/{conversation_id}
→ AgentConversationApiData
```
Note: `conversation_id` here is the numeric DB ID, not the string conversation_id field.

### Get conversation by EID
```
GET /agents/conversations/eid/{eid}
→ AgentConversationApiData
```

### Get conversation by mapping (execution + conversation)
```
GET /agents/conversations/mapping?execution_id=&conversation_id=
→ AgentConversationApiData
```

### Get conversations by execution
```
GET /agents/conversations/execution/{execution_id}?limit=&offset=
→ AgentConversationApiData[]
```

### Get executions for a conversation
```
GET /agents/conversations/conversation/{conversation_id}?limit=&offset=
→ AgentConversationApiData[]
```

### Update conversation
```
PUT /agents/conversations/{conversation_id}
Body: AgentConversationApiData (partial)
→ AgentConversationApiData
```

### Delete conversation by ID
```
DELETE /agents/conversations/{conversation_id}
→ DeleteResponse
```

### Delete conversation by EID
```
DELETE /agents/conversations/eid/{eid}
→ DeleteResponse
```

### Delete conversations by execution
```
DELETE /agents/conversations/execution/{execution_id}
→ BulkDeleteResponse
```

### Delete conversations by conversation_id (string)
```
DELETE /agents/conversations/conversation/{conversation_id}
→ BulkDeleteResponse
```

---

## Agent Definitions

### Prepare agent definitions
```
POST /agents/definitions/prepare
Body: { agent_metadata_id: string, parameters?: object, configs?: object }
→ object (prepared definitions)
```
Resolves agent metadata + task definitions, applies parameter substitutions, returns prepared definitions ready for execution.

---

## Agent Maintenance

### Cleanup old agent messages
```
POST /agents/cleanup_agent_messages
Body: { batch_time_window?: number | string }  (default: 10)
→ { success: boolean, message: string }
```
Deletes agent messages older than 60 days in batches.

### Retrieve data from datasource
```
POST /agents/retrieve_data_from_datasource
Body: { ds_config?: object, sql_parameters?: object, randomize?: boolean, n?: number }
→ { success: boolean, data?: any[], count: number, message?: string }
```
Retrieves data from a datasource configuration with optional randomization and limiting.

---

## Filter Query Syntax

Used by `/agents/metadata/filter` and `/tools/filter` endpoints.

### Basic syntax
`<field>__<keyword>=<value>`

### Supported keywords
| Category | Keywords |
|---|---|
| String matching | `exact`, `iexact`, `contains`, `icontains`, `startswith`, `istartswith`, `endswith`, `iendswith` |
| Comparison | `gt`, `gte`, `lt`, `lte` |
| Collection | `in` |
| Null check | `isnull` |

### JSON field queries (for JSON columns like `configs`, `info`, `tool_config`)
- Path access: `configs.provider__exact="openai"`, `configs.llm_parameters.model__contains="gpt"`
- JSON keywords: `has_key`, `has_keys`, `has_any_keys`, `json_contains`, `json_contained_by`

### Logical operators
- AND: `&` (e.g., `status__exact="success"&event_type__contains="api"`)
- OR: `|` (e.g., `status__exact="success"|status__exact="pending"`)
- NOT: `^` prefix (e.g., `^status__exact="error"`)

### Sorting (order_by parameter)
- Ascending: `name`
- Descending: `-name`
- Multiple: `status,-event_time` (status ASC, then event_time DESC)
