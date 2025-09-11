# RabbitMQ Webhook Replacement - Technical Design Document

## Executive Summary

This document outlines the technical design for replacing the current HTTP webhook-based communication pattern with RabbitMQ message queues in the Resolve Onboarding application. This change will improve reliability, scalability, and maintainability of the chat and document processing systems.

## Current State Analysis

### Current Architecture Issues

1. **Webhook Reliability Problems**
   - Network timeouts cause message loss
   - Callback URLs must be publicly accessible (ngrok requirement for local dev)
   - Manual retry logic with database polling (`webhookRetry.js`)
   - No guaranteed delivery semantics

2. **Tight Coupling**
   - Services need to know each other's HTTP endpoints
   - Direct dependencies between Onboarding App and Resolve AI Service
   - CORS configuration complexity for external callbacks

3. **Error Handling Complexity**
   - Custom retry logic in `rag_webhook_failures` table
   - Exponential backoff implementation in application code
   - No dead letter queue for permanently failed messages

### Current Message Flow

```
Frontend → Onboarding App → HTTP Webhook → Resolve AI → HTTP Callback → Onboarding App → SSE → Frontend
```

**Problems with this flow:**
- Single point of failure at HTTP callback
- No message persistence during service restarts
- Manual retry implementation

## Proposed Solution: RabbitMQ Integration

### Architecture Overview

```mermaid
graph TB
    A[Frontend Dashboard] --> B[Onboarding App]
    B --> C[RabbitMQ Broker]
    C --> D[Resolve AI Service]
    D --> C
    C --> B
    B --> A
    
    subgraph "Message Queues"
        E[chat.requests]
        F[chat.responses]
        G[document.processing]
        H[document.processed]
        I[chat.dlx - Dead Letter]
    end
    
    C --> E
    C --> F
    C --> G
    C --> H
    C --> I
```

### Queue Design

#### Core Queues

| Queue Name | Purpose | Producer | Consumer | Durability |
|------------|---------|----------|----------|------------|
| `chat.requests` | User messages to AI | Onboarding App | Resolve AI | Durable |
| `chat.responses` | AI responses | Resolve AI | Onboarding App | Durable |
| `document.processing` | Document ingestion requests | Onboarding App | Resolve AI | Durable |
| `document.processed` | Document processing results | Resolve AI | Onboarding App | Durable |
| `chat.dlx` | Failed messages | System | Manual Review | Durable |

#### Queue Properties

```javascript
const queueConfig = {
  durable: true,              // Survive broker restart
  exclusive: false,           // Multiple consumers allowed
  autoDelete: false,          // Don't delete when unused
  arguments: {
    'x-dead-letter-exchange': 'dlx.exchange',
    'x-dead-letter-routing-key': 'failed',
    'x-message-ttl': 300000   // 5 minutes TTL
  }
};
```

## Implementation Plan

### Phase 1: Infrastructure Setup

#### 1.1 RabbitMQ Service Integration

```javascript
// src/services/rabbitmq.js
class RabbitMQService {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
        this.exchanges = {
            chat: 'chat.exchange',
            document: 'document.exchange',
            dlx: 'dlx.exchange'
        };
    }

    async connect() {
        this.connection = await amqp.connect(this.url, {
            heartbeat: 60,
            clientProperties: {
                application: 'resolve-onboarding',
                version: process.env.APP_VERSION || '1.0.0'
            }
        });

        this.channel = await this.connection.createChannel();
        await this.setupTopology();
        this.setupEventHandlers();
    }

    async setupTopology() {
        // Declare exchanges
        await this.channel.assertExchange(this.exchanges.chat, 'topic', { durable: true });
        await this.channel.assertExchange(this.exchanges.document, 'topic', { durable: true });
        await this.channel.assertExchange(this.exchanges.dlx, 'direct', { durable: true });

        // Declare queues with dead letter configuration
        const queueConfig = {
            durable: true,
            arguments: {
                'x-dead-letter-exchange': this.exchanges.dlx,
                'x-message-ttl': 300000  // 5 minutes
            }
        };

        await this.channel.assertQueue('chat.requests', queueConfig);
        await this.channel.assertQueue('chat.responses', queueConfig);
        await this.channel.assertQueue('document.processing', queueConfig);
        await this.channel.assertQueue('document.processed', queueConfig);
        
        // Dead letter queue
        await this.channel.assertQueue('failed.messages', { durable: true });

        // Bind queues to exchanges
        await this.channel.bindQueue('chat.requests', this.exchanges.chat, 'chat.process');
        await this.channel.bindQueue('chat.responses', this.exchanges.chat, 'chat.response');
        await this.channel.bindQueue('document.processing', this.exchanges.document, 'document.process');
        await this.channel.bindQueue('document.processed', this.exchanges.document, 'document.response');
        await this.channel.bindQueue('failed.messages', this.exchanges.dlx, 'failed');
    }
}
```

