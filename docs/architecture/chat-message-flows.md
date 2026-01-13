# Chat Message Flows Architecture

This document explains how messages flow through Rita's chat systems, covering both regular Rita Go chats and iframe-embedded chats.

## Overview

Rita has two chat entry points:
- **Rita Go** (`/chat`) - Main app with Keycloak authentication
- **Iframe Chat** (`/iframe/chat`) - Embeddable chat using Valkey session config

Both flows converge at the webhook → RabbitMQ → SSE pipeline for responses.

---

## 1. Identity Model

### User ID Types

| ID Type | Source | Example | Used By |
|---------|--------|---------|---------|
| Rita User ID | `user_profiles.user_id` | `abc123-...` | DB, SSE routing |
| Keycloak ID | `user_profiles.keycloak_id` | `jarvis-xyz789-...` | Auth lookup |
| Valkey userGuid | Valkey session payload | `xyz789-...` | Webhook payload |

### Legacy vs New Users

```
NEW USER (post-JIT):
  keycloak_id: jarvis-xyz789
  user_id: xyz789           ← Same as Valkey userGuid

LEGACY USER (pre-JIT):
  keycloak_id: jarvis-xyz789
  user_id: abc123           ← Different from Valkey userGuid
```

---

## 2. Database Schema (Relevant Tables)

```
┌─────────────────────────────────────────────────────────────┐
│ user_profiles                                               │
├─────────────────────────────────────────────────────────────┤
│ user_id (PK)          │ Rita internal ID                    │
│ keycloak_id (UNIQUE)  │ "jarvis-{userGuid}" for iframe      │
│ email                 │                                     │
│ active_organization_id│ FK → organizations                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ conversations                                               │
├─────────────────────────────────────────────────────────────┤
│ id (PK)               │ conversation_id                     │
│ organization_id       │ FK → organizations                  │
│ user_id               │ FK → user_profiles (Rita user ID)   │
│ title                 │                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ messages                                                    │
├─────────────────────────────────────────────────────────────┤
│ id (PK)               │ message_id                          │
│ conversation_id       │ FK → conversations                  │
│ organization_id       │ FK → organizations                  │
│ user_id               │ FK → user_profiles                  │
│ role                  │ 'user' | 'assistant'                │
│ message               │ content text                        │
│ status                │ 'pending' | 'completed'             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Rita Go Regular Chat Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           RITA GO CHAT FLOW                                  │
└──────────────────────────────────────────────────────────────────────────────┘

  ┌─────────┐         ┌─────────┐         ┌──────────┐         ┌─────────────┐
  │ Browser │         │ Rita Go │         │ API      │         │ PostgreSQL  │
  │         │         │ Client  │         │ Server   │         │             │
  └────┬────┘         └────┬────┘         └────┬─────┘         └──────┬──────┘
       │                   │                   │                      │
       │  1. Keycloak Login                    │                      │
       │──────────────────►│                   │                      │
       │                   │                   │                      │
       │  2. Load Chat UI  │                   │                      │
       │◄──────────────────│                   │                      │
       │                   │                   │                      │
       │                   │  3. Create Session (JWT)                 │
       │                   │──────────────────►│                      │
       │                   │                   │                      │
       │                   │  4. SSE Subscribe │                      │
       │                   │──────────────────►│  Registers:          │
       │                   │                   │  userId (Rita DB)    │
       │                   │                   │  organizationId      │
       │                   │                   │                      │
       │  5. User sends message                │                      │
       │──────────────────►│                   │                      │
       │                   │                   │                      │
       │                   │  6. POST /messages                       │
       │                   │──────────────────►│──────────────────────►
       │                   │                   │  INSERT message      │
       │                   │                   │  (status: pending)   │
       │                   │                   │                      │
       │                   │                   │  7. Send Webhook     │
       │                   │                   │─────────────────────────────┐
       │                   │                   │                             │
       │                   │                   │         ┌───────────────────▼──┐
       │                   │                   │         │ Actions API          │
       │                   │                   │         │ (External Platform)  │
       │                   │                   │         └───────────┬──────────┘
       │                   │                   │                     │
       │                   │                   │         8. Process & respond
       │                   │                   │                     │
       │                   │                   │         ┌───────────▼──────────┐
       │                   │                   │         │ RabbitMQ             │
       │                   │                   │         │ (chat.responses)     │
       │                   │                   │         └───────────┬──────────┘
       │                   │                   │                     │
       │                   │                   │◄────────────────────┘
       │                   │                   │  9. Consume message
       │                   │                   │
       │                   │                   │  10. Fetch user_id from
       │                   │                   │      conversations table
       │                   │                   │
       │                   │  11. SSE Event    │
       │                   │◄──────────────────│  Route by:
       │                   │                   │  userId (from conversation)
       │  12. Display      │                   │  organizationId
       │◄──────────────────│                   │
       │                   │                   │
```

