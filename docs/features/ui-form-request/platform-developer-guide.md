# Jarvis UI Form Request

Technical specification for requesting dynamic UI forms from users via the Jarvis iframe.

---

## Context

### What is Jarvis?

Jarvis is a chat widget (React app) embedded as an **iframe** inside the Resolve Actions Platform UI. Users interact with Jarvis for AI-assisted workflows, and Platform can trigger UI forms to collect user input mid-workflow.

### Iframe Embedding

```html
<!-- Platform embeds Jarvis iframe -->
<iframe src="https://onboarding.resolve.io/iframe/chat?sessionKey={uuid}" />
```

The `sessionKey` references a Valkey payload containing tenant/user context and webhook credentials. The iframe establishes an SSE connection for real-time events.

This pattern allows modularity between the chatbot app (Jarvis) and Resolve Platform Actions—each can evolve independently while communicating through well-defined message contracts. Multi-tenant routing is handled via `tenant_id` in all messages.

---

## Architecture

```
                         REQUEST PATH
┌─────────────────┐                      ┌──────────────────┐
│ Actions Platform│  ui_form.requests    │  Jarvis API      │     SSE      ┌─────────────┐
│ (Temporal       │ ──────────────────►  │  Server          │ ───────────► │   Iframe    │
│  Activity)      │      RabbitMQ        │  (Consumer)      │              │  (React)    │
└─────────────────┘                      └──────────────────┘              └──────┬──────┘
        ▲                                                                         │
        │                         RESPONSE PATH                                   │
        │                                                                         │
        │         POST /api/Webhooks/postEvent/{tenantId}                        │
        │         Authorization: Basic {clientId:clientKey}                       │
        └─────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Request Message (Platform → RabbitMQ)

Publish to existing `chat.requests` queue with type `ui_form_request`.

**Required fields:**
- `type` — `"ui_form_request"`
- `tenant_id` — Organization UUID
- `user_id` — Target user's Valkey userGuid
- `workflow_id` — Temporal workflow ID (echoed in response)
- `activity_id` — Temporal activity ID (echoed in response)
- `ui_schema` — Form definition (see Section 3)

**Optional fields:**
- `conversation_id` — Link to chat conversation
- `interrupt` — If `true`, immediately opens modal. If `false`, queues for user to open later. (default: `true`)

**Example:**
```
{
  "type": "ui_form_request",
  "tenant_id": "00F4F67D-3B92-4FD2-A574-7BE22C6BE796",
  "user_id": "275fb79d-0a6f-4336-bc05-1f6fcbaf775b",
  "workflow_id": "wf-servicenow-setup",
  "activity_id": "collect-credentials",
  "interrupt": true,
  "ui_schema": { ... }
}
```

Jarvis routes on `type` field. Response webhook uses `workflow_id` + `activity_id` to signal the waiting Temporal activity.

---

## 2. Response Webhook (Jarvis → Platform)

When user submits/cancels/timeout, Jarvis API Server sends HTTP webhook.

### Endpoint

```
POST {actionsApiBaseUrl}/api/Webhooks/postEvent/{tenantId}
```

Credentials from Valkey session: `actionsApiBaseUrl`, `clientId`, `clientKey`

### Headers

```
Authorization: Basic {base64(clientId:clientKey)}
Content-Type: application/json
```

### Response Schema

```typescript
interface UIFormResponsePayload {
  source: 'rita-chat-iframe';
  action: 'ui_form_response';

  // Routing
  tenant_id: string;
  user_id: string;

  // Correlation (echoed from request)
  correlation_id: string;
  workflow_id?: string;
  activity_id?: string;
  conversation_id?: string;

  // Result
  status: 'submitted' | 'cancelled' | 'timeout' | 'error';
  form_action?: string;  // submitAction from modal (only if submitted)
  data?: Record<string, any>; // Form values (only if submitted)
  error_message?: string; // Only if status='error'

  timestamp: string; // ISO 8601
}
```

### Status Values

| Status | Description | Has `data`? | Has `form_action`? |
|--------|-------------|-------------|-------------------|
| `submitted` | User submitted form | Yes | Yes |
| `cancelled` | User clicked Cancel | No | No |
| `timeout` | Form expired | No | No |
| `error` | Processing error | No | No (has `error_message`) |

---

## 3. UI Schema Specification

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

  submitAction: string;     // Action name in response
  submitLabel?: string;     // Default: "Submit"
  submitVariant?: 'default' | 'destructive';
  cancelLabel?: string;     // Default: "Cancel"

  children: UIComponent[];
}
```