#### 1.2 Environment Configuration

```bash
# .env additions
RABBITMQ_URL=amqp://user:password@localhost:5672
RABBITMQ_EXCHANGE_CHAT=chat.exchange
RABBITMQ_EXCHANGE_DOCUMENT=document.exchange
RABBITMQ_PREFETCH_COUNT=1
RABBITMQ_HEARTBEAT=60
```

### Phase 2: Chat System Migration

#### 2.1 Replace Chat Webhook with Queue Publisher

```javascript
// src/routes/ragApi.js - BEFORE
router.post('/chat', validateTenantMW, rateLimit, async (req, res) => {
    // ... existing validation ...
    
    // OLD: HTTP webhook
    resolveWebhook.sendProxyEvent({
        source: 'onboarding',
        action: 'process-chat-message',
        // ... webhook payload
    });
    
    res.json({ message: 'Processing...', message_id: messageId });
});

// src/routes/ragApi.js - AFTER
router.post('/chat', validateTenantMW, rateLimit, async (req, res) => {
    const { message, conversation_id } = req.body;
    const messageId = crypto.randomUUID();
    const convId = conversation_id || crypto.randomUUID();
    
    // Store user message
    await db.query(
        'INSERT INTO rag_messages (id, conversation_id, tenant_id, user_message, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [messageId, convId, req.tenantId, message]
    );
    
    // NEW: Publish to RabbitMQ
    const chatMessage = {
        message_id: messageId,
        conversation_id: convId,
        tenant_id: req.tenantId,
        user_email: req.userEmail,
        user_message: message,
        timestamp: new Date().toISOString(),
        vector_search_endpoint: `${process.env.APP_URL}/api/rag/vector-search`,
        callback_auth: generateCallbackToken(req.tenantId, messageId)
    };
    
    await rabbitMQ.publish('chat.exchange', 'chat.process', chatMessage, {
        persistent: true,
        messageId: messageId,
        timestamp: Date.now(),
        headers: {
            'tenant-id': req.tenantId,
            'conversation-id': convId
        }
    });
    
    res.json({ 
        message: 'Processing your message...', 
        message_id: messageId,
        conversation_id: convId 
    });
});
```

#### 2.2 Chat Response Consumer

```javascript
// src/consumers/chatResponseConsumer.js
class ChatResponseConsumer {
    constructor(rabbitMQ, db, sseManager) {
        this.rabbitMQ = rabbitMQ;
        this.db = db;
        this.sseManager = sseManager;
    }

    async start() {
        await this.rabbitMQ.channel.prefetch(1); // Process one message at a time
        
        await this.rabbitMQ.channel.consume('chat.responses', async (message) => {
            if (message) {
                try {
                    const data = JSON.parse(message.content.toString());
                    await this.handleChatResponse(data);
                    this.rabbitMQ.channel.ack(message);
                } catch (error) {
                    console.error('Chat response processing failed:', error);
                    this.rabbitMQ.channel.nack(message, false, true); // Requeue
                }
            }
        });
    }

    async handleChatResponse(data) {
        const { 
            message_id, 
            conversation_id, 
            tenant_id, 
            ai_response, 
            sources = [],
            processing_time_ms 
        } = data;

        // Store AI response in database
        await this.db.query(
            'UPDATE rag_messages SET ai_response = $1, sources = $2, processing_time_ms = $3, updated_at = NOW() WHERE id = $4',
            [ai_response, JSON.stringify(sources), processing_time_ms, message_id]
        );

        // Broadcast to SSE clients
        const sseMessage = {
            type: 'chat-response',
            message_id,
            conversation_id,
            ai_response,
            sources,
            processing_time_ms
        };

        this.sseManager.broadcastToConversation(conversation_id, sseMessage);
        
        console.log(`Chat response processed for message ${message_id}`);
    }
}
```

