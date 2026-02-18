# SchemaRenderer: JSON → UI Pipeline

How `ui_schema` flows from Platform through RabbitMQ/SSE to the client and renders as React components.

---

## End-to-End Flow

```
Platform Activity                    Jarvis API Server              Jarvis Iframe (React)
───────────────                      ──────────────────              ─────────────────────
RabbitMQ Push Activity
  queue: chat.responses
  message: {                    ──►  RabbitMQ Consumer
    user_id,                         (rabbitmq.ts)
    ui_schema: {...}                   │
  }                                    ├─ Detects ui_schema field
                                       ├─ Stores message in DB
                                       └─ Sends SSE event        ──►  SSEContext receives
                                          {                            new_message event
                                            type: "new_message",         │
                                            data: {                      ├─ Adds to conversationStore
                                              metadata: {                ├─ ChatV1Content renders msg
                                                ui_schema: {...}         └─ SchemaRenderer renders
                                              }                              ui_schema as React components
                                            }
                                          }
```

---

## 1. Platform → RabbitMQ

Platform publishes to `chat.responses` queue via existing RabbitMQ Push Activity.

**Inner message** (goes in `response` field):
```json
{
  "user_id": "275fb79d-0a6f-4336-bc05-1f6fcbaf775b",
  "ui_schema": {
    "root": "main",
    "elements": {
      "main": { "type": "Text", "props": { "text": "Hello from Platform" } }
    }
  }
}
```

**Outer wrapper** (added by RabbitMQ Push Activity):
```json
{
  "tenant_id": "00F4F67D-3B92-4FD2-A574-7BE22C6BE796",
  "message_id": "generated-uuid",
  "conversation_id": "conv-123",
  "response": "<inner message as JSON string>"
}
```

---

## 2. API Server Processing

**File:** `packages/api-server/src/services/rabbitmq.ts`

1. Consumer receives message from `chat.responses` queue
2. Parses `response` field as JSON
3. Detects `ui_schema` field → routes as form request
4. Stores message with metadata in database
5. Broadcasts SSE `new_message` event to target user

The `metadata` sent via SSE contains:
```typescript
{
  type: "ui_form_request",
  request_id: string,
  ui_schema: object,      // The schema to render
  interrupt: boolean,      // Auto-open as modal?
  status: "pending"
}
```

---

## 3. Client SSE → Store → Render

**Files:**
- `packages/client/src/contexts/SSEContext.tsx` — receives SSE events
- `packages/client/src/stores/conversationStore.ts` — stores messages
- `packages/client/src/components/chat/ChatV1Content.tsx` — decides how to render

### Rendering Decision

ChatV1Content checks `message.metadata`:

| Condition | Render |
|-----------|--------|
| `type === "ui_form_request"` + `interrupt: true` | Modal form (host or in-iframe dialog) |
| `type === "ui_form_request"` + `interrupt: false` | Inline form in chat |
| `ui_schema` present (no form request) | `<SchemaRenderer>` inline in chat bubble |

---

## 4. SchemaRenderer

**File:** `packages/client/src/components/schema-renderer/SchemaRenderer.tsx`

Renders a `ui_schema` JSON object as shadcn/ui React components.

### Props

```typescript
interface SchemaRendererProps {
  schema: UISchema | Record<string, unknown>;
  messageId: string;
  conversationId: string;
  onAction?: (payload: UIActionPayload) => void;
  disabled?: boolean;
}
```

### Schema Format

```typescript
interface UISchema {
  root: string;                        // ID of root element
  elements: Record<string, UIElement>; // Flat map: element ID → definition
  dialogs?: Record<string, string>;    // Dialog name → element ID
  autoOpenDialog?: string;             // Auto-open this dialog on render
}

interface UIElement {
  type: string;                        // PascalCase component name
  props?: Record<string, unknown>;     // Component-specific props
  children?: string[];                 // IDs of child elements
  visible?: VisibleCondition;          // Conditional visibility
  on?: Record<string, Record<string, unknown>>; // Event handlers
}
```

### Schema Parsing

**File:** `packages/client/src/types/uiSchema.ts`

`parseSchema()` accepts three input formats:

**1. Full schema** (standard):
```json
{
  "root": "main",
  "elements": {
    "main": { "type": "Text", "props": { "text": "Hello" } }
  }
}
```

**2. Bare element** (auto-wrapped):
```json
{ "type": "Text", "props": { "text": "Hello" } }
```
→ Becomes `{ root: "main", elements: { main: <element> } }`

**3. Flat single element** (auto-wrapped):
```json
{ "elements": { "type": "Text", "props": { "text": "Hello" } } }
```
→ Becomes `{ root: "main", elements: { main: <element> } }`

All inputs are validated with Zod. Invalid schemas show an error fallback.

---

## 5. Supported Component Types

### Core Components

| Type | Purpose | Key Props |
|------|---------|-----------|
| `Text` | Display text/markdown | `text`, `variant` (`default`/`muted`/`heading`/`subheading`) |
| `Input` | Text input field | `name`, `label`, `placeholder`, `inputType` (`text`/`password`/`email`/`textarea`), `required`, `defaultValue` |
| `Select` | Dropdown | `name`, `label`, `placeholder`, `required`, `options: {label, value}[]`, `defaultValue` |
| `Button` | Action button | `label`, `action`, `variant`, `disabled`, `opensDialog` |
| `Form` | Form container | `title`, `description`, `submitAction`, `submitLabel`, `cancelLabel`, `submitVariant` |

### Layout Components

| Type | Purpose | Key Props |
|------|---------|-----------|
| `Row` | Horizontal flex layout | `gap`, `className`, children |
| `Column` | Vertical flex layout | `gap`, `className`, children |
| `Card` | Card container | `title`, `description`, children |
| `Separator` | Divider line | `spacing`, `className` |