### Component Types

```typescript
// Display text
interface TextComponent {
  type: 'text';
  content: string;
  variant?: 'default' | 'muted' | 'heading' | 'subheading';
}

// Text input
interface InputComponent {
  type: 'input';
  name: string;              // Field name in response.data
  label?: string;
  placeholder?: string;
  inputType?: 'text' | 'password' | 'email' | 'textarea';
  required?: boolean;
  defaultValue?: string;
  if?: ConditionalRule;
}

// Dropdown select
interface SelectComponent {
  type: 'select';
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  options: Array<{ label: string; value: string }>;
  if?: ConditionalRule;
}

// Horizontal layout
interface RowComponent {
  type: 'row';
  gap?: number;
  children: UIComponent[];
}

// Vertical layout
interface ColumnComponent {
  type: 'column';
  gap?: number;
  children: UIComponent[];
}

// Conditional rendering
interface ConditionalRule {
  field: string;   // Name of field to check
  equals: string;  // Value to match
}

type UIComponent =
  | TextComponent
  | InputComponent
  | SelectComponent
  | RowComponent
  | ColumnComponent;
```

---

## 4. Component Examples

### Text (Display Only)

```json
{
  "type": "text",
  "content": "Please enter your credentials below.",
  "variant": "muted"
}
```

### Input Field

```json
{
  "type": "input",
  "name": "username",
  "label": "Username",
  "placeholder": "Enter username",
  "required": true
}
```

### Password Field

```json
{
  "type": "input",
  "name": "password",
  "label": "Password",
  "inputType": "password",
  "required": true
}
```

### Textarea

```json
{
  "type": "input",
  "name": "comments",
  "label": "Comments",
  "inputType": "textarea"
}
```

### Select (Dropdown)

```json
{
  "type": "select",
  "name": "environment",
  "label": "Environment",
  "required": true,
  "options": [
    { "label": "Production", "value": "prod" },
    { "label": "Staging", "value": "staging" },
    { "label": "Development", "value": "dev" }
  ]
}
```

### Row Layout

```json
{
  "type": "row",
  "gap": 12,
  "children": [
    { "type": "input", "name": "first_name", "label": "First Name" },
    { "type": "input", "name": "last_name", "label": "Last Name" }
  ]
}
```

### Conditional Field

```json
{
  "type": "input",
  "name": "rejection_reason",
  "label": "Rejection Reason",
  "required": true,
  "if": {
    "field": "decision",
    "equals": "reject"
  }
}
```

---

## 5. Complete Request/Response Examples

### Example 1: Credential Collection

**Request (RabbitMQ):**

```json
{
  "tenant_id": "00F4F67D-3B92-4FD2-A574-7BE22C6BE796",
  "user_id": "275fb79d-0a6f-4336-bc05-1f6fcbaf775b",
  "correlation_id": "cred-req-001",
  "workflow_id": "wf-servicenow-setup",
  "timeout_seconds": 300,
  "priority": "high",
  "ui_schema": {
    "version": "1",
    "autoOpenModal": "credentials",
    "modals": {
      "credentials": {
        "title": "ServiceNow Credentials",
        "description": "Enter your ServiceNow instance credentials to connect.",
        "submitAction": "submit_credentials",
        "submitLabel": "Connect",
        "children": [
          {
            "type": "input",
            "name": "instance_url",
            "label": "Instance URL",
            "placeholder": "https://your-instance.service-now.com",
            "required": true
          },
          {
            "type": "input",
            "name": "username",
            "label": "Username",
            "required": true
          },
          {
            "type": "input",
            "name": "password",
            "label": "Password",
            "inputType": "password",
            "required": true
          }
        ]
      }
    }
  }
}
```

**Response (HTTP Webhook):**

