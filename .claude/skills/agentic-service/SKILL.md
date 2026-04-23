---
name: agentic-service
description: Integration skill for the Rita ↔ LLM Service Agentic API. Use whenever Rita code touches agent metadata (create/update/duplicate, DRAFT/PUBLISHED/RETIRED/TESTING state, conversation_starters, guardrails, admin_type), agent tasks, agent execution (invoke/poll/continue/stop), tools (CRUD/invoke/execute_python_script), meta-agent flows (improve instructions, generate starters, cancel), SSE events (`meta_agent_progress|completed|failed`), or anything under `packages/client/src/components/agents/*` or `packages/api-server/src/services/AgenticService.ts` / `metaAgentExecution/*`.
---

# Agentic Service Integration

Knowledge base for integrating Rita with the external LLM Service API (Agentic Service).

## When to Use

- Wiring agent pages (AgentsPage, AgentBuilderPage, AgentChatPage, AgentTestPage) to real API
- Creating/modifying TanStack Query hooks for agent data
- Building backend routes that proxy to the LLM Service
- Implementing agent execution (invoke, poll, continue) flows
- Working with agent markdown definitions
- Implementing meta-agent flows (improve instructions, generate conversation starters)
- Working with meta-agent SSE events (progress, completed, failed)

## Base URLs

| Environment | API | Swagger Docs |
|---|---|---|
| Staging | `https://llm-service-staging.resolve.io` | `https://llm-service-web-staging.resolve.io/new_ui/docs` |

**Auth**: API requires `X-API-Key` header. Swagger docs UI is VPN-protected (no key needed).

Env vars (in `.env`):
- `LLM_SERVICE_URL` — base URL (default: `https://llm-service-staging.resolve.io`)
- `LLM_SERVICE_API_KEY` — value for `X-API-Key` header
- `LLM_SERVICE_DB_TENANT` — tenant identifier sent with agent requests. `AgenticService` logs a warning when unset and most calls will fail.
- `META_AGENT_MODE` — meta-agent execution strategy: `"direct"` (default) or `"workflow"`

## Architecture

```
Client (React) → Rita API Server (Express) → LLM Service API
```

- **Never call LLM Service directly from client** — always proxy through Rita API server
- Rita API server maps LLM Service responses to Rita client types

## Backend Pattern

Follow `packages/api-server/src/services/WebhookService.ts`:
- Axios instance with base URL from `LLM_SERVICE_URL` env var
- Error handling with logging
- Service class with typed methods

Route pattern from `packages/api-server/src/routes/members.ts`:
- OpenAPI registry + Zod schemas
- `authenticateUser` + `addUserContextToLogs` middleware
- Express router with try/catch handlers

Meta-agent pattern from `packages/api-server/src/services/metaAgentExecution/`:
- Strategy interface (`MetaAgentStrategy`) with Direct and Workflow implementations
- Background polling with SSE event relay
- See `references/meta-agent-patterns.md`

## Frontend Pattern

Follow `packages/client/src/hooks/api/useConversations.ts`:
- Query key factory pattern
- `apiRequest<T>()` from `services/api.ts`
- TanStack Query hooks with cache invalidation on mutations

## API Groups (see references/)

**LLM Service (proxied by Rita API server):**

