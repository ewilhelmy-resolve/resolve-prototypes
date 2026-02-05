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
           │ 1. Publish to ui_form.requests
           ▼
┌──────────────────────┐
│     RABBITMQ         │
│  ui_form.requests    │
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
│  └─ Match correlation│
│  └─ Signal activity  │
└──────────────────────┘
```

### Key Points
- **Request via RabbitMQ** - iframe can't receive inbound webhooks
- **Response via HTTP Webhook** - API server has Valkey credentials
- **API Server bridges** RabbitMQ ↔ SSE (browser can't speak AMQP)
- **Valkey provides** `actionsApiBaseUrl`, `clientId`, `clientKey` for webhook auth
- **Correlation** via `correlation_id` to match request ↔ response

---

## 3. Platform Activity Implementation

### Resolve Activity: `RequestUIForm`

Platform needs to create a Temporal activity that:
1. Publishes form request to `ui_form.requests` queue
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

  // Timeout
  timeoutSeconds?: number;  // default: 300
  priority?: 'low' | 'normal' | 'high';
}

interface RequestUIFormOutput {
  status: 'submitted' | 'cancelled' | 'timeout' | 'error';
  action?: string;        // submitAction from modal
  data?: Record<string, any>;  // Form field values
  errorMessage?: string;
}

// Activity sends to RabbitMQ, waits for webhook response
async function requestUIForm(input: RequestUIFormInput): Promise<RequestUIFormOutput> {
  const correlationId = generateUUID();

  // Publish to queue
  await publishToQueue('ui_form.requests', {
    tenant_id: input.tenantId,
    user_id: input.userGuid,
    correlation_id: correlationId,
    ui_schema: input.uiSchema,
    conversation_id: input.conversationId,
    timeout_seconds: input.timeoutSeconds ?? 300,
    priority: input.priority ?? 'normal',
    workflow_id: getWorkflowId(),  // From Temporal context
    activity_id: getActivityId(),
  });

  // Wait for response via webhook (Jarvis calls postEvent endpoint)
  return await waitForFormResponse(correlationId, input.timeoutSeconds);
}
```

---

## 4. RabbitMQ Message Schema

### Request Queue: `ui_form.requests`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tenant_id` | string | Yes | Organization ID (UUID format) |
| `user_id` | string | Yes | User GUID from Valkey session |
| `correlation_id` | string | Yes | Unique request ID for matching response |
| `ui_schema` | object | Yes | Form definition (see Section 6) |
| `conversation_id` | string | No | Link to chat conversation |
| `workflow_id` | string | No | Parent workflow ID |
| `activity_id` | string | No | Specific activity step |
| `timeout_seconds` | number | No | Expiration (default: 300) |
| `priority` | string | No | `low` \| `normal` \| `high` |

> **Note**: Response webhook credentials come from Valkey session (`actionsApiBaseUrl`, `clientId`, `clientKey`), not from this message.

### ID Format Reference (from unit tests)

```javascript
// All IDs are UUID format (36 chars with dashes)
const examplePayload = {
  tenant_id: '00F4F67D-3B92-4FD2-A574-7BE22C6BE796',  // Organization
  user_id: '275fb79d-0a6f-4336-bc05-1f6fcbaf775b',    // User GUID
  conversation_id: 'b18c9d56-7c26-42d0-87ff-07cd7dabb171',
  correlation_id: '2b6a2b62-86ef-4bcd-893b-6b6d55c7f7f9',
};

// Validation regex
const UUID_PATTERN = /^[0-9a-f-]{36}$/i;
```

### Example Request

```json
{
  "tenant_id": "00F4F67D-3B92-4FD2-A574-7BE22C6BE796",
  "user_id": "275fb79d-0a6f-4336-bc05-1f6fcbaf775b",
  "correlation_id": "req-abc-123-def-456",
  "workflow_id": "wf-servicenow-setup",
  "activity_id": "collect-credentials",
  "timeout_seconds": 300,
  "priority": "high",
  "ui_schema": {
    "version": "1",
    "autoOpenModal": "cred-form",
    "modals": {
      "cred-form": {
        "title": "ServiceNow Credentials",
        "submitAction": "submit_credentials",
        "children": [...]
      }
    }
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
  correlationId: string;
  uiSchema: UISchema;
  priority: 'low' | 'normal' | 'high';
  conversationId?: string;
  expiresAt: number;  // Unix timestamp (ms)
}
```