### Webhook Payload (Rita Go)

```json
{
  "source": "rita-chat",
  "action": "message_created",
  "user_id": "abc123-...",        // Rita DB user_id
  "user_email": "user@example.com",
  "tenant_id": "org456-...",      // organization_id
  "conversation_id": "conv789-...",
  "message_id": "msg012-...",
  "customer_message": "Hello...",
  "timestamp": "2024-01-12T..."
}
```

---

## 4. Iframe Chat Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           IFRAME CHAT FLOW                                   │
└──────────────────────────────────────────────────────────────────────────────┘

  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌────────┐    ┌──────────────┐
  │ Host    │    │ Iframe  │    │ API     │    │ Valkey │    │ PostgreSQL   │
  │ App     │    │ Client  │    │ Server  │    │        │    │              │
  └────┬────┘    └────┬────┘    └────┬────┘    └───┬────┘    └──────┬───────┘
       │              │              │             │                │
       │  1. Store session config    │             │                │
       │─────────────────────────────────────────►│                │
       │  Key: rita:session:{guid}   │             │                │
       │  Data: {userGuid, tenantId, │             │                │
       │         clientId, clientKey,│             │                │
       │         actionsApiBaseUrl}  │             │                │
       │              │              │             │                │
       │  2. Load iframe with sessionKey           │                │
       │─────────────►│              │             │                │
       │              │              │             │                │
       │              │  3. POST /iframe/validate-instantiation     │
       │              │─────────────►│             │                │
       │              │              │             │                │
       │              │              │  4. HGET    │                │
       │              │              │────────────►│                │
       │              │              │◄────────────│                │
       │              │              │  Returns: userGuid, tenantId,│
       │              │              │  clientId, clientKey, etc.   │
       │              │              │             │                │
       │              │              │  5. JIT Provisioning         │
       │              │              │────────────────────────────►│
       │              │              │  - Resolve/create org        │
       │              │              │  - Resolve/create user       │
       │              │              │  - Create conversation       │
       │              │              │  (stores Rita user_id)       │
       │              │              │             │                │
       │              │              │  6. Create session           │
       │              │              │  userId: Rita DB ID          │
       │              │              │  organizationId: tenant      │
       │              │              │  iframeConfig: Valkey data   │
       │              │              │             │                │
       │              │◄─────────────│             │                │
       │              │  Set-Cookie + conversationId               │
       │              │              │             │                │
       │              │  7. SSE Subscribe          │                │
       │              │─────────────►│  Registers: │                │
       │              │              │  userId (Rita DB ID)         │
       │              │              │  organizationId              │
       │              │              │             │                │
       │  8. User sends message      │             │                │
       │─────────────►│              │             │                │
       │              │              │             │                │
       │              │  9. POST /messages         │                │
       │              │─────────────►│────────────────────────────►│
       │              │              │  INSERT message              │
       │              │              │             │                │
       │              │              │  10. Send Tenant Webhook     │
       │              │              │  URL: {actionsApiBaseUrl}/api/Webhooks/postEvent/{tenantId}
       │              │              │  Auth: Basic {clientId}:{clientKey}
       │              │              │──────────────────────────────────────────┐
       │              │              │             │                            │
       │              │              │             │     ┌─────────────────────▼─┐
       │              │              │             │     │ Actions API           │
       │              │              │             │     │ (Tenant-specific URL) │
       │              │              │             │     └──────────┬────────────┘
       │              │              │             │                │
       │              │              │             │     11. Process & respond
       │              │              │             │                │
       │              │              │             │     ┌──────────▼────────────┐
       │              │              │             │     │ RabbitMQ              │
       │              │              │             │     │ (chat.responses)      │
       │              │              │             │     └──────────┬────────────┘
       │              │              │             │                │
       │              │              │◄─────────────────────────────┘
       │              │              │  12. Consume message
       │              │              │  Payload contains Keycloak userGuid
       │              │              │             │                │
       │              │              │  13. Fetch user_id from      │
       │              │              │      conversations table ────────────────►
       │              │              │  (Returns Rita DB user_id)   │
       │              │              │             │                │
       │              │  14. SSE Event             │                │
       │              │◄─────────────│  Route by:  │                │
       │              │              │  userId (from conversation)  │
       │  15. Display │              │  organizationId              │
       │◄─────────────│              │             │                │
