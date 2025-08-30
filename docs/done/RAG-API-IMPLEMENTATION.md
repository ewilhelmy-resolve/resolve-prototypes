# RAG API Implementation - Knowledge Embeddings & Tenant Isolation

## Overview

This document describes the RAG (Retrieval-Augmented Generation) API implementation for managing knowledge articles with vector embeddings and strict tenant-level isolation. The system enables external systems (particularly the Actions platform) to ingest knowledge articles, vectorize them, and perform similarity searches while ensuring complete data isolation between tenants.

## Architecture

### Components

1. **Knowledge API Router** (`/src/routes/knowledge.js`)
   - Handles knowledge article ingestion
   - Manages vectorization callbacks
   - Provides embedding-based search
   - Enforces tenant isolation

2. **RAG API Router** (`/src/routes/ragApi.js`)
   - General document ingestion
   - Chat functionality with RAG
   - Vector storage and retrieval

3. **Database Schema** (PostgreSQL with pgvector)
   - `rag_documents` - Stores raw document content
   - `rag_vectors` - Stores vector embeddings
   - `rag_tenant_tokens` - Authentication tokens for callbacks
   - Tenant isolation via `tenant_id` column in all tables

## API Endpoints

### Knowledge Management Endpoints

#### 1. Ingest Knowledge Articles
```
POST /api/tenant/:tenantId/knowledge
```

**Purpose**: Ingest knowledge articles from external systems (Actions platform)

**Headers**:
```json
{
  "Authorization": "Bearer {sessionToken}",
  "Content-Type": "application/json"
}
```

**Request Body**:
```json
{
  "articles": [
    {
      "title": "Article Title",
      "content": "Article content text...",
      "category": "technical",
      "tags": ["api", "documentation"],
      "source": "actions-platform",
      "metadata": {}
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "tenant_id": "tenant-uuid",
  "articles": [
    {
      "article_id": "uuid",
      "callback_id": "callback-token",
      "title": "Article Title",
      "status": "accepted"
    }
  ],
  "total": 1,
  "accepted": 1,
  "skipped": 0
}
```

**Tenant Isolation**: 
- Validates `tenantId` in URL matches authenticated tenant
- All articles stored with tenant_id
- Maximum article size: 100KB

#### 2. Search Knowledge with Embeddings
```
POST /api/tenant/:tenantId/knowledge/search-embedding
```

**Purpose**: Search knowledge base using vector embeddings

**Headers**:
```json
{
  "Content-Type": "application/json",
  "X-Callback-Token": "{token}" // For external systems
}
```

**Request Body**:
```json
{
  "query_embedding": [/* 1536-dimensional vector */],
  "limit": 10,
  "threshold": 0.7,
  "category": "technical",
  "tags": ["api", "documentation"]
}
```

**Response**:
```json
{
  "success": true,
  "tenant_id": "tenant-uuid",
  "documents": [
    {
      "document_id": "uuid",
      "title": "Article Title",
      "category": "technical",
      "tags": ["api"],
      "chunks": [
        {
          "chunk_text": "Relevant text...",
          "chunk_index": 0,
          "similarity": 0.89
        }
      ],
      "max_similarity": 0.89
    }
  ],
  "total_documents": 1,
  "total_chunks": 3
}
```

**Tenant Isolation**:
- Only searches within tenant's documents
- Joins on tenant_id for both documents and vectors
- No cross-tenant data leakage

#### 3. Vectorization Callback
```
POST /api/tenant/:tenantId/knowledge/callback/:callback_id
```

**Purpose**: Receive vectorized embeddings from Actions platform

**Headers**:
```json
{
  "Content-Type": "application/json",
  "X-Callback-Token": "{token}"
}
```

**Request Body**:
```json
{
  "document_id": "uuid",
  "vectors": [
    {
      "chunk_text": "Text chunk",
      "embedding": [/* 1536-dimensional vector */],
      "chunk_index": 0,
      "metadata": {}
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "tenant_id": "tenant-uuid",
  "document_id": "uuid",
  "vectors_stored": 3,
  "total_vectors": 3
}
```

#### 4. List Knowledge Articles
```
GET /api/tenant/:tenantId/knowledge
```

**Purpose**: Retrieve list of knowledge articles for a tenant

**Query Parameters**:
- `limit` - Number of articles (default: 20)
- `offset` - Pagination offset (default: 0)
- `category` - Filter by category
- `status` - Filter by status (pending/vectorized)

**Response**:
```json
{
  "success": true,
  "tenant_id": "tenant-uuid",
  "articles": [
    {
      "article_id": "uuid",
      "title": "Article Title",
      "category": "technical",
      "tags": ["api"],
      "status": "vectorized",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 45,
    "has_more": true
  }
}
```

#### 5. Delete Knowledge Article
```
DELETE /api/tenant/:tenantId/knowledge/:articleId
```

**Purpose**: Delete a knowledge article and its vectors

**Response**:
```json
{
  "success": true,
  "message": "Knowledge article deleted successfully",
  "article_id": "uuid",
  "tenant_id": "tenant-uuid"
}
```

**Cascade Behavior**:
- Deletes all associated vectors
- Removes document from rag_documents
- Maintains referential integrity

## Security & Tenant Isolation


### Authentication & Token Usage

