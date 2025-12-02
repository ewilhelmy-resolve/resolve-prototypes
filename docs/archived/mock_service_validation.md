# Mock External Service - Validation Documentation

**Status**: ✅ Complete
**Created**: Phase 3 (Core Chat Functionality)
**Purpose**: Automated testing and validation for message processing pipeline

## Overview

The mock external service simulates the real automation service for development and testing purposes. It provides complete automation of the message flow: webhook reception → processing → RabbitMQ response → database updates.

## Architecture

```
Rita API Server ──webhook──> Mock Service ──RabbitMQ──> Rita Consumer ──> Database
     │                           │                          │
     │                           │                          │
  Messages API              Auto-response              Status Updates
```

## Files Structure

```
packages/mock-service/
├── package.json              # Mock service configuration
├── src/
│   └── index.ts              # Main mock service implementation
└── node_modules/             # Dependencies (express, amqplib, etc.)

Root directory:
├── test-automation-flow.sh   # Automated test script
├── .env                      # Updated with mock service URLs
└── package.json              # Added workspace and dev:mock script
```

## Environment Configuration

**.env updates:**
```bash
# External Service (Mock)
AUTOMATION_WEBHOOK_URL=http://localhost:3001/webhook
AUTOMATION_AUTH=mock-secret-token

# Mock Service Configuration
MOCK_SERVICE_PORT=3001
MOCK_SCENARIO=success
MOCK_DELAY=2000
MOCK_SUCCESS_RATE=90
```

## Mock Service Features

### 🎭 Response Scenarios
- **`success`**: Returns completed status with success message
- **`failure`**: Returns failed status with error message
- **`processing`**: Returns processing status (intermediate state)
- **`random`**: Probabilistic success/failure based on success rate

### ⚙️ Configuration API
```bash
# Get current configuration
curl http://localhost:3001/config

# Update configuration
curl -X POST -H "Content-Type: application/json" \
  -d '{"scenario": "failure", "delay": 1000}' \
  http://localhost:3001/config
```

### 🧪 Test Endpoints
```bash
# Health check
curl http://localhost:3001/health

# Test specific scenario
curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-secret-token" \
  -d '{"message_id": "test", "organization_id": "test", "user_id": "test", "content": "test"}' \
  http://localhost:3001/test/success
```

## Running Services

### Start All Services (3 terminals needed):

**Terminal 1 - Database & Infrastructure:**
```bash
docker-compose up
```

**Terminal 2 - Rita API Server:**
```bash
npm run dev:api
```

**Terminal 3 - Mock Service:**
```bash
npm run dev:mock
```

### Expected Service Logs:

**API Server:**
```
🚀 Rita API Server running on port 3000
🐰 Connecting to RabbitMQ...
✅ RabbitMQ connected, listening on queue: rita_responses
🎧 Starting RabbitMQ consumer...
```

**Mock Service:**
```
🎭 Rita Mock Automation Service running on port 3001
📊 Health check: http://localhost:3001/health
⚙️ Configuration: http://localhost:3001/config
🔧 Current scenario: success (2000ms delay)
🐰 Mock service connecting to RabbitMQ...
✅ Mock service connected to RabbitMQ queue: rita_responses
```

## Automated Testing

### Quick Test
```bash
chmod +x test-automation-flow.sh
./test-automation-flow.sh
```

### Expected Flow:
1. **Fresh token**: Script gets new JWT from auth service
2. **Message creation**: Creates test message via API
3. **Webhook delivery**: API sends webhook to mock service (status: `pending` → `sent`)
4. **Mock processing**: Mock service processes with configured delay
5. **RabbitMQ response**: Mock publishes response to queue
6. **Status update**: Consumer updates database (status: `sent` → `completed`)

### Success Output Example:
```
🧪 Testing Complete Automated Message Flow
==========================================

🔐 Getting fresh JWT token...
✅ Got fresh token: eyJhbGciOiJIUzI1NiIs...

1️⃣ Creating test message...
✅ Message created with ID: 3ea00ad3-93b8-4cb6-affd-033c34bbbf98

2️⃣ Waiting 1 second for webhook...
3️⃣ Checking message status (should be 'sent' after webhook)...
Status: sent, Content: 🤖 Testing automated flow...

4️⃣ Waiting 3 seconds for mock service to process...
5️⃣ Final status check (should be 'completed' with response)...

📋 Final Status: completed
💬 Response: ✅ Mock automation completed successfully...
⏰ Processed: 2025-09-14T18:09:11.907Z

✅ Automated flow test complete!
```

## Validation Test Matrix

| Scenario | Configuration | Expected Result |
|----------|---------------|----------------|
| **Success** | `{"scenario": "success", "delay": 2000}` | Status: `completed`, Response content populated |
| **Failure** | `{"scenario": "failure", "delay": 1000}` | Status: `failed`, Error message populated |
| **Processing** | `{"scenario": "processing", "delay": 500}` | Status: `processing`, Intermediate state |
| **Random** | `{"scenario": "random", "delay": 500}` | 90% success rate, 10% failure rate |

## Troubleshooting

### Common Issues:

**1. Mock service won't start**
```bash
cd packages/mock-service
npm install  # Ensure dependencies are installed
npm run dev  # Check for error messages
```

**2. Webhook delivery fails**
- Check API server logs for webhook errors
- Verify `AUTOMATION_WEBHOOK_URL=http://localhost:3001/webhook`
- Check mock service is running on port 3001

**3. RabbitMQ connection issues**
- Ensure Docker Compose is running
- Check `RABBITMQ_URL=amqp://guest:guest@localhost:5672`
- Verify queue `rita_responses` exists

**4. Messages stuck in 'sent' status**
- Check mock service logs for processing errors
- Verify RabbitMQ consumer is running
- Check RabbitMQ queue for pending messages

### Debug Commands:
```bash
# Check all running services
curl http://localhost:3000/health  # API server
curl http://localhost:3001/health  # Mock service

# Check message status directly
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/messages

# Check RabbitMQ queue
docker exec rita-chat-rabbitmq-1 rabbitmqctl list_queues
```

## Integration Points

### With Phase 4 (Real-time Updates):
- Mock service provides predictable message flows for testing SSE
- Different delay settings help test real-time UI responsiveness
- Multiple scenarios validate error handling in UI

### With Phase 5 (File Upload):
- Mock service can simulate document processing
- Test file attachment workflows end-to-end

## Key Benefits

✅ **Automated Testing**: No manual RabbitMQ message publishing needed
✅ **Scenario Coverage**: All success/failure/intermediate states testable
✅ **Development Speed**: Instant feedback on message flow changes
✅ **Debugging**: Clear logs from both services for troubleshooting
✅ **CI/CD Ready**: Scriptable tests for automated validation

## Next Steps

When continuing development:

1. **Start services**: Docker + API server + Mock service
2. **Run quick test**: `./test-automation-flow.sh`
3. **Configure scenario**: Use config API for specific testing needs
4. **Monitor logs**: Both services provide detailed operation logs

The mock service is now ready to support Phase 4 development with reliable, automated message flows!