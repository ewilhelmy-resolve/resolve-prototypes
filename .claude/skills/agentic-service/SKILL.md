---
name: agentic-service
description: Integration skill for the LLM Service Agentic API. Use when creating, wiring, or modifying agent features, agent API hooks, agent pages, or agent execution flows in Rita.
---

# Agentic Service Integration

Knowledge base for integrating Rita with the external LLM Service API (Agentic Service).

## When to Use

- Wiring agent pages (AgentsPage, AgentBuilderPage, AgentChatPage, AgentTestPage) to real API
- Creating/modifying TanStack Query hooks for agent data
- Building backend routes that proxy to the LLM Service
- Implementing agent execution (invoke, poll, continue) flows
- Working with agent markdown definitions

## Base URLs

| Environment | API | Swagger Docs |
|---|---|---|
| Staging | `https://llm-service-staging.resolve.io` | `https://llm-service-web-staging.resolve.io/new_ui/docs` |

**Auth**: API requires `X-API-Key` header. Swagger docs UI is VPN-protected (no key needed).

Env vars (in `.env`):
- `LLM_SERVICE_URL` — base URL (default: `https://llm-service-staging.resolve.io`)
- `LLM_SERVICE_API_KEY` — value for `X-API-Key` header

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

## Frontend Pattern

Follow `packages/client/src/hooks/api/useConversations.ts`:
- Query key factory pattern
- `apiRequest<T>()` from `services/api.ts`
- TanStack Query hooks with cache invalidation on mutations

## API Groups (see references/)

| Group | Primary Use | Reference |
|---|---|---|
| `/agents/metadata` | Agent CRUD, list, filter, duplicate | `references/api-endpoints.md` |
| `/agents/tasks` | Sub-tasks with tools (skills) | `references/api-endpoints.md` |
| `/agents/definitions` | Prepare agent definitions for execution | `references/api-endpoints.md` |
| `/services/agentic` | Invoke agent execution | `references/async-execution-patterns.md` |
| `/agents/messages` | Execution messages, polling, CRUD | `references/async-execution-patterns.md` |
| `/agents/states` | Execution state tracking, CRUD | `references/async-execution-patterns.md` |
| `/agents/conversations` | Conversation-execution mapping, CRUD | `references/async-execution-patterns.md` |
| `/tools/` | Tool CRUD, filter, invoke, duplicate | `references/api-endpoints.md` |
| `/agents/cleanup_*` | Maintenance (cleanup old messages) | `references/api-endpoints.md` |
| `/agents/retrieve_data_*` | Datasource data retrieval | `references/api-endpoints.md` |

## Type Mapping (LLM Service → Rita Client)

| LLM Service | Rita Client | Notes |
|---|---|---|
| `AgentMetadataApiData` | `AgentTableRow` | For agents list/table |
| `AgentMetadataApiData` | `AgentConfig` | For builder page |
| `AgentMetadataApiData` | `AgentChatConfig` | For chat page |
| `AgentTaskApiData.tools` | `AgentTableRow.skills` | Flatten from tasks |

### AgentMetadata → AgentTableRow mapping

```
eid → id
name → name
description ?? "" → description
active ? "published" : "draft" → status
(from tasks) flatMap(t => t.tools) → skills
sys_date_updated formatted → lastUpdated
null → updatedBy  (LLM service has IPs, not user data)
null → owner      (same)
```

## Reference Files

- `references/api-endpoints.md` — All CRUD endpoints with filters and response types
- `references/data-models.md` — Exact schemas from OpenAPI spec
- `references/markdown-agent-format.md` — Agent definition markdown template
- `references/async-execution-patterns.md` — Invoke, poll, continue protocol