1. **User Authentication (Bearer Token)**
  - Users log in via an authentication endpoint (e.g., `/api/auth/login`) using username and password.
  - The system returns a Bearer token (`access_token`) and the user's associated `tenant_id`.
  - All API requests requiring user authentication must include:
    - `Authorization: Bearer {access_token}`
    - The correct `tenant_id` in the URL path.

2. **Tenant Token (Callback Token)**
  - For system-to-system or callback operations (e.g., Actions platform vectorization callbacks), a tenant token is issued and stored in `rag_tenant_tokens`.
  - These requests must include:
    - `X-Callback-Token: {tenant_token}`
    - The correct `tenant_id` in the URL path.

**Important:**
- The Bearer token and tenant token are not interchangeable. The Bearer token authenticates users; the tenant token authorizes system-level actions for a specific tenant.
- Both tokens may be required for some flows, but each serves a distinct purpose.

### Tenant Isolation Mechanisms

1. **URL-based Tenant ID**
   - All endpoints include `/tenant/:tenantId/` in path
   - Validates against authenticated tenant

2. **Database-level Isolation**
   - All queries filtered by `tenant_id`
   - No shared data between tenants
   - Foreign keys maintain tenant boundaries

3. **Vector Search Isolation**
   ```sql
   SELECT * FROM rag_vectors v
   JOIN rag_documents d ON v.document_id = d.document_id
   WHERE v.tenant_id = $1 AND d.tenant_id = $1
   ```

## Integration Flow


### Complete Knowledge Ingestion & Authentication Flow

1. **User Login & Token Acquisition**
  - User or test automation calls `/api/auth/login` with username and password.
  - System returns a Bearer token and the user's `tenant_id`.
  - For system integrations, a tenant token may also be issued for callback operations.

2. **Article Submission**
  - Actions platform or user calls `/api/tenant/{tenantId}/knowledge`.
  - Request must include `Authorization: Bearer {access_token}` and correct `tenant_id` in the path.
  - System stores article and generates `callback_id` for async processing.

3. **Vectorization (External)**
  - Actions platform processes content, generates embeddings (1536 dimensions), and chunks large content.

4. **Vector Storage (Callback)**
  - Actions platform calls `/api/tenant/{tenantId}/knowledge/callback/{callback_id}`.
  - Request must include `X-Callback-Token: {tenant_token}` and correct `tenant_id` in the path.
  - System validates callback and stores vectors, updating document status to 'vectorized'.

5. **Search & Retrieval**
  - External systems or users call `/api/tenant/{tenantId}/knowledge/search-embedding`.
  - Request must include valid authentication (Bearer token or tenant token as appropriate).
  - System performs cosine similarity search and returns only tenant-specific results.

## Testing

### Test Coverage

1. **Tenant Isolation Tests** (`tests/rag-embeddings.spec.js`)
   - Multiple tenants with different content
   - Verify no cross-tenant data access
   - Test search isolation

2. **Vectorization Tests** (`tests/rag-vectorization.spec.js`)
   - Document chunking
   - Vector storage and retrieval
   - Similarity search accuracy

3. **Integration Tests**
   - End-to-end ingestion flow
   - Callback processing
   - Search with filters

### Running Tests

```bash
# Run all RAG-related tests
npm test -- rag

# Run specific test file
npx playwright test tests/rag-embeddings.spec.js

# Run with UI mode for debugging
npm run test:ui
```

## Configuration

### Environment Variables

```env
# Vector dimensions (OpenAI compatible)
VECTOR_DIMENSION=1536

# Document size limits
MAX_DOCUMENT_SIZE=51200  # 50KB for documents
MAX_KNOWLEDGE_SIZE=102400  # 100KB for knowledge articles

# Database
DATABASE_URL=postgresql://user:pass@localhost/db

# Application URL for callbacks
APP_URL=http://localhost:5000
```

### Database Requirements

- PostgreSQL 12+ with pgvector extension
- Indexes on tenant_id for performance
- IVFFlat index for vector similarity search

## Performance Considerations

1. **Vector Indexing**
   - Uses IVFFlat for approximate nearest neighbor search
   - Optimal for datasets > 1M vectors
   - Trade-off between speed and accuracy

2. **Chunking Strategy**
   - Chunk size affects search relevance
   - Overlap between chunks improves context
   - Metadata preserves document structure

3. **Rate Limiting**
   - Applied to ingestion endpoints
   - Prevents abuse and ensures fair usage
   - Configurable per tenant

## Error Handling

### Common Error Responses

```json
{
  "error": "Tenant ID mismatch",
  "status": 403
}

{
  "error": "Invalid embedding dimension. Expected 1536, got 768",
  "status": 400
}

{
  "error": "Document exceeds 100KB limit",
  "skipped": true
}
```

## Migration Guide

### From Existing RAG Implementation

1. Update ingestion calls to use `/api/tenant/{tenantId}/knowledge`
2. Include tenant_id in all API calls
3. Update embedding dimension to 1536 if different
4. Implement callback handling for async vectorization

## Support & Troubleshooting

### Common Issues

1. **Vectors not storing**
   - Check embedding dimension (must be 1536)
   - Verify callback token is valid
   - Ensure pgvector extension is installed

2. **Search returns no results**
   - Verify tenant_id is correct
   - Check threshold value (lower = more results)
   - Ensure documents are vectorized

3. **Tenant isolation concerns**
   - All queries include tenant_id filter
   - Database constraints prevent cross-tenant access
   - Regular security audits recommended