```json
{
  "source": "rita-chat-iframe",
  "action": "ui_form_response",
  "tenant_id": "00F4F67D-3B92-4FD2-A574-7BE22C6BE796",
  "user_id": "275fb79d-0a6f-4336-bc05-1f6fcbaf775b",
  "correlation_id": "cred-req-001",
  "workflow_id": "wf-servicenow-setup",
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

---

### Example 2: Approval Request

**Request (RabbitMQ):**

```json
{
  "tenant_id": "00F4F67D-3B92-4FD2-A574-7BE22C6BE796",
  "user_id": "approver-user-guid",
  "correlation_id": "approval-req-456",
  "workflow_id": "wf-change-request-123",
  "timeout_seconds": 86400,
  "priority": "high",
  "ui_schema": {
    "version": "1",
    "autoOpenModal": "approval",
    "modals": {
      "approval": {
        "title": "Approve Change Request",
        "description": "CR-12345: Production database migration scheduled for tonight.",
        "submitAction": "submit_decision",
        "submitLabel": "Submit Decision",
        "children": [
          {
            "type": "select",
            "name": "decision",
            "label": "Your Decision",
            "required": true,
            "options": [
              { "label": "Approve", "value": "approve" },
              { "label": "Reject", "value": "reject" },
              { "label": "Request More Information", "value": "more_info" }
            ]
          },
          {
            "type": "input",
            "name": "reason",
            "label": "Reason (required for rejection)",
            "inputType": "textarea",
            "if": { "field": "decision", "equals": "reject" }
          },
          {
            "type": "input",
            "name": "comments",
            "label": "Additional Comments",
            "inputType": "textarea"
          }
        ]
      }
    }
  }
}
```

**Response (HTTP Webhook - approved):**

```json
{
  "source": "rita-chat-iframe",
  "action": "ui_form_response",
  "tenant_id": "00F4F67D-3B92-4FD2-A574-7BE22C6BE796",
  "user_id": "approver-user-guid",
  "correlation_id": "approval-req-456",
  "workflow_id": "wf-change-request-123",
  "status": "submitted",
  "form_action": "submit_decision",
  "data": {
    "decision": "approve",
    "comments": "Looks good, proceed with the migration."
  },
  "timestamp": "2024-02-03T14:22:00.000Z"
}
```

---

### Example 3: Configuration Form

**Request (RabbitMQ):**

```json
{
  "tenant_id": "00F4F67D-3B92-4FD2-A574-7BE22C6BE796",
  "user_id": "275fb79d-0a6f-4336-bc05-1f6fcbaf775b",
  "correlation_id": "config-req-789",
  "workflow_id": "wf-automation-setup",
  "ui_schema": {
    "version": "1",
    "autoOpenModal": "config",
    "modals": {
      "config": {
        "title": "Configure Automation Trigger",
        "submitAction": "save_config",
        "submitLabel": "Save",
        "size": "lg",
        "children": [
          {
            "type": "input",
            "name": "automation_name",
            "label": "Automation Name",
            "placeholder": "My Automation",
            "required": true
          },
          {
            "type": "select",
            "name": "trigger_event",
            "label": "Trigger When",
            "required": true,
            "options": [
              { "label": "Ticket Created", "value": "ticket_created" },
              { "label": "Ticket Updated", "value": "ticket_updated" },
              { "label": "SLA Breached", "value": "sla_breach" }
            ]
          },
          {
            "type": "row",
            "children": [
              {
                "type": "select",
                "name": "priority_filter",
                "label": "Priority",
                "options": [
                  { "label": "Any", "value": "any" },
                  { "label": "Critical", "value": "critical" },
                  { "label": "High", "value": "high" }
                ]
              },
              {
                "type": "select",
                "name": "category_filter",
                "label": "Category",
                "options": [
                  { "label": "Any", "value": "any" },
                  { "label": "Hardware", "value": "hardware" },
                  { "label": "Software", "value": "software" }
                ]
              }
            ]
          }
        ]
      }
    }
  }
}
```

---

## 6. Edge Cases & Error Handling

| Scenario | Behavior | Response Status |
|----------|----------|-----------------|
| User offline | Form stored, timeout after `timeout_seconds` | `timeout` |
| User cancels | Modal closed by user | `cancelled` |
| Form expires | Countdown timer ends | `timeout` |
| Invalid schema | Consumer rejects message | No response |
| Webhook failure | Falls back to `ui_form.responses` queue | N/A |

---

## 7. ID Formats

All IDs use UUID format (36 chars with dashes):

```typescript
// Validation
const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

// Examples
tenant_id: '00F4F67D-3B92-4FD2-A574-7BE22C6BE796'
user_id: '275fb79d-0a6f-4336-bc05-1f6fcbaf775b'
correlation_id: '2b6a2b62-86ef-4bcd-893b-6b6d55c7f7f9'
```

---

## 8. Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `UI_FORM_REQUEST_QUEUE` | `ui_form.requests` | Incoming request queue |
| `UI_FORM_RESPONSE_QUEUE` | `ui_form.responses` | Fallback response queue |

---

## 9. Open Questions

- Password field encryption in transit?
- Multi-step form workflows (wizard)?
- File upload component support?
- Client-side validation rules in schema?
