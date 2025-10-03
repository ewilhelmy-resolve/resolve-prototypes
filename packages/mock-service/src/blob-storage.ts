// Blob storage for mock service
// Stores full document content that can be fetched by blob_id

export interface BlobContent {
  blob_id: string;
  content: string;
  content_type: 'markdown' | 'text' | 'html';
  metadata?: {
    title?: string;
    author?: string;
    created_at?: string;
    updated_at?: string;
  };
}

// Mock blob storage database
export const BLOB_STORAGE: Map<string, BlobContent> = new Map([
  [
    'blob_automation_guide_v2024',
    {
      blob_id: 'blob_automation_guide_v2024',
      content_type: 'markdown',
      content: `# Rita Automation System - Complete Implementation Guide

## Executive Summary

The Rita automation system provides **enterprise-grade workflow automation** with SOC2 Type II compliance, comprehensive audit logging, and real-time monitoring. Built on modern cloud-native architecture, Rita processes over 10,000 tasks per second with 99.99% uptime SLA.

**Key Benefits:**
- ⚡ **High Performance**: Sub-50ms P95 latency for workflow execution
- 🔒 **Enterprise Security**: Full SOC2 Type II certification with AES-256 encryption
- 📊 **Real-time Insights**: Live metrics and comprehensive audit trails
- 🚀 **Infinite Scalability**: Horizontal scaling with zero downtime deployments

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [System Components](#system-components)
3. [Getting Started](#getting-started)
4. [Workflow Development](#workflow-development)
5. [Security & Compliance](#security-compliance)
6. [Performance Optimization](#performance-optimization)
7. [Monitoring & Observability](#monitoring-observability)
8. [Troubleshooting](#troubleshooting)
9. [API Reference](#api-reference)

---

## Architecture Overview

Rita's architecture follows a **microservices pattern** with event-driven communication:

\`\`\`mermaid
graph TB
    subgraph "Client Layer"
        UI[Rita UI<br/>React + TypeScript]
        Mobile[Mobile Apps<br/>React Native]
    end

    subgraph "API Gateway"
        Gateway[Kong Gateway<br/>Rate Limiting + Auth]
    end

    subgraph "Application Layer"
        API[API Server<br/>Node.js + Express]
        Worker1[Worker Pool 1<br/>Task Processing]
        Worker2[Worker Pool 2<br/>Task Processing]
        Worker3[Worker Pool 3<br/>Task Processing]
    end

    subgraph "Message Queue"
        RabbitMQ[(RabbitMQ<br/>Event Bus)]
    end

    subgraph "Data Layer"
        Postgres[(PostgreSQL<br/>Primary DB)]
        Redis[(Redis<br/>Cache Layer)]
        S3[(S3<br/>Object Storage)]
    end

    subgraph "Observability"
        Prometheus[Prometheus<br/>Metrics]
        Grafana[Grafana<br/>Dashboards]
        ELK[ELK Stack<br/>Log Aggregation]
    end

    UI --> Gateway
    Mobile --> Gateway
    Gateway --> API
    API --> RabbitMQ
    RabbitMQ --> Worker1
    RabbitMQ --> Worker2
    RabbitMQ --> Worker3
    Worker1 --> Postgres
    Worker2 --> Postgres
    Worker3 --> Postgres
    API --> Redis
    API --> Postgres
    Worker1 --> S3
    API --> Prometheus
    Worker1 --> Prometheus
    Prometheus --> Grafana
    API --> ELK
    Worker1 --> ELK
\`\`\`

### Design Principles

1. **Loose Coupling**: Services communicate via message queues, enabling independent scaling
2. **Fault Tolerance**: Circuit breakers and retry mechanisms prevent cascade failures
3. **Observability**: Comprehensive metrics, logs, and traces at every layer
4. **Security First**: Zero-trust architecture with end-to-end encryption

---

## System Components

### 1. API Server

**Purpose**: REST API endpoints for client interactions

**Technology Stack:**
- **Runtime**: Node.js 20.x LTS
- **Framework**: Express 4.x with TypeScript
- **Authentication**: OAuth 2.0 via Keycloak
- **Validation**: Zod schema validation
- **Documentation**: OpenAPI 3.1 specification

**Key Responsibilities:**
- Request validation and authentication
- Message routing to RabbitMQ
- Real-time SSE connections
- Metrics collection and reporting

**Performance Characteristics:**

| Metric | Target | Current |
|--------|--------|---------|
| P50 Latency | < 20ms | 15ms |
| P95 Latency | < 50ms | 42ms |
| P99 Latency | < 100ms | 87ms |
| Throughput | 5,000 req/s | 6,200 req/s |
| Error Rate | < 0.1% | 0.03% |

### 2. Message Queue (RabbitMQ)

**Purpose**: Asynchronous message distribution and load balancing

**Configuration:**

\`\`\`yaml
# RabbitMQ Configuration
rabbitmq:
  version: 3.12
  management_plugin: enabled

  queues:
    - name: chat.responses
      durable: true
      auto_delete: false
      arguments:
        x-max-length: 100000
        x-message-ttl: 3600000  # 1 hour
        x-dead-letter-exchange: dlx.chat

    - name: workflow.tasks
      durable: true
      prefetch_count: 10

  exchanges:
    - name: chat.topic
      type: topic
      durable: true

  policies:
    - name: ha-all
      pattern: ".*"
      definition:
        ha-mode: all
        ha-sync-mode: automatic
\`\`\`

**Message Flow Diagram:**

\`\`\`mermaid
sequenceDiagram
    participant Client
    participant API
    participant RabbitMQ
    participant Worker
    participant DB

    Client->>API: POST /messages
    API->>API: Validate request
    API->>RabbitMQ: Publish to chat.requests
    API-->>Client: 202 Accepted

    RabbitMQ->>Worker: Deliver message
    Worker->>Worker: Process task
    Worker->>DB: Store result
    Worker->>RabbitMQ: Publish to chat.responses

    RabbitMQ->>API: Deliver response
    API->>Client: SSE: message.completed

    Note over Client,DB: Async processing complete
\`\`\`

### 3. Worker Pool

**Purpose**: Distributed task processing with horizontal scaling

**Features:**
- Auto-scaling based on queue depth
- Graceful shutdown with task completion
- Dead letter handling for failed tasks
- Rate limiting per tenant

**Scaling Strategy:**

\`\`\`typescript
// Auto-scaling configuration
interface ScalingConfig {
  minWorkers: 3
  maxWorkers: 50
  scaleUpThreshold: 1000    // Queue depth
  scaleDownThreshold: 100
  cooldownPeriod: 300        // seconds
  metricsWindow: 60          // seconds
}

// Worker health check
async function healthCheck(): Promise<boolean> {
  const checks = await Promise.all([
    checkDatabaseConnection(),
    checkRabbitMQConnection(),
    checkMemoryUsage(),
    checkCPULoad()
  ])

  return checks.every(check => check.healthy)
}
\`\`\`

### 4. Database (PostgreSQL)

**Schema Design:**

\`\`\`sql
-- Core tables with optimized indexes

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Full-text search
    message_tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', message)) STORED
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_search ON messages USING GIN(message_tsv);
CREATE INDEX idx_messages_metadata ON messages USING GIN(metadata);

-- Audit log for compliance
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant_time ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
\`\`\`

---

## Getting Started

### Installation

**Prerequisites:**
- Node.js 20.x or higher
- Docker Desktop 4.x or higher
- PostgreSQL 15.x (or use Docker)
- RabbitMQ 3.12.x (or use Docker)

**Quick Start:**

\`\`\`bash
# Clone the repository
git clone https://github.com/resolve/rita.git
cd rita

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start infrastructure services
docker compose up -d postgres rabbitmq keycloak

# Run database migrations
npm run migrate

# Start the API server
cd packages/api-server
npm run dev

# In a new terminal, start the client
cd packages/client
npm run dev
\`\`\`

**Environment Variables:**

\`\`\`bash
# .env file
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://rita:rita@localhost:5432/rita_dev
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=20

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672
RABBITMQ_QUEUE_NAME=chat.responses

# Redis Cache
REDIS_URL=redis://localhost:6379
REDIS_TTL=3600

# Authentication
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=rita
KEYCLOAK_CLIENT_ID=rita-client
KEYCLOAK_CLIENT_SECRET=your-secret-here

# Observability
PROMETHEUS_PORT=9090
LOG_LEVEL=info
\`\`\`

### Docker Compose Setup

\`\`\`yaml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg15
    environment:
      POSTGRES_DB: rita_dev
      POSTGRES_USER: rita
      POSTGRES_PASSWORD: rita
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U rita"]
      interval: 10s
      timeout: 5s
      retries: 5

  rabbitmq:
    image: rabbitmq:3.12-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 30s
      timeout: 10s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

volumes:
  postgres_data:
  rabbitmq_data:
  redis_data:
\`\`\`

---

## Workflow Development

### Creating Custom Workflows

**Basic Workflow Example:**

\`\`\`typescript
import { Workflow, Task, Trigger } from '@resolve/rita-sdk'

// Define workflow
const dataProcessingWorkflow = new Workflow({
  id: 'data-processing-v1',
  name: 'Data Processing Pipeline',
  description: 'Validates, transforms, and stores uploaded data',

  // Trigger configuration
  triggers: [
    new Trigger.FileUpload({
      fileTypes: ['.csv', '.json', '.xlsx'],
      maxSize: 10 * 1024 * 1024, // 10MB
    }),
    new Trigger.Schedule({
      cron: '0 2 * * *', // Daily at 2 AM
    })
  ],

  // Task pipeline
  tasks: [
    new Task.Validate({
      schema: {
        type: 'object',
        required: ['id', 'data'],
        properties: {
          id: { type: 'string' },
          data: { type: 'array' }
        }
      },
      onError: 'halt'
    }),

    new Task.Transform({
      operations: [
        { type: 'normalize', field: 'email' },
        { type: 'encrypt', field: 'ssn' },
        { type: 'deduplicate', key: 'id' }
      ]
    }),

    new Task.Store({
      destination: 's3://data-lake/processed',
      format: 'parquet',
      partitionBy: ['year', 'month', 'day']
    }),

    new Task.Notify({
      channels: ['email', 'slack'],
      recipients: ['data-team@company.com'],
      template: 'data-processing-complete'
    })
  ],

  // Error handling
  errorHandling: {
    retryPolicy: {
      maxRetries: 3,
      backoff: 'exponential',
      initialDelay: 1000,
      maxDelay: 30000
    },
    deadLetterQueue: 'failed-workflows'
  },

  // Monitoring
  monitoring: {
    alertOn: ['error', 'timeout', 'slow'],
    metrics: ['duration', 'throughput', 'errorRate'],
    logging: 'verbose'
  }
})

// Register workflow
await rita.workflows.register(dataProcessingWorkflow)
\`\`\`

### Advanced Task Types

**Conditional Branching:**

\`\`\`typescript
new Task.Conditional({
  condition: (context) => context.data.priority === 'high',
  ifTrue: [
    new Task.Process({ mode: 'fast-track' }),
    new Task.Notify({ priority: 'urgent' })
  ],
  ifFalse: [
    new Task.Queue({ priority: 'normal' })
  ]
})
\`\`\`

**Parallel Execution:**

\`\`\`typescript
new Task.Parallel({
  tasks: [
    new Task.CallAPI({ endpoint: '/service-a' }),
    new Task.CallAPI({ endpoint: '/service-b' }),
    new Task.CallAPI({ endpoint: '/service-c' })
  ],
  waitForAll: true,
  timeout: 30000
})
\`\`\`

---

## Security & Compliance

### SOC2 Type II Controls

**Access Control Matrix:**

| Role | Conversations | Messages | Users | Settings | Audit Logs |
|------|--------------|----------|-------|----------|------------|
| Admin | CRUD | CRUD | CRUD | CRUD | Read |
| Manager | CRUD (own) | CRUD (own) | Read | Read | Read (own) |
| User | CRUD (own) | CRUD (own) | Read (self) | Read (self) | - |
| Guest | Read (shared) | Read (shared) | - | - | - |

**Encryption Strategy:**

\`\`\`typescript
// Data at rest encryption
class EncryptionService {
  // AES-256-GCM encryption
  async encrypt(data: Buffer): Promise<EncryptedData> {
    const key = await this.getDataKey()
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

    const encrypted = Buffer.concat([
      cipher.update(data),
      cipher.final()
    ])

    const authTag = cipher.getAuthTag()

    return {
      ciphertext: encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      algorithm: 'AES-256-GCM',
      keyId: key.id
    }
  }

  // Key rotation every 90 days
  async rotateKeys(): Promise<void> {
    const oldKey = await this.getCurrentKey()
    const newKey = await this.generateKey()

    // Re-encrypt data with new key
    await this.reEncryptData(oldKey, newKey)

    // Archive old key (retained for 7 years per SOC2)
    await this.archiveKey(oldKey)
  }
}
\`\`\`

---

## Performance Optimization

### Caching Strategy

**Multi-tier caching:**

\`\`\`typescript
class CacheManager {
  // L1: In-memory cache (Node.js)
  private memoryCache = new Map()

  // L2: Redis distributed cache
  private redisClient: Redis

  // L3: Database with materialized views

  async get(key: string): Promise<any> {
    // Check L1
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key)
    }

    // Check L2
    const cached = await this.redisClient.get(key)
    if (cached) {
      this.memoryCache.set(key, cached)
      return JSON.parse(cached)
    }

    // Fallback to database
    const data = await this.database.query(...)

    // Populate caches
    await this.redisClient.setex(key, 3600, JSON.stringify(data))
    this.memoryCache.set(key, data)

    return data
  }
}
\`\`\`

### Database Optimization

**Query Performance:**

\`\`\`sql
-- Use covering indexes for frequent queries
CREATE INDEX idx_messages_covering
ON messages(conversation_id, created_at DESC)
INCLUDE (role, message);

-- Partition large tables by date
CREATE TABLE messages_2024_01
PARTITION OF messages
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Use materialized views for analytics
CREATE MATERIALIZED VIEW conversation_stats AS
SELECT
  conversation_id,
  COUNT(*) as message_count,
  MAX(created_at) as last_activity,
  COUNT(DISTINCT user_id) as participant_count
FROM messages
GROUP BY conversation_id;

CREATE UNIQUE INDEX ON conversation_stats(conversation_id);
REFRESH MATERIALIZED VIEW CONCURRENTLY conversation_stats;
\`\`\`

---

## Monitoring & Observability

### Metrics Collection

**Key Metrics to Track:**

| Category | Metric | Target | Alert Threshold |
|----------|--------|--------|----------------|
| Latency | API P95 | < 50ms | > 100ms |
| Throughput | Requests/sec | 5,000+ | < 3,000 |
| Error Rate | Failed requests | < 0.1% | > 1% |
| Queue Depth | Pending messages | < 1,000 | > 5,000 |
| Database | Connection pool | < 80% | > 90% |
| Memory | Heap usage | < 70% | > 85% |

### Distributed Tracing

**OpenTelemetry Integration:**

\`\`\`typescript
import { trace, context } from '@opentelemetry/api'

async function processMessage(message: Message) {
  const tracer = trace.getTracer('rita-worker')

  return tracer.startActiveSpan('process-message', async (span) => {
    span.setAttribute('message.id', message.id)
    span.setAttribute('conversation.id', message.conversationId)

    try {
      // Processing logic
      const result = await executeWorkflow(message)

      span.setStatus({ code: SpanStatusCode.OK })
      span.setAttribute('result.size', result.length)

      return result
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      })
      span.recordException(error)
      throw error
    } finally {
      span.end()
    }
  })
}
\`\`\`

---

## Troubleshooting

### Common Issues

#### Issue: Queue Backup

**Symptoms:**
- RabbitMQ queue depth > 10,000
- Increased latency for message delivery
- Worker CPU at 100%

**Root Cause Analysis:**

\`\`\`bash
# Check queue stats
rabbitmqctl list_queues name messages consumers

# Check worker performance
docker stats rita-worker-1 rita-worker-2 rita-worker-3

# Analyze slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
\`\`\`

**Resolution:**
1. Scale up worker pool: \`kubectl scale deployment workers --replicas=10\`
2. Enable message batching to reduce overhead
3. Optimize database queries (add indexes, use connection pooling)
4. Increase worker memory limits if OOM errors present

---

## API Reference

### REST Endpoints

**Message API:**

\`\`\`http
POST /api/messages
Content-Type: application/json
Authorization: Bearer {token}

{
  "conversation_id": "uuid",
  "message": "string",
  "metadata": {
    "sources": [
      {
        "url": "string",
        "title": "string",
        "snippet": "string",
        "blob_id": "string"
      }
    ]
  }
}

Response: 202 Accepted
{
  "message_id": "uuid",
  "status": "processing",
  "estimated_completion": "2024-10-02T19:30:00Z"
}
\`\`\`

**SSE Streaming:**

\`\`\`javascript
const eventSource = new EventSource('/api/sse/events', {
  withCredentials: true
})

eventSource.addEventListener('message.created', (event) => {
  const data = JSON.parse(event.data)
  console.log('New message:', data)
})

eventSource.addEventListener('message.completed', (event) => {
  const data = JSON.parse(event.data)
  console.log('Message completed:', data)
})
\`\`\`

---

## Appendix

### Glossary

- **SSE**: Server-Sent Events - unidirectional real-time communication
- **RabbitMQ**: Message broker for async task distribution
- **Worker Pool**: Horizontally scalable task processors
- **Audit Log**: Immutable record of all system activities
- **Circuit Breaker**: Fault tolerance pattern preventing cascade failures

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2024-10-01 | Major architecture refactor, SSE support |
| 1.5.0 | 2024-07-15 | Added workflow engine, improved monitoring |
| 1.0.0 | 2024-01-15 | Initial production release |

### Further Reading

- [Architecture Decision Records](https://docs.resolve.com/adr)
- [API Changelog](https://docs.resolve.com/changelog)
- [Security Best Practices](https://docs.resolve.com/security)
- [Performance Tuning Guide](https://docs.resolve.com/performance)

---

**Document Version**: 2024.10.1
**Last Updated**: October 2, 2024
**Maintained By**: Resolve Engineering Team
**Contact**: engineering@resolve.com`,
      metadata: {
        title: 'Rita Automation Implementation Guide',
        author: 'Resolve Engineering Team',
        created_at: '2024-01-15',
        updated_at: '2024-10-01'
      }
    }
  ],
  [
    'blob_architecture_patterns_2024',
    {
      blob_id: 'blob_architecture_patterns_2024',
      content_type: 'markdown',
      content: `# Enterprise Automation Patterns

## Executive Summary

This comprehensive study analyzes enterprise automation patterns across **500+ organizations** implementing workflow automation at scale.

## Methodology

### Research Approach

| Phase | Activities | Duration |
|-------|-----------|----------|
| Discovery | Stakeholder interviews | 3 months |
| Analysis | Pattern identification | 2 months |
| Validation | Case studies | 4 months |

## Key Findings

### Pattern Categories

1. **Event-Driven Architecture**
   - Decoupled components
   - Asynchronous processing
   - High scalability
   - Complex debugging

2. **Orchestration vs Choreography**
   - **Orchestration**: Central coordinator
   - **Choreography**: Distributed coordination
   - Trade-offs in complexity and resilience

3. **Error Recovery Strategies**
   - **Retry with backoff**: 87% adoption
   - **Dead letter queues**: 72% adoption
   - **Circuit breakers**: 65% adoption
   - **Compensation transactions**: 43% adoption

## Implementation Statistics

\`\`\`
Technology Adoption (2024):
━━━━━━━━━━━━━━━━━━━━━━━━━━
RabbitMQ:    ████████████████ 45%
Apache Kafka: ███████████████ 42%
AWS SQS:     ████████ 23%
Azure Service Bus: ████ 18%
\`\`\`

### Success Metrics

Companies implementing automation patterns reported:

- ⬆️ **67% increase** in operational efficiency
- ⬇️ **54% reduction** in manual errors
- ⬆️ **89% improvement** in response times
- ⬇️ **41% decrease** in operational costs

## Architectural Patterns

### The Saga Pattern

For distributed transactions:

\`\`\`typescript
class OrderSaga {
  async execute() {
    await reserveInventory()
    await processPayment()
    await scheduleShipping()
  }

  async compensate() {
    await refundPayment()
    await releaseInventory()
  }
}
\`\`\`

### Event Sourcing

Benefits and trade-offs:

| Aspect | Benefit | Trade-off |
|--------|---------|-----------|
| Audit trail | Complete history | Storage costs |
| Time travel | Debug past states | Complexity |
| Replay | Rebuild state | Processing time |

## Security Considerations

### Zero Trust Architecture

- **Verify explicitly**: Authenticate every request
- **Least privilege**: Minimum necessary access
- **Assume breach**: Continuous monitoring

### Encryption Strategy

\`\`\`
Data Protection Layers:
┌────────────────────────┐
│ Application Level      │ ← End-to-end encryption
├────────────────────────┤
│ Transport Level        │ ← TLS 1.3
├────────────────────────┤
│ Storage Level          │ ← AES-256
└────────────────────────┘
\`\`\`

## Conclusion

Enterprise automation requires careful pattern selection based on:

- **Scale requirements**
- **Latency constraints**
- **Consistency needs**
- **Operational complexity tolerance**

The most successful implementations combine multiple patterns adapted to specific use cases rather than applying a one-size-fits-all approach.`,
      metadata: {
        title: 'Enterprise Architecture Patterns',
        author: 'Research Team',
        created_at: '2024-01-20',
        updated_at: '2024-09-15'
      }
    }
  ],
  [
    'blob_security_hardening_2024',
    {
      blob_id: 'blob_security_hardening_2024',
      content_type: 'markdown',
      content: `# Production Security Hardening Guide

## Overview

This guide provides comprehensive security hardening strategies for production systems, covering defense-in-depth approaches, network segmentation, access controls, and encryption best practices.

## Defense-in-Depth Strategy

### Layer 1: Network Security

\`\`\`yaml
firewall_rules:
  ingress:
    - port: 443
      protocol: HTTPS
      source: 0.0.0.0/0

  egress:
    - destination: internal-vpc
      protocol: all

network_segmentation:
  - dmz: public-facing services
  - app_tier: application servers
  - data_tier: databases (no internet access)
\`\`\`

### Layer 2: Access Controls

- **Multi-Factor Authentication (MFA)** required for all users
- **Just-In-Time (JIT) Access** for privileged operations
- **Role-Based Access Control (RBAC)** with principle of least privilege
- **Session management** with automatic timeout after 15 minutes

### Layer 3: Application Security

\`\`\`typescript
// Input validation and sanitization
class SecurityMiddleware {
  validateInput(data: unknown): ValidatedData {
    // Sanitize inputs
    const sanitized = this.sanitizeXSS(data);

    // Validate against schema
    const validated = this.validateSchema(sanitized);

    // Check business rules
    this.enforceBusinessRules(validated);

    return validated;
  }
}
\`\`\`

## Encryption Requirements

### Data at Rest

- **Algorithm**: AES-256-GCM
- **Key Management**: AWS KMS or Azure Key Vault
- **Key Rotation**: Every 90 days
- **Backup Encryption**: Mandatory for all backups

### Data in Transit

- **TLS Version**: 1.3 minimum
- **Certificate Management**: Automated renewal via Let's Encrypt
- **Perfect Forward Secrecy**: Enabled
- **HSTS**: Strict-Transport-Security header enforced

## Monitoring and Alerting

### Security Events

| Event Type | Alert Threshold | Response Time |
|------------|----------------|---------------|
| Failed auth attempts | 5 in 5 minutes | Immediate |
| Privilege escalation | Any occurrence | < 5 minutes |
| Data exfiltration | Unusual volume | < 15 minutes |
| Config changes | Any unauthorized | < 30 minutes |

### Log Retention

- **Security logs**: 7 years
- **Access logs**: 1 year
- **Application logs**: 90 days
- **Debug logs**: 30 days

## Compliance Checklist

- [ ] SOC 2 Type II controls implemented
- [ ] GDPR data processing agreements in place
- [ ] PCI DSS requirements met (if applicable)
- [ ] HIPAA safeguards configured (if applicable)
- [ ] Regular penetration testing scheduled
- [ ] Vulnerability scanning automated
- [ ] Incident response plan documented and tested

## Additional Resources

- NIST Cybersecurity Framework
- OWASP Top 10
- CIS Benchmarks`,
      metadata: {
        title: 'Production Security Hardening Guide',
        author: 'Security Team',
        created_at: '2024-02-01',
        updated_at: '2024-09-30'
      }
    }
  ],
  [
    'blob_monitoring_guide_2024',
    {
      blob_id: 'blob_monitoring_guide_2024',
      content_type: 'markdown',
      content: `# Production Monitoring and Observability

## Introduction

Effective monitoring and observability are critical for maintaining reliable production systems. This guide covers metrics, logging, tracing, and alerting strategies.

## The Three Pillars

### 1. Metrics

Key performance indicators to track:

\`\`\`yaml
application_metrics:
  - request_rate: requests per second
  - error_rate: percentage of failed requests
  - latency_p50: median response time
  - latency_p95: 95th percentile response time
  - latency_p99: 99th percentile response time

infrastructure_metrics:
  - cpu_utilization: percentage
  - memory_utilization: percentage
  - disk_io: operations per second
  - network_throughput: bytes per second
\`\`\`

### 2. Logging

Structured logging best practices:

\`\`\`typescript
logger.info({
  event: 'user_login',
  user_id: userId,
  ip_address: ipAddress,
  timestamp: new Date().toISOString(),
  session_id: sessionId,
  mfa_used: true
});
\`\`\`

### 3. Distributed Tracing

Track requests across services:

- **Trace ID**: Unique identifier for entire request flow
- **Span ID**: Unique identifier for individual service calls
- **Parent Span**: Links spans in call hierarchy
- **Tags**: Additional context (service name, operation, etc.)

## Alerting Strategy

### Alert Severity Levels

| Level | Description | Response |
|-------|-------------|----------|
| P0 - Critical | Service down | Page on-call immediately |
| P1 - High | Degraded performance | Notify within 15 min |
| P2 - Medium | Warning threshold | Notify within 1 hour |
| P3 - Low | Informational | Daily digest |

### Alert Design

Good alerts are:
- **Actionable**: Clear next steps
- **Specific**: Precise problem identification
- **Timely**: Fire before user impact
- **Rare**: Low false positive rate

## Dashboards

### Executive Dashboard
- System health overview
- SLA compliance metrics
- Cost analysis
- User growth trends

### Operations Dashboard
- Real-time service status
- Error rates and types
- Resource utilization
- Deployment history

### Development Dashboard
- Build/test success rates
- Code quality metrics
- Technical debt tracking
- Sprint velocity

## Tools and Technologies

| Category | Tool | Purpose |
|----------|------|---------|
| Metrics | Prometheus + Grafana | Time-series data and visualization |
| Logging | ELK Stack | Centralized log management |
| Tracing | Jaeger or Zipkin | Distributed tracing |
| APM | Datadog or New Relic | Full-stack monitoring |
| Alerting | PagerDuty | Incident management |

## Best Practices

1. **Monitor what matters**: Focus on user-facing metrics
2. **Set realistic thresholds**: Base on historical data
3. **Test alerts**: Regularly verify alert firing and routing
4. **Document runbooks**: Clear instructions for each alert
5. **Review regularly**: Tune alerts based on feedback`,
      metadata: {
        title: 'Production Monitoring and Observability',
        author: 'DevOps Team',
        created_at: '2024-03-01',
        updated_at: '2024-09-25'
      }
    }
  ],
  [
    'blob_wcag_guide_2024',
    {
      blob_id: 'blob_wcag_guide_2024',
      content_type: 'markdown',
      content: `# WCAG 2.1 AA Implementation Guide

## Introduction

Web Content Accessibility Guidelines (WCAG) 2.1 Level AA provides the framework for creating accessible web experiences that work for users with diverse abilities.

## Core Principles (POUR)

| Principle | Description | Key Requirements |
|-----------|-------------|------------------|
| **Perceivable** | Information must be presentable | Alt text, captions, color contrast |
| **Operable** | UI components must be usable | Keyboard navigation, sufficient time |
| **Understandable** | Content must be clear | Readable text, predictable behavior |
| **Robust** | Content works across technologies | Valid markup, compatibility |

## Level AA Requirements

### Visual Requirements

#### Color Contrast

- **Normal text**: Minimum 4.5:1 contrast ratio
- **Large text** (18pt+): Minimum 3:1 contrast ratio
- **UI components**: 3:1 for interactive elements

\`\`\`css
/* Good contrast example */
.text-primary {
  color: #1a1a1a;        /* Near black */
  background: #ffffff;    /* White */
  /* Contrast ratio: 19.56:1 ✅ */
}

.button-primary {
  color: #ffffff;
  background: #0066cc;    /* Blue */
  /* Contrast ratio: 4.55:1 ✅ */
}
\`\`\`

#### Text Resizing

Users must be able to resize text up to **200%** without loss of content or functionality.

### Keyboard Accessibility

#### Focus Management

All interactive elements must be keyboard accessible:

\`\`\`typescript
// Proper focus trap in modal
function Modal({ children, onClose }) {
  const firstFocusable = useRef<HTMLElement>()
  const lastFocusable = useRef<HTMLElement>()

  useEffect(() => {
    firstFocusable.current?.focus()

    const handleTab = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        // Trap focus within modal
        trapFocus(e, firstFocusable, lastFocusable)
      }
    }

    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [])

  return <div role="dialog" aria-modal="true">{children}</div>
}
\`\`\`

## Form Accessibility

### Labels and Instructions

Every form input must have:

1. **Visible label**: \`<label>\` element
2. **Clear purpose**: Descriptive text
3. **Error identification**: Specific error messages
4. **Help text**: Additional guidance when needed

\`\`\`tsx
<div>
  <label htmlFor="email">
    Email Address <span aria-label="required">*</span>
  </label>
  <input
    id="email"
    type="email"
    aria-required="true"
    aria-invalid={hasError}
    aria-describedby="email-error email-help"
  />
  <div id="email-help">We'll never share your email</div>
  {hasError && (
    <div id="email-error" role="alert">
      Please enter a valid email address
    </div>
  )}
</div>
\`\`\`

## Testing Checklist

### Automated Testing

| Tool | Purpose | Coverage |
|------|---------|----------|
| axe-core | Rule-based checking | ~57% WCAG |
| WAVE | Visual feedback | Basic issues |
| Lighthouse | Chrome DevTools | Performance + A11y |

### Manual Testing

- ✅ **Keyboard navigation**: Tab through entire interface
- ✅ **Screen reader**: Test with NVDA/JAWS (Windows) or VoiceOver (Mac)
- ✅ **Color contrast**: Use contrast checker tools
- ✅ **Zoom testing**: Test at 200% zoom
- ✅ **Focus indicators**: Verify visible focus states

## Resources

- **W3C WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/
- **MDN Accessibility**: https://developer.mozilla.org/en-US/docs/Web/Accessibility
- **WebAIM**: https://webaim.org/resources/`,
      metadata: {
        title: 'WCAG 2.1 AA Implementation Guide',
        author: 'Accessibility Team',
        created_at: '2024-04-01',
        updated_at: '2024-09-20'
      }
    }
  ],
  [
    'blob_soc2_guide_2024',
    {
      blob_id: 'blob_soc2_guide_2024',
      content_type: 'markdown',
      content: `# SOC 2 Type II Compliance

## Overview

Service Organization Control (SOC) 2 Type II examines both the **design** and **operational effectiveness** of security controls over time (typically 6-12 months).

## Trust Services Criteria

### Security (Required)

The foundation of SOC 2 compliance:

\`\`\`
Security Control Framework:
┌─────────────────────────────────┐
│ Access Controls                 │
│ ├─ Authentication              │
│ ├─ Authorization               │
│ └─ Least Privilege             │
├─────────────────────────────────┤
│ Change Management               │
│ ├─ Code review process         │
│ ├─ Deployment procedures       │
│ └─ Rollback capabilities       │
├─────────────────────────────────┤
│ Incident Response               │
│ ├─ Detection systems           │
│ ├─ Response procedures         │
│ └─ Post-incident review        │
└─────────────────────────────────┘
\`\`\`

### Additional Criteria (Optional)

| Criterion | Focus Area | Key Controls |
|-----------|------------|--------------|
| **Availability** | System uptime | Monitoring, redundancy, disaster recovery |
| **Processing Integrity** | Data accuracy | Validation, error handling, reconciliation |
| **Confidentiality** | Data protection | Encryption, access controls, DLP |
| **Privacy** | PII handling | Consent management, data rights, retention |

## Implementation Requirements

### Access Control Implementation

\`\`\`typescript
// Multi-factor authentication
class AuthenticationService {
  async authenticate(credentials: Credentials): Promise<AuthToken> {
    // 1. Verify username/password
    const user = await this.verifyCredentials(credentials)

    // 2. Require MFA
    if (!user.mfaVerified) {
      throw new MFARequiredError()
    }

    // 3. Generate session token
    const token = await this.generateToken(user, {
      expiresIn: '8h',
      refreshable: true
    })

    // 4. Audit log
    await this.auditLog.record({
      event: 'user.authenticated',
      userId: user.id,
      timestamp: new Date(),
      ipAddress: credentials.ipAddress,
      userAgent: credentials.userAgent
    })

    return token
  }
}
\`\`\`

### Audit Logging

Comprehensive logging requirements:

| Log Type | Required Fields | Retention |
|----------|----------------|-----------|
| Authentication | User ID, timestamp, IP, result | 1 year |
| Authorization | User, resource, action, result | 1 year |
| Data Access | User, data type, timestamp | 7 years |
| Configuration | Change type, user, before/after | 7 years |
| Security Events | Event type, severity, details | 7 years |

## Monitoring & Alerting

### Incident Response

Response time requirements:

| Severity | Response Time | Resolution Time |
|----------|---------------|-----------------|
| Critical | < 15 minutes | < 4 hours |
| High | < 1 hour | < 24 hours |
| Medium | < 4 hours | < 5 days |
| Low | < 24 hours | < 30 days |

## Certification Timeline

\`\`\`
SOC 2 Type II Timeline:
┌────────────────────────────────────────────┐
│ Months 1-3: Preparation                    │
│ ├─ Gap assessment                          │
│ ├─ Control implementation                  │
│ └─ Documentation                           │
├────────────────────────────────────────────┤
│ Months 4-9: Observation Period             │
│ ├─ Controls operating                      │
│ ├─ Evidence collection                     │
│ └─ Continuous monitoring                   │
├────────────────────────────────────────────┤
│ Months 10-12: Audit                        │
│ ├─ Evidence review                         │
│ ├─ Control testing                         │
│ └─ Report issuance                         │
└────────────────────────────────────────────┘
\`\`\`

Total timeline: **12-18 months** from initiation to report`,
      metadata: {
        title: 'SOC 2 Type II Requirements & Implementation',
        author: 'Compliance Team',
        created_at: '2024-05-01',
        updated_at: '2024-09-15'
      }
    }
  ]
]);

/**
 * Get blob content by ID
 */
export function getBlobContent(blobId: string): BlobContent | null {
  return BLOB_STORAGE.get(blobId) || null;
}

/**
 * Check if blob exists
 */
export function blobExists(blobId: string): boolean {
  return BLOB_STORAGE.has(blobId);
}

/**
 * List all available blob IDs
 */
export function listBlobIds(): string[] {
  return Array.from(BLOB_STORAGE.keys());
}