### Phase 3: Document Processing Migration

#### 3.1 Document Upload Queue Publisher

```javascript
// src/routes/ragApi.js - Document upload
router.post('/upload-document', validateTenantMW, rateLimit, upload.single('document'), async (req, res) => {
    // ... existing validation and storage ...
    
    // NEW: Publish to document processing queue
    const documentMessage = {
        document_id: documentId,
        tenant_id: req.tenantId,
        document_url: `${process.env.APP_URL}/api/documents/${documentId}`,
        file_type: fileExt,
        file_size: uploadedFile.size,
        original_filename: uploadedFile.originalname,
        user_email: req.userEmail,
        timestamp: new Date().toISOString()
    };
    
    await rabbitMQ.publish('document.exchange', 'document.process', documentMessage, {
        persistent: true,
        messageId: documentId,
        headers: {
            'tenant-id': req.tenantId,
            'document-type': fileExt
        }
    });
    
    res.json({
        success: true,
        document_id: documentId,
        status: 'processing',
        message: 'Document uploaded and queued for processing'
    });
});
```

#### 3.2 Document Processing Consumer

```javascript
// src/consumers/documentConsumer.js
class DocumentProcessingConsumer {
    constructor(rabbitMQ, db, sseManager) {
        this.rabbitMQ = rabbitMQ;
        this.db = db;
        this.sseManager = sseManager;
    }

    async start() {
        await this.rabbitMQ.channel.prefetch(1);
        
        await this.rabbitMQ.channel.consume('document.processed', async (message) => {
            if (message) {
                try {
                    const data = JSON.parse(message.content.toString());
                    await this.handleDocumentProcessed(data);
                    this.rabbitMQ.channel.ack(message);
                } catch (error) {
                    console.error('Document processing failed:', error);
                    this.rabbitMQ.channel.nack(message, false, true);
                }
            }
        });
    }

    async handleDocumentProcessed(data) {
        const { 
            document_id, 
            tenant_id, 
            status, 
            vectors = [], 
            error_message = null,
            processing_time_ms 
        } = data;

        if (status === 'completed' && vectors.length > 0) {
            // Store vectors in database
            for (const vector of vectors) {
                await this.db.query(
                    'INSERT INTO rag_vectors (document_id, tenant_id, chunk_text, embedding, chunk_index) VALUES ($1, $2, $3, $4, $5)',
                    [document_id, tenant_id, vector.chunk_text, vector.embedding, vector.chunk_index]
                );
            }
        }

        // Update document status
        await this.db.query(
            'UPDATE rag_documents SET status = $1, error_message = $2, processing_time_ms = $3, updated_at = NOW() WHERE id = $4',
            [status, error_message, processing_time_ms, document_id]
        );

        // Notify frontend
        this.sseManager.broadcastToTenant(tenant_id, {
            type: 'document-processed',
            document_id,
            status,
            error_message
        });
    }
}
```

### Phase 4: Error Handling & Monitoring

#### 4.1 Dead Letter Queue Handler

