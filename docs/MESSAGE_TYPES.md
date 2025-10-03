# Rita Chat Message Types Documentation

This document describes the different types of messages supported by Rita's chat interface, the external system requirements for sending messages via RabbitMQ, and the test triggers available in the mock service.

## Overview

Rita supports a hybrid message system that allows external services to send structured responses with different components:

- **Text**: Main response content with markdown support
- **Reasoning**: Step-by-step analysis or thought process
- **Sources**: Reference links and documentation
- **Tasks**: Actionable automation items

Messages are grouped using a `response_group_id` to create cohesive multi-part responses that display as a single conversation unit.

## Message Architecture

### Database Schema

```sql
-- Complete messages table structure
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(user_id),
  organization_id UUID NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('sending', 'pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP WITH TIME ZONE,

  -- Hybrid message support fields
  metadata JSONB,
  response_group_id UUID,

  -- Indexes for performance
  CONSTRAINT messages_conversation_id_idx FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- Indexes for efficient queries
CREATE INDEX idx_messages_conversation_id ON messages (conversation_id);
CREATE INDEX idx_messages_created_at ON messages (created_at);
CREATE INDEX idx_messages_response_group ON messages (response_group_id);
CREATE INDEX idx_messages_user_organization ON messages (user_id, organization_id);
CREATE INDEX idx_messages_status ON messages (status);

-- JSONB indexes for metadata queries
CREATE INDEX idx_messages_metadata_reasoning ON messages USING GIN ((metadata->'reasoning'));
CREATE INDEX idx_messages_metadata_sources ON messages USING GIN ((metadata->'sources'));
CREATE INDEX idx_messages_metadata_tasks ON messages USING GIN ((metadata->'tasks'));
```

### Message Interface

```typescript
interface Message {
  id: string
  role: 'user' | 'assistant'
  message: string  // Main text content
  metadata?: {
    reasoning?: {
      content: string
      state?: 'streaming' | 'done'
      duration?: number
      title?: string  // Optional custom title (e.g., "Research & Analysis", "Planning")
    }
    sources?: Array<{
      url: string
      title: string
      snippet?: string  // Optional content preview/excerpt (200-300 chars recommended)
      blob_id?: string  // Optional reference to uploaded document in blob storage
    }>
    tasks?: Array<{
      title: string
      items: string[]
      defaultOpen?: boolean
    }>
    files?: Array<{
      url: string
      filename?: string
      mediaType: string
      size?: number
    }>
    turn_complete?: boolean  // UI hint: true = turn finished, false/undefined = more messages coming
    citation_variant?: 'hover-card' | 'modal' | 'right-panel' | 'collapsible-list' | 'inline'  // Controls how citations are displayed
  }
  response_group_id?: string
  timestamp: Date
  conversation_id: string
  status: 'sending' | 'pending' | 'processing' | 'completed' | 'failed'
  // ... other fields
}
```

## External System Requirements

### RabbitMQ Message Format

External services must send messages to the RabbitMQ queue (`chat.responses`) in this format:

```typescript
interface RabbitMQMessage {
  message_id: string
  conversation_id: string
  tenant_id: string
  user_id?: string
  response: string  // Main text content (can be empty for metadata-only messages)
  metadata?: {
    reasoning?: {
      content: string
      state?: 'streaming' | 'done'
      title?: string  // Optional custom title (e.g., "Research & Analysis", "Planning", "Investigation")
    }
    sources?: Array<{
      url: string
      title: string
      snippet?: string  // Optional content preview (200-300 chars recommended)
      blob_id?: string  // Optional reference to uploaded document in blob storage (e.g., "blob-a1b2c3d4-...")
    }>
    tasks?: Array<{
      title: string
      items: string[]
      defaultOpen?: boolean
    }>
    files?: Array<{
      url: string
      filename?: string
      mediaType: string
      size?: number
    }>
    turn_complete?: boolean  // UI hint: false = more messages coming, true = turn finished
    citation_variant?: 'hover-card' | 'modal' | 'right-panel' | 'collapsible-list' | 'inline'  // Controls citation display (default: 'hover-card')
  }
  response_group_id?: string  // UUID to group related messages
}
```

### Message Ordering

To ensure proper ordering in grouped responses:

1. **Use the same `response_group_id`** for all related message parts
2. **Send messages with incremental delays** (recommended: 100ms between parts)
3. **Maintain consistent ordering**: reasoning → text → sources → tasks

### Example: Complete Response Flow

