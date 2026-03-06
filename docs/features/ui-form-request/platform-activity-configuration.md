# Platform Activity Configuration for UI Form Requests

Guide for Platform developers to configure RabbitMQ Push Activity for requesting UI forms from Jarvis.

## Quick Start

Minimal working example using existing RabbitMQ Push Activity:

```
Activity: RabbitMQ Push Activity
Inputs:
  queue_name: chat.responses
  message: |
    {
      "user_id": "${workflow.userGuid}",
      "ui_schema": {
        "root": "form",
        "elements": {
          "form": {
            "type": "Form",
            "props": { "title": "Enter Information", "submitAction": "submit" },
            "children": ["valueInput"]
          },
          "valueInput": { "type": "Input", "props": { "name": "value", "label": "Value", "required": true } }
        },
        "dialogs": { "simple-form": "form" },
        "autoOpenDialog": "simple-form"
      }
    }
```

---

## UI Form Request Activity (Wrapper)

A wrapper activity that simplifies sending UI form requests. Based on the existing "Publish Message to Rabbit" activity format.

### Activity Files

- **Frontend (JSON):** [`example-activity.json`](example-activity.json)
- **Backend (Python):** [`request_ui_form.py`](request_ui_form.py)

### Message JSON (What Gets Sent)

The activity constructs this JSON and passes it to RabbitMQ Push Activity's `message` input:

```json
{
  "user_id": "user-guid-here",
  "interrupt": true,
  "ui_schema": {
    "root": "form",
    "elements": {
      "form": {
        "type": "Form",
        "props": { "title": "Form Title", "submitAction": "submit" },
        "children": ["field1"]
      },
      "field1": { "type": "Input", "props": { "name": "field1", "label": "Field 1", "required": true } }
    },
    "dialogs": { "my-form": "form" },
    "autoOpenDialog": "my-form"
  }
}
```

RabbitMQ Push Activity then wraps it into the final queue message:

```
{
  "tenant_id": "tenant-456",
  "message_id": "generated-uuid",
  "conversation_id": "conv-789",
  "response": "<JSON-encoded string of the inner message above>"
}
```

The `response` field contains the inner message as a JSON-encoded string.

### Usage Example

```
Activity: UI Form Request Activity
Inputs:
  tenant_id: ${workflow.tenantId}
  conversation_id: ${workflow.conversationId}
  user_id: ${workflow.userGuid}
  ui_schema: |
    {
      "root": "form",
      "elements": {
        "form": {
          "type": "Form",
          "props": { "title": "Enter Your Information", "submitAction": "submit_info" },
          "children": ["fullName", "email"]
        },
        "fullName": { "type": "Input", "props": { "name": "full_name", "label": "Full Name", "required": true } },
        "email": { "type": "Input", "props": { "name": "email", "label": "Email", "inputType": "email", "required": true } }
      },
      "dialogs": { "user-info": "form" },
      "autoOpenDialog": "user-info"
    }
  interrupt: true
```

### Benefits Over Raw RabbitMQ Push

| Aspect | Raw RabbitMQ Push | Wrapper Activity |
|--------|-------------------|------------------|
| Queue name | Must specify `chat.responses` | Hardcoded |
| Message format | Must construct full JSON with `type` | Just provide `ui_schema` |
| Error prevention | Can forget `type` field | Always correct |
| Discoverability | Generic activity | Purpose-built for forms |

---

## Architecture

```
Platform Workflow
       │
       ▼
┌──────────────────────┐
│ RabbitMQ Push        │  ← Existing activity
│ Activity             │
│  queue: chat.responses│
│  message: {...}      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Jarvis API Server    │  ← Routes by message "type"
│ (Consumer)           │
└──────────┬───────────┘
           │ SSE
           ▼
┌──────────────────────┐
│ Jarvis Iframe        │  ← Renders form modal
│ (React)              │
└──────────┬───────────┘
           │ User submits
           ▼
┌──────────────────────┐
│ HTTP Webhook         │  ← POST /api/Webhooks/postEvent/{tenantId}
│ back to Platform     │
└──────────────────────┘
```

---

## Activity Input Configuration

Configure the RabbitMQ Push Activity with these inputs:

| Input | Value | Notes |
|-------|-------|-------|
| `host` | `${env.RABBITMQ_HOST}` | From environment |
| `port` | `${env.RABBITMQ_PORT}` | Usually `5671` |
| `username` | `${env.RABBITMQ_USER}` | |
| `password` | `${env.RABBITMQ_PASS}` | |
| `vhost` | `/` | Default virtual host |
| `queue_name` | `chat.responses` | **Required** - Jarvis consumer queue |
| `message` | JSON string | See Message Format below |
| `tenant_id` | `${workflow.tenantId}` | Current tenant |
| `message_id` | `${uuid()}` | Unique ID |
| `conversation_id` | `${workflow.conversationId}` | Link to chat |

---

## Message Format

### Required Structure

The `message` field must be a JSON string:

```
{
  "user_id": "<target user's Valkey userGuid>",
  "ui_schema": {
    "root": "<root-element-id>",
    "elements": {
      "<id>": { "type": "Form", "props": { "title": "Form Title", "submitAction": "action_name" }, "children": ["<child-ids>"] }
    },
    "dialogs": { "<dialog-name>": "<element-id>" },
    "autoOpenDialog": "<dialog-name>"
  }
}
```

### Field Reference

| Field | Required | Description |
|-------|----------|-------------|
| `user_id` | Yes | Target user's Valkey userGuid |
| `ui_schema` | Yes | Form definition (see schema spec) |
| `interrupt` | No | If `true`, modal opens immediately (default: `true`) |
| `conversation_id` | No | Link to specific chat conversation |

### How Messages Are Wrapped

The RabbitMQ Push Activity wraps your message:

```
{
  "tenant_id": "<tenant_id>",
  "message_id": "<message_id>",
  "response": "<your message JSON string>",
  "conversation_id": "<conversation_id>"
}
```

The Jarvis consumer parses `response` as JSON and routes by `type` field.

---

## Response Handling

When user submits or cancels, Jarvis sends webhook to Platform:

### Webhook Endpoint

```
POST {actionsApiBaseUrl}/api/Webhooks/postEvent/{tenantId}
Authorization: Basic {base64(clientId:clientKey)}
Content-Type: application/json
```

### Response Payload

```json
{
  "source": "rita-chat-iframe",
  "action": "ui_form_response",
  "tenant_id": "tenant-123",
  "user_id": "user-guid",
  "status": "submitted",
  "form_action": "submit_credentials",
  "data": {
    "field1": "user input value",
    "field2": "another value"
  },
  "timestamp": "2024-02-03T10:30:00.000Z"
}
```

### Status Values

| Status | Description |
|--------|-------------|
| `submitted` | User completed and submitted form |
| `cancelled` | User dismissed modal without submitting |

---

## Examples

### Example 1: Credential Collection

```json
{
  "user_id": "${workflow.userGuid}",
  "interrupt": true,
  "ui_schema": {
    "root": "main",
    "elements": {
      "main": {
        "type": "Form",
        "props": {
          "title": "ServiceNow Credentials",
          "description": "Enter your credentials to connect.",
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

### Example 2: Approval Form

```json
{
  "user_id": "${workflow.approverGuid}",
  "ui_schema": {
    "root": "main",
    "elements": {
      "main": {
        "type": "Form",
        "props": {
          "title": "Expense Approval Required",
          "description": "Review and approve the following expense request.",
          "submitAction": "approve",
          "submitLabel": "Approve",
          "cancelLabel": "Reject"
        },
        "children": ["requester", "amount", "desc", "comments"]
      },
      "requester": { "type": "Text", "props": { "text": "**Requester:** ${expense.requesterName}" } },
      "amount": { "type": "Text", "props": { "text": "**Amount:** $${expense.amount}" } },
      "desc": { "type": "Text", "props": { "text": "**Description:** ${expense.description}" } },
      "comments": { "type": "Input", "props": { "name": "comments", "label": "Comments (optional)", "inputType": "textarea" } }
    },
    "dialogs": { "approval": "main" },
    "autoOpenDialog": "approval"
  }
}
```

### Example 3: Multi-Step Selection

```json
{
  "user_id": "${workflow.userGuid}",
  "ui_schema": {
    "root": "main",
    "elements": {
      "main": {
        "type": "Form",
        "props": { "title": "Configure Integration", "submitAction": "configure" },
        "children": ["env", "freq", "webhook"]
      },
      "env": {
        "type": "Select",
        "props": {
          "name": "environment", "label": "Environment", "required": true,
          "options": [
            { "value": "prod", "label": "Production" },
            { "value": "staging", "label": "Staging" },
            { "value": "dev", "label": "Development" }
          ]
        }
      },
      "freq": {
        "type": "Select",
        "props": {
          "name": "sync_frequency", "label": "Sync Frequency",
          "options": [
            { "value": "realtime", "label": "Real-time" },
            { "value": "hourly", "label": "Hourly" },
            { "value": "daily", "label": "Daily" }
          ]
        }
      },
      "webhook": { "type": "Input", "props": { "name": "webhook_url", "label": "Webhook URL (optional)", "placeholder": "https://..." } }
    },
    "dialogs": { "options": "main" },
    "autoOpenDialog": "options"
  }
}
```

---

## UI Schema Reference

### Component Types

| Type | Description |
|------|-------------|
| `Text` | Static markdown text |
| `Input` | Text input field |
| `Select` | Dropdown selection |
| `Row` | Horizontal layout container |
| `Column` | Vertical layout container |

### Input Properties

```json
{
  "type": "Input",
  "props": {
    "name": "field_name",
    "label": "Display Label",
    "placeholder": "Hint text",
    "required": true,
    "inputType": "text | password | email | textarea",
    "defaultValue": "initial value"
  }
}
```

### Select Properties

```json
{
  "type": "Select",
  "props": {
    "name": "field_name",
    "label": "Display Label",
    "required": true,
    "options": [
      { "value": "key", "label": "Display Text" }
    ]
  }
}
```

### Dialog Properties

```json
{
  "type": "Form",
  "props": {
    "title": "Dialog Title",
    "description": "Optional description text",
    "submitAction": "action_name",
    "submitLabel": "Button Text",
    "cancelLabel": "Cancel Button Text"
  },
  "children": ["<child-element-ids>"]
}
```

For complete schema spec, see `docs/features/ui-form-request/platform-developer-guide.md`.

---

## Troubleshooting

### Form Not Appearing

| Symptom | Cause | Solution |
|---------|-------|----------|
| No modal shown | Wrong `user_id` | Verify user's Valkey userGuid matches |
| No modal shown | User not connected | User must have active SSE connection |
| No modal shown | Invalid JSON | Validate `message` field is valid JSON |
| No modal shown | Missing `ui_schema` | Ensure `ui_schema` is present and valid |

### Webhook Not Received

| Symptom | Cause | Solution |
|---------|-------|----------|
| No webhook | Wrong endpoint | Verify `actionsApiBaseUrl` config |
| 401 error | Auth failed | Check `clientId`/`clientKey` credentials |
| 404 error | Wrong tenant | Verify `tenantId` in URL |

### Form Validation Errors

| Symptom | Cause | Solution |
|---------|-------|----------|
| Form won't submit | Required field empty | User must fill all `required: true` fields |
| Invalid selection | Stale options | Regenerate form with current option values |

### Debug Steps

1. **Check queue**: Verify message arrives in `chat.responses`
2. **Check consumer logs**: Look for routing decision in Jarvis API logs
3. **Check SSE connection**: Verify user's browser has active EventSource
4. **Check browser console**: Look for SSE events and form rendering errors
5. **Check network tab**: Verify webhook POST on form submit

---

## Integration Checklist

### Platform Side

- [ ] RabbitMQ Push Activity configured with `queue_name: chat.responses`
- [ ] Message includes `user_id`
- [ ] Valid `ui_schema` with root/elements (and dialogs if modal needed)
- [ ] Webhook handler at `/api/Webhooks/postEvent/{tenantId}`
- [ ] Workflow can receive and process webhook response

### Testing

- [ ] Create test workflow with UI form request
- [ ] Trigger workflow and verify modal appears
- [ ] Submit form and verify webhook received
- [ ] Cancel form and verify cancel webhook received
- [ ] Test with invalid/missing fields
- [ ] Test with user not connected (should queue or timeout)