```javascript
// src/consumers/deadLetterConsumer.js
class DeadLetterConsumer {
    constructor(rabbitMQ, db) {
        this.rabbitMQ = rabbitMQ;
        this.db = db;
    }

    async start() {
        await this.rabbitMQ.channel.consume('failed.messages', async (message) => {
            if (message) {
                try {
                    const originalMessage = JSON.parse(message.content.toString());
                    await this.logFailedMessage(originalMessage, message.properties.headers);
                    this.rabbitMQ.channel.ack(message);
                } catch (error) {
                    console.error('Dead letter processing failed:', error);
                    this.rabbitMQ.channel.ack(message); // Don't requeue dead letters
                }
            }
        });
    }

    async logFailedMessage(originalMessage, headers) {
        await this.db.query(
            'INSERT INTO message_failures (message_id, tenant_id, original_payload, failure_reason, failed_at) VALUES ($1, $2, $3, $4, NOW())',
            [
                originalMessage.message_id || 'unknown',
                originalMessage.tenant_id || 'unknown',
                JSON.stringify(originalMessage),
                headers['x-death'] ? headers['x-death'][0].reason : 'unknown'
            ]
        );

        // Alert monitoring system
        console.error('Message sent to dead letter queue:', originalMessage);
    }
}
```

#### 4.2 Health Check Integration

```javascript
// src/routes/health.js
router.get('/health', async (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {}
    };

    try {
        // Check RabbitMQ connection
        if (rabbitMQ.connection && !rabbitMQ.connection.connection.destroyed) {
            health.services.rabbitmq = 'healthy';
        } else {
            health.services.rabbitmq = 'unhealthy';
            health.status = 'unhealthy';
        }

        // Check database
        await db.query('SELECT 1');
        health.services.database = 'healthy';

    } catch (error) {
        health.status = 'unhealthy';
        health.services.database = 'unhealthy';
        health.error = error.message;
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
});
```

## Migration Strategy

### Phase 1: Infrastructure (Week 1)
- [ ] Set up RabbitMQ service in Docker Compose
- [ ] Create RabbitMQ service class with connection management
- [ ] Add environment configuration
- [ ] Implement health checks

### Phase 2: Parallel Implementation (Week 2)
- [ ] Implement RabbitMQ publishers alongside existing webhooks
- [ ] Create message consumers
- [ ] Add feature flag to switch between webhook/queue modes
- [ ] Test both systems in parallel

### Phase 3: Migration (Week 3)
- [ ] Enable queue mode in staging environment
- [ ] Monitor message processing and error rates
- [ ] Gradual rollout with ability to rollback
- [ ] Performance testing and optimization

### Phase 4: Cleanup (Week 4)
- [ ] Remove webhook-related code
- [ ] Clean up database tables (`rag_webhook_failures`)
- [ ] Update documentation
- [ ] Remove ngrok dependency for local development
- [ ] Create local development onboarding guide
- [ ] Update CI/CD pipelines for RabbitMQ testing

## Local Development Environment

### Current Local Development Pain Points

The current webhook-based architecture creates significant friction for local development:

- **External Dependencies**: Requires ngrok tunnel for webhook callbacks
- **Network Configuration**: Complex CORS setup for external callback URLs
- **Debugging Difficulty**: Hard to trace webhook failures and retry logic
- **Environment Complexity**: Need publicly accessible URLs for localhost testing

### RabbitMQ Local Development Benefits

RabbitMQ eliminates these pain points by providing a self-contained messaging environment:

- **No External URLs Required**: All communication happens through local message queues
- **Simplified Setup**: Single Docker Compose command starts entire stack
- **Enhanced Debugging**: RabbitMQ Management UI provides real-time message flow visibility
- **Offline Development**: No internet dependency for core functionality

### Local Development Setup

#### Docker Compose for Development

```yaml
# docker-compose.dev.yml
services:
  app:
    build:
      context: .
      target: development
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=development
      - RABBITMQ_URL=amqp://dev:devpass@rabbitmq:5672
      - APP_URL=http://localhost:5000  # No ngrok needed!
      - DEBUG_MESSAGES=true
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      rabbitmq:
        condition: service_healthy

  rabbitmq:
    image: rabbitmq:3.12-management-alpine
    ports:
      - "5672:5672"    # AMQP protocol
      - "15672:15672"  # Management UI
    environment:
      RABBITMQ_DEFAULT_USER: dev
      RABBITMQ_DEFAULT_PASS: devpass
      RABBITMQ_DEFAULT_VHOST: /
    volumes:
      - rabbitmq_dev_data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

volumes:
  rabbitmq_dev_data:
```

