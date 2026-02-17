# UI Form Request: Platform ↔ Jarvis Integration Spec

**Version**: 1.0
**Last Updated**: 2024-02-03
**Status**: Planning

---

## 1. Overview

Generic form request system where Actions Platform triggers **any UI form** in Jarvis iframe client. User responses return to Platform via RabbitMQ response queue.

**Why RabbitMQ both directions:**
- Iframe can't make direct webhooks (browser security)
- Multi-tenant routing via `tenant_id` in message
- Async decoupling between Platform and Jarvis
- Consistent with existing Rita message patterns

### Use Cases
- Credential collection (ServiceNow, Jira, etc.)
- Approval requests (change management, access requests)
- Configuration forms (workflow triggers, settings)
- Data collection (surveys, feedback)

---

## 2. Architecture Flow

```
                    REQUEST: RabbitMQ
┌──────────────────────┐
│  ACTIONS PLATFORM    │
│  (Temporal Activity) │
└──────────┬───────────┘
           │ 1. Publish to chat.responses
           ▼
┌──────────────────────┐
│     RABBITMQ         │
│  chat.responses      │
└──────────┬───────────┘
           │ 2. Consume message
           ▼
┌──────────────────────┐
│   JARVIS API SERVER  │
│  UIFormRequestConsumer│
│  └─ Store in pending │
│  └─ Send SSE event   │
└──────────┬───────────┘
           │ 3. SSE push to user
           ▼
┌──────────────────────┐
│   JARVIS IFRAME      │
│  └─ Render modal     │
│  └─ User fills form  │
└──────────────────────┘


                   RESPONSE: HTTP Webhook
┌──────────────────────┐
│   JARVIS IFRAME      │
│  (User submits form) │
└──────────┬───────────┘
           │ 4. POST /api/iframe/ui-form-response
           ▼
┌──────────────────────┐
│   JARVIS API SERVER  │
│  └─ Lookup pending   │
│  └─ Get Valkey creds │
└──────────┬───────────┘
           │ 5. POST {actionsApiBaseUrl}/api/Webhooks/postEvent/{tenantId}
           │    (Basic auth from Valkey: clientId:clientKey)
           ▼
┌──────────────────────┐
│  ACTIONS PLATFORM    │
│  (Webhook endpoint)  │
│  └─ Signal activity  │
└──────────────────────┘
```