### Data Display Components

| Type | Purpose | Key Props |
|------|---------|-----------|
| `Table` | Data table | `columns: {key, label}[]`, `rows: Record<string,string>[]` |
| `Stat` | Statistic display | `label`, `value`, `change`, `changeType` |
| `Diagram` | Mermaid diagram | `code`, `title` |
| `Badge` | Badge/tag | `text`/`label`, `variant` (`default`/`success`/`warning`/`destructive`) |
| `Alert` | Alert box | `title`, `message`/`text`, `variant` (`default`/`info`/`warning`/`destructive`) |
| `Image` | Image display | `src`, `alt`, `width`, `height` |
| `Link` | Hyperlink | `href`, `text`/`label`, `target` |
| `Progress` | Progress bar | `value`, `max`, `label` |
| `List` | Ordered/unordered list | `items: string[]`, `ordered` |

### Type Aliases

These alternative type names map to canonical types:

| Alias | Maps To |
|-------|---------|
| `Stack` | `Column` (or `Row` if `direction: "horizontal"`) |
| `Heading`, `Paragraph`, `Label` | `Text` |
| `TextInput`, `TextField` | `Input` |
| `Dropdown` | `Select` |
| `Container`, `Box`, `Section`, `Group`, `VStack` | `Column` |
| `HStack` | `Row` |
| `Divider`, `Hr` | `Separator` |
| `Img` | `Image` |

### Unknown Types

Unknown component types render their children (if any) as a plain `<div>`. If no children, nothing is rendered.

---

## 6. Conditional Rendering

### `if` prop (RITA format)

Any element can include an `if` condition in props:

```json
{
  "type": "Input",
  "props": {
    "name": "reason",
    "label": "Rejection Reason",
    "if": { "field": "decision", "operator": "eq", "value": "reject" }
  }
}
```

### `visible` prop (json-render.dev format)

```json
{
  "type": "Input",
  "props": { "name": "extra" },
  "visible": { "path": "$data.form.isDirty", "operator": "eq", "value": true }
}
```

The `$data.` prefix is stripped before evaluation.

### Operators

| Operator | Description |
|----------|-------------|
| `eq` | Equal to value |
| `neq` | Not equal to value |
| `exists` | Field is not empty/undefined/null |
| `notExists` | Field is empty/undefined/null |
| `gt` | Greater than (numeric) |
| `lt` | Less than (numeric) |
| `contains` | String contains value |

Conditions evaluate against current form field values.

---

## 7. Dialogs & Forms

### Dialog Definition

Dialogs map a name to an element ID (typically a `Form` element):

```json
{
  "root": "main",
  "elements": {
    "main": {
      "type": "Form",
      "props": { "title": "Enter Info", "submitAction": "submit" },
      "children": ["nameInput"]
    },
    "nameInput": { "type": "Input", "props": { "name": "name", "label": "Name" } }
  },
  "dialogs": { "info-form": "main" },
  "autoOpenDialog": "info-form"
}
```

### Auto-Open

`autoOpenDialog` causes the named dialog to open automatically on render. The backdrop click is disabled for auto-opened dialogs.

### Modal Rendering Tiers

When a dialog opens, SchemaRenderer uses a three-tier fallback:

1. **Same-origin injection** — If iframe can access parent document, injects modal directly into host page DOM
2. **Cross-origin postMessage** — Sends `RITA_OPEN_FORM_MODAL` to parent, waits 300ms for `RITA_FORM_MODAL_ACK`
3. **In-iframe Dialog** — Falls back to rendering a `<Dialog>` inside the iframe

### Form Submission

When user submits a form:
1. Form data collected from all Input/Select fields
2. `onAction` callback fires with `{ action: submitAction, data: formData }`
3. Parent component (ChatV1Content) forwards to platform via webhook

### Button Actions

Buttons can trigger actions or open dialogs:

```json
{ "type": "Button", "props": { "label": "Submit", "action": "do_something" } }
{ "type": "Button", "props": { "label": "Open Form", "opensDialog": "my-form" } }
```

json-render.dev event format also supported:
```json
{ "type": "Button", "on": { "press": { "action": "do_something" } } }
```

---

## 8. Response Flow (Form Submit → Platform)

```
User submits form in iframe
        │
        ▼
SchemaRenderer onAction callback
        │
        ▼
ChatV1Content sends to API server
  POST /api/iframe/ui-form-response
        │
        ▼
API Server sends HTTP webhook to Platform
  POST {actionsApiBaseUrl}/api/Webhooks/postEvent/{tenantId}
  Authorization: Basic {base64(clientId:clientKey)}
        │
        ▼
Platform receives form data
  { status: "submitted", form_action: "submit", data: { ... } }
```

---

## 9. File Reference

| Component | File |
|-----------|------|
| Schema types & parser | `packages/client/src/types/uiSchema.ts` |
| SchemaRenderer | `packages/client/src/components/schema-renderer/SchemaRenderer.tsx` |
| Tests | `packages/client/src/components/schema-renderer/SchemaRenderer.test.tsx` |
| Chat message rendering | `packages/client/src/components/chat/ChatV1Content.tsx` |
| SSE event handling | `packages/client/src/contexts/SSEContext.tsx` |
| Conversation store | `packages/client/src/stores/conversationStore.ts` |
| RabbitMQ consumer | `packages/api-server/src/services/rabbitmq.ts` |
| SSE service | `packages/api-server/src/services/sse.ts` |
| Host modal utils | `packages/client/src/utils/hostModal.ts` |
| Demo page | `packages/client/src/pages/SchemaRendererDemo.tsx` |