#### Mock Resolve AI Service

Since the external Resolve AI service may not be available locally, we provide a mock implementation:

```javascript
// scripts/mock-resolve-ai.js
const amqp = require('amqplib');

class MockResolveAI {
    constructor() {
        this.connection = null;
        this.channel = null;
    }

    async connect() {
        this.connection = await amqp.connect('amqp://dev:devpass@localhost:5672');
        this.channel = await this.connection.createChannel();
        
        // Setup exchanges and queues
        await this.setupQueues();
        
        // Start consuming messages
        await this.startConsumers();
        
        console.log('🤖 Mock Resolve AI service started');
        console.log('📊 Management UI: http://localhost:15672 (dev/devpass)');
    }

    async setupQueues() {
        // Ensure queues exist (same as main app)
        await this.channel.assertExchange('chat.exchange', 'topic', { durable: true });
        await this.channel.assertExchange('document.exchange', 'topic', { durable: true });
        
        await this.channel.assertQueue('chat.requests', { durable: true });
        await this.channel.assertQueue('chat.responses', { durable: true });
        await this.channel.assertQueue('document.processing', { durable: true });
        await this.channel.assertQueue('document.processed', { durable: true });
    }

    async startConsumers() {
        // Chat request consumer
        await this.channel.consume('chat.requests', this.handleChatRequest.bind(this));
        
        // Document processing consumer
        await this.channel.consume('document.processing', this.handleDocumentRequest.bind(this));
    }

    async handleChatRequest(message) {
        if (message) {
            const data = JSON.parse(message.content.toString());
            console.log(`📨 Processing chat: "${data.user_message}"`);
            
            // Simulate AI processing time
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const response = {
                message_id: data.message_id,
                conversation_id: data.conversation_id,
                tenant_id: data.tenant_id,
                ai_response: `Mock AI response to: "${data.user_message}". This is a simulated response for local development.`,
                sources: ['Local Mock Document 1', 'Local Mock Document 2'],
                processing_time_ms: 1500
            };

            await this.channel.publish('chat.exchange', 'chat.response', 
                Buffer.from(JSON.stringify(response)));
            
            this.channel.ack(message);
            console.log('✅ Chat response sent');
        }
    }

    async handleDocumentRequest(message) {
        if (message) {
            const data = JSON.parse(message.content.toString());
            console.log(`📄 Processing document: ${data.original_filename}`);
            
            // Simulate document processing
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const response = {
                document_id: data.document_id,
                tenant_id: data.tenant_id,
                status: 'completed',
                vectors: [
                    {
                        chunk_text: `Mock content from ${data.original_filename} - chunk 1`,
                        embedding: new Array(1536).fill(0.1), // Mock 1536-dimension vector
                        chunk_index: 0
                    },
                    {
                        chunk_text: `Mock content from ${data.original_filename} - chunk 2`,
                        embedding: new Array(1536).fill(0.2),
                        chunk_index: 1
                    }
                ],
                processing_time_ms: 3000
            };

            await this.channel.publish('document.exchange', 'document.response',
                Buffer.from(JSON.stringify(response)));
                
            this.channel.ack(message);
            console.log(`✅ Document processing complete: ${data.original_filename}`);
        }
    }
}

// Auto-start when run directly
if (require.main === module) {
    const mockAI = new MockResolveAI();
    mockAI.connect().catch(console.error);
}

module.exports = MockResolveAI;
```

#### Development Scripts

```json
{
  "scripts": {
    "dev:setup": "docker compose -f docker-compose.dev.yml up -d",
    "dev:start": "concurrently \"npm run dev\" \"npm run mock-ai\"",
    "dev:app": "nodemon server.js",
    "dev:mock-ai": "node scripts/mock-resolve-ai.js",
    "dev:ui": "open http://localhost:15672",
    "dev:reset": "docker compose -f docker-compose.dev.yml down -v && npm run dev:setup",
    "dev:logs": "docker compose -f docker-compose.dev.yml logs -f",
    "dev:debug": "node --inspect=0.0.0.0:9229 server.js"
  }
}
```

