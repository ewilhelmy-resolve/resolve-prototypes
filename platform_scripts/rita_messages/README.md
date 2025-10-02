# Rita Message Actions

Pre-built Python activities for sending structured messages to Rita via RabbitMQ from external automation platforms.

## Overview

These activities abstract away the complexity of constructing JSON messages and handling RabbitMQ connections. Each activity sends a **single RabbitMQ message** with the appropriate structure.

## Available Actions

### Core Actions

#### 1. `send_text_message.py`
Send a simple text-only message.

**Required Parameters:**
- `host`, `port`, `username`, `password`, `queue_name` - RabbitMQ connection details
- `text_content` - Markdown-formatted text
- `tenant_id`, `message_id`, `conversation_id` - Message identifiers

**Optional Parameters:**
- `vhost` - RabbitMQ virtual host (default: "/")
- `response_group_id` - UUID to group with other messages

**Example:**
```python
result = execute(
    host="rabbitmq.example.com",
    port="5671",
    username="user",
    password="pass",
    vhost="/",
    queue_name="chat.responses",
    text_content="## Task Completed ✅\n\nDeployment successful!",
    response_group_id=None,
    tenant_id="tenant-123",
    message_id="msg-456",
    conversation_id="conv-789"
)
```

---

#### 2. `send_complete_message.py`
Send a message with any combination of components: text, reasoning, sources, and/or tasks. This is the **most versatile action** and can handle all message types.

**Required Parameters:**
- RabbitMQ connection details: `host`, `port`, `username`, `password`, `queue_name`
- Message identifiers: `tenant_id`, `message_id`, `conversation_id`

**Optional Parameters (at least one required):**
- `text_content` - Main response text (markdown supported)
- `reasoning_content` - Step-by-step analysis/thinking process
- `sources` - JSON string or list of `{"url": "...", "title": "..."}`
- `tasks` - JSON string or list of `{"title": "...", "items": [...], "defaultOpen": bool}`
- `vhost` - RabbitMQ virtual host (default: "/")
- `response_group_id` - UUID to group with other messages

**Note:** At least one content parameter (text_content, reasoning_content, sources, or tasks) must be provided.

**Examples:**

**Reasoning only:**
```python
result = execute(
    host="rabbitmq.example.com",
    port="5671",
    username="user",
    password="pass",
    vhost="/",
    queue_name="chat.responses",
    text_content=None,
    reasoning_content="""Let me analyze this step by step:

1. **Check System Status**: Verify all services are running
2. **Review Logs**: Look for any errors or warnings
3. **Generate Report**: Create comprehensive status report""",
    sources=None,
    tasks=None,
    response_group_id=None,
    tenant_id="tenant-123",
    message_id="msg-456",
    conversation_id="conv-789"
)
```

**Sources only:**
```python
sources = [
    {"url": "https://docs.example.com/deployment", "title": "Deployment Guide"},
    {"url": "https://docs.example.com/monitoring", "title": "Monitoring Guide"}
]

result = execute(
    host="rabbitmq.example.com",
    port="5671",
    username="user",
    password="pass",
    vhost="/",
    queue_name="chat.responses",
    text_content=None,
    reasoning_content=None,
    sources=json.dumps(sources),
    tasks=None,
    response_group_id=None,
    tenant_id="tenant-123",
    message_id="msg-456",
    conversation_id="conv-789"
)
```

**Tasks only:**
```python
tasks = [
    {
        "title": "Deployment Tasks",
        "defaultOpen": True,
        "items": [
            "Build Docker image",
            "Push to registry",
            "Update deployment"
        ]
    },
    {
        "title": "Post-Deployment",
        "defaultOpen": False,
        "items": ["Run smoke tests", "Update monitoring"]
    }
]

result = execute(
    host="rabbitmq.example.com",
    port="5671",
    username="user",
    password="pass",
    vhost="/",
    queue_name="chat.responses",
    text_content=None,
    reasoning_content=None,
    sources=None,
    tasks=json.dumps(tasks),
    response_group_id=None,
    tenant_id="tenant-123",
    message_id="msg-456",
    conversation_id="conv-789"
)
```

**Complete message with all components:**
```python
result = execute(
    host="rabbitmq.example.com",
    port="5671",
    username="user",
    password="pass",
    vhost="/",
    queue_name="chat.responses",
    text_content="## Deployment Plan Ready 🚀\n\nYour application is ready for production deployment.",
    reasoning_content="""Deployment Analysis:

1. **Requirements Check**: All prerequisites met
2. **Configuration Review**: Settings validated
3. **Risk Assessment**: Low risk deployment""",
    sources=json.dumps([
        {"url": "https://docs.example.com/deploy", "title": "Deployment Guide"}
    ]),
    tasks=json.dumps([
        {
            "title": "Pre-Deployment Checklist",
            "defaultOpen": True,
            "items": ["Backup production database", "Review rollback plan", "Notify team members"]
        }
    ]),
    response_group_id=None,
    tenant_id="tenant-123",
    message_id="msg-456",
    conversation_id="conv-789"
)
```