#### Step 1: Send Reasoning Message
```json
{
  "message_id": "msg-123",
  "conversation_id": "conv-456",
  "tenant_id": "tenant-789",
  "response": "",
  "metadata": {
    "reasoning": {
      "content": "Let me analyze this step by step:\n\n1. First, I'll check the system status\n2. Then review the logs\n3. Finally, create automation tasks",
      "state": "done",
      "title": "System Analysis"
    },
    "turn_complete": false
  },
  "response_group_id": "group-abc-123"
}
```

#### Step 2: Send Main Text Response (100ms delay)
```json
{
  "message_id": "msg-124",
  "conversation_id": "conv-456",
  "tenant_id": "tenant-789",
  "response": "## Analysis Complete ✅\n\nI've successfully processed your request.\n\n### Summary\n- System status: Healthy\n- Issues found: 2 minor warnings\n- Actions recommended: 3 automation tasks",
  "metadata": {
    "turn_complete": false
  },
  "response_group_id": "group-abc-123"
}
```

#### Step 3: Send Sources (200ms delay)
```json
{
  "message_id": "msg-125",
  "conversation_id": "conv-456",
  "tenant_id": "tenant-789",
  "response": "",
  "metadata": {
    "sources": [
      {
        "url": "https://docs.company.com/monitoring",
        "title": "System Monitoring Guide",
        "snippet": "Comprehensive guide for monitoring system health, including CPU, memory, disk usage, and service status checks."
      },
      {
        "url": "https://docs.company.com/automation",
        "title": "Automation Best Practices",
        "snippet": "Learn how to automate routine tasks, implement CI/CD pipelines, and optimize workflow efficiency."
      },
      {
        "url": "blob://internal",
        "title": "Company Security Policy Q2 2024.pdf",
        "snippet": "Section 4: System monitoring requirements and compliance guidelines for production environments.",
        "blob_id": "blob-a1b2c3d4-e5f6-7890-abcd-ef1234567890"
      }
    ],
    "citation_variant": "hover-card",
    "turn_complete": false
  },
  "response_group_id": "group-abc-123"
}
```

#### Step 4: Send Tasks (300ms delay) - Final Message
```json
{
  "message_id": "msg-126",
  "conversation_id": "conv-456",
  "tenant_id": "tenant-789",
  "response": "",
  "metadata": {
    "tasks": [
      {
        "title": "System Health Check",
        "defaultOpen": true,
        "items": [
          "Check CPU and memory usage",
          "Verify service status",
          "Review error logs",
          "Generate health report"
        ]
      },
      {
        "title": "Performance Optimization",
        "defaultOpen": false,
        "items": [
          "Optimize database queries",
          "Clear application cache",
          "Update configuration"
        ]
      }
    ],
    "turn_complete": true
  },
  "response_group_id": "group-abc-123"
}
```

## Supported Message Types

### 1. Simple Text Message
**Use case**: Basic responses, explanations, confirmations

```json
{
  "response": "## Task Completed ✅\n\nYour request has been processed successfully.",
  "response_group_id": "unique-id"
}
```

**UI Display**: Single message bubble with markdown content

### 2. Reasoning + Text
**Use case**: Analytical responses where the thought process is important

```json
// Message 1: Reasoning
{
  "response": "",
  "metadata": {
    "reasoning": {
      "content": "Let me think through this:\n\n1. Analyze the request\n2. Check prerequisites\n3. Plan the solution",
      "state": "done"
    }
  },
  "response_group_id": "group-id"
}

// Message 2: Text Response
{
  "response": "## Solution Implemented\n\nBased on my analysis, here's what I've done...",
  "response_group_id": "group-id"
}
```

**UI Display**: Collapsible reasoning section followed by main response

### 3. Text + Sources
**Use case**: Responses that reference documentation or external resources

```json
// Message 1: Text
{
  "response": "## Documentation Available\n\nHere are the relevant resources for your request.",
  "response_group_id": "group-id"
}

// Message 2: Sources
{
  "response": "",
  "metadata": {
    "sources": [
      {"url": "https://docs.example.com", "title": "Official Documentation"}
    ]
  },
  "response_group_id": "group-id"
}
```

**UI Display**: Main content followed by expandable sources section

### 4. Text + Tasks
**Use case**: Responses that include actionable automation items

```json
// Message 1: Text
{
  "response": "## Automation Ready\n\nI've prepared the following tasks for execution.",
  "response_group_id": "group-id"
}

// Message 2: Tasks
{
  "response": "",
  "metadata": {
    "tasks": [
      {
        "title": "Primary Tasks",
        "defaultOpen": true,
        "items": ["Task 1", "Task 2", "Task 3"]
      }
    ]
  },
  "response_group_id": "group-id"
}
```