```

### Valkey Session Payload

```json
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "tabInstanceId": "b677747a-...",
  "tenantId": "00F4F67D-...",
  "tenantName": "staging",
  "chatSessionId": "b974d74f-...",
  "clientId": "E14730FA-...",
  "clientKey": "secret-key",
  "tokenExpiry": 1767902104,
  "actionsApiBaseUrl": "https://actions-api-staging.resolve.io/",
  "userGuid": "275fb79d-..."
}
```

### Iframe Webhook Payload

```json
{
  "source": "rita-chat-iframe",
  "action": "message_created",

  // Valkey IDs (for platform routing)
  "userGuid": "275fb79d-...",
  "tenantId": "00F4F67D-...",
  "chatSessionId": "b974d74f-...",

  // Snake_case copies (for RabbitMQ response)
  "user_id": "275fb79d-...",      // = userGuid (Keycloak ID)
  "tenant_id": "00F4F67D-...",    // = tenantId

  "conversation_id": "b18c9d56-...",
  "message_id": "2b6a2b62-...",
  "customer_message": "Hello...",
  "document_ids": [],
  "transcript_ids": { "transcripts": [...] },
  "user_email": "iframe-275fb79d@iframe.internal",
  "timestamp": "2024-01-12T..."
}
```

### Webhook Field Reference

| Field | Description | Created When | Updated |
|-------|-------------|--------------|---------|
| `source` | Identifies origin app. Rita defines this. Always `rita-chat-iframe` for iframe. | Static | Never |
| `action` | Event type. Currently only `message_created` for iframe chat. | Per event | Never |
| `conversation_id` | UUID for chat thread. One conversation = multiple messages. | On `/validate-instantiation` | Never |
| `message_id` | UUID for each user message. New ID per message sent. | On POST `/messages` | Never |
| `customer_message` | The user's message text. | Per message | Never |
| `user_id` | Keycloak userGuid (for platform routing). | From Valkey | Never |
| `tenant_id` | Organization/tenant ID. | From Valkey | Never |
| `user_email` | **Synthetic** for iframe: `iframe-{guid-prefix}@iframe.internal`. Not a real email. | On JIT provisioning | Never |
| `document_ids` | File attachment IDs. **Empty for iframe** (uploads disabled). | Per message | Never |
| `transcript_ids` | Conversation history for RAG context. Optional. | Per message | Never |
| `timestamp` | ISO timestamp of event. | Per event | Never |

### Action Types

For **iframe chat**, currently only one action:

| Action | Source | Description |
|--------|--------|-------------|
| `message_created` | `rita-chat-iframe` | User sent a chat message |

Other actions exist in Rita (not used by iframe):

| Action | Source | Description |
|--------|--------|-------------|
| `document_uploaded` | `rita-documents` | File uploaded to knowledge base |
| `document_deleted` | `rita-documents` | File removed from knowledge base |
| `password_reset_request` | `rita-auth` | User requested password reset |
| `password_reset_complete` | `rita-auth` | User completed password reset |

Future iframe actions could include: `conversation_started`, `typing_indicator`, `conversation_closed`.

---

## 5. RabbitMQ Response Routing (Critical Path)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        RABBITMQ → SSE ROUTING                                │
└──────────────────────────────────────────────────────────────────────────────┘

                    RabbitMQ Message
                    ┌─────────────────────────────┐
                    │ {                           │
                    │   message_id: "msg012",     │
                    │   conversation_id: "conv789"│
                    │   tenant_id: "org456",      │
                    │   user_id: "xyz789", ◄──────┼─── Keycloak userGuid
                    │   response: "Hello..."      │    (may differ from
                    │ }                           │     Rita DB user_id)
                    └─────────────┬───────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │   processMessage()          │
                    │   rabbitmq.ts:355           │
                    └─────────────┬───────────────┘
                                  │
                                  │  CRITICAL FIX:
                                  │  Always fetch user_id from DB
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │  SELECT user_id             │
                    │  FROM conversations         │
                    │  WHERE id = conversation_id │
                    │  AND organization_id = ...  │
                    └─────────────┬───────────────┘
                                  │
                                  │  Returns Rita DB user_id
                                  │  (matches SSE subscription)
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │  sseService.sendToUser(     │
                    │    user_id,    ◄────────────┼─── From conversation table
                    │    organization_id,         │    (NOT from payload)
                    │    event                    │
                    │  )                          │
                    └─────────────┬───────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │  SSE Connection Lookup      │
                    │  sse.ts:256                 │
                    │                             │
                    │  conn.userId === user_id    │
                    │  &&                         │
                    │  conn.organizationId ===    │
                    │    organization_id          │
                    └─────────────┬───────────────┘
                                  │
                                  │  Match found!
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │  Browser receives SSE event │
                    │  → Chat UI updates          │
                    └─────────────────────────────┘
```

