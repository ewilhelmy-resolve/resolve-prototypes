# Mock Service RabbitMQ Resilience

## Overview
Add robust RabbitMQ connection handling to mock-service with auto-reconnection, exponential backoff, and proper state management—matching the patterns used in api-server.

## Goals
- Auto-reconnect on connection loss with exponential backoff + jitter
- Track connection state (disconnected/connecting/connected/reconnecting)
- Configurable retry behavior via env vars
- Graceful shutdown with proper cleanup
- Non-goal: Health endpoint integration (keep simple)
- Non-goal: Circuit breaker pattern (maxAttempts is sufficient)

## Research/Context

### Current mock-service (simple, no resilience)
**File**: `packages/mock-service/src/index.ts` (lines ~160-200)

```typescript
let rabbitConnection: Awaited<ReturnType<typeof connect>> | null = null;
let rabbitChannel: Channel | null = null;

async function connectRabbitMQ(): Promise<void> {
  rabbitConnection = await connect(MOCK_CONFIG.rabbitUrl);
  rabbitChannel = await rabbitConnection.createChannel();
  await rabbitChannel.assertQueue(MOCK_CONFIG.queueName, { durable: true });
}
```

Issues:
- No reconnection on connection loss
- No exponential backoff
- No health status tracking
- No event listeners for errors/close
- Module-level variables

### api-server (robust pattern to follow)
**File**: `packages/api-server/src/services/rabbitmq.ts`

Key features:
- `RabbitMQService` class with encapsulated state
- Connection states: `disconnected | connecting | connected | reconnecting | circuit_open`
- Event listeners: `error`, `close`, `blocked`, `unblocked`
- Exponential backoff with jitter (prevents thundering herd)
- Env var configuration:
  - `RABBITMQ_RETRY_MAX_ATTEMPTS` (default: 10, 0 = infinite)
  - `RABBITMQ_RETRY_INITIAL_DELAY_MS` (default: 1000)
  - `RABBITMQ_RETRY_MAX_DELAY_MS` (default: 32000)
  - `RABBITMQ_RETRY_BACKOFF_MULTIPLIER` (default: 2)
  - `RABBITMQ_RETRY_JITTER_ENABLED` (default: true)
- `getHealthStatus()` method
- `isShuttingDown` flag for graceful shutdown
- Singleton pattern via `getRabbitMQService()`

## Approach

Create `packages/mock-service/src/services/rabbitmq.ts` with a simplified `RabbitMQService` class that:

1. **Mirrors api-server's resilience patterns** - same state machine, backoff algorithm, event handling
2. **Simplified for mock-service needs** - no consumers, no DB, no SSE integration
3. **Singleton pattern** - consistent with api-server, easy to use from index.ts

### Key differences from api-server
| Aspect | api-server | mock-service |
|--------|------------|--------------|
| Consumers | Multiple (DataSource, Document, Workflow) | None (publish only) |
| Database | Uses pool, withOrgContext | None |
| SSE | Sends events to users | None |
| Health endpoint | Includes RabbitMQ status | No (per decision) |

## Phases

### Phase 1: Create RabbitMQService
- Create `packages/mock-service/src/services/rabbitmq.ts`
- Implement `RabbitMQService` class with:
  - Connection state types and interfaces
  - `connect()` with state tracking
  - `setupEventListeners()` for error/close/blocked/unblocked
  - `handleConnectionLoss()` and `reconnect()` with exponential backoff
  - `calculateBackoffDelay()` with jitter
  - `publishToQueue()` method
  - `close()` for graceful shutdown
  - `getHealthStatus()` for debugging
- Export singleton `getRabbitMQService()`

### Phase 2: Integrate into index.ts
- Remove module-level `rabbitConnection` and `rabbitChannel` variables
- Remove `connectRabbitMQ()` function
- Remove `publishResponse()` and `publishToQueue()` functions
- Import `getRabbitMQService` from new service
- Update startup to use `service.connect()`
- Update all `publishResponse`/`publishToQueue` calls to use `service.publishToQueue()`
- Update graceful shutdown to use `service.close()`

### Phase 3: Manual Testing
- Start mock-service, verify connection logs
- Stop RabbitMQ container, verify reconnection attempts with backoff
- Restart RabbitMQ, verify successful reconnection
- Send webhook, verify message published after reconnect

## Open Questions
- None currently—all decisions made during planning