### Development Workflow

#### Quick Start

```bash
# 1. Start RabbitMQ and dependencies
npm run dev:setup

# 2. Wait for services to be healthy
docker compose -f docker-compose.dev.yml ps

# 3. Start application and mock AI service
npm run dev:start

# 4. Open RabbitMQ Management UI
npm run dev:ui
# Login: dev/devpass

# 5. Test the application
curl -X POST http://localhost:5000/api/rag/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: sessionToken=your-session-token" \
  -d '{"message": "Hello, can you help me?"}'
```

#### Debug Utilities

```javascript
// src/utils/devTools.js - Development-only utilities
class RabbitMQDevTools {
    static async inspectQueues() {
        const queues = ['chat.requests', 'chat.responses', 'document.processing', 'document.processed'];
        const report = {};
        
        for (const queueName of queues) {
            try {
                const queueInfo = await rabbitMQ.channel.checkQueue(queueName);
                report[queueName] = {
                    messages: queueInfo.messageCount,
                    consumers: queueInfo.consumerCount
                };
            } catch (error) {
                report[queueName] = { error: error.message };
            }
        }
        
        return report;
    }
    
    static async publishTestMessage(type = 'chat') {
        const testMessages = {
            chat: {
                exchange: 'chat.exchange',
                routingKey: 'chat.process',
                message: {
                    message_id: 'test-' + Date.now(),
                    conversation_id: 'test-conversation',
                    tenant_id: 'test-tenant',
                    user_message: 'This is a test message from dev tools'
                }
            },
            document: {
                exchange: 'document.exchange', 
                routingKey: 'document.process',
                message: {
                    document_id: 'test-doc-' + Date.now(),
                    tenant_id: 'test-tenant',
                    original_filename: 'test-document.pdf',
                    file_type: 'pdf'
                }
            }
        };
        
        const { exchange, routingKey, message } = testMessages[type];
        
        await rabbitMQ.channel.publish(exchange, routingKey, 
            Buffer.from(JSON.stringify(message)));
        
        console.log(`📤 Test ${type} message published`);
        return message;
    }
}

// Development-only routes
if (process.env.NODE_ENV === 'development') {
    app.get('/dev/queues', async (req, res) => {
        const report = await RabbitMQDevTools.inspectQueues();
        res.json(report);
    });
    
    app.post('/dev/test-message/:type', async (req, res) => {
        const { type } = req.params;
        try {
            const message = await RabbitMQDevTools.publishTestMessage(type);
            res.json({ success: true, message });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}
```

### Environment Configuration

```bash
# .env.development
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/resolve_dev
RABBITMQ_URL=amqp://dev:devpass@localhost:5672
APP_URL=http://localhost:5000

# Development-specific settings
DEBUG_MESSAGES=true
MOCK_AI_ENABLED=true
RABBITMQ_DEBUG=true
LOG_LEVEL=debug

# Disable external services
WEBHOOK_ENABLED=false
EXTERNAL_API_ENABLED=false
```

### Testing and Debugging

#### RabbitMQ Management UI Features

The management UI at `http://localhost:15672` provides:

- **Queue Monitoring**: Real-time message counts and rates
- **Message Inspection**: View message contents and headers
- **Manual Publishing**: Send test messages to any queue
- **Consumer Tracking**: Monitor which consumers are active
- **Dead Letter Analysis**: Inspect failed messages

#### Message Flow Debugging

```javascript
// Enable detailed message logging in development
if (process.env.DEBUG_MESSAGES === 'true') {
    // Log all published messages
    const originalPublish = rabbitMQ.channel.publish;
    rabbitMQ.channel.publish = function(exchange, routingKey, content, options) {
        console.log(`📤 [${exchange}:${routingKey}]`, JSON.parse(content.toString()));
        return originalPublish.call(this, exchange, routingKey, content, options);
    };
    
    // Log all consumed messages
    const originalConsume = rabbitMQ.channel.consume;
    rabbitMQ.channel.consume = function(queue, onMessage, options) {
        const wrappedOnMessage = (message) => {
            if (message) {
                console.log(`📥 [${queue}]`, JSON.parse(message.content.toString()));
            }
            return onMessage(message);
        };
        return originalConsume.call(this, queue, wrappedOnMessage, options);
    };
}
```

