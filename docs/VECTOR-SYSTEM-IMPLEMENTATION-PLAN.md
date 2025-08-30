# Vector System Implementation Plan - Document Store & Viewer

## Executive Summary

This document outlines the implementation plan for the Resolve Onboarding platform as a **document store and viewer** that integrates with the Actions platform for document processing and vectorization. The system receives documents from customers via the manage button, sends them to Actions platform for processing, and receives back both markdown content and vector embeddings for storage and retrieval.

## System Architecture

### Core Components

1. **Document Storage Layer**
   - PostgreSQL for document metadata and processed content
   - Binary storage for original documents
   - Markdown storage for processed content from Actions platform
   - Vector storage (pgvector) for embeddings from Actions platform

2. **Document Processing Flow**
   - Customer uploads document via manage button
   - System sends document to Actions platform via webhook
   - Actions platform processes and returns:
     - Full document as markdown
     - Vectorized chunks with embeddings
   - System stores both for viewing and search

3. **API Gateway**
   - Document retrieval endpoints
   - Vector search endpoints
   - Callback endpoints for Actions platform
   - Document viewer endpoints

## Database Schema

### Current Database System
The system uses PostgreSQL with the pgvector extension for vector storage. All migrations are designed to be **idempotent** using PostgreSQL's `IF NOT EXISTS` and `ON CONFLICT` clauses.

### Migration Files (Idempotent)
1. **`01-init.sql`** - Base schema initialization
2. **`02-add_system_config.sql`** - System configuration table
3. **`03-migrate-to-vectors.sql`** - pgvector extension and type migration
4. **`04-fix-admin-metrics-constraint.sql`** - Admin metrics fixes
5. **`05-add-document-upload-columns.sql`** - Document upload support

### Existing Tables (from `/src/database/01-init.sql`)

#### `rag_documents` (Existing - Lines 165-176)
```sql
CREATE TABLE IF NOT EXISTS rag_documents (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    document_id UUID DEFAULT gen_random_uuid(),
    callback_id VARCHAR(64) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Added by migration 05-add-document-upload-columns.sql:
    file_data BYTEA,                    -- Raw binary document
    file_type VARCHAR(50),               -- File extension
    file_size INTEGER,                   -- Size in bytes
    original_filename VARCHAR(255),      -- Original name
    callback_token VARCHAR(64),          -- Auth token for callbacks
    token_expires_at TIMESTAMP,          -- Token expiry
    processed_markdown TEXT              -- Markdown from Actions platform
);
```

