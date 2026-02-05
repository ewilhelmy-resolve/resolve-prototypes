# JSON UI Schema Specification

Dynamic UI rendering for Jarvis iframe using the [json-render.dev](https://json-render.dev) standard.

Platform sends JSON schemas via RabbitMQ → SSE, Jarvis validates with Zod and renders shadcn/ui components. This foundation enables future AI skills to auto-generate UIs from approved components.

## Table of Contents

- [Schema Format](#schema-format)
- [Component Types](#component-types)
- [Modals](#modals)
- [Conditional Rendering](#conditional-rendering)
- [Action Payloads](#action-payloads)
- [Examples](#examples)

---

## Schema Format

```json
{
  "version": "1",
  "components": [
    { "type": "text", "content": "Hello" },
    { "type": "button", "label": "Click", "action": "submit" }
  ],
  "modals": {
    "my-modal": {
      "title": "Modal Title",
      "children": [...]
    }
  },
  "autoOpenModal": "my-modal"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | `"1"` | No | Schema version (default: "1") |
| `components` | `Component[]` | Yes | Array of UI components |
| `modals` | `Record<string, Modal>` | No | Modal definitions (keyed by ID) |
| `autoOpenModal` | `string` | No | Modal ID to open automatically on render |

---

## Component Types

### text

Display text with styling variants.

```json
{
  "type": "text",
  "props": {
    "content": "Welcome to the dashboard",
    "variant": "heading"
  }
}
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `content` | `string` | Yes | - | Text to display |
| `variant` | `string` | No | `"default"` | Style variant |

**Variants:** `default`, `heading`, `subheading`, `muted`, `label`, `code`, `diff-add`, `diff-remove`, `diff-context`

---

### button

Trigger actions or open modals when clicked.

```json
{
  "type": "button",
  "label": "Approve",
  "action": "approve_request",
  "variant": "default"
}
```

**Open a modal instead of action:**

```json
{
  "type": "button",
  "label": "Configure",
  "opensModal": "config-modal",
  "variant": "outline"
}
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `label` | `string` | Yes | - | Button text |
| `action` | `string` | No* | - | Action identifier sent to webhook |
| `opensModal` | `string` | No* | - | Modal ID to open (alternative to action) |
| `variant` | `string` | No | `"default"` | Button style |
| `disabled` | `boolean` | No | `false` | Disable button |

*Either `action` or `opensModal` should be provided.

**Variants:** `default`, `destructive`, `outline`, `secondary`, `ghost`

---

### input

Text input fields for forms.

```json
{
  "type": "input",
  "props": {
    "name": "email",
    "label": "Email Address",
    "inputType": "email",
    "placeholder": "user@example.com",
    "required": true
  }
}
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `name` | `string` | Yes | - | Field name (used in form data) |
| `label` | `string` | No | - | Label text |
| `placeholder` | `string` | No | - | Placeholder text |
| `inputType` | `string` | No | `"text"` | Input type |
| `required` | `boolean` | No | `false` | Mark as required |
| `defaultValue` | `string` | No | - | Initial value |

**Input Types:** `text`, `email`, `number`, `password`, `textarea`

---

### select

Dropdown selection.

```json
{
  "type": "select",
  "props": {
    "name": "priority",
    "label": "Priority",
    "placeholder": "Select priority",
    "options": [
      { "label": "High", "value": "high" },
      { "label": "Medium", "value": "medium" },
      { "label": "Low", "value": "low" }
    ]
  }
}
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `name` | `string` | Yes | - | Field name |
| `label` | `string` | No | - | Label text |
| `placeholder` | `string` | No | - | Placeholder text |
| `options` | `Option[]` | Yes | - | Selection options |
| `required` | `boolean` | No | `false` | Mark as required |

**Option:** `{ label: string, value: string }`

---

### form

Groups inputs with submit action.

```json
{
  "type": "form",
  "props": {
    "submitAction": "create_ticket",
    "submitLabel": "Create Ticket"
  },
  "children": [
    { "type": "input", "props": { "name": "title", "label": "Title" } },
    { "type": "select", "props": { "name": "type", "options": [...] } }
  ]
}
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `submitAction` | `string` | Yes | - | Action identifier on submit |
| `submitLabel` | `string` | No | `"Submit"` | Submit button text |
| `children` | `Component[]` | Yes | - | Form field components |

---

### card

Container with optional title/description.

```json
{
  "type": "card",
  "props": {
    "title": "User Details",
    "description": "Review the information below"
  },
  "children": [
    { "type": "text", "props": { "content": "John Doe" } }
  ]
}
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | No | - | Card title |
| `description` | `string` | No | - | Card description |
| `children` | `Component[]` | No | - | Child components |

---

### row / column

Layout containers.

```json
{
  "type": "row",
  "props": { "gap": 4 },
  "children": [
    { "type": "button", "props": { "label": "Cancel", "action": "cancel", "variant": "outline" } },
    { "type": "button", "props": { "label": "Confirm", "action": "confirm" } }
  ]
}
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `gap` | `number` | No | `2` | Spacing (Tailwind gap units) |
| `children` | `Component[]` | Yes | - | Child components |

---

### stat

Metric display with change indicator.

```json
{
  "type": "stat",
  "props": {
    "label": "Active Users",
    "value": "1,234",
    "change": "+12%",
    "changeType": "positive"
  }
}
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `label` | `string` | Yes | - | Metric label |
| `value` | `string \| number` | Yes | - | Metric value |
| `change` | `string` | No | - | Change indicator (e.g., "+12%") |
| `changeType` | `string` | No | `"neutral"` | Change styling |

**Change Types:** `positive` (green), `negative` (red), `neutral` (gray)

---

### table

Data table display.

```json
{
  "type": "table",
  "props": {
    "columns": [
      { "key": "name", "label": "Name" },
      { "key": "status", "label": "Status" }
    ],
    "rows": [
      { "name": "Task 1", "status": "Complete" },
      { "name": "Task 2", "status": "Pending" }
    ]
  }
}
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `columns` | `Column[]` | Yes | - | Column definitions |
| `rows` | `object[]` | Yes | - | Row data |

**Column:** `{ key: string, label: string }`

---

### diagram

Mermaid diagram rendering.

```json
{
  "type": "diagram",
  "props": {
    "title": "Workflow",
    "code": "graph TD\n  A[Start] --> B[Process]\n  B --> C[End]",
    "expandable": true
  }
}
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `code` | `string` | Yes | - | Mermaid diagram code |
| `title` | `string` | No | `"Diagram"` | Diagram title |
| `expandable` | `boolean` | No | `true` | Allow fullscreen |

---

### divider

Horizontal line separator.

```json
{
  "type": "divider",
  "spacing": "md"
}
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `spacing` | `string` | No | `"md"` | Vertical spacing |

**Spacing:** `sm` (8px), `md` (16px), `lg` (24px)

---

## Modals

Modals provide fullscreen dialogs for forms and complex interactions. They render in the host page (outside the iframe) for maximum space.

### Defining Modals

Define modals in the `modals` object with unique IDs:

```json
{
  "version": "1",
  "components": [
    { "type": "text", "content": "Click button to configure" },
    { "type": "button", "label": "Configure API", "opensModal": "api-config" }
  ],
  "modals": {
    "api-config": {
      "title": "API Configuration",
      "description": "Enter your API credentials",
      "size": "md",
      "children": [
        { "type": "input", "name": "apiKey", "label": "API Key", "inputType": "password" },
        { "type": "input", "name": "endpoint", "label": "Endpoint URL" }
      ],
      "submitAction": "save_api_config",
      "submitLabel": "Save Configuration"
    }
  }
}
```

### Modal Properties

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | Yes | - | Modal title |
| `description` | `string` | No | - | Modal description |
| `size` | `string` | No | `"full"` | Modal size |
| `children` | `Component[]` | Yes | - | Modal content components |
| `submitAction` | `string` | No | - | Action to trigger on submit |
| `submitLabel` | `string` | No | `"Submit"` | Submit button text |
| `cancelLabel` | `string` | No | `"Cancel"` | Cancel button text |
| `submitVariant` | `string` | No | `"default"` | Submit button style |

**Sizes:** `sm` (400px), `md` (600px), `lg` (900px), `xl` (1200px), `full` (95vw)

**Submit Variants:** `default`, `destructive`

### Auto-Opening Modals (Forced Mode)

Use `autoOpenModal` to force-open a modal when the schema renders. This is essential for:
- Mandatory credential prompts before workflow execution
- Required user input that blocks further progress
- Authentication flows that must complete before proceeding

**Best Practice: Always include a fallback button**

Since users may accidentally close the modal (ESC key, click outside, cancel button), always provide a button in the underlying card that reopens the same modal:

```json
{
  "version": "1",
  "components": [
    {
      "type": "card",
      "title": "Authentication Required",
      "description": "This action requires valid credentials to proceed",
      "children": [
        {
          "type": "text",
          "content": "The credential form has been opened automatically. Please complete authentication to continue.",
          "variant": "muted"
        },
        {
          "type": "button",
          "label": "Enter Credentials",
          "opensModal": "auth-modal"
        }
      ]
    }
  ],
  "modals": {
    "auth-modal": {
      "title": "Enter Credentials",
      "description": "Authenticate to continue with this workflow",
      "size": "md",
      "children": [
        { "type": "input", "name": "apiEndpoint", "label": "API Endpoint", "placeholder": "https://api.example.com" },
        { "type": "input", "name": "apiKey", "label": "API Key", "inputType": "password" },
        {
          "type": "select",
          "name": "authType",
          "label": "Authentication Type",
          "options": [
            { "label": "Bearer Token", "value": "bearer" },
            { "label": "API Key Header", "value": "api-key" },
            { "label": "Basic Auth", "value": "basic" }
          ]
        }
      ],
      "submitAction": "authenticate",
      "submitLabel": "Authenticate",
      "cancelLabel": "Cancel"
    }
  },
  "autoOpenModal": "auth-modal"
}
```

**How it works:**

1. Schema renders with `autoOpenModal: "auth-modal"`
2. Modal opens automatically after 100ms delay
3. User sees fullscreen modal in host page (outside iframe)
4. **Backdrop click and ESC key are disabled** - modal can only be closed via Cancel/Close button
5. If user closes modal via Cancel → they see the card with "Enter Credentials" button
6. Button click reopens the modal (but without forced mode - can close via backdrop)

**Key points:**
- The `autoOpenModal` value must match a key in the `modals` object
- Auto-opened modals have `preventBackdropClose: true` automatically
- The fallback button's `opensModal` should reference the same modal ID
- Modal renders in host page for maximum screen real estate
- Toast notification confirms successful submission

### Modal Actions

When a modal is submitted:
1. Form data is collected from all input/select fields
2. Action payload is sent with `action` = modal's `submitAction`
3. A toast notification confirms the submission
4. The action log can be viewed via the toast's "View Log" button

---

## Conditional Rendering

All components support the `if` prop for conditional display based on form data.

```json
{
  "type": "text",
  "props": { "content": "Premium features unlocked!" },
  "if": {
    "field": "plan",
    "operator": "eq",
    "value": "premium"
  }
}
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `field` | `string` | Yes | Field name from form data context |
| `operator` | `string` | Yes | Comparison operator |
| `value` | `any` | No* | Value to compare against |

**Operators:**

| Operator | Description | Requires `value` |
|----------|-------------|------------------|
| `eq` | Equals | Yes |
| `neq` | Not equals | Yes |
| `gt` | Greater than (numeric) | Yes |
| `lt` | Less than (numeric) | Yes |
| `contains` | String contains | Yes |
| `exists` | Field has non-empty value | No |
| `notExists` | Field is empty/undefined | No |

**Example: Show error when validation fails**

```json
{
  "type": "card",
  "children": [
    {
      "type": "select",
      "props": {
        "name": "action",
        "options": [
          { "label": "Approve", "value": "approve" },
          { "label": "Reject", "value": "reject" }
        ]
      }
    },
    {
      "type": "input",
      "props": { "name": "reason", "label": "Rejection Reason" },
      "if": { "field": "action", "operator": "eq", "value": "reject" }
    }
  ]
}
```

---

## Action Payloads

When a user clicks a button or submits a form, an action payload is sent to the Platform webhook.

**Payload Structure:**

```json
{
  "action": "approve_request",
  "data": {
    "title": "User input value",
    "priority": "high"
  },
  "messageId": "msg-550e8400-e29b-41d4-a716-446655440000",
  "conversationId": "conv-550e8400-e29b-41d4-a716-446655440001",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `action` | `string` | Action identifier from button or form submitAction |
| `data` | `object` | Form field values (keyed by field `name`) |
| `messageId` | `string` | ID of the message containing the schema |
| `conversationId` | `string` | Current conversation ID |
| `timestamp` | `string` | ISO 8601 timestamp |

**Endpoint:** `POST /api/iframe/ui-action`

---

## Examples

### Simple Confirmation

```json
{
  "version": "1",
  "components": [
    { "type": "text", "props": { "content": "Confirm Action", "variant": "heading" } },
    { "type": "text", "props": { "content": "Are you sure you want to proceed?", "variant": "muted" } },
    {
      "type": "row",
      "props": { "gap": 2 },
      "children": [
        { "type": "button", "props": { "label": "Cancel", "action": "cancel", "variant": "outline" } },
        { "type": "button", "props": { "label": "Confirm", "action": "confirm" } }
      ]
    }
  ]
}
```

### Form with Validation

```json
{
  "version": "1",
  "components": [
    {
      "type": "form",
      "props": {
        "submitAction": "create_ticket",
        "submitLabel": "Create Ticket"
      },
      "children": [
        { "type": "input", "props": { "name": "title", "label": "Title", "required": true } },
        {
          "type": "select",
          "props": {
            "name": "priority",
            "label": "Priority",
            "options": [
              { "label": "Low", "value": "low" },
              { "label": "Medium", "value": "medium" },
              { "label": "High", "value": "high" }
            ]
          }
        },
        { "type": "input", "props": { "name": "description", "label": "Description", "inputType": "textarea" } }
      ]
    }
  ]
}
```

### Dashboard with Stats

```json
{
  "version": "1",
  "components": [
    { "type": "text", "props": { "content": "Dashboard", "variant": "heading" } },
    {
      "type": "row",
      "props": { "gap": 4 },
      "children": [
        { "type": "stat", "props": { "label": "Total Users", "value": "1,234", "change": "+12%", "changeType": "positive" } },
        { "type": "stat", "props": { "label": "Active Sessions", "value": "89", "change": "-5%", "changeType": "negative" } },
        { "type": "stat", "props": { "label": "Avg Response", "value": "2.3s", "changeType": "neutral" } }
      ]
    },
    {
      "type": "table",
      "props": {
        "columns": [
          { "key": "name", "label": "Name" },
          { "key": "status", "label": "Status" },
          { "key": "date", "label": "Date" }
        ],
        "rows": [
          { "name": "Task Alpha", "status": "Complete", "date": "2024-01-15" },
          { "name": "Task Beta", "status": "In Progress", "date": "2024-01-14" }
        ]
      }
    }
  ]
}
```

### Conditional Form Fields

```json
{
  "version": "1",
  "components": [
    {
      "type": "form",
      "props": { "submitAction": "submit_request" },
      "children": [
        {
          "type": "select",
          "props": {
            "name": "requestType",
            "label": "Request Type",
            "options": [
              { "label": "Bug Report", "value": "bug" },
              { "label": "Feature Request", "value": "feature" },
              { "label": "Question", "value": "question" }
            ]
          }
        },
        {
          "type": "input",
          "props": { "name": "steps", "label": "Steps to Reproduce", "inputType": "textarea" },
          "if": { "field": "requestType", "operator": "eq", "value": "bug" }
        },
        {
          "type": "input",
          "props": { "name": "useCase", "label": "Use Case Description", "inputType": "textarea" },
          "if": { "field": "requestType", "operator": "eq", "value": "feature" }
        }
      ]
    }
  ]
}
```

### Modal with Form

```json
{
  "version": "1",
  "components": [
    {
      "type": "card",
      "title": "API Configuration",
      "description": "Configure your integration settings",
      "children": [
        { "type": "text", "content": "Click the button below to set up your API credentials.", "variant": "muted" },
        { "type": "button", "label": "Configure Credentials", "opensModal": "credentials-modal" }
      ]
    }
  ],
  "modals": {
    "credentials-modal": {
      "title": "Enter API Credentials",
      "description": "These credentials will be used for all API requests",
      "size": "md",
      "children": [
        { "type": "input", "name": "hostname", "label": "API Hostname", "placeholder": "https://api.example.com" },
        { "type": "input", "name": "username", "label": "Username", "placeholder": "your-username" },
        { "type": "input", "name": "apiKey", "label": "API Key", "inputType": "password", "placeholder": "Enter your API key" }
      ],
      "submitAction": "save_credentials",
      "submitLabel": "Save Credentials",
      "cancelLabel": "Cancel"
    }
  }
}
```

### Forced Credential Prompt (with Fallback Button)

Combines `autoOpenModal` with a fallback button for reopening if closed accidentally. See [Auto-Opening Modals](#auto-opening-modals-forced-mode) for detailed explanation.

```json
{
  "version": "1",
  "components": [
    {
      "type": "card",
      "title": "Authentication Required",
      "description": "This action requires valid credentials to proceed",
      "children": [
        { "type": "text", "content": "The credential form will open automatically. Click below if closed accidentally.", "variant": "muted" },
        { "type": "button", "label": "Enter Credentials", "opensModal": "auth-modal" }
      ]
    }
  ],
  "modals": {
    "auth-modal": {
      "title": "Enter Credentials",
      "description": "Authenticate to continue with this workflow",
      "size": "md",
      "children": [
        { "type": "input", "name": "apiEndpoint", "label": "API Endpoint", "placeholder": "https://api.example.com" },
        { "type": "input", "name": "apiKey", "label": "API Key", "inputType": "password" },
        {
          "type": "select",
          "name": "authType",
          "label": "Authentication Type",
          "options": [
            { "label": "Bearer Token", "value": "bearer" },
            { "label": "API Key Header", "value": "api-key" },
            { "label": "Basic Auth", "value": "basic" }
          ]
        }
      ],
      "submitAction": "authenticate",
      "submitLabel": "Authenticate"
    }
  },
  "autoOpenModal": "auth-modal"
}
```

---

## Validation

Schemas are validated at runtime using Zod. Invalid schemas:
- Log validation errors to console
- Display error UI with details (in development)
- Fall back gracefully (no crash)

**Common validation errors:**
- Missing required props (`content`, `name`, `action`, etc.)
- Invalid `type` value
- Malformed `options` array
- Invalid `variant` or `changeType` values
