# Dynamic UI Schema Specification

## Overview

JSON-driven UI rendering for Platform Activities. Backend sends schema, RITA renders interactive components.

```
Platform Activity → RabbitMQ message (metadata.ui_schema) → SSE → Client → SchemaRenderer → User interaction → Action callback
```

## Schema Structure

```typescript
interface UISchema {
  version?: "1";           // Schema version for future compatibility
  components: UIComponent[]; // Array of components to render
}
```

## Component Types

### Display Components

#### Text
```json
{
  "type": "text",
  "content": "Hello world",
  "variant": "default" | "muted" | "heading" | "subheading"
}
```

#### Stat (Metric Card)
```json
{
  "type": "stat",
  "label": "Total Tickets",
  "value": "1,234",
  "change": "+12%",
  "changeType": "positive" | "negative" | "neutral"
}
```

#### Table
```json
{
  "type": "table",
  "columns": [
    { "key": "name", "label": "Name" },
    { "key": "status", "label": "Status" }
  ],
  "rows": [
    { "name": "Ticket #1", "status": "Open" },
    { "name": "Ticket #2", "status": "Closed" }
  ]
}
```

### Input Components

#### Text Input
```json
{
  "type": "input",
  "name": "email",
  "label": "Email Address",
  "placeholder": "user@example.com",
  "inputType": "text" | "email" | "number" | "password" | "textarea",
  "required": true,
  "defaultValue": ""
}
```

#### Select Dropdown
```json
{
  "type": "select",
  "name": "priority",
  "label": "Priority",
  "placeholder": "Select priority...",
  "options": [
    { "label": "Low", "value": "low" },
    { "label": "Medium", "value": "medium" },
    { "label": "High", "value": "high" }
  ],
  "required": false,
  "defaultValue": "medium"
}
```

### Action Components

#### Button
```json
{
  "type": "button",
  "label": "Submit",
  "action": "submit_form",
  "variant": "default" | "destructive" | "outline" | "secondary" | "ghost",
  "disabled": false
}
```

### Layout Components

#### Card (Container with header)
```json
{
  "type": "card",
  "title": "Settings",
  "description": "Configure your preferences",
  "children": [ /* nested components */ ]
}
```

#### Row (Horizontal layout)
```json
{
  "type": "row",
  "gap": 12,
  "children": [ /* nested components */ ]
}
```

#### Column (Vertical layout)
```json
{
  "type": "column",
  "gap": 12,
  "children": [ /* nested components */ ]
}
```

#### Form (Collects inputs, handles submit)
```json
{
  "type": "form",
  "submitAction": "save_settings",
  "submitLabel": "Save",
  "children": [ /* input components */ ]
}
```

## Action Callback Payload

When user clicks button or submits form:

```typescript
interface UIActionPayload {
  action: string;              // Action identifier (e.g., "submit_form")
  data?: Record<string, any>;  // Form data (for form submissions)
  messageId: string;           // ID of the message containing the schema
  conversationId: string;      // Current conversation
  timestamp: string;           // ISO timestamp
}
```

## RabbitMQ Message Format

```json
{
  "messageId": "msg-123",
  "conversationId": "conv-456",
  "role": "assistant",
  "message": "",
  "metadata": {
    "ui_schema": {
      "version": "1",
      "components": [
        { "type": "text", "content": "Please configure:", "variant": "heading" },
        { "type": "form", "submitAction": "configure", "children": [
          { "type": "input", "name": "name", "label": "Name" },
          { "type": "button", "label": "Save", "action": "save" }
        ]}
      ]
    },
    "turn_complete": true
  }
}
```

## Full Example: Workflow Configuration

```json
{
  "version": "1",
  "components": [
    {
      "type": "text",
      "content": "Configure Workflow Trigger",
      "variant": "heading"
    },
    {
      "type": "card",
      "title": "Trigger Settings",
      "description": "Define when this workflow should run",
      "children": [
        {
          "type": "form",
          "submitAction": "save_trigger",
          "submitLabel": "Save Configuration",
          "children": [
            {
              "type": "select",
              "name": "triggerType",
              "label": "Trigger Event",
              "options": [
                { "label": "On Ticket Created", "value": "ticket_created" },
                { "label": "On SLA Breach", "value": "sla_breach" },
                { "label": "On Status Change", "value": "status_change" }
              ]
            },
            {
              "type": "input",
              "name": "filterCondition",
              "label": "Filter Condition",
              "placeholder": "e.g., priority = 'high' AND category = 'billing'",
              "inputType": "textarea"
            },
            {
              "type": "row",
              "gap": 8,
              "children": [
                {
                  "type": "stat",
                  "label": "Matching Tickets",
                  "value": "42",
                  "change": "Last 24h",
                  "changeType": "neutral"
                },
                {
                  "type": "stat",
                  "label": "Est. Runs/Day",
                  "value": "~15",
                  "changeType": "neutral"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## Implementation Status

| Component | Implemented | Notes |
|-----------|-------------|-------|
| text | ✅ | All variants |
| stat | ✅ | With change indicator |
| input | ✅ | text, email, number, password, textarea |
| select | ✅ | Single select only |
| button | ✅ | All variants |
| card | ✅ | With title/description |
| row | ✅ | Horizontal flex |
| column | ✅ | Vertical flex |
| form | ✅ | Collects nested inputs |
| table | ✅ | Basic rendering |

## Future Enhancements

- [ ] Multi-select dropdown
- [ ] Checkbox / Toggle
- [ ] Date picker
- [ ] File upload
- [ ] Conditional rendering (`if` property)
- [ ] Validation rules
- [ ] Loading states
- [ ] Schema versioning/migration

## Security

- No script execution in schema
- All user input sanitized before callback
- Schema validated before rendering (graceful fallback on invalid)