## Docker Compose Updates

### Production Configuration

```yaml
# docker-compose.yml - Production
services:
  rabbitmq:
    image: rabbitmq:3.12-management-alpine
    ports:
      - "5672:5672"    # AMQP port
      - "15672:15672"  # Management UI (should be restricted in production)
    environment:
      RABBITMQ_DEFAULT_USER: resolve
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
      RABBITMQ_DEFAULT_VHOST: /production
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  app:
    depends_on:
      rabbitmq:
        condition: service_healthy
    environment:
      - RABBITMQ_URL=amqp://resolve:${RABBITMQ_PASSWORD}@rabbitmq:5672/production

volumes:
  rabbitmq_data:
```

## Monitoring & Observability

### Key Metrics to Track

1. **Message Processing Metrics**
   - Messages published per minute
   - Messages consumed per minute
   - Queue depths
   - Processing latency

2. **Error Metrics**
   - Dead letter queue size
   - Message rejection rate
   - Consumer connection failures

3. **Business Metrics**
   - Chat response time
   - Document processing time
   - User satisfaction scores

### Logging Strategy

```javascript
// Structured logging for RabbitMQ operations
const logger = {
    messagePublished: (exchange, routingKey, messageId) => {
        console.log(JSON.stringify({
            event: 'message_published',
            exchange,
            routing_key: routingKey,
            message_id: messageId,
            timestamp: new Date().toISOString()
        }));
    },
    
    messageConsumed: (queue, messageId, processingTime) => {
        console.log(JSON.stringify({
            event: 'message_consumed',
            queue,
            message_id: messageId,
            processing_time_ms: processingTime,
            timestamp: new Date().toISOString()
        }));
    }
};
```

## Benefits & Expected Outcomes

### Reliability Improvements
- **99.9% message delivery guarantee** vs current ~95% webhook success rate
- **Automatic retry mechanism** eliminates custom retry logic
- **Dead letter queues** for debugging failed messages

### Performance Improvements
- **Reduced latency** by eliminating HTTP roundtrips
- **Better throughput** with message batching capabilities
- **Load balancing** across multiple consumer instances

### Operational Improvements
- **Simplified local development** (no ngrok required)
- **Better error visibility** through RabbitMQ management UI
- **Easier scaling** with queue-based load distribution
- **Improved developer experience** with self-contained environment

### Development Benefits
- **Faster onboarding** for new developers (single command setup)
- **Offline development capability** (no external service dependencies)
- **Enhanced debugging** with message flow visualization
- **Consistent development environment** across team members

### Cost Reduction
- **Reduced infrastructure complexity** (no webhook retry workers)
- **Lower maintenance overhead** (RabbitMQ handles reliability)
- **Simplified deployment** (fewer external dependencies)
- **Eliminated ngrok costs** for development teams

## Risk Mitigation

### Potential Risks & Mitigations

1. **RabbitMQ Single Point of Failure**
   - **Mitigation**: RabbitMQ clustering in production
   - **Fallback**: Keep webhook code as emergency fallback

2. **Message Processing Bottlenecks**
   - **Mitigation**: Horizontal scaling with multiple consumers
   - **Monitoring**: Queue depth alerts

3. **Breaking Changes in Resolve AI Service**
   - **Mitigation**: Gradual migration with feature flags
   - **Testing**: Comprehensive integration test suite

## Conclusion

Replacing the webhook-based communication with RabbitMQ will significantly improve the reliability, scalability, and maintainability of the Resolve Onboarding application. The proposed implementation provides a robust foundation for future growth while simplifying the current architecture.

The migration strategy allows for a gradual transition with minimal risk, and the comprehensive monitoring ensures visibility into system health and performance.