**UI Display**: Main content followed by expandable task groups

### 5. Complete Suite (Reasoning + Text + Sources + Tasks)
**Use case**: Comprehensive responses with full context and actions

**UI Display**: All components in a cohesive grouped message:
1. Collapsible reasoning section (thinking process)
2. Main response content (analysis results)
3. Expandable sources (reference materials)
4. Expandable task groups (actionable items)

### 6. Standalone Components
**Use case**: Specific component-only responses

- **Reasoning only**: Analysis or thought process without conclusions
- **Sources only**: Reference materials or documentation links
- **Tasks only**: Pure automation/action items

## Mock Service Test Triggers

The mock service supports the following test triggers for development and testing:

### Single Component Tests

| Trigger | Description | Components |
|---------|-------------|------------|
| `test1` | Normal text message only | Text |
| `test6` | Reasoning only | Reasoning |
| `test7` | Sources only | Sources (5 links) |
| `test8` | Tasks only | Tasks (3 groups) |

### Two Component Combinations

| Trigger | Description | Components |
|---------|-------------|------------|
| `test2` | Reasoning + text | Reasoning → Text |
| `test3` | Text + sources | Text → Sources |
| `test4` | Text + tasks | Text → Tasks |
| `test9` | Reasoning + sources | Reasoning → Sources |
| `test10` | Reasoning + tasks | Reasoning → Tasks |

### Complete Suite

| Trigger | Description | Components |
|---------|-------------|------------|
| `test5` | Full response | Reasoning → Text → Sources → Tasks |

### Legacy Fallback

| Trigger | Description | Components |
|---------|-------------|------------|
| Any other message | Default behavior | Reasoning → Text → Sources → Tasks |

### Example Test Usage

Simply type any trigger in the chat interface:

```
test1    → Simple text response
test2    → Reasoning followed by text
test3    → Text with source references
test4    → Text with automation tasks
test5    → Complete suite with all components
test6    → Only reasoning display
test7    → Only sources display
test8    → Only tasks display
test9    → Reasoning + sources combination
test10   → Reasoning + tasks combination
hello    → Default full response (fallback)
```

## UI Components Used

Rita uses the **ai-elements** component library for rendering:

- **`<Reasoning>`**: Collapsible thought process section
- **`<Response>`**: Main markdown content rendering
- **`<Sources>`**: Expandable reference links
- **`<Task>`**: Expandable automation task groups
- **`<Actions>`**: Copy/retry buttons (copy with toast feedback)

## Best Practices

### For External Services:

1. **Always use UUIDs** for `response_group_id` when sending grouped responses
2. **Send messages in logical order**: reasoning → text → sources → tasks
3. **Use incremental delays** (100ms recommended) between grouped messages
4. **Include meaningful metadata** with appropriate structure
5. **Keep text content** in the `response` field, metadata in `metadata` field
6. **Use `turn_complete`** to control loading indicators:
   - Set `metadata.turn_complete = false` for all messages except the last
   - Set `metadata.turn_complete = true` on the final message in a turn
   - Omit the field for single-message responses (defaults to complete)
7. **Include `snippet` in sources** for richer previews (200-300 characters recommended)
8. **Use `blob_id` for uploaded documents** to reference files in blob storage
9. **Customize reasoning titles** with `reasoning.title` for better context (e.g., "Research & Analysis", "Planning")
10. **Control citation display** with `citation_variant`:
    - `hover-card` (default): Show citations in hover cards
    - `modal`: Open citations in modal dialogs
    - `right-panel`: Display citations in sidebar
    - `collapsible-list`: Show as expandable list
    - `inline`: Embed citations in text

### For Frontend Development:

1. **Test all combinations** using the mock service triggers
2. **Verify message ordering** by checking database timestamps
3. **Ensure proper grouping** by validating `response_group_id` handling
4. **Test copy functionality** with grouped vs simple messages
5. **Validate accessibility** of all ai-elements components

## Integration Notes

- Messages are stored flat in the database and grouped dynamically in the frontend
- Real-time updates work via Server-Sent Events (SSE)
- Message ordering is ensured by timestamp + ID sorting
- Copy functionality works for both individual and grouped messages
- All components support proper accessibility and keyboard navigation

---

*This documentation should be updated when new message types or components are added to the system.*