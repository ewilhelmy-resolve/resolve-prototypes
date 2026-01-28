# Mock Service RabbitMQ Resilience - Todo

## Phase 1: Create RabbitMQService
- [x] Create `packages/mock-service/src/services/rabbitmq.ts`
- [x] Implement connection state types and interfaces
- [x] Implement `connect()` with state tracking
- [x] Implement `setupEventListeners()` for error/close/blocked/unblocked
- [x] Implement `handleConnectionLoss()` and `reconnect()` with exponential backoff
- [x] Implement `calculateBackoffDelay()` with jitter
- [x] Implement `publishToQueue()` method
- [x] Implement `close()` for graceful shutdown
- [x] Implement `getHealthStatus()` for debugging
- [x] Export singleton `getRabbitMQService()`

## Phase 2: Integrate into index.ts
- [x] Remove module-level `rabbitConnection` and `rabbitChannel` variables
- [x] Remove `connectRabbitMQ()` function
- [x] Remove `publishResponse()` and `publishToQueue()` functions (kept publishResponse as helper)
- [x] Import `getRabbitMQService` from new service
- [x] Update startup to use `service.connect()`
- [x] Update all publish calls to use `service.publishToQueue()`
- [x] Update graceful shutdown to use `service.close()`

## Phase 3: Manual Testing
- [x] Start mock-service, verify connection logs
- [x] Stop RabbitMQ container, verify reconnection attempts with backoff
- [x] Restart RabbitMQ, verify successful reconnection
- [x] Send webhook, verify message published after reconnect
