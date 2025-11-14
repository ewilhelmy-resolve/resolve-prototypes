# RabbitMQ Architecture - Rita Platform

**Version**: 1.0
**Last Updated**: 2025-10-21
**Maintainer**: Engineering Team

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Queues & Consumers](#queues--consumers)
4. [Message Flow Patterns](#message-flow-patterns)
5. [Connection Resilience](#connection-resilience)
6. [Configuration](#configuration)
7. [Monitoring & Health](#monitoring--health)
8. [Operations Guide](#operations-guide)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The Rita platform uses **RabbitMQ** as a message broker for asynchronous communication between the API server and external services. The system implements a **reliable, self-healing message processing architecture** with automatic reconnection and comprehensive error handling.

### Key Features

- **3 Active Queues**: Chat responses, data source status, document processing
- **Automatic Reconnection**: Exponential backoff with jitter (1s → 32s)
- **Health Monitoring**: Real-time connection status via `/health` endpoint
- **Event-Driven Updates**: Real-time notifications via Server-Sent Events (SSE)
- **Durable Queues**: Message persistence across RabbitMQ restarts
- **Graceful Degradation**: API continues operating during RabbitMQ outages

---

## Architecture Diagram

### High-Level System Architecture

```mermaid
graph TB
    subgraph "Rita API Server"
        API[Express API]
        RMQ[RabbitMQ Service]
        SSE[SSE Service]

        subgraph "Consumers"
            ChatConsumer[Chat Response Consumer]
            DSConsumer[Data Source Consumer]
            DocConsumer[Document Consumer]
        end
    end

    subgraph "RabbitMQ Broker"
        Q1[chat.responses]
        Q2[data_source_status]
        Q3[document_processing_status]
    end

    subgraph "External Services"
        ExtService[Automation Service]
        DocProcessor[Document Processor]
        DSSync[Data Source Sync]
    end

    subgraph "Clients"
        Frontend[RITA Go Frontend]
    end

    API -->|1. User Request| ExtService
    ExtService -->|2. Response| Q1
    Q1 -->|3. Consume| ChatConsumer
    ChatConsumer -->|4. Update DB| API
    ChatConsumer -->|5. SSE Event| SSE
    SSE -->|6. Real-time Update| Frontend

    DSSync -->|Sync Status| Q2
    Q2 -->|Consume| DSConsumer
    DSConsumer -->|Update DB + SSE| API

    DocProcessor -->|Processing Status| Q3
    Q3 -->|Consume| DocConsumer
    DocConsumer -->|Update DB + SSE| API

    RMQ -->|Manages| ChatConsumer
    RMQ -->|Manages| DSConsumer
    RMQ -->|Manages| DocConsumer
```

### Connection Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Disconnected: Service Start
    Disconnected --> Connecting: connect()
    Connecting --> Connected: Success
    Connecting --> Reconnecting: Failure
    Connected --> Reconnecting: Error/Close Event
    Reconnecting --> Connected: Retry Success
    Reconnecting --> Disconnected: Max Attempts Reached
    Connected --> Disconnected: Graceful Shutdown
    Reconnecting --> Disconnected: Graceful Shutdown

    note right of Connected
        - Processing messages
        - Event listeners active
        - Health: 200 OK
    end note

    note right of Reconnecting
        - Exponential backoff
        - Background retries
        - Health: 503 Degraded
    end note

    note right of Disconnected
        - No connection
        - Max retries exceeded
        - Health: 503 Degraded
    end note
```

### Message Flow Sequence

```mermaid
sequenceDiagram
    participant Client as RITA Go Client
    participant API as API Server
    participant DB as PostgreSQL
    participant RMQ as RabbitMQ
    participant Ext as External Service
    participant SSE as SSE Stream

    Client->>API: POST /api/conversations/:id/messages
    API->>DB: INSERT message (status: pending)
    API->>Ext: POST /webhook (async)
    API-->>Client: 201 Created (message_id)

    Note over Ext: Process request<br/>(AI, data sources, etc.)

    Ext->>RMQ: Publish to chat.responses
    RMQ->>API: Consume message

    API->>DB: UPDATE message (status: completed)
    API->>DB: INSERT assistant message
    API->>DB: INSERT audit_log

    API->>SSE: Send message_update event
    API->>SSE: Send new_message event
    SSE-->>Client: SSE: message_update
    SSE-->>Client: SSE: new_message

    Client->>Client: Update UI (real-time)
```

---

## Queues & Consumers

### Queue Summary

| Queue Name | Consumer | Purpose | Message Rate | Durability |
|------------|----------|---------|--------------|------------|
| `chat.responses` | ChatConsumer | AI chat responses from automation service | High (100s/min) | ✅ Durable |
| `data_source_status` | DataSourceStatusConsumer | Sync and verification status updates | Medium (10s/min) | ✅ Durable |
| `document_processing_status` | DocumentProcessingConsumer | Document processing completion/failure | Low (1-10/min) | ✅ Durable |

---

### 1. Chat Responses Queue

**Queue Name**: `chat.responses` (configurable via `QUEUE_NAME`)

**Purpose**: Receives AI-generated chat responses from the external automation service.

**Consumer**: `RabbitMQService.startConsumer()` (main consumer in `src/services/rabbitmq.ts`)

**Message Format**:
```typescript
{
  message_id: string;           // UUID of the original user message
  conversation_id: string;      // UUID of the conversation
  tenant_id: string;            // Organization ID (remapped to organization_id)
  user_id?: string;             // User ID (optional, fetched from DB if missing)
  response: string;             // AI-generated response text
  metadata?: object;            // Optional rich metadata (links, citations, etc.)
  response_group_id?: string;   // Optional grouping for multi-part responses
}
```

**Processing Flow**:
1. **Validate** required fields (message_id, tenant_id, conversation_id)
2. **Fetch user_id** from conversation if not provided
3. **Update** original user message: `status = 'completed'`, `processed_at = NOW()`
4. **Insert** new assistant message with response text and metadata
5. **Create audit log** entry for compliance
6. **Send SSE events**:
   - `message_update`: User message completion
   - `new_message`: New assistant message

**Error Handling**:
- Invalid messages → stored in `message_processing_failures` table
- Failed processing → `nack(message, false, false)` (don't requeue)
- SSE failures → logged but don't block message processing

**Code Location**: `packages/api-server/src/services/rabbitmq.ts:96-232`

---

### 2. Data Source Status Queue

**Queue Name**: `data_source_status` (configurable via `DATA_SOURCE_STATUS_QUEUE`)

**Purpose**: Unified queue for data source sync and verification status updates.

**Consumer**: `DataSourceStatusConsumer` (`src/consumers/DataSourceStatusConsumer.ts`)

**Message Types**:

#### 2.1 Sync Status Messages

```typescript
{
  type: 'sync';
  connection_id: string;        // Data source connection ID
  tenant_id: string;            // Organization ID
  status: 'sync_started' | 'sync_completed' | 'sync_failed';
  documents_processed?: number; // For sync_completed
  error_message?: string;       // For sync_failed
}
```

**Status Mapping**:
- `sync_started` → DB status: `'syncing'`
- `sync_completed` → DB status: `'idle'`, last_sync_status: `'completed'`, updates `last_sync_at`
- `sync_failed` → DB status: `'idle'`, last_sync_status: `'failed'`, updates `last_sync_at`

#### 2.2 Verification Status Messages

```typescript
{
  type: 'verification';
  connection_id: string;
  tenant_id: string;
  status: 'success' | 'failed';
  options?: object;             // Connection-specific options (folders, sites, etc.)
  error?: string;               // For failed verifications
}
```

**Processing Flow**:
1. **Discriminate** message type via `type` field
2. **Update database** via `DataSourceService`
3. **Send SSE event** to organization (all users see updates)

**SSE Event Format**:
```typescript
{
  type: 'data_source_update',
  data: {
    connection_id: string,
    connection_type: string,
    status: string,
    last_sync_status?: string,
    last_sync_at?: string,
    last_sync_error?: string,
    documents_processed?: number,
    timestamp: string
  }
}
```

**Code Location**: `packages/api-server/src/consumers/DataSourceStatusConsumer.ts`

---

### 3. Document Processing Status Queue

**Queue Name**: `document_processing_status` (configurable via `DOCUMENT_PROCESSING_QUEUE`)

**Purpose**: Handles document processing completion and failure notifications.

**Consumer**: `DocumentProcessingConsumer` (`src/consumers/DocumentProcessingConsumer.ts`)

**Message Format**:

```typescript
{
  type: 'document_processing';
  blob_metadata_id: string;     // Document ID
  tenant_id: string;            // Organization ID
  user_id?: string;             // User who uploaded (optional)
  status: 'processing_completed' | 'processing_failed';

  // For processing_completed:
  processed_markdown?: string;  // Extracted markdown content

  // For processing_failed:
  error_message?: string;       // Error details
}
```

**Processing Flow**:

#### Success Path (`processing_completed`):
1. **Update blob_metadata**: `status = 'processed'`, store `processed_markdown`
2. **Remove error metadata** (if previously failed)
3. **Send SSE event** to user or organization

#### Failure Path (`processing_failed`):
1. **Update blob_metadata**: `status = 'failed'`
2. **Store error** in `metadata.error` field
3. **Send SSE event** with error details

**SSE Event Format**:
```typescript
{
  type: 'document_update',
  data: {
    blob_metadata_id: string,
    filename: string,
    status: 'processed' | 'failed',
    processed_markdown?: string,  // Only on success
    error_message?: string,        // Only on failure
    timestamp: string
  }
}
```

**Code Location**: `packages/api-server/src/consumers/DocumentProcessingConsumer.ts`

---

## Message Flow Patterns

### Pattern 1: Request-Response (Chat)

```mermaid
sequenceDiagram
    participant User
    participant API
    participant DB
    participant RabbitMQ
    participant AutomationService

    User->>API: Send message
    API->>DB: Store message (pending)
    API->>AutomationService: Webhook
    API-->>User: 201 (message created)

    AutomationService->>RabbitMQ: Publish response
    RabbitMQ->>API: Deliver message
    API->>DB: Update message (completed)
    API->>DB: Insert assistant message
    API-->>User: SSE event
```

### Pattern 2: Status Update (Data Source Sync)

```mermaid
sequenceDiagram
    participant DataSourceSync
    participant RabbitMQ
    participant API
    participant DB
    participant Frontend

    DataSourceSync->>RabbitMQ: sync_started
    RabbitMQ->>API: Consume
    API->>DB: UPDATE status='syncing'
    API-->>Frontend: SSE: data_source_update

    Note over DataSourceSync: Processing...

    DataSourceSync->>RabbitMQ: sync_completed
    RabbitMQ->>API: Consume
    API->>DB: UPDATE status='idle', last_sync_status='completed'
    API-->>Frontend: SSE: data_source_update
```

### Pattern 3: Fire-and-Forget (Document Processing)

```mermaid
sequenceDiagram
    participant User
    participant API
    participant ObjectStorage
    participant DocProcessor
    participant RabbitMQ

    User->>API: Upload document
    API->>ObjectStorage: Store file
    API->>DocProcessor: Trigger processing
    API-->>User: 202 (processing started)

    Note over DocProcessor: Extract text<br/>Convert to markdown

    DocProcessor->>RabbitMQ: processing_completed
    RabbitMQ->>API: Consume
    API-->>User: SSE: document_update
```

---

## Connection Resilience

### Automatic Reconnection System

The RabbitMQ service implements **enterprise-grade connection resilience** with automatic recovery from connection failures.

#### Features

- ✅ **Exponential Backoff**: Retry delays increase exponentially (1s → 2s → 4s → 8s → 16s → 32s)
- ✅ **Jitter**: ±25% randomness prevents thundering herd problem
- ✅ **Event-Driven**: Listens for `error`, `close`, `blocked` events
- ✅ **Configurable Retries**: Max attempts configurable via environment variables
- ✅ **Graceful Degradation**: API stays operational during RabbitMQ outages
- ✅ **Health Monitoring**: `/health` endpoint reflects connection status

#### Connection States

```typescript
type ConnectionStatus =
  | 'disconnected'  // No connection, not attempting
  | 'connecting'    // Initial connection in progress
  | 'connected'     // Healthy, processing messages
  | 'reconnecting'  // Lost connection, attempting recovery
  | 'circuit_open'; // Too many failures (future feature)
```

#### Retry Logic

```typescript
// Exponential backoff with jitter
function calculateDelay(attempt: number): number {
  const delay = Math.min(
    INITIAL_DELAY * Math.pow(2, attempt),
    MAX_DELAY  // Cap at 32s
  );

  // Add ±25% jitter
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.floor(delay + jitter);
}

// Example progression:
// Attempt 1: ~1s
// Attempt 2: ~2s
// Attempt 3: ~4s
// Attempt 4: ~8s
// Attempt 5: ~16s
// Attempt 6+: ~32s (capped)
```

#### Event Handlers

```typescript
connection.on('error', (err) => {
  // Log error and trigger reconnection
  queueLogger.error({ error: err.message }, 'Connection error');
  handleConnectionLoss(err);
});

connection.on('close', () => {
  // Connection closed, attempt reconnection
  queueLogger.warn('Connection closed');
  handleConnectionLoss(new Error('Connection closed'));
});

connection.on('blocked', (reason) => {
  // RabbitMQ is low on resources
  queueLogger.warn({ reason }, 'Connection blocked');
});

connection.on('unblocked', () => {
  // RabbitMQ resources recovered
  queueLogger.info('Connection unblocked');
});
```

#### Reconnection Flow

```mermaid
flowchart TD
    A[Connection Lost] --> B{Shutdown Flag?}
    B -->|Yes| C[Stop - No Reconnect]
    B -->|No| D{Max Attempts?}
    D -->|Exceeded| E[Give Up - Set Disconnected]
    D -->|Not Exceeded| F[Calculate Backoff Delay]
    F --> G[Schedule Reconnect Timer]
    G --> H[Wait for Delay]
    H --> I[Attempt Connection]
    I --> J{Success?}
    J -->|Yes| K[Restart Consumers]
    J -->|No| L[Increment Attempt Counter]
    L --> D
    K --> M[Connected State]
```

#### Health Status Response

**Healthy (HTTP 200)**:
```json
{
  "status": "ok",
  "timestamp": "2025-10-21T22:10:57.041Z",
  "services": {
    "api": "ok",
    "rabbitmq": {
      "status": "connected",
      "lastConnectedAt": "2025-10-21T22:10:15.717Z",
      "reconnectAttempts": 0,
      "consecutiveFailures": 0,
      "message": "Connected and processing messages"
    }
  }
}
```

**Degraded (HTTP 503)**:
```json
{
  "status": "degraded",
  "timestamp": "2025-10-21T22:11:25.373Z",
  "services": {
    "api": "ok",
    "rabbitmq": {
      "status": "reconnecting",
      "lastConnectedAt": "2025-10-21T22:10:15.717Z",
      "reconnectAttempts": 4,
      "consecutiveFailures": 5,
      "message": "Connection lost, attempting reconnection (attempt 4/10)"
    }
  }
}
```

---

## Configuration

### Environment Variables

```bash
# RabbitMQ Connection
RABBITMQ_URL=amqp://guest:guest@localhost:5672
QUEUE_NAME=chat.responses

# Data Source Queue
DATA_SOURCE_STATUS_QUEUE=data_source_status

# Document Processing Queue
DOCUMENT_PROCESSING_QUEUE=document_processing_status

# Connection Resilience (Optional - defaults provided)
RABBITMQ_RETRY_MAX_ATTEMPTS=10              # Max reconnection attempts (0 = infinite)
RABBITMQ_RETRY_INITIAL_DELAY_MS=1000        # Initial backoff delay (1s)
RABBITMQ_RETRY_MAX_DELAY_MS=32000           # Max backoff delay (32s)
RABBITMQ_RETRY_BACKOFF_MULTIPLIER=2         # Exponential multiplier
RABBITMQ_RETRY_JITTER_ENABLED=true          # Add randomness to prevent thundering herd
```

### Docker Compose Configuration

```yaml
services:
  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: rita-rabbitmq
    ports:
      - "5672:5672"    # AMQP protocol
      - "15672:15672"  # Management UI
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
```

### RabbitMQ Management UI

- **URL**: http://localhost:15672
- **Username**: guest
- **Password**: guest

**Available Features**:
- Queue monitoring (message rates, depth)
- Consumer management
- Connection tracking
- Performance metrics

---

## Monitoring & Health

### Health Check Endpoint

**Endpoint**: `GET /health`

**Response Codes**:
- `200 OK`: All services healthy (RabbitMQ connected)
- `503 Service Unavailable`: Degraded state (RabbitMQ reconnecting)

**Use Cases**:
- Kubernetes liveness probes
- Load balancer health checks
- Monitoring systems (Datadog, New Relic)

### Structured Logging Events

All RabbitMQ events are logged with structured data using Pino logger:

| Event | Log Level | Fields |
|-------|-----------|--------|
| `rabbitmq_connecting` | info | url, attempt |
| `rabbitmq_connected` | info | queueName, wasReconnecting, downtimeMs |
| `rabbitmq_connection_failed` | error | error, errorCode, attempt, consecutiveFailures |
| `rabbitmq_connection_error` | error | error, errorCode, state |
| `rabbitmq_connection_closed` | warn | lastConnectedAt, uptimeMs, state |
| `rabbitmq_connection_blocked` | warn | reason |
| `rabbitmq_connection_unblocked` | info | - |
| `rabbitmq_connection_lost` | warn | error, consecutiveFailures, reconnectAttempts |
| `rabbitmq_reconnect_scheduled` | info | attempt, maxAttempts, delayMs, nextRetryAt |
| `rabbitmq_reconnect_attempt` | info | attempt, maxAttempts |
| `rabbitmq_reconnect_attempt_failed` | warn | attempt, error |
| `rabbitmq_reconnect_success` | info | attempt, downtimeMs |
| `rabbitmq_reconnect_failed_max_attempts` | error | maxAttempts, consecutiveFailures |
| `rabbitmq_shutdown_initiated` | info | state |
| `rabbitmq_shutdown_complete` | info | - |

**Example Log Query (Pino)**:
```bash
# Find all connection failures in the last hour
cat api-server.log | grep '"event":"rabbitmq_connection_failed"' | tail -n 20

# Track reconnection attempts
cat api-server.log | grep '"event":"rabbitmq_reconnect_attempt"'
```

### Performance Metrics

Each message processing operation is tracked with `PerformanceTimer`:

- `rabbitmq-connect`: Connection establishment time
- `message-processing`: Chat message processing time
- `data-source-status-processing`: Data source status update time
- `document-processing-status`: Document status update time
- `publish-message`: Message publishing time

**Log Format**:
```json
{
  "level": "info",
  "operation": "message-processing",
  "durationMs": 142,
  "messageId": "uuid",
  "status": "completed",
  "success": true
}
```

---

## Operations Guide

### Starting the System

```bash
# 1. Start RabbitMQ (via Docker Compose)
docker compose up -d rabbitmq

# 2. Verify RabbitMQ is healthy
docker compose ps rabbitmq
# Should show: Up (healthy)

# 3. Start API server
cd packages/api-server
npm run dev

# 4. Verify connection
curl http://localhost:3000/health | jq '.services.rabbitmq.status'
# Should return: "connected"
```

### Testing Reconnection

```bash
# 1. Stop RabbitMQ
docker compose stop rabbitmq

# 2. Check health (should show "reconnecting")
curl http://localhost:3000/health | jq

# 3. Monitor logs for reconnection attempts
docker compose logs -f api-server | grep rabbitmq_reconnect

# 4. Restart RabbitMQ
docker compose start rabbitmq

# 5. Verify reconnection (within 30s)
curl http://localhost:3000/health | jq '.services.rabbitmq.status'
# Should return: "connected"
```

### Inspecting Queues

```bash
# Via RabbitMQ Management UI
open http://localhost:15672

# Via CLI (inside container)
docker compose exec rabbitmq rabbitmqctl list_queues name messages consumers

# Expected output:
# chat.responses             0    1
# data_source_status         0    1
# document_processing_status 0    1
```

### Manual Message Publishing (Testing)

```bash
# 1. Access RabbitMQ container
docker compose exec rabbitmq bash

# 2. Use rabbitmqadmin (if available) or Management UI
# Navigate to: http://localhost:15672/#/queues
# Select queue → "Publish message"

# 3. Or use API service publishMessage method
# See: packages/api-server/src/services/rabbitmq.ts:297-326
```

### Graceful Shutdown

```bash
# Send SIGINT signal
kill -SIGINT <api-server-pid>

# Or via npm
npm run dev
# Then press Ctrl+C

# Shutdown sequence:
# 1. SSE service stops accepting new connections
# 2. RabbitMQ consumers stop processing
# 3. RabbitMQ connection closes gracefully
# 4. Session store cleanup
# 5. Process exit
```

---

## Troubleshooting

### Issue: API Server Crashes on Startup

**Symptoms**: Server exits with "Failed to initialize services"

**Possible Causes**:
- RabbitMQ not running
- Incorrect `RABBITMQ_URL` configuration
- Network connectivity issues

**Solution** (as of v1.1):
- ✅ **This is now fixed!** The API server no longer crashes on RabbitMQ failure
- Server starts and attempts reconnection in background
- Check health endpoint: `curl http://localhost:3000/health`

**Legacy Behavior** (pre-v1.1):
```typescript
// OLD CODE (removed):
try {
  await rabbitmqService.connect();
} catch (error) {
  logger.fatal({ error }, 'Failed to initialize services');
  process.exit(1);  // ❌ Crashed here
}
```

### Issue: Messages Not Being Consumed

**Symptoms**: Messages piling up in queue, no database updates

**Diagnosis**:
```bash
# 1. Check consumer count
docker compose exec rabbitmq rabbitmqctl list_queues name messages consumers

# 2. Check API server connection status
curl http://localhost:3000/health | jq '.services.rabbitmq'

# 3. Check API server logs
docker compose logs -f api-server | grep "consumer started"
```

**Possible Causes**:
1. **Connection Lost**: Check if status is "reconnecting"
2. **Consumer Not Started**: Check logs for "startConsumer" events
3. **Message Format Invalid**: Check for parsing errors in logs

**Solutions**:
1. Restart API server: `docker compose restart api-server`
2. Verify RabbitMQ health: `docker compose ps rabbitmq`
3. Check queue configuration in RabbitMQ Management UI

### Issue: Slow Message Processing

**Symptoms**: High message latency, growing queue depth

**Diagnosis**:
```bash
# Check queue depth
docker compose exec rabbitmq rabbitmqctl list_queues name messages message_bytes

# Check performance logs
cat logs/api-server.log | grep '"operation":"message-processing"' | grep '"durationMs"'
```

**Possible Causes**:
1. Database slow queries
2. External service latency (SSE, database)
3. High message volume

**Solutions**:
1. Check database performance: `EXPLAIN ANALYZE` slow queries
2. Increase consumer concurrency (future enhancement)
3. Monitor resource usage: CPU, memory, network

### Issue: Duplicate Message Processing

**Symptoms**: Same message processed multiple times

**Cause**: Consumer crashes before `ack()`, RabbitMQ redelivers

**Prevention**:
- Messages are processed with `withOrgContext` (transaction-like)
- Failed processing calls `nack(message, false, false)` (don't requeue)
- Idempotency: Use `message_id` as unique constraint

**Detection**:
```sql
-- Check for duplicate assistant messages
SELECT conversation_id, message, COUNT(*)
FROM messages
WHERE role = 'assistant'
GROUP BY conversation_id, message
HAVING COUNT(*) > 1;
```

### Issue: RabbitMQ Connection Stuck in "Reconnecting"

**Symptoms**: Health endpoint shows "reconnecting" for > 5 minutes

**Diagnosis**:
```bash
# Check reconnection attempts
curl http://localhost:3000/health | jq '.services.rabbitmq.reconnectAttempts'

# Check logs for errors
docker compose logs api-server | grep rabbitmq_reconnect_attempt_failed
```

**Possible Causes**:
1. Max attempts reached (default: 10)
2. Network connectivity issues
3. RabbitMQ authentication failure
4. RabbitMQ not running

**Solutions**:
1. Check RabbitMQ is running: `docker compose ps rabbitmq`
2. Verify credentials in `.env`: `RABBITMQ_URL`
3. Restart API server: `docker compose restart api-server`
4. Increase max attempts: `RABBITMQ_RETRY_MAX_ATTEMPTS=0` (infinite)

### Issue: High Memory Usage

**Symptoms**: API server memory grows over time

**Possible Causes**:
1. Reconnection timers not cleared
2. Event listeners accumulating
3. Message buffering (if implemented)

**Diagnosis**:
```bash
# Monitor memory usage
docker stats api-server

# Check for memory leaks (Node.js)
node --inspect packages/api-server/src/index.ts
```

**Solutions**:
- ✅ **Already implemented**: Timers cleared on shutdown
- ✅ **Already implemented**: Single event listener registration
- Monitor with production APM tools (Datadog, New Relic)

---

## References

### Related Documentation

- [RabbitMQ Connection Resilience Design](../design/rabbitmq-connection-resilience.md)
- [SSE Architecture](./sse-architecture.md) (future)
- [Database Schema](./database-schema.md) (future)

### External Resources

- [RabbitMQ Official Documentation](https://www.rabbitmq.com/documentation.html)
- [amqplib Library](https://amqp-node.github.io/amqplib/)
- [RabbitMQ Management UI Guide](https://www.rabbitmq.com/management.html)

### Code Locations

| Component | File Path |
|-----------|-----------|
| **Main Service** | `packages/api-server/src/services/rabbitmq.ts` |
| **Chat Consumer** | `packages/api-server/src/services/rabbitmq.ts:297-232` |
| **Data Source Consumer** | `packages/api-server/src/consumers/DataSourceStatusConsumer.ts` |
| **Document Consumer** | `packages/api-server/src/consumers/DocumentProcessingConsumer.ts` |
| **Health Endpoint** | `packages/api-server/src/index.ts:41-63` |
| **Service Initialization** | `packages/api-server/src/index.ts:162-186` |

---

**Document Version**: 1.0
**Last Updated**: 2025-10-21
**Next Review**: 2025-11-21

*For questions or issues, contact the engineering team or file an issue in the project repository.*