### Key Points
- **Request via RabbitMQ** - iframe can't receive inbound webhooks
- **Response via HTTP Webhook** - API server has Valkey credentials
- **API Server bridges** RabbitMQ ↔ SSE (browser can't speak AMQP)
- **Valkey provides** `actionsApiBaseUrl`, `clientId`, `clientKey` for webhook auth

---

## 3. Platform Activity Implementation

### Resolve Activity: `RequestUIForm`

Platform needs to create a Temporal activity that:
1. Publishes form request to `chat.responses` queue
2. Waits for response (async signal or polling)
3. Returns form data or timeout/cancellation

```typescript
// Pseudo-code for Platform Activity
interface RequestUIFormInput {
  // Routing (required)
  tenantId: string;
  userGuid: string;

  // Form definition
  uiSchema: UISchema;

  // Optional context
  conversationId?: string;

}

interface RequestUIFormOutput {
  status: 'submitted' | 'cancelled' | 'timeout' | 'error';
  action?: string;        // submitAction from modal
  data?: Record<string, any>;  // Form field values
  errorMessage?: string;
}

// Activity sends to RabbitMQ, waits for webhook response
async function requestUIForm(input: RequestUIFormInput): Promise<RequestUIFormOutput> {
  // Publish to queue
  await publishToQueue('chat.responses', {
    tenant_id: input.tenantId,
    user_id: input.userGuid,
    ui_schema: input.uiSchema,
    conversation_id: input.conversationId,
  });

  // Wait for response via webhook (Jarvis calls postEvent endpoint)
  return await waitForFormResponse();
}
```

---

## 4. RabbitMQ Message Schema

### Request Queue: `chat.responses`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tenant_id` | string | Yes | Organization ID (UUID format) |
| `user_id` | string | Yes | User GUID from Valkey session |
| `ui_schema` | object | Yes | Form definition (see Section 6) |
| `conversation_id` | string | No | Link to chat conversation |

> **Note**: Response webhook credentials come from Valkey session (`actionsApiBaseUrl`, `clientId`, `clientKey`), not from this message.

### ID Format Reference (from unit tests)

```javascript
// All IDs are UUID format (36 chars with dashes)
const examplePayload = {
  tenant_id: '00F4F67D-3B92-4FD2-A574-7BE22C6BE796',  // Organization
  user_id: '275fb79d-0a6f-4336-bc05-1f6fcbaf775b',    // User GUID
  conversation_id: 'b18c9d56-7c26-42d0-87ff-07cd7dabb171',
};

// Validation regex
const UUID_PATTERN = /^[0-9a-f-]{36}$/i;
```

### Example Request

```json
{
  "tenant_id": "00F4F67D-3B92-4FD2-A574-7BE22C6BE796",
  "user_id": "275fb79d-0a6f-4336-bc05-1f6fcbaf775b",
  "ui_schema": {
    "root": "main",
    "elements": {
      "main": { "type": "Form", "props": { "title": "ServiceNow Credentials", "submitAction": "submit_credentials" }, "children": ["..."] }
    },
    "dialogs": { "cred-form": "main" },
    "autoOpenDialog": "cred-form"
  }
}
```

---

## 5. SSE Event (API Server → Iframe)

After consuming from RabbitMQ, API server sends SSE to client.

### Event Type
```
ui_form_request
```

### Payload

```typescript
interface UIFormRequestSSEPayload {
  uiSchema: UISchema;
  conversationId?: string;
}
```

### Example

```json
{
  "type": "ui_form_request",
  "data": {
    "uiSchema": { ... },
    "conversationId": "conv-xyz-789"
  }
}
```

---

## 6. UI Schema Specification

### Root Schema

```typescript
interface UISchema {
  root: string;                              // ID of root element
  elements: Record<string, UIElement>;       // Flat map of element ID → definition
  dialogs?: Record<string, string>;          // Dialog name → element ID
  autoOpenDialog?: string;                   // Dialog name to auto-open
}
```

### UIElement

```typescript
interface UIElement {
  type: string;                              // PascalCase component name
  props?: Record<string, unknown>;           // Component-specific properties
  children?: string[];                       // IDs of child elements
}
```

### Component Types

#### Text (display only)
```typescript
{ type: 'Text', props: { text: string, variant?: 'default' | 'muted' | 'heading' | 'subheading' } }
```

#### Input (user entry)
```typescript
{ type: 'Input', props: { name: string, label?: string, placeholder?: string, inputType?: 'text' | 'password' | 'email' | 'textarea', required?: boolean, defaultValue?: string } }
```

#### Select (dropdown)
```typescript
{ type: 'Select', props: { name: string, label?: string, placeholder?: string, required?: boolean, defaultValue?: string, options: Array<{ label: string, value: string }> } }
```

#### Layout: Row / Column
```typescript
{ type: 'Row', props: { gap?: number }, children: ['child1', 'child2'] }
{ type: 'Column', props: { gap?: number }, children: ['child1', 'child2'] }
```

### Pre-Populating Values

Use `defaultValue` on Input/Select components:

```json
{ "type": "Input", "props": { "name": "instance_url", "label": "Instance URL", "defaultValue": "https://acme.service-now.com" } }
```

```json
{
  "type": "Select",
  "props": {
    "name": "environment",
    "label": "Environment",
    "defaultValue": "production",
    "options": [
      { "label": "Production", "value": "production" },
      { "label": "Sandbox", "value": "sandbox" }
    ]
  }
}
```

### Conditional Rendering

```typescript
{ type: 'Input', props: { name: 'rejection_reason', label: 'Rejection Reason', if: { field: 'decision', operator: 'eq', value: 'reject' } } }
```

---

## 7. Form Response (Jarvis → Platform)

### Step 1: Iframe → API Server

Iframe POSTs to API server:

```
POST /api/iframe/ui-form-response
Content-Type: application/json

{
  "status": "submitted",
  "action": "submit_credentials",
  "data": {
    "instance_url": "https://acme.service-now.com",
    "username": "admin",
    "password": "secret123"
  }
}
```

### Step 2: API Server → Platform (HTTP Webhook)

API server uses Valkey credentials to POST webhook to Platform.

**Valkey provides** (from iframe session):
- `actionsApiBaseUrl` - Platform API base URL
- `tenantId` - Tenant identifier
- `clientId` / `clientKey` - Basic auth credentials

**Webhook URL**:
```
POST {actionsApiBaseUrl}/api/Webhooks/postEvent/{tenantId}
```

**Headers**:
```
Authorization: Basic {base64(clientId:clientKey)}
Content-Type: application/json
```

**Payload**:
```json
{
  "source": "rita-chat-iframe",
  "action": "ui_form_response",
  "tenant_id": "00F4F67D-3B92-4FD2-A574-7BE22C6BE796",
  "user_id": "275fb79d-0a6f-4336-bc05-1f6fcbaf775b",
  "conversation_id": "conv-xyz-789",
  "status": "submitted",
  "form_action": "submit_credentials",
  "data": {
    "instance_url": "https://acme.service-now.com",
    "username": "admin",
    "password": "secret123"
  },
  "timestamp": "2024-02-03T10:30:00.000Z"
}
```

> **Note**: Same pattern as `sendTenantMessageEvent` in WebhookService.ts - reuse existing webhook infrastructure.

### Step 3: Platform Receives Webhook

Platform webhook handler:
1. Signals Temporal workflow with response data
2. Activity resumes with form data or timeout/cancellation

### Response Status Values

| Status | Description | Has `data`? | Has `action`? |
|--------|-------------|-------------|---------------|
| `submitted` | User submitted form | Yes | Yes |
| `cancelled` | User clicked cancel | No | No |
| `timeout` | Request expired | No | No |
| `error` | Processing error | No | No (has `error_message`) |

---

## 8. Error Handling

### Invalid Request (Missing Fields)

If required fields missing, consumer rejects message (nack, no requeue).

Required: `tenant_id`, `user_id`, `ui_schema`

### User Offline

- Request stored in `PendingUIFormRequestStore`
- Timeout checker runs periodically
- After expiration, sends `timeout` response to platform

### Callback Failure

If HTTP callback fails (5xx, timeout), retries or logs error.

---

## 9. Implementation Checklist

### Platform Team

- [ ] Create `RequestUIForm` Temporal activity
- [ ] Publish form requests to `chat.responses` queue
- [ ] Create callback endpoint to receive HTTP responses
- [ ] Handle response statuses in workflow logic
- [ ] Document activity in Resolve Actions docs

### Jarvis Team

- [ ] Create `UIFormRequestConsumer` (RabbitMQ consumer)
- [ ] Create `PendingUIFormRequestStore` (in-memory request tracking)
- [ ] Create `UIFormCallbackService` (HTTP + queue response)
- [ ] Add `ui_form_request` SSE event type to `sse.ts`
- [ ] Wire consumer in `rabbitmq.ts`
- [ ] Create `/api/iframe/ui-form-response` endpoint
- [ ] Update `UIFormRequestModal` component (rename from credential)
- [ ] Update `useUIFormRequestStore` Zustand store
- [ ] Handle `ui_form_request` SSE event in iframe context

---

## 11. Example Workflows

### Credential Collection

```
Workflow: Setup ServiceNow Connection
  ├─ Activity: ValidateUserPermissions
  ├─ Activity: RequestUIForm
  │     └─ ui_schema: credential form
  ├─ (User fills form in Jarvis iframe)
  ├─ Activity: ValidateCredentials
  │     └─ input: form.data.instance_url, username, password
  └─ Activity: CreateConnection
```

### Approval Request

```
Workflow: Change Request Approval
  ├─ Activity: NotifyApprover (email)
  ├─ Activity: RequestUIForm
  │     └─ ui_schema: approval form (approve/reject + comments)
  ├─ (Approver responds in Jarvis iframe)
  └─ Activity: ProcessDecision
        └─ if approved: proceed with change
        └─ if rejected: notify requester
```

---

## 12. Open Questions

1. **Encryption**: Should password fields be encrypted in RabbitMQ/HTTP transit?
2. **Multi-step forms**: Can a single request have multiple modals in sequence?
3. **File uploads**: Future support for file input components?
4. **Rich validation**: Client-side validation rules in schema (regex, min/max)?
5. **Offline queue**: What if user connects after timeout - show expired requests?

---

## 13. References

- [Resolve Actions Documentation](https://help.resolve.io/actions/)
- [RabbitMQ Consumer Pattern](packages/api-server/src/consumers/DataSourceStatusConsumer.ts)
- [Webhook Service](packages/api-server/src/services/WebhookService.ts)
- [SSE Event Types](packages/api-server/src/services/sse.ts)
- [Unit Test Examples](packages/api-server/src/services/__tests__/rabbitmq.test.ts)