### Example

```json
{
  "type": "ui_form_request",
  "data": {
    "correlationId": "req-abc-123-def-456",
    "uiSchema": { ... },
    "priority": "high",
    "conversationId": "conv-xyz-789",
    "expiresAt": 1706900000000
  }
}
```

---

## 6. UI Schema Specification

### Root Schema

```typescript
interface UISchema {
  version: '1';
  autoOpenModal?: string;  // Modal ID to auto-open
  modals: Record<string, ModalDefinition>;
}
```

### Modal Definition

```typescript
interface ModalDefinition {
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';

  // Submit configuration
  submitAction?: string;     // Action name in response
  submitLabel?: string;      // Button text (default: "Submit")
  submitVariant?: 'default' | 'destructive';
  cancelLabel?: string;      // Cancel button text

  // Form fields
  children: UIComponent[];
}
```

### Component Types

#### Text (display only)
```typescript
{
  type: 'text';
  content: string;
  variant?: 'default' | 'muted' | 'heading' | 'subheading';
}
```

#### Input (user entry)
```typescript
{
  type: 'input';
  name: string;              // Field name in response.data
  label?: string;
  placeholder?: string;
  inputType?: 'text' | 'password' | 'email' | 'textarea';
  required?: boolean;
  defaultValue?: string;     // Pre-populated value
}
```

#### Select (dropdown)
```typescript
{
  type: 'select';
  name: string;              // Field name in response.data
  label?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;     // Pre-selected value
  options: Array<{
    label: string;
    value: string;
  }>;
}
```

#### Layout: Row
```typescript
{
  type: 'row';
  gap?: number;
  children: UIComponent[];
}
```

#### Layout: Column
```typescript
{
  type: 'column';
  gap?: number;
  children: UIComponent[];
}
```

### Pre-Populating Values

Use `defaultValue` on input/select components:

```json
{
  "type": "input",
  "name": "instance_url",
  "label": "Instance URL",
  "defaultValue": "https://acme.service-now.com"
}
```

```json
{
  "type": "select",
  "name": "environment",
  "label": "Environment",
  "defaultValue": "production",
  "options": [
    { "label": "Production", "value": "production" },
    { "label": "Sandbox", "value": "sandbox" }
  ]
}
```

### Conditional Rendering

```typescript
{
  type: 'input';
  name: 'rejection_reason';
  label: 'Rejection Reason';
  if: {
    field: 'decision';
    equals: 'reject';
  }
}
```

---

## 7. Form Response (Jarvis → Platform)

### Step 1: Iframe → API Server

Iframe POSTs to API server:

```
POST /api/iframe/ui-form-response
Content-Type: application/json

{
  "correlationId": "req-abc-123-def-456",
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
  "correlation_id": "req-abc-123-def-456",
  "workflow_id": "wf-servicenow-setup",
  "activity_id": "collect-credentials",
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
1. Matches `correlation_id` to waiting activity
2. Signals Temporal workflow with response data
3. Activity resumes with form data or timeout/cancellation

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

Required: `tenant_id`, `user_id`, `correlation_id`, `ui_schema`

### User Offline

- Request stored in `PendingUIFormRequestStore`
- Timeout checker runs every 10 seconds
- After `timeout_seconds`, sends `timeout` response to platform

### Callback Failure

If HTTP callback fails (5xx, timeout), falls back to `ui_form.responses` queue.

---

## 9. Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `UI_FORM_REQUEST_QUEUE` | `ui_form.requests` | Incoming request queue |
| `UI_FORM_RESPONSE_QUEUE` | `ui_form.responses` | Fallback response queue |

---

## 10. Implementation Checklist

### Platform Team

- [ ] Create `RequestUIForm` Temporal activity
- [ ] Implement RabbitMQ publisher for `ui_form.requests`
- [ ] Create callback endpoint to receive HTTP responses
- [ ] OR implement consumer for `ui_form.responses` queue
- [ ] Handle response statuses in workflow logic
- [ ] Document activity in Resolve Actions docs

### Jarvis Team

- [ ] Create `UIFormRequestConsumer` (RabbitMQ consumer)
- [ ] Create `PendingUIFormRequestStore` (in-memory correlation)
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
  │     └─ timeout: 300s
  │     └─ priority: high
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
  │     └─ timeout: 86400s (24h)
  │     └─ priority: normal
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