| Group | Primary Use | Reference |
|---|---|---|
| `/agents/metadata` | Agent CRUD, list, filter (incl. `state`, `admin_type`), duplicate | `references/api-endpoints.md` |
| `/agents/metadata/eid/{eid}/update_parameters` | Re-scan sub-tasks for `{%placeholder}` params (single / bulk variant) | `references/api-endpoints.md` |
| `/agents/tasks` | Sub-tasks with tools (skills) | `references/api-endpoints.md` |
| `/agents/definitions/prepare` | Resolve agent + tasks + substitutions for execution | `references/api-endpoints.md` |
| `/services/agentic` | Invoke agent execution | `references/async-execution-patterns.md` |
| `/agents/request_stop_agent` | Request stop on a running execution | `references/async-execution-patterns.md` |
| `/agents/messages` | Execution messages, polling (raw + UI-formatted), CRUD | `references/async-execution-patterns.md` |
| `/agents/states` | Execution state tracking, CRUD | `references/async-execution-patterns.md` |
| `/agents/conversations` | Conversation-execution mapping, CRUD | `references/async-execution-patterns.md` |
| `/tools/` | Tool CRUD, filter (incl. `state`, `admin_type`), duplicate | `references/api-endpoints.md` |
| `/tools/invoke` | Invoke a tool by name with inputs | `references/api-endpoints.md` |
| `/tools/execute_python_script` | Run ad-hoc `def script(inputs, params)` Python | `references/api-endpoints.md` |
| `/tools/groups`, `/tools/associations` | Tool grouping + tool↔group links | `references/api-endpoints.md` |
| `/agents/cleanup_agent_messages` | Maintenance (delete old messages) | `references/api-endpoints.md` |
| `/agents/retrieve_data_from_datasource` | Datasource data retrieval | `references/api-endpoints.md` |
| `/agents/select-agent` | Agent selection by criteria | `references/api-endpoints.md` |

**Rita API server (meta-agent / builder endpoints):**

| Group | Primary Use | Reference |
|---|---|---|
| `/api/agents/improve-instructions` | Meta-agent: improve instructions | `references/meta-agent-patterns.md` |
| `/api/agents/generate` / `/api/agents/creation-input` / `/api/agents/cancel-creation` | Meta-agent: create/update agents via builder (multi-turn, SSE-driven) — schemas: `AgentGenerateBodySchema`, `AgentCreationInputBodySchema`, `AgentCancelCreationBodySchema` in `packages/api-server/src/schemas/agent.ts` | `references/meta-agent-patterns.md` |
| `/api/agents/cancel-meta-agent` | Cancel generic meta-agent execution | `references/meta-agent-patterns.md` |

## Type Mapping (LLM Service → Rita Client)

| LLM Service | Rita Client | Notes |
|---|---|---|
| `AgentMetadataApiData` | `AgentTableRow` | For agents list/table |
| `AgentMetadataApiData` | `AgentConfig` / `AgentDetailResponse` | For builder page |
| `AgentMetadataApiData` | `AgentChatConfig` | For chat page |
| `AgentTaskApiData.tools` | `AgentTableRow.skills` | Flatten from tasks |

### AgentMetadata → AgentTableRow mapping

```
eid → id
name → name
description ?? "" → description
state (lowercased) → status         // "DRAFT"|"PUBLISHED"|"RETIRED"|"TESTING" → "draft"|"published"|...
(from tasks) flatMap(t => t.tools) → skills
sys_date_updated formatted → lastUpdated
null → updatedBy  (LLM service has IPs, not user data)
null → owner      (same)
```

**Lifecycle source of truth: `state`**, not `active`. New builder agents default to `state: "DRAFT"`, `admin_type: "user"`. The Rita server's `AgentListQuerySchema` accepts `state=DRAFT|PUBLISHED|RETIRED|TESTING` and forwards as `state__exact=` to the filter endpoint.

### AgentMetadata → AgentDetailResponse (builder)

```
eid → id
name → name
state → state                         // enum preserved
ui_configs.icon → iconId
ui_configs.icon_color → iconColorId
admin_type ?? "user" → adminType
conversation_starters ?? [] → conversationStarters
guardrails ?? [] → guardrails
description, instructions, role, agentType, knowledgeSources, tools, skills,
responsibilities, completionCriteria, capabilities → default to empty/null
sys_date_created → createdAt
sys_date_updated → updatedAt
```

## Reference Files

- `references/api-endpoints.md` — All CRUD endpoints with filters and response types
- `references/data-models.md` — Exact schemas from OpenAPI spec
- `references/markdown-agent-format.md` — Agent definition markdown template
- `references/async-execution-patterns.md` — Invoke, poll, continue protocol
- `references/meta-agent-patterns.md` — Meta-agent execution strategy, SSE events, client hooks
