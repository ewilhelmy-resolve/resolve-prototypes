# Rita Message Actions - Testing Guide

Quick reference for testing all message types with real conversation IDs.

## Prerequisites

1. **Activate virtual environment**:
   ```bash
   source platform_scripts/rita_messages/.venv/bin/activate
   ```

2. **Get a valid message ID** from your database:
   - The message must already exist in the `messages` table
   - Must be an `assistant` role message in `pending` status
   - Must belong to the specified conversation and tenant

## Test Configuration

**Conversation ID**: `2c5e478d-0827-4403-8780-9dee982676f0`
**Tenant ID**: `be0cc838-7530-4961-a887-139f9c9e5012`
**Message ID**: `ebc08133-cd88-4d5a-b672-55a4cdfe2433` *(update with your own)*

---

## Test Commands

### 1. Text Message Test

Simple text-only message.

```bash
python platform_scripts/rita_messages/test_actions.py \
  --conversation-id 2c5e478d-0827-4403-8780-9dee982676f0 \
  --tenant-id be0cc838-7530-4961-a887-139f9c9e5012 \
  --message-id ebc08133-cd88-4d5a-b672-55a4cdfe2433 \
  --test text
```

**Expected Output**:
```
## Test Message ✅

This is a simple text message test from the automation platform.
```

---

### 2. Reasoning Message Test

Message with reasoning (thinking process) and text.

```bash
python platform_scripts/rita_messages/test_actions.py \
  --conversation-id 2c5e478d-0827-4403-8780-9dee982676f0 \
  --tenant-id be0cc838-7530-4961-a887-139f9c9e5012 \
  --message-id ebc08133-cd88-4d5a-b672-55a4cdfe2433 \
  --test reasoning
```

**Expected Output**:
- Collapsible reasoning section with step-by-step analysis
- Main text response

---

### 3. Sources Message Test

Message with text and reference links.

```bash
python platform_scripts/rita_messages/test_actions.py \
  --conversation-id 2c5e478d-0827-4403-8780-9dee982676f0 \
  --tenant-id be0cc838-7530-4961-a887-139f9c9e5012 \
  --message-id ebc08133-cd88-4d5a-b672-55a4cdfe2433 \
  --test sources
```

**Expected Output**:
- Main text content
- Expandable sources section with 3 documentation links

---

### 4. Tasks Message Test

Message with text and actionable automation tasks.

```bash
python platform_scripts/rita_messages/test_actions.py \
  --conversation-id 2c5e478d-0827-4403-8780-9dee982676f0 \
  --tenant-id be0cc838-7530-4961-a887-139f9c9e5012 \
  --message-id ebc08133-cd88-4d5a-b672-55a4cdfe2433 \
  --test tasks
```

**Expected Output**:
- Main text content
- Expandable task groups with checklist items

---

### 5. Complete Message Test

Message with ALL components: reasoning + text + sources + tasks.

```bash
python platform_scripts/rita_messages/test_actions.py \
  --conversation-id 2c5e478d-0827-4403-8780-9dee982676f0 \
  --tenant-id be0cc838-7530-4961-a887-139f9c9e5012 \
  --message-id ebc08133-cd88-4d5a-b672-55a4cdfe2433 \
  --test complete
```

**Expected Output**:
- Collapsible reasoning section
- Main text content
- Expandable sources section
- Expandable task groups

---

### 6. Grouped Messages Test

Test message grouping with `response_group_id` (sends 2 messages).

```bash
python platform_scripts/rita_messages/test_actions.py \
  --conversation-id 2c5e478d-0827-4403-8780-9dee982676f0 \
  --tenant-id be0cc838-7530-4961-a887-139f9c9e5012 \
  --message-id ebc08133-cd88-4d5a-b672-55a4cdfe2433 \
  --test grouped
```

**Expected Output**:
- Two messages grouped together with same `response_group_id`
- First message: reasoning + text
- Second message: tasks

---

## Run All Tests

Run all 6 tests in sequence (requires valid message ID for each):

```bash
python platform_scripts/rita_messages/test_actions.py \
  --conversation-id 2c5e478d-0827-4403-8780-9dee982676f0 \
  --tenant-id be0cc838-7530-4961-a887-139f9c9e5012 \
  --message-id ebc08133-cd88-4d5a-b672-55a4cdfe2433 \
  --test all
```

**Note**: This will attempt to use the same message ID for all tests, which may cause issues since each test updates the message. Better to run tests individually with fresh message IDs.

---

## Short Form Commands

Using short flags for faster typing:

```bash
# Text message test
python platform_scripts/rita_messages/test_actions.py \
  -c 2c5e478d-0827-4403-8780-9dee982676f0 \
  -tn be0cc838-7530-4961-a887-139f9c9e5012 \
  -m ebc08133-cd88-4d5a-b672-55a4cdfe2433 \
  -t text

# Complete message test
python platform_scripts/rita_messages/test_actions.py \
  -c 2c5e478d-0827-4403-8780-9dee982676f0 \
  -tn be0cc838-7530-4961-a887-139f9c9e5012 \
  -m ebc08133-cd88-4d5a-b672-55a4cdfe2433 \
  -t complete
```

---

## Troubleshooting

### Error: Message not found

```
Error: Message ebc08133-cd88-4d5a-b672-55a4cdfe2433 not found
```

**Solution**: Create a new assistant message in the database first, or get a valid pending message ID from an existing conversation.

### Error: Invalid UUID format

```
Error: invalid input syntax for type uuid
```

**Solution**: Ensure all IDs are valid UUIDs (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### SSL Connection Error

```
Error: [SSL: CERTIFICATE_VERIFY_FAILED]
```

**Solution**: Make sure `.env` has `RABBITMQ_URL=amqp://...` (not `amqps://`) for local development.

### Connection Refused

```
Error: [Errno 61] Connection refused
```

**Solution**: Ensure RabbitMQ is running:
```bash
docker compose ps
# or
brew services list
```

---

## Verifying Results

After running a test:

1. **Check the Rita UI** - Navigate to the conversation and verify the message appears
2. **Check the database** - Query the message to see the updated content and metadata
3. **Check the logs** - Look at api-server logs for any processing errors

```sql
-- Check message in database
SELECT id, role, message, metadata, status, created_at
FROM messages
WHERE id = 'ebc08133-cd88-4d5a-b672-55a4cdfe2433';
```

---

## Next Steps

Once testing is complete with the mock data:

1. **Update other action scripts** to remove SSL for local development (like we did with `send_text_message.py`)
2. **Add SSL support** based on port detection for production use
3. **Integrate with external automation platform** using these action scripts
4. **Create production-ready message IDs** through proper workflow integration

---

## Related Documentation

- [Message Types Reference](../../docs/MESSAGE_TYPES.md) - Rita message structure
- [Action Scripts README](./README.md) - Action implementation details