#### `rag_vectors` (Existing - Lines 179-188)
```sql
CREATE TABLE IF NOT EXISTS rag_vectors (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    document_id UUID NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding vector(1536) NOT NULL,     -- OpenAI-compatible vectors
    chunk_index INTEGER,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `rag_tenant_tokens` (Existing - Lines 156-162)
```sql
CREATE TABLE IF NOT EXISTS rag_tenant_tokens (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL UNIQUE,
    callback_token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `system_config` (From `02-add_system_config.sql`)
```sql
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default values (idempotent with ON CONFLICT DO NOTHING)
INSERT INTO system_config (key, value, description)
VALUES 
    ('app_url', 'http://localhost:5000', 'Base URL for the application callbacks'),
    ('webhook_enabled', 'true', 'Enable/disable webhook functionality'),
    ('max_document_size', '51200', 'Maximum document size for RAG in bytes'),
    ('vector_dimension', '1536', 'Vector dimension for embeddings')
ON CONFLICT (key) DO NOTHING;
```

### Existing Indexes (Idempotent)
```sql
-- From 01-init.sql (Lines 229-235)
CREATE INDEX IF NOT EXISTS idx_rag_docs_tenant ON rag_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rag_docs_callback ON rag_documents(callback_id);
CREATE INDEX IF NOT EXISTS idx_rag_vectors_tenant ON rag_vectors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rag_vectors_doc ON rag_vectors(document_id);

-- Vector similarity index (IVFFlat for large datasets)
CREATE INDEX IF NOT EXISTS idx_vectors_embedding ON rag_vectors 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- From 05-add-document-upload-columns.sql
CREATE INDEX IF NOT EXISTS idx_rag_docs_callback_token ON rag_documents(callback_token);
CREATE INDEX IF NOT EXISTS idx_rag_docs_token_expires ON rag_documents(token_expires_at) 
WHERE token_expires_at IS NOT NULL;
```

### New Tables Required

#### `vector_search_logs` (New - Proposed)
```sql
-- Idempotent creation
CREATE TABLE IF NOT EXISTS vector_search_logs (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    search_id UUID DEFAULT gen_random_uuid(),
    query_vector vector(1536),
    result_count INTEGER,
    threshold FLOAT,
    execution_time_ms INTEGER,
    filters_applied JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Idempotent index creation
CREATE INDEX IF NOT EXISTS idx_search_logs_tenant ON vector_search_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_created ON vector_search_logs(created_at DESC);
```

### Migration Strategy (Idempotent Patterns)
All migrations follow these idempotent patterns:
1. **Table Creation**: `CREATE TABLE IF NOT EXISTS`
2. **Column Addition**: `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
3. **Index Creation**: `CREATE INDEX IF NOT EXISTS`
4. **Data Insertion**: `INSERT ... ON CONFLICT DO NOTHING`
5. **Extension Creation**: `CREATE EXTENSION IF NOT EXISTS`
6. **Conditional Logic**: Using `DO $$ BEGIN ... END $$` blocks for complex checks

## API Endpoints

### 1. Document Processing Webhook (Outgoing to Actions Platform)

**EXISTING IMPLEMENTATION LOCATION:**
- **Webhook Handler**: `/src/utils/resolve-webhook.js` (lines 109-123) - `sendDocumentProcessingEvent` method
- **Called From**: `/src/routes/ragApi.js` (lines 102-112) - Document upload endpoint
- **Retry Logic**: `/src/routes/ragApi.js` (lines 126-141) - Webhook failure handling
- **Worker Process**: `/src/workers/webhookRetry.js` (line 25) - Automated retry worker

When a customer clicks the manage button and uploads a document, the system sends this webhook to the Actions platform:

#### Current Webhook Payload to Actions Platform
```json
{
  "source": "onboarding",
  "action": "document-processing",
  "document_id": "uuid",
  "document_url": "https://platform.com/api/documents/{document_id}",
  "callback_url": "https://platform.com/api/rag/document-callback/{document_id}",
  "callback_token": "secure-token",
  "file_type": "pdf",
  "file_size": 1024000,
  "original_filename": "user-guide.pdf"
}
```

#### Required Updates to Webhook Payload
The existing webhook needs to be updated to include separate callback URLs for markdown and vector processing:

```json
{
  "source": "onboarding",
  "action": "document-processing",
  "tenant_id": "uuid",  // Add tenant_id to payload
  "document_id": "uuid",
  "document_url": "https://platform.com/api/documents/{document_id}",
  "markdown_callback_url": "https://platform.com/api/rag/document-callback/{document_id}",  // New
  "vector_callback_url": "https://platform.com/api/rag/callback/{callback_id}",  // Existing endpoint
  "callback_token": "secure-token",
  "file_type": "pdf",
  "file_size": 1024000,
  "original_filename": "user-guide.pdf"
  // Note: Processing options (chunk_size, overlap, etc.) are determined by the Actions platform
}
```

### 2. Document Callback Endpoints (Receiving from Actions Platform)

#### POST `/api/rag/document-callback/:document_id` (EXISTING)
**Purpose**: Receive processed markdown content from Actions platform  
**Location**: `/src/routes/ragApi.js` (lines 518-597)

**Headers**:
```
Authorization: Bearer {callback_token}
Content-Type: application/json
```

**Current Implementation Expects**:
```json
{
  "tenant_id": "uuid",
  "markdown": "# Full Document Content\n\nProcessed markdown..."
}
```

**Response**:
```json
{
  "success": true,
  "message": "Document processed successfully"
}
```

#### POST `/api/rag/callback/:callback_id` (EXISTING)
**Purpose**: Receive vectorized chunks from Actions platform  
**Location**: `/src/routes/ragApi.js` (lines 285-349)

**Headers**:
```
X-Callback-Token: {token}
Content-Type: application/json
```

**Current Implementation Expects**:
```json
{
  "document_id": "uuid",
  "tenant_id": "uuid",
  "vectors": [
    {
      "chunk_text": "This is the actual text chunk...",
      "embedding": [/* 1536 floats */],
      "chunk_index": 0,
      "metadata": {}  // Optional, stored as JSONB
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "vectors_stored": 10  // Number of vectors successfully stored
}
```

### 3. Document Viewing Endpoints

#### GET `/api/tenant/:tenantId/documents/:documentId/markdown`
**Purpose**: Retrieve processed markdown for viewing

**Response**:
```json
{
  "document_id": "uuid",
  "markdown_content": "# Full processed content...",
  "processed_at": "2024-01-01T00:00:00Z"
}
```

### 4. Vector Search Endpoints

#### POST `/api/rag/vector-search` (EXISTING)
**Purpose**: Semantic similarity search for LLM-generated embeddings
**Location**: `/src/routes/ragApi.js` (lines 352-410)

**Use Case**: 
- Customer asks: "What is my password reset policy?"
- Actions platform's LLM converts this to a query embedding
- This endpoint finds the most relevant document chunks from the knowledge base

**Request from Actions Platform**:
```json
{
  "query_embedding": [/* 1536 floats from GPT/LLM */],
  "tenant_id": "uuid",
  "limit": 5,        // Optional, default: 5 - number of chunks to return
  "threshold": 0.7   // Optional, default: 0.7 - minimum similarity score
}
```

**Response to Actions Platform**:
```json
{
  "results": [
    {
      "document_id": "uuid",
      "chunk_text": "Password reset policy: Users can reset their password by clicking the 'Forgot Password' link. A reset token will be sent to their registered email address, valid for 24 hours...",
      "chunk_index": 0,
      "similarity": 0.92,  // How closely this matches the query
      "metadata": {}       // Any additional context stored with the chunk
    }
  ]
}
```

### 5. Document Management Endpoints

#### GET `/api/tenant/:tenantId/vectors/stats`
**Purpose**: Get vector storage statistics

**Response**:
```json
{
  "tenant_id": "uuid",
  "total_documents": 150,
  "total_vectors": 5000,
  "average_vectors_per_document": 33,
  "storage_size_mb": 125,
  "index_status": "optimal",
  "last_indexed": "2024-01-01T00:00:00Z"
}
```

#### DELETE `/api/tenant/:tenantId/vectors/document/:documentId`
**Purpose**: Remove all vectors for a specific document

**Response**:
```json
{
  "success": true,
  "document_id": "uuid",
  "vectors_deleted": 45,
  "space_freed_mb": 1.2
}
```


## Security & Authentication

### Multi-Layer Authentication

1. **User Authentication (Bearer Token)**
   - Required for user-initiated operations
   - Validates tenant ownership
   - Session-based expiration

2. **Callback Authentication (X-Callback-Token)**
   - Required for Actions platform callbacks
   - Time-limited tokens (1 hour TTL)
   - Single-use tokens for sensitive operations


### Tenant Isolation

- All vector operations scoped to tenant_id
- Database-level row security policies
- No cross-tenant vector similarity searches
- Audit logging for all vector operations

## Performance Optimization

### Indexing Strategy

**IVFFlat Index**
- Suitable for current scale
- Balanced speed/accuracy tradeoff
- Lists parameter: sqrt(total_vectors)

## Monitoring & Observability

### Key Metrics

1. **Performance Metrics**
   - Vector search latency (p50, p95, p99)
   - Index scan efficiency
   - Storage growth rate

2. **Business Metrics**
   - Vectors per tenant
   - Search queries per hour
   - Most searched documents
   - Vector dimension distribution

### Logging Strategy

```json
{
  "event": "vector_search",
  "tenant_id": "uuid",
  "search_id": "uuid",
  "result_count": 10,
  "execution_time_ms": 45,
  "filters": ["category"],
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Implementation Phases

### Phase 1: Core Document Processing Integration (Week 1)
- [ ] Update document processing webhook to include both callback URLs
- [ ] Implement markdown callback endpoint
- [ ] Implement vector callback endpoint
- [ ] Update database schema for markdown storage
- [ ] Test end-to-end flow with Actions platform

### Phase 2: Document Storage & Retrieval (Week 2)
- [ ] Implement document viewer endpoints
- [ ] Add markdown rendering support
- [ ] Create document listing with status tracking
- [ ] Add document metadata management
- [ ] Implement retry mechanism for failed callbacks

### Phase 3: Vector Search Implementation (Week 3)
- [ ] Implement basic vector similarity search
- [ ] Add search result enhancement with markdown context
- [ ] Implement search filters (document, metadata)
- [ ] Add search logging and analytics
- [ ] Optimize vector indexes for performance

### Phase 4: User Interface Integration (Week 4)
- [ ] Integrate with manage button workflow
- [ ] Add document status indicators
- [ ] Implement document viewer UI
- [ ] Add search interface
- [ ] Create analytics dashboard

## Testing Strategy

### Unit Tests
- Vector dimension validation
- Tenant isolation verification
- Similarity calculation accuracy
- Callback token validation

### Integration Tests
- End-to-end vector pipeline
- Basic vector operations
- Search result accuracy

### Note: POC Scope
This is a proof-of-concept system with a single user from the automation platform. Performance and security testing at scale are not required for the current implementation.

## Error Handling

### Common Error Scenarios

1. **Invalid Vector Dimension**
```json
{
  "error": "INVALID_DIMENSION",
  "message": "Expected 1536 dimensions, received 768",
  "document_id": "uuid",
  "chunk_index": 5
}
```

2. **Storage Quota Exceeded**
```json
{
  "error": "QUOTA_EXCEEDED", 
  "message": "Tenant vector storage limit reached",
  "current_usage_mb": 1000,
  "limit_mb": 1000
}
```

3. **Search Timeout**
```json
{
  "error": "SEARCH_TIMEOUT",
  "message": "Vector search exceeded 30s timeout",
  "partial_results": true,
  "results_returned": 5
}
```

## Migration Considerations

### From Existing System
1. Batch migrate existing vectors
2. Maintain backward compatibility
3. Parallel run for validation
4. Gradual traffic migration

### Data Migration Script
```sql
-- Migrate existing vectors to new schema
INSERT INTO rag_vectors_v2 (tenant_id, document_id, embedding, chunk_text, metadata)
SELECT tenant_id, document_id, embedding, chunk_text, metadata 
FROM rag_vectors
WHERE status = 'active'
ON CONFLICT DO NOTHING;
```

## Deployment Configuration

### Environment Variables
```env
# Document Processing
MAX_DOCUMENT_SIZE_MB=100
SUPPORTED_FILE_TYPES=pdf,doc,docx,ppt,pptx,xls,xlsx,txt,md,html

# Vector Configuration
VECTOR_DIMENSION=1536
VECTOR_INDEX_TYPE=ivfflat
VECTOR_INDEX_LISTS=100
VECTOR_SEARCH_TIMEOUT_MS=30000

# Storage Limits
MAX_VECTORS_PER_DOCUMENT=1000
MAX_MARKDOWN_SIZE_MB=10
MAX_DOCUMENTS_PER_TENANT=10000

# Callback Configuration
CALLBACK_TOKEN_TTL_HOURS=1
CALLBACK_RETRY_ATTEMPTS=3
CALLBACK_RETRY_DELAY_MS=60000

# Actions Platform Integration
ACTIONS_PLATFORM_URL=https://actions.platform.com
ACTIONS_PLATFORM_API_KEY={encrypted}
ACTIONS_WEBHOOK_TIMEOUT_MS=30000

# Application URLs
APP_URL=https://platform.resolve.com
API_BASE_URL=https://platform.resolve.com/api
```

## Success Metrics

### Technical KPIs
- Document processing success rate > 95%
- Callback processing time < 5s
- Vector search latency < 100ms (p95)
- Markdown retrieval time < 500ms
- API availability > 99.9%

### Business KPIs
- Documents processed per day
- Average document processing time
- Search queries per tenant
- Document viewer engagement rate
- Customer satisfaction with search results

## Support & Maintenance

### Regular Maintenance Tasks
1. Weekly index optimization
2. Monthly storage cleanup
3. Quarterly performance review
4. Annual capacity planning

### Troubleshooting Guide
1. Slow vector searches → Check index fragmentation
2. High memory usage → Review database configuration
3. Storage growth → Check for duplicate documents
4. Poor search results → Validate embedding quality

## Appendix

### A. Document Processing Flow Diagram
```
Customer Upload → Onboarding Platform → Actions Platform
                        ↓                      ↓
                  Store Original        Process Document
                        ↓                      ↓
                  Generate Webhook     Extract Text & Generate Vectors
                        ↓                      ↓
                  Send to Actions      Return Markdown & Vectors
                        ↓                      ↓
                  Await Callbacks  ←   Send to Callback URLs
                        ↓
                  Store Markdown & Vectors
                        ↓
                  Update Document Status
                        ↓
                  Enable Viewing & Search
```

### B. Supported File Types
- **Documents**: PDF, DOC, DOCX, RTF, TXT, MD
- **Presentations**: PPT, PPTX, ODP
- **Spreadsheets**: XLS, XLSX, CSV, ODS
- **Web**: HTML, HTM, XML, JSON
- **Images** (with OCR): JPG, PNG, GIF, TIFF, BMP
- **Other**: EPUB, ODT, EML, MSG

### C. Webhook Retry Strategy
1. Initial attempt: Immediate
2. First retry: After 1 minute
3. Second retry: After 5 minutes
4. Third retry: After 15 minutes
5. Mark as failed after 3 retries

### D. Document Status Lifecycle
1. `uploaded` - Document received from customer
2. `processing` - Sent to Actions platform
3. `markdown_received` - Markdown callback completed
4. `vectors_received` - Vector callback completed
5. `completed` - Both callbacks successful
6. `failed` - Processing failed after retries

### E. Reference Implementation
- Webhook handler: `/src/utils/resolve-webhook.js`
- Document API: `/src/routes/documentApi.js`
- RAG API: `/src/routes/ragApi.js`
- Database schema: `/src/database/01-init.sql`
- Tests: `/tests/rag-*.spec.js`