---

### Utility Actions

#### 3. `build_message.py`
Build a message payload without sending it to RabbitMQ. Useful for testing, logging, or sending via different transports.

**Required Parameters:**
- Message identifiers: `tenant_id`, `message_id`, `conversation_id`

**Optional Parameters (at least one required):**
- `text_content`, `reasoning_content`, `sources`, `tasks`, `response_group_id`

**Returns:**
```python
{
    "status": "success",
    "message": {
        "message_id": "msg-456",
        "conversation_id": "conv-789",
        "tenant_id": "tenant-123",
        "response": "Message text",
        "metadata": { ... }
    }
}
```

**Example:**
```python
result = build_message.execute(
    text_content="Test message",
    reasoning_content=None,
    sources=None,
    tasks=None,
    response_group_id=None,
    tenant_id="tenant-123",
    message_id="msg-456",
    conversation_id="conv-789"
)

# Use the built message
message_payload = result["message"]
```

---

#### 4. `send_to_rabbitmq.py`
Send any message payload to RabbitMQ. Generic sender that works with any message structure.

**Required Parameters:**
- RabbitMQ connection details: `host`, `port`, `username`, `password`, `queue_name`
- `message` - Dictionary or JSON string of the message payload

**Optional Parameters:**
- `vhost` - RabbitMQ virtual host (default: "/")

**Example (composable approach):**
```python
# Step 1: Build message
build_result = build_message.execute(
    text_content="Hello",
    reasoning_content=None,
    sources=None,
    tasks=None,
    response_group_id=None,
    tenant_id="tenant-123",
    message_id="msg-456",
    conversation_id="conv-789"
)

# Step 2: Send to RabbitMQ
send_result = send_to_rabbitmq.execute(
    host="rabbitmq.example.com",
    port="5671",
    username="user",
    password="pass",
    vhost="/",
    queue_name="chat.responses",
    message=build_result["message"]
)
```

---

## Message Grouping

Use `response_group_id` to link multiple messages together in the Rita UI:

```python
import uuid

# Generate a group ID
group_id = str(uuid.uuid4())

# Send reasoning message
send_complete_message(
    host="rabbitmq.example.com",
    port="5671",
    username="user",
    password="pass",
    vhost="/",
    queue_name="chat.responses",
    text_content=None,
    reasoning_content="Analyzing the system...",
    sources=None,
    tasks=None,
    response_group_id=group_id,  # Link messages with same group ID
    tenant_id="tenant-123",
    message_id="msg-456",
    conversation_id="conv-789"
)

# Send tasks message (will be grouped with above)
send_complete_message(
    host="rabbitmq.example.com",
    port="5671",
    username="user",
    password="pass",
    vhost="/",
    queue_name="chat.responses",
    text_content=None,
    reasoning_content=None,
    sources=None,
    tasks=json.dumps([
        {"title": "Recommended Actions", "defaultOpen": True, "items": ["Action 1", "Action 2"]}
    ]),
    response_group_id=group_id,  # Same group ID
    tenant_id="tenant-123",
    message_id="msg-789",
    conversation_id="conv-789"
)
```

Messages with the same `response_group_id` will display as a cohesive conversation unit in Rita.

---

## Return Values

All activities return a dictionary:

**Success:**
```python
{
    "status": "success",
    "message_id": "msg-456",
    "message": { ... }  # Full message payload sent to RabbitMQ
}
```

**Failure:**
```python
{
    "status": "error",
    "error": "Validation failed: tenant_id is required"
}
```

---

## Validation

All actions perform comprehensive validation:

### RabbitMQ Parameters
- `host`, `port`, `username`, `password`, `queue_name` - All required
- `port` - Must be a valid integer
- `vhost` - Optional, defaults to "/"

### Message Parameters
- `tenant_id`, `message_id`, `conversation_id` - Always required
- `response_group_id` - Must be a valid UUID v4 if provided
- **At least one content component required** (text, reasoning, sources, or tasks)
- Whitespace-only text is treated as empty

### Data Structures
**Sources:**
- Must be a list of objects
- Each source requires: `url` (string), `title` (string)

**Tasks:**
- Must be a list of objects
- Each task requires: `title` (string), `items` (list of strings)
- Optional: `defaultOpen` (boolean)

---

## Dependencies

Each activity automatically installs `pika` (RabbitMQ client) if not available. No manual dependency installation needed.

**Built-in modules used:**
- `json` - JSON serialization
- `uuid` - UUID validation and generation
- `sys` - Package installation

---

## Integration with Automation Platforms

These scripts are designed to work with platforms that support Python activities. They follow specific requirements:

### Execute Function Signature
**Important:** Execute functions have **no spaces between parameters** and **no default values** for compatibility with automation platforms:

```python
def execute(host,port,username,password,vhost,queue_name,text_content,response_group_id,tenant_id,message_id,conversation_id):
    # Handle defaults internally
    response_group_id = response_group_id if response_group_id else None
    # Activity logic
    return result_dict
```

### Platform Configuration
1. Load the appropriate Python script
2. Map workflow variables to the `execute()` parameters (no spaces in signature)
3. Pass `None` for optional parameters instead of omitting them
4. Handle the returned status dictionary

---

## Testing

### Unit Tests

**Run all unit tests:**
```bash
# Test message building
python platform_scripts/rita_messages/test_build_message.py

# Test RabbitMQ sender
python platform_scripts/rita_messages/test_send_to_rabbitmq.py

# Test complete message action
python platform_scripts/rita_messages/test_send_complete_message.py
```

### Integration Tests

**Prerequisites:**
1. Create `.env` file in project root with:
   ```
   RABBITMQ_URL=amqp://username:password@host:port/vhost
   QUEUE_NAME=rita_responses
   ```

2. Ensure RabbitMQ is running and accessible

**Run integration tests:**
```bash
# Run all integration tests
python platform_scripts/rita_messages/test_actions.py

# Run specific test
python platform_scripts/rita_messages/test_actions.py --test text

# Run with specific IDs (requires existing message_id in database)
python platform_scripts/rita_messages/test_actions.py \
  --conversation-id 2c5e478d-0827-4403-8780-9dee982676f0 \
  --tenant-id be0cc838-7530-4961-a887-139f9c9e5012 \
  --message-id ebc08133-cd88-4d5a-b672-55a4cdfe2433 \
  --test complete
```

**Test options:**
- `--test` / `-t`: Test to run (`text`, `reasoning`, `sources`, `tasks`, `complete`, `grouped`, `all`)
- `--conversation-id` / `-c`: Conversation ID (auto-generated if not provided)
- `--tenant-id` / `-tn`: Tenant ID (defaults to "test-tenant-001")
- `--message-id` / `-m`: Message ID (must exist in database)

### Manual Testing

Test locally by importing and calling the execute function:

```python
from send_complete_message import execute

result = execute(
    host="localhost",
    port="5672",
    username="guest",
    password="guest",
    vhost="/",
    queue_name="test.queue",
    text_content="Test message",
    reasoning_content=None,
    sources=None,
    tasks=None,
    response_group_id=None,
    tenant_id="test-tenant",
    message_id="test-msg-1",
    conversation_id="test-conv-1"
)

print(result)
```

---

## Architecture

### Design Principles
1. **Single Responsibility**: Each action has one clear purpose
2. **Composable**: Actions can be combined for complex workflows
3. **Validated**: Comprehensive input validation before sending
4. **Resilient**: Automatic dependency installation and error handling
5. **Compatible**: No spaces in function signatures, no default values

### Message Flow
```
User Workflow → Action Script → Validation → RabbitMQ → Rita Backend → Rita UI
```

### Action Types
- **All-in-One**: `send_complete_message.py` - Handles any message type
- **Convenience**: `send_text_message.py` - Simplified text-only
- **Composable**: `build_message.py` + `send_to_rabbitmq.py` - Maximum flexibility

---

## Related Documentation

- [Message Types Reference](../../docs/MESSAGE_TYPES.md) - Rita message structure and UI components

---

## File Structure

```
platform_scripts/rita_messages/
├── README.md                      # This file
├── send_text_message.py           # Text-only messages
├── send_complete_message.py       # All message types (most versatile)
├── build_message.py               # Message construction only
├── send_to_rabbitmq.py            # Generic RabbitMQ sender
├── test_build_message.py          # Unit tests (15 tests)
├── test_send_to_rabbitmq.py       # Unit tests (17 tests)
├── test_send_complete_message.py  # Unit tests (18 tests)
└── test_actions.py                # Integration tests
```

---

## Quick Reference

### Choose the Right Action

| Use Case | Action | When to Use |
|----------|--------|-------------|
| Simple text message | `send_text_message.py` | Only text content needed |
| Any single component | `send_complete_message.py` | Reasoning, sources, or tasks only |
| Multiple components | `send_complete_message.py` | Mix of text, reasoning, sources, tasks |
| Build without sending | `build_message.py` | Testing, logging, custom transport |
| Send custom payload | `send_to_rabbitmq.py` | Non-Rita messages or custom structure |

### Common Patterns

**Pattern 1: Simple text notification**
```python
send_text_message.execute(...)
```

**Pattern 2: Reasoning + Tasks**
```python
send_complete_message.execute(
    reasoning_content="...",
    tasks=json.dumps([...]),
    # Other params
)
```

**Pattern 3: Build, modify, send**
```python
result = build_message.execute(...)
message = result["message"]
# Modify message if needed
send_to_rabbitmq.execute(message=message, ...)
```

**Pattern 4: Grouped messages**
```python
group_id = str(uuid.uuid4())
send_complete_message.execute(response_group_id=group_id, ...)
send_complete_message.execute(response_group_id=group_id, ...)
```