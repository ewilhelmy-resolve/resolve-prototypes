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
│ Actions Platform│  chat.responses      │  Jarvis API      │     SSE      ┌─────────────┐
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

Publish to existing `chat.responses` queue.

**Required fields:**
- `tenant_id` — Organization UUID
- `user_id` — Target user's Valkey userGuid
- `ui_schema` — Form definition (see Section 3)

**Optional fields:**
- `conversation_id` — Link to chat conversation
- `interrupt` — If `true`, immediately opens modal. If `false`, queues for user to open later. (default: `true`)

**Example:**
```
{
  "tenant_id": "00F4F67D-3B92-4FD2-A574-7BE22C6BE796",
  "user_id": "275fb79d-0a6f-4336-bc05-1f6fcbaf775b",
  "interrupt": true,
  "ui_schema": { ... }
}
```

Jarvis detects `ui_schema` field and renders the form.

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

## 3. UI Schema Specification (V2)

The UI schema uses a nested tree format with a single `root` element. All component types use PascalCase and properties are grouped under a `props` object.

> **Note:** The client only accepts the V2 format below. Legacy V1 schemas (`version: "1"` + `modals`/`components`) are not supported.

### Root Schema

```typescript
interface UISchema {
  root: string;                            // ID of root element in elements map
  elements: Record<string, UIElement>;     // Flat map of element ID → definition
  dialogs?: Record<string, string>;        // Dialog name → element ID
  autoOpenDialog?: string;                 // Dialog name to auto-open
}
```

### UIElement

```typescript
interface UIElement {
  type: string;                            // PascalCase component name
  props?: Record<string, unknown>;         // Component-specific properties
  children?: string[];                     // IDs of child elements in elements map
}
```

### Component Types

| Type | Purpose | Key Props |
|------|---------|-----------|
| `Text` | Display text | `text`, `variant` (`default`/`muted`/`heading`/`subheading`) |
| `Input` | Text input | `name`, `label`, `placeholder`, `inputType` (`text`/`password`/`email`/`textarea`), `required`, `defaultValue` |
| `Select` | Dropdown | `name`, `label`, `placeholder`, `required`, `options: {label, value}[]` |
| `Button` | Action button | `label`, `action`, `variant`, `opensDialog` |
| `Form` | Form container | `title`, `description`, `submitAction`, `submitLabel`, `cancelLabel`, `submitVariant` |
| `Card` | Card container | `title`, `description` |
| `Row` | Horizontal layout | `gap` |
| `Column` | Vertical layout | `gap` |
| `Table` | Data table | `columns: {key, label}[]`, `rows: Record<string,string>[]` |
| `Stat` | Statistic display | `label`, `value`, `change`, `changeType` |
| `Diagram` | Mermaid diagram | `code`, `title` |
| `Separator` | Divider line | `spacing` |

### Conditional Rendering

Any element can include an `if` prop for conditional display:

```typescript
interface ConditionalRule {
  field: string;
  operator: 'eq' | 'neq' | 'exists' | 'notExists' | 'gt' | 'lt' | 'contains';
  value?: unknown;
}
```

---

## 4. Component Examples

### Text (Display Only)

```json
{ "type": "Text", "props": { "text": "Please enter your credentials below.", "variant": "muted" } }
```

### Input Field

```json
{ "type": "Input", "props": { "name": "username", "label": "Username", "placeholder": "Enter username", "required": true } }
```

### Password Field

```json
{ "type": "Input", "props": { "name": "password", "label": "Password", "inputType": "password", "required": true } }
```

### Textarea

```json
{ "type": "Input", "props": { "name": "comments", "label": "Comments", "inputType": "textarea" } }
```

### Select (Dropdown)

```json
{
  "type": "Select",
  "props": {
    "name": "environment",
    "label": "Environment",
    "required": true,
    "options": [
      { "label": "Production", "value": "prod" },
      { "label": "Staging", "value": "staging" },
      { "label": "Development", "value": "dev" }
    ]
  }
}
```

### Row Layout

`children` references element IDs from the `elements` map:

```json
"nameRow": { "type": "Row", "props": { "gap": 12 }, "children": ["firstName", "lastName"] },
"firstName": { "type": "Input", "props": { "name": "first_name", "label": "First Name" } },
"lastName": { "type": "Input", "props": { "name": "last_name", "label": "Last Name" } }
```

### Conditional Field

```json
{
  "type": "Input",
  "props": {
    "name": "rejection_reason",
    "label": "Rejection Reason",
    "required": true,
    "if": { "field": "decision", "operator": "eq", "value": "reject" }
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
  "ui_schema": {
    "root": "main",
    "elements": {
      "main": {
        "type": "Form",
        "props": {
          "title": "ServiceNow Credentials",
          "description": "Enter your ServiceNow instance credentials to connect.",
          "submitAction": "submit_credentials",
          "submitLabel": "Connect"
        },
        "children": ["instanceUrl", "username", "password"]
      },
      "instanceUrl": { "type": "Input", "props": { "name": "instance_url", "label": "Instance URL", "placeholder": "https://your-instance.service-now.com", "required": true } },
      "username": { "type": "Input", "props": { "name": "username", "label": "Username", "required": true } },
      "password": { "type": "Input", "props": { "name": "password", "label": "Password", "inputType": "password", "required": true } }
    },
    "dialogs": { "credentials": "main" },
    "autoOpenDialog": "credentials"
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
  "ui_schema": {
    "root": "main",
    "elements": {
      "main": {
        "type": "Form",
        "props": {
          "title": "Approve Change Request",
          "description": "CR-12345: Production database migration scheduled for tonight.",
          "submitAction": "submit_decision",
          "submitLabel": "Submit Decision"
        },
        "children": ["decision", "reason", "comments"]
      },
      "decision": {
        "type": "Select",
        "props": {
          "name": "decision",
          "label": "Your Decision",
          "required": true,
          "options": [
            { "label": "Approve", "value": "approve" },
            { "label": "Reject", "value": "reject" },
            { "label": "Request More Information", "value": "more_info" }
          ]
        }
      },
      "reason": {
        "type": "Input",
        "props": {
          "name": "reason",
          "label": "Reason (required for rejection)",
          "inputType": "textarea",
          "if": { "field": "decision", "operator": "eq", "value": "reject" }
        }
      },
      "comments": { "type": "Input", "props": { "name": "comments", "label": "Additional Comments", "inputType": "textarea" } }
    },
    "dialogs": { "approval": "main" },
    "autoOpenDialog": "approval"
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
  "ui_schema": {
    "root": "main",
    "elements": {
      "main": {
        "type": "Form",
        "props": {
          "title": "Configure Automation Trigger",
          "submitAction": "save_config",
          "submitLabel": "Save"
        },
        "children": ["automationName", "triggerEvent", "filterRow"]
      },
      "automationName": { "type": "Input", "props": { "name": "automation_name", "label": "Automation Name", "placeholder": "My Automation", "required": true } },
      "triggerEvent": {
        "type": "Select",
        "props": {
          "name": "trigger_event",
          "label": "Trigger When",
          "required": true,
          "options": [
            { "label": "Ticket Created", "value": "ticket_created" },
            { "label": "Ticket Updated", "value": "ticket_updated" },
            { "label": "SLA Breached", "value": "sla_breach" }
          ]
        }
      },
      "filterRow": {
        "type": "Row",
        "children": ["priorityFilter", "categoryFilter"]
      },
      "priorityFilter": { "type": "Select", "props": { "name": "priority_filter", "label": "Priority", "options": [{ "label": "Any", "value": "any" }, { "label": "Critical", "value": "critical" }, { "label": "High", "value": "high" }] } },
      "categoryFilter": { "type": "Select", "props": { "name": "category_filter", "label": "Category", "options": [{ "label": "Any", "value": "any" }, { "label": "Hardware", "value": "hardware" }, { "label": "Software", "value": "software" }] } }
    },
    "dialogs": { "config": "main" },
    "autoOpenDialog": "config"
  }
}
```

---

## 6. Edge Cases & Error Handling

| Scenario | Behavior | Response Status |
|----------|----------|-----------------|
| User offline | Form stored, timeout after expiration | `timeout` |
| User cancels | Modal closed by user | `cancelled` |
| Form expires | Countdown timer ends | `timeout` |
| Invalid schema | Consumer rejects message | No response |
| Webhook failure | Retries or logs error | N/A |

---

## 7. ID Formats

All IDs use UUID format (36 chars with dashes):

```typescript
// Validation
const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

// Examples
tenant_id: '00F4F67D-3B92-4FD2-A574-7BE22C6BE796'
user_id: '275fb79d-0a6f-4336-bc05-1f6fcbaf775b'
```

---

## 8. Open Questions

- Password field encryption in transit?
- Multi-step form workflows (wizard)?
- File upload component support?
- Client-side validation rules in schema?
