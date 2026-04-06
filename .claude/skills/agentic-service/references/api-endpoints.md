# LLM Service API Endpoints

Base URL: `https://llm-service-staging.resolve.io`

All endpoints return arrays directly (not wrapped in `{ data: [] }`). All list endpoints support `limit` and `offset` pagination.

---

## Agents Metadata (`/agents/metadata`)

### List agents
```
GET /agents/metadata?name=&description=&active=true&limit=50&offset=0
→ AgentMetadataApiData[]
```
Filters: `eid`, `name`, `description`, `active` (boolean), `limit`, `offset`

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

### Delete by EID
```
DELETE /agents/metadata/eid/{eid}
→ { success: boolean, message: string, count?: number }
```

### Duplicate agent
```
POST /agents/metadata/duplicate
Body: { existing_name: string, new_name: string, tenant?: string }
→ 201 { agent: AgentMetadataApiData, tasks: AgentTaskApiData[] }
```

### Update agent parameters from sub-tasks
```
POST /agents/metadata/eid/{eid}/update_parameters
→ object (detected parameters)
```

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

### Delete by EID
```
DELETE /agents/tasks/eid/{eid}
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

### Get by EID / name / ID
```
GET /tools/eid/{eid}
GET /tools/name/{name}
GET /tools/{tool_id}
→ ToolApiData
```

### Invoke tool
```
POST /tools/invoke
Body: { tool_name: string, input?: object, for_agent?: boolean, verbose?: boolean }
→ { success: boolean, output?: string|object, error?: string }
```

### Tool Groups
```
GET /tools/groups
POST /tools/groups
GET/PUT/DELETE /tools/groups/{group_id}
GET/DELETE /tools/groups/eid/{eid}
```

### Tool-Group Associations
```
GET /tools/associations?tool=&group=&active=
POST /tools/associations
GET/DELETE /tools/associations/mapping?tool=&group=
GET/DELETE /tools/associations/tool/{tool}
GET/DELETE /tools/associations/group/{group}
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
Body: { execution_id: string, tenant?: string }
→ { success: boolean, message: string }
```

---

## Agent Messages (`/agents/messages`)

### Get execution messages (raw)
```
GET /agents/messages/execution/{execution_id}?limit=&offset=
→ AgentMessageApiData[]
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

### List messages with filters
```
GET /agents/messages?execution_id=&event_type=&role=&limit=&offset=
→ AgentMessageApiData[]
```

---

## Agent State (`/agents/states`)

### Get execution state
```
GET /agents/states/execution/{execution_id}
→ AgentStateApiData
```

### List states with filters
```
GET /agents/states?execution_id=&conversation_id=&agent_name=&agent_metadata_id=&state=&limit=&offset=
→ AgentStateApiData[]
```

---

## Agent Conversations (`/agents/conversations`)

### List conversations
```
GET /agents/conversations?execution_id=&conversation_id=&agent_metadata_id=&limit=&offset=
→ AgentConversationApiData[]
```

### Prepare agent definitions
```
POST /agents/definitions/prepare
Body: { agent_metadata_id: string, parameters?: object, configs?: object }
→ object (prepared definitions)
```