### Why This Fix Was Needed

```
BEFORE FIX (broken for legacy users):
─────────────────────────────────────
SSE Subscription:    userId = "abc123" (Rita DB)
RabbitMQ Payload:    user_id = "xyz789" (Keycloak)
                     ↓
                     NO MATCH → Message dropped

AFTER FIX (works for all users):
────────────────────────────────
SSE Subscription:    userId = "abc123" (Rita DB)
Conversation Table:  user_id = "abc123" (Rita DB)
                     ↓
                     MATCH → Message delivered
```

---

## 6. Platform Response: Used vs Ignored Fields

The Actions API (platform) returns responses with legacy chat parameters from older integrations. Rita only uses a subset of these fields.

### RabbitMQ Response from Platform

```json
{
  "message_id": "2b6a2b62-...",
  "conversation_id": "b18c9d56-...",
  "tenant_id": "00F4F67D-...",
  "user_id": "275fb79d-...",
  "response": "Here is the answer...",
  "metadata": {
    "tableName": "",
    "columns": [
      {"key": "Name", "name": "Name", "type": "String"},
      {"key": "Value", "name": "Value", "type": "String"}
    ],
    "data": [
      {"Name": "%chatSessionId%", "Value": "9b5d230e-..."},
      {"Name": "%tabInstanceId%", "Value": "9729c374-..."},
      {"Name": "%conversationid%", "Value": "0ce47347-..."},
      {"Name": "%session%", "Value": "9b5d230e-..."}
    ],
    "paging": {
      "pageSize": 2,
      "pageNumber": 1,
      "totalRecords": 2,
      "sortDirection": 0,
      "columnNameToSortBy": null
    }
  }
}
```

### Fields Used by Rita

| Field | Used | Purpose |
|-------|------|---------|
| `message_id` | **Yes** | Update original message status |
| `conversation_id` | **Yes** | Lookup user_id for SSE routing |
| `tenant_id` | **Yes** | Maps to organization_id |
| `response` | **Yes** | Assistant message content |
| `metadata` | **Yes** | Stored with assistant message (passed through) |
| `response_group_id` | **Yes** | Groups multi-part responses |

### Fields Ignored by Rita

| Field | Ignored | Reason |
|-------|---------|--------|
| `user_id` | **Yes** | Fetched from conversation table instead |
| `metadata.tableName` | **Yes** | Legacy table display format |
| `metadata.columns` | **Yes** | Legacy table column definitions |
| `metadata.data[].%chatSessionId%` | **Yes** | Platform's session ID, not Rita's |
| `metadata.data[].%tabInstanceId%` | **Yes** | Platform's tab tracking |
| `metadata.data[].%conversationid%` | **Yes** | Platform's conversation ID (different from Rita's) |
| `metadata.data[].%session%` | **Yes** | Platform's session reference |
| `metadata.paging` | **Yes** | Legacy pagination for table data |

### Key Distinction

```
PLATFORM IDs (legacy, ignored):
  %conversationid% = "0ce47347-..."  ← Platform's internal conversation
  %chatSessionId%  = "9b5d230e-..."  ← Platform's chat session
  %session%        = "9b5d230e-..."  ← Platform's session

RITA IDs (used):
  conversation_id  = "b18c9d56-..."  ← Rita's conversation (from webhook echo)
  message_id       = "2b6a2b62-..."  ← Rita's message ID
```

Rita maintains its own conversation tracking independent of the platform's legacy chat system.

---

## 7. Summary: ID Flow by Chat Type

| Step | Rita Go | Iframe |
|------|---------|--------|
| Auth | Keycloak JWT | Valkey session |
| Session userId | Rita DB ID | Rita DB ID (JIT resolved) |
| SSE subscribes with | Rita DB ID | Rita DB ID |
| Webhook user_id | Rita DB ID | Keycloak userGuid |
| RabbitMQ user_id | Rita DB ID | Keycloak userGuid |
| SSE routes by | **Conversation table** | **Conversation table** |

The conversation table is the **source of truth** for SSE routing, ensuring consistent IDs regardless of webhook payload.
