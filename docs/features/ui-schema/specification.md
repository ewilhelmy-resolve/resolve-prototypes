# JSON UI Schema Specification

Dynamic UI rendering using the [json-render.dev](https://json-render.dev) format.

Platform sends JSON schemas via RabbitMQ → SSE, RITA validates with Zod and renders shadcn/ui components.

## Table of Contents

- [Schema Format](#schema-format)
- [Component Types](#component-types)
- [Dialogs](#dialogs)
- [Conditional Rendering](#conditional-rendering)
- [Action Payloads](#action-payloads)
- [Examples](#examples)

---

## Schema Format

Flat element map with string-reference children.

```json
{
  "root": "main",
  "elements": {
    "main": { "type": "Column", "children": ["heading", "btn"] },
    "heading": { "type": "Text", "props": { "text": "Hello" } },
    "btn": { "type": "Button", "props": { "label": "Click", "action": "submit" } }
  },
  "dialogs": {
    "my-dialog": "dialogEl"
  },
  "autoOpenDialog": "my-dialog"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `root` | `string` | Yes | ID of root element in elements map |
| `elements` | `Record<string, UIElement>` | Yes | Flat map of element ID → definition |
| `dialogs` | `Record<string, string>` | No | Dialog name → element ID |
| `autoOpenDialog` | `string` | No | Dialog name to auto-open on render |

### UIElement

```json
{ "type": "Text", "props": { "text": "Hello" }, "children": ["child1"] }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `string` | Yes | PascalCase component type |
| `props` | `object` | No | Component-specific properties |
| `children` | `string[]` | No | IDs of child elements in elements map |
| `visible` | `object` | No | json-render.dev visibility conditional |
| `on` | `object` | No | json-render.dev event handlers |

### Shorthand Formats

Bare element (auto-wrapped as root):

```json
{ "type": "Text", "props": { "text": "Hello world" } }
```

---

## Component Types

### Text

Display text with markdown support and styling variants.

```json
{
  "type": "Text",
  "props": {
    "text": "Welcome to the dashboard",
    "variant": "heading"
  }
}
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `text` | `string` | Yes | - | Text/markdown content |
| `variant` | `string` | No | `"default"` | Style variant |
| `className` | `string` | No | - | Custom CSS class |

**Variants:** `default`, `heading`, `subheading`, `muted`, `code`, `diff-add`, `diff-remove`, `diff-context`

---

### Button

Trigger actions or open dialogs.

```json
{
  "type": "Button",
  "props": { "label": "Approve", "action": "approve_request", "variant": "default" }
}
```

**Open a dialog:**

```json
{
  "type": "Button",
  "props": { "label": "Configure", "opensDialog": "config-dialog", "variant": "outline" }
}
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `label` | `string` | Yes | - | Button text |
| `action` | `string` | No* | - | Action identifier sent on click |
| `opensDialog` | `string` | No* | - | Dialog name to open |
| `variant` | `string` | No | `"default"` | Button style |
| `disabled` | `boolean` | No | `false` | Disable button |

*Either `action` or `opensDialog` should be provided.

**Variants:** `default`, `primary` (→default), `destructive`, `danger` (→destructive), `outline`, `secondary`, `ghost`

**Event handler alternative** (json-render.dev):

```json
{
  "type": "Button",
  "props": { "label": "Save" },
  "on": { "press": { "action": "save" } }
}
```

---

### Input

Text input fields for forms.

```json
{
  "type": "Input",
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
| `inputType` | `string` | No | `"text"` | Input type (also accepts `type` as fallback) |
| `required` | `boolean` | No | `false` | Mark as required |
| `defaultValue` | `string` | No | - | Initial value |

**Input Types:** `text`, `email`, `number`, `password`, `textarea`

---

### Select

Dropdown selection.

```json
{
  "type": "Select",
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

### Form

Groups inputs with submit action.

```json
{
  "type": "Form",
  "props": {
    "submitAction": "create_ticket",
    "submitLabel": "Create Ticket"
  },
  "children": ["titleInput", "typeSelect"]
}
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `submitAction` | `string` | Yes | - | Action identifier on submit |
| `submitLabel` | `string` | No | `"Submit"` | Submit button text |

---

### Card

Container with optional title/description.

```json
{
  "type": "Card",
  "props": {
    "title": "User Details",
    "description": "Review the information below"
  },
  "children": ["content"]
}
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | No | - | Card title |
| `description` | `string` | No | - | Card description |

---

### Row / Column

Layout containers.

```json
{
  "type": "Row",
  "props": { "gap": 12 },
  "children": ["cancelBtn", "confirmBtn"]
}
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `gap` | `number \| string` | No | `12` | Spacing in px, or named: `xs`(4), `sm`(8), `md`(12), `lg`(16), `xl`(24) |

---

### Stat

Metric display with change indicator.

```json
{
  "type": "Stat",
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
| `change` | `string` | No | - | Change indicator |
| `changeType` | `string` | No | `"neutral"` | `positive` (green), `negative` (red), `neutral` (gray) |

---

### Table

Data table display.

```json
{
  "type": "Table",
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

### Diagram

Mermaid diagram rendering.

```json
{
  "type": "Diagram",
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

### Separator

Horizontal line divider.

```json
{ "type": "Separator", "props": { "spacing": "md" } }
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `spacing` | `string` | No | `"md"` | `sm` (8px), `md` (16px), `lg` (24px) |

---

### Image

```json
{ "type": "Image", "props": { "src": "https://example.com/img.png", "alt": "Logo", "width": 200 } }
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `src` | `string` | Yes | - | Image URL |
| `alt` | `string` | No | `""` | Alt text |
| `width` | `number` | No | - | Width |
| `height` | `number` | No | - | Height |

---

### Badge

```json
{ "type": "Badge", "props": { "text": "New", "variant": "default" } }
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `text` | `string` | Yes | - | Badge text (also accepts `label`) |
| `variant` | `string` | No | `"default"` | `default`, `success`, `warning`, `destructive` |

---

### Alert

```json
{ "type": "Alert", "props": { "title": "Warning", "message": "Check your input", "variant": "warning" } }
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | No | - | Alert title |
| `message` | `string` | No | - | Alert body (also accepts `text`) |
| `variant` | `string` | No | `"default"` | `default`, `info`, `warning`, `destructive` |

---

### Link

```json
{ "type": "Link", "props": { "href": "https://example.com", "text": "Visit", "target": "_blank" } }
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `href` | `string` | Yes | - | URL |
| `text` | `string` | No | href | Link text (also accepts `label`) |
| `target` | `string` | No | - | `_blank` for new tab |

---

### Progress

```json
{ "type": "Progress", "props": { "value": 75, "max": 100, "label": "Upload" } }
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `value` | `number` | Yes | `0` | Current value |
| `max` | `number` | No | `100` | Maximum value |
| `label` | `string` | No | - | Label with percentage |

---

### List

```json
{ "type": "List", "props": { "items": ["Apple", "Banana", "Cherry"], "ordered": false } }
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `items` | `string[]` | Yes | - | List items |
| `ordered` | `boolean` | No | `false` | Ordered (numbered) list |

---

### Type Aliases

These types are mapped to existing renderers for json-render.dev compatibility:

| Alias | Maps To | Notes |
|-------|---------|-------|
| `Heading`, `Paragraph`, `Label` | `Text` | |
| `TextInput`, `TextField` | `Input` | |
| `Dropdown` | `Select` | |
| `Container`, `Box`, `Section`, `Group`, `VStack` | `Column` | |
| `HStack` | `Row` | |
| `Stack` | `Column` or `Row` | Based on `direction` prop (`horizontal` → Row) |
| `Divider`, `Hr` | `Separator` | |
| `Img` | `Image` | |

Unknown types render their children if present, otherwise render nothing.

---

## Dialogs

Dialogs provide fullscreen modals for forms and complex interactions. In iframe context, they render in the host page for maximum space.

### Defining Dialogs

Define dialogs in the `dialogs` map. Keys are dialog names, values are element IDs:

```json
{
  "root": "main",
  "elements": {
    "main": { "type": "Column", "children": ["text", "btn"] },
    "text": { "type": "Text", "props": { "text": "Click button to configure" } },
    "btn": { "type": "Button", "props": { "label": "Configure API", "opensDialog": "api-config" } },
    "apiConfigForm": {
      "type": "Form",
      "props": {
        "title": "API Configuration",
        "description": "Enter your API credentials",
        "size": "md",
        "submitAction": "save_api_config",
        "submitLabel": "Save Configuration"
      },
      "children": ["apiKey", "endpoint"]
    },
    "apiKey": { "type": "Input", "props": { "name": "apiKey", "label": "API Key", "inputType": "password" } },
    "endpoint": { "type": "Input", "props": { "name": "endpoint", "label": "Endpoint URL" } }
  },
  "dialogs": { "api-config": "apiConfigForm" }
}
```

### Dialog Properties

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | Yes | - | Dialog title |
| `description` | `string` | No | - | Dialog description |
| `size` | `string` | No | `"full"` | Dialog size |
| `submitAction` | `string` | No | - | Action to trigger on submit |
| `submitLabel` | `string` | No | `"Submit"` | Submit button text |
| `cancelLabel` | `string` | No | `"Cancel"` | Cancel button text |
| `submitVariant` | `string` | No | `"default"` | `default` or `destructive` |

**Sizes:** `sm` (400px), `md` (600px), `lg` (900px), `xl` (1200px), `full` (95vw)

### Auto-Opening Dialogs (Forced Mode)

Use `autoOpenDialog` to force-open a dialog on render. Essential for:
- Mandatory credential prompts
- Required user input blocking progress
- Authentication flows

**Best Practice: Always include a fallback button** since users can close via Cancel:

```json
{
  "root": "main",
  "elements": {
    "main": {
      "type": "Card",
      "props": {
        "title": "Authentication Required",
        "description": "This action requires valid credentials"
      },
      "children": ["text", "btn"]
    },
    "text": { "type": "Text", "props": { "text": "The credential form has been opened automatically. Please complete authentication to continue.", "variant": "muted" } },
    "btn": { "type": "Button", "props": { "label": "Enter Credentials", "opensDialog": "auth-dialog" } },
    "authForm": {
      "type": "Form",
      "props": {
        "title": "Enter Credentials",
        "description": "Authenticate to continue with this workflow",
        "size": "md",
        "submitAction": "authenticate",
        "submitLabel": "Authenticate"
      },
      "children": ["apiEndpoint", "apiKeyInput", "authType"]
    },
    "apiEndpoint": { "type": "Input", "props": { "name": "apiEndpoint", "label": "API Endpoint", "placeholder": "https://api.example.com" } },
    "apiKeyInput": { "type": "Input", "props": { "name": "apiKey", "label": "API Key", "inputType": "password" } },
    "authType": {
      "type": "Select",
      "props": {
        "name": "authType",
        "label": "Authentication Type",
        "options": [
          { "label": "Bearer Token", "value": "bearer" },
          { "label": "API Key Header", "value": "api-key" },
          { "label": "Basic Auth", "value": "basic" }
        ]
      }
    }
  },
  "dialogs": { "auth-dialog": "authForm" },
  "autoOpenDialog": "auth-dialog"
}
```

**How it works:**

1. Schema renders with `autoOpenDialog: "auth-dialog"`
2. Dialog opens automatically after 100ms delay
3. **Backdrop click and ESC are disabled** for auto-opened dialogs
4. If user closes via Cancel → fallback button visible
5. Button click reopens dialog (without forced mode)

**Key points:**
- `autoOpenDialog` value must match a key in `dialogs`
- Auto-opened dialogs have `preventBackdropClose: true` automatically
- Dialog renders in host page in iframe context
- Toast notification confirms successful submission

---

## Conditional Rendering

### `if` prop

All elements support `if` in props for conditional display based on form data:

```json
{
  "type": "Text",
  "props": {
    "text": "Premium features unlocked!",
    "if": { "field": "plan", "operator": "eq", "value": "premium" }
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

### `visible` conditional (json-render.dev)

Element-level visibility using `$data.` path prefix:

```json
{
  "type": "Text",
  "props": { "text": "Form is dirty" },
  "visible": { "path": "$data.form.isDirty", "operator": "eq", "value": true }
}
```

---

## Action Payloads

When a user clicks a button or submits a form, an action payload is sent.

```json
{
  "action": "approve_request",
  "data": { "title": "User input value", "priority": "high" },
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

---

## Examples

### Simple Confirmation

```json
{
  "root": "main",
  "elements": {
    "main": { "type": "Column", "children": ["heading", "subtext", "buttons"] },
    "heading": { "type": "Text", "props": { "text": "Confirm Action", "variant": "heading" } },
    "subtext": { "type": "Text", "props": { "text": "Are you sure you want to proceed?", "variant": "muted" } },
    "buttons": {
      "type": "Row",
      "props": { "gap": 8 },
      "children": ["cancelBtn", "confirmBtn"]
    },
    "cancelBtn": { "type": "Button", "props": { "label": "Cancel", "action": "cancel", "variant": "outline" } },
    "confirmBtn": { "type": "Button", "props": { "label": "Confirm", "action": "confirm" } }
  }
}
```

### Form with Conditional Fields

```json
{
  "root": "form",
  "elements": {
    "form": {
      "type": "Form",
      "props": { "submitAction": "submit_request" },
      "children": ["requestType", "steps", "useCase"]
    },
    "requestType": {
      "type": "Select",
      "props": {
        "name": "requestType",
        "label": "Request Type",
        "options": [
          { "label": "Bug Report", "value": "bug" },
          { "label": "Feature Request", "value": "feature" }
        ]
      }
    },
    "steps": {
      "type": "Input",
      "props": {
        "name": "steps",
        "label": "Steps to Reproduce",
        "inputType": "textarea",
        "if": { "field": "requestType", "operator": "eq", "value": "bug" }
      }
    },
    "useCase": {
      "type": "Input",
      "props": {
        "name": "useCase",
        "label": "Use Case Description",
        "inputType": "textarea",
        "if": { "field": "requestType", "operator": "eq", "value": "feature" }
      }
    }
  }
}
```

### Dashboard with Stats

```json
{
  "root": "main",
  "elements": {
    "main": { "type": "Column", "children": ["heading", "statsRow", "table"] },
    "heading": { "type": "Text", "props": { "text": "Dashboard", "variant": "heading" } },
    "statsRow": {
      "type": "Row",
      "props": { "gap": 16 },
      "children": ["s1", "s2", "s3"]
    },
    "s1": { "type": "Stat", "props": { "label": "Total Users", "value": "1,234", "change": "+12%", "changeType": "positive" } },
    "s2": { "type": "Stat", "props": { "label": "Active Sessions", "value": "89", "change": "-5%", "changeType": "negative" } },
    "s3": { "type": "Stat", "props": { "label": "Avg Response", "value": "2.3s", "changeType": "neutral" } },
    "table": {
      "type": "Table",
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
  }
}
```

---

## Validation

Schemas are validated at runtime using Zod. Invalid schemas:
- Log validation errors to console
- Display error UI with details (in development)
- Fall back gracefully (no crash)

**Common validation errors:**
- Missing required props (`text`, `name`, `action`, etc.)
- Invalid `type` value
- Malformed `options` array
- Invalid `variant` or `changeType` values
