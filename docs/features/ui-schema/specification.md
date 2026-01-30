# JSON UI Schema Specification

Dynamic UI rendering for Jarvis iframe using the [json-render.dev](https://json-render.dev) standard.

Platform sends JSON schemas via RabbitMQ → SSE, Jarvis validates with Zod and renders shadcn/ui components. This foundation enables future AI skills to auto-generate UIs from approved components.

## Table of Contents

- [Schema Format](#schema-format)
- [Component Types](#component-types)
- [Conditional Rendering](#conditional-rendering)
- [Action Payloads](#action-payloads)
- [Examples](#examples)

---

## Schema Format

```json
{
  "version": "1",
  "components": [
    { "type": "text", "props": { "content": "Hello" } },
    { "type": "button", "props": { "label": "Click", "action": "submit" } }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | `"1"` | No | Schema version (default: "1") |
| `components` | `Component[]` | Yes | Array of UI components |

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

Trigger actions when clicked.

```json
{
  "type": "button",
  "props": {
    "label": "Approve",
    "action": "approve_request",
    "variant": "default"
  }
}
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `label` | `string` | Yes | - | Button text |
| `action` | `string` | Yes | - | Action identifier sent to webhook |
| `variant` | `string` | No | `"default"` | Button style |
| `disabled` | `boolean` | No | `false` | Disable button |

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
