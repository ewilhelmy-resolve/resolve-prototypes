# Rita File Upload System - Technical Documentation

## Overview

The Rita file upload system implements a **content-addressable blob storage** architecture with automatic deduplication, enabling efficient storage of files across multiple users and organizations while maintaining per-user metadata.

**Status**: ✅ **FULLY IMPLEMENTED** (Migration from `documents` table to `blobs`/`blob_metadata` completed + Real-time Processing Status Updates via SSE)

**Last Updated**: 2025-10-12

---

## Architecture Summary

### Sequence Diagram: File Upload with Real-Time Processing Status

```mermaid
sequenceDiagram
    actor User
    participant Frontend as Rita Frontend
    participant API as Rita Backend API<br/>(includes Consumer)
    participant DB as Rita Database
    participant Automation as Automation Platform
    participant RabbitMQ

    Note over User,Automation: File Upload Flow

    User->>Frontend: 1. Select & upload file
    Frontend->>API: 2. POST /api/files/upload<br/>(multipart/form-data)

    API->>API: 3. Calculate SHA-256 hash
    API->>DB: 4. SELECT blob_id FROM blobs<br/>WHERE digest = hash

    alt Blob does not exist
        API->>DB: 5a. INSERT INTO blobs (data, digest)
    else Blob exists (deduplication)
        API->>API: 5b. Reuse existing blob_id
    end

    API->>DB: 6. INSERT INTO blob_metadata<br/>(status='processing', ...)
    DB-->>API: 7. Return metadata record

    API->>Automation: 8. Send webhook<br/>{action: "document_uploaded",<br/> blob_metadata_id, document_url, ...}

    API-->>Frontend: 9. {document: {id, status: 'processing', ...}}
    Frontend-->>User: 10. Show "Processing" badge

    Note over Automation,API: Async Document Processing

    Automation->>DB: 11. SELECT data FROM blobs JOIN blob_metadata<br/>(direct database access)
    DB-->>Automation: 12. Return blob data

    Automation->>Automation: 13. Process document<br/>(parse, chunk, embed, vectorize)

    alt Processing Successful
        Automation->>DB: 14a. UPDATE blob_metadata<br/>SET processed_markdown (direct DB access)
        Automation->>RabbitMQ: 14b. Publish to document_processing_status<br/>{status: 'processing_completed'}
    else Processing Failed
        Automation->>RabbitMQ: 14c. Publish to document_processing_status<br/>{status: 'processing_failed',<br/> error_message: "..."}
    end

    RabbitMQ->>API: 15. Consumer receives message
    API->>DB: 16. UPDATE blob_metadata<br/>SET status='processed'|'failed'<br/>(status only, not processed_markdown)
    API->>Frontend: 17. Send SSE event:<br/>document_update

    Frontend-->>User: 18. Update badge to "Processed" or "Failed"<br/>Show toast notification

    Note over User,RabbitMQ: Chat Message Flow

    User->>Frontend: 17. Type message in chat
    Frontend->>API: 18. POST /api/conversations/:id/messages<br/>{content}

    API->>DB: 19. INSERT INTO messages<br/>(role='user', status='pending')
    DB-->>API: 20. Return message record

    API->>DB: 21. SELECT role, message FROM messages<br/>(build transcript)
    DB-->>API: 22. Return conversation history

    API->>Automation: 23. Send webhook<br/>{action: "message_created",<br/> message_id, transcript, ...}
    Automation-->>API: 24. 200 OK

    API->>DB: 25. UPDATE messages SET status='sent'
    API-->>Frontend: 26. {message: {id, status: 'sent', ...}}
    Frontend-->>User: 27. Show message sent

    Note over Automation,Frontend: Async Processing via RabbitMQ

    Automation->>Automation: 28. Generate AI response<br/>(query context + LLM)

    Automation->>RabbitMQ: 29. Publish to chat.responses queue<br/>{message_id, tenant_id,<br/> conversation_id, user_id, response}

    RabbitMQ->>API: 30. Consumer receives message

    API->>DB: 31. UPDATE messages<br/>SET status='completed' (user message)

    API->>DB: 32. INSERT INTO messages<br/>(role='assistant', message=response)
    DB-->>API: 33. Return assistant message record

    API->>Frontend: 34. Send SSE events:<br/>• message_update (completed)<br/>• new_message (assistant)
    Frontend-->>User: 35. Display AI response

    API->>RabbitMQ: 36. ACK message
```

### Core Concept: Content-Addressable Storage

The system separates **content** (raw file data) from **context** (user/org metadata):

```
┌─────────────────┐
│  File Upload    │
└────────┬────────┘
         │
         ├──► Calculate SHA-256 hash
         │
         ├──► Check if blob exists (deduplication)
         │
         ├──► Store blob (if new) OR reuse existing
         │
         └──► Create metadata record (always unique per user/upload)
```

**Key Benefits**:
- **Storage Efficiency**: Identical files stored only once
- **Multi-tenancy**: Same blob can have different metadata per organization/user
- **Data Integrity**: Content-addressable via SHA-256 ensures consistency
- **Scalability**: Separate concerns of data storage vs. contextual metadata

---

## Document Processing Status System

### Overview

The system implements **real-time document processing status updates** via RabbitMQ and Server-Sent Events (SSE), allowing users to track the progress of document processing from upload through completion or failure.

**Status Flow**:
```
processing → processed (success)
          ↘ failed (error)
```

### Architecture Components

####  1. **Initial Upload** (`status='processing'`)
When a document is uploaded, it starts with `status='processing'` rather than `'uploaded'`:

**Location**: `packages/api-server/src/routes/files.ts:117,123`
```sql
INSERT INTO blob_metadata (..., status, ...)
VALUES (..., 'processing', ...)
```

**Rationale**: Processing begins immediately via webhook, so the document is never in a true "uploaded but not processing" state.

#### 2. **RabbitMQ Consumer** (`DocumentProcessingConsumer`)

**Location**: `packages/api-server/src/consumers/DocumentProcessingConsumer.ts`

**Purpose**: Listens to `document_processing_status` queue for status updates from the automation platform.

**Message Format**:
```typescript
// Success
{
  type: 'document_processing',
  blob_metadata_id: 'uuid',
  tenant_id: 'org-uuid',
  user_id: 'user-uuid',  // Optional
  status: 'processing_completed',
  processed_markdown: '# Document\n\nContent...',
  timestamp: '2025-10-12T01:11:55Z'
}

// Failure
{
  type: 'document_processing',
  blob_metadata_id: 'uuid',
  tenant_id: 'org-uuid',
  user_id: 'user-uuid',  // Optional
  status: 'processing_failed',
  error_message: 'Unable to parse PDF: Corrupted file',
  timestamp: '2025-10-12T01:11:55Z'
}
```

**Consumer Logic**:
1. Validates required fields (`blob_metadata_id`, `tenant_id`, `status`)
2. Routes to `handleProcessingCompleted()` or `handleProcessingFailed()`
3. Updates database via `withOrgContext` (multi-tenant isolation)
4. Sends SSE event to frontend
5. ACKs message to RabbitMQ

**Database Updates**:
```sql
-- Success
UPDATE blob_metadata
SET status = 'processed',
    metadata = CASE
      WHEN metadata ? 'error' THEN metadata - 'error'  -- Clear previous errors
      ELSE metadata
    END,
    updated_at = NOW()
WHERE id = $1 AND organization_id = $2;

-- Failure
UPDATE blob_metadata
SET status = 'failed',
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{error}',
      to_jsonb($1::text)
    ),
    updated_at = NOW()
WHERE id = $2 AND organization_id = $3;
```

**Key Features**:
- When processing succeeds after a previous failure, the error is automatically removed from metadata using PostgreSQL JSONB operations (`metadata - 'error'`)
- **Important**: The `processed_markdown` field is updated directly by the external automation system in the database, NOT by the consumer. The consumer only updates the status and clears errors.

#### 3. **SSE Event Broadcasting**

**SSE Event Type**: `document_update`

**Implementation**: Consumer sends SSE events via `getSSEService()`:

```typescript
sseService.sendToUser(userId, tenantId, {
  type: 'document_update',
  data: {
    blob_metadata_id: id,
    filename: filename,
    status: 'processed' | 'failed',
    processed_markdown: markdown,  // Optional
    error_message: error,           // Optional
    timestamp: new Date().toISOString()
  }
});
```

**SSE Type Definition** (`packages/api-server/src/services/sse.ts`):
```typescript
export interface DocumentUpdateEvent {
  type: 'document_update';
  data: {
    blob_metadata_id: string;
    filename: string;
    status: 'processed' | 'failed';
    processed_markdown?: string;
    error_message?: string;
    timestamp: string;
  };
}
```

#### 4. **Frontend SSE Listener**

**Location**: `packages/client/src/contexts/SSEContext.tsx:132-160`

**Handler Logic**:
```typescript
else if (event.type === "document_update") {
  console.log("[SSE] Document update received:", {
    blobMetadataId: event.data.blob_metadata_id,
    filename: event.data.filename,
    status: event.data.status,
  });

  // Invalidate TanStack Query cache to trigger automatic refetch
  queryClient.invalidateQueries({ queryKey: fileKeys.lists() });

  // Show toast notification
  if (event.data.status === "processed") {
    toast.success(`${event.data.filename} processed successfully`, {
      action: { label: "View", onClick: () => navigate("/content") }
    });
  } else if (event.data.status === "failed") {
    toast.error(`${event.data.filename} processing failed`, {
      description: event.data.error_message || "An error occurred",
      action: { label: "View", onClick: () => navigate("/content") }
    });
  }
}
```

**TanStack Query Invalidation**: Automatically refetches the file list, updating UI without manual refresh.

#### 5. **UI Status Indicators**

**Location**: `packages/client/src/components/FilesV1Content.tsx`

**Status Icons**:
```typescript
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'processing': return <Loader className="h-3 w-3 animate-spin" />
    case 'processed': return <CheckCircle className="h-3 w-3" />
    case 'failed': return <AlertCircle className="h-3 w-3" />
    default: return <Check className="h-3 w-3" />
  }
}
```

**Status Badge Variants**:
```typescript
const getStatusVariant = (status: string) => {
  switch (status) {
    case 'processed': return 'default'      // Green
    case 'processing': return 'secondary'   // Blue with spinner
    case 'failed': return 'destructive'     // Red
    default: return 'outline'
  }
}
```

**Stats Cards**: Display counts for each status (processing, processed, failed, all)

#### 6. **Reprocess Functionality**

**Purpose**: Allow users to retry failed document processing or reprocess existing documents.

**Backend Endpoint**: `POST /api/files/:documentId/process`

**Frontend Hook** (`useReprocessFile`):
```typescript
export function useReprocessFile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (documentId: string) => {
      return await fileApi.reprocessDocument(documentId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() })
    },
  })
}
```

**UI Integration**: Context menu with "Reprocess" option available for all statuses.

### Automation Platform Integration

#### Automation Activity Script

**Location**: `platform_scripts/rita_messages/send_document_processing_status/`

**Files**:
- `send_document_processing_status.py` - Python activity script
- `send_document_processing_status.json` - Activity configuration
- `send_document_processing_status.txt` - User documentation
- `test_send_document_processing_status.py` - Test suite

**Usage in RAG Workflows**:
```python
# In document processing automation
try:
    # Process document (parse, chunk, embed, vectorize)
    processed_content = process_document(document_url)

    # Send success status
    send_document_processing_status(
        rabbitmq_url=config.rabbitmq_url,
        queue_name='document_processing_status',
        blob_metadata_id=metadata_id,
        tenant_id=tenant_id,
        user_id=user_id,
        status='processing_completed',
        processed_markdown=processed_content
    )
except Exception as e:
    # Send failure status
    send_document_processing_status(
        rabbitmq_url=config.rabbitmq_url,
        queue_name='document_processing_status',
        blob_metadata_id=metadata_id,
        tenant_id=tenant_id,
        user_id=user_id,
        status='processing_failed',
        error_message=str(e)
    )
```

**Activity Parameters**:
| Parameter | Required | Description |
|-----------|----------|-------------|
| `rabbitmq_url` | Yes | RabbitMQ connection URL |
| `queue_name` | Yes | Queue name (`document_processing_status`) |
| `blob_metadata_id` | Yes | Document UUID |
| `tenant_id` | Yes | Organization UUID |
| `user_id` | No | User UUID (optional) |
| `status` | Yes | `processing_completed` or `processing_failed` |
| `processed_markdown` | No | Extracted markdown (for success) |
| `error_message` | No | Error details (for failure) |

### Mock Service for Testing

**Location**: `packages/mock-service/src/index.ts:1627-1659`

**Behavior**: Simulates document processing with 3-second delay:
1. Receives webhook from Rita
2. Waits 3 seconds (simulated processing time)
3. Publishes `processing_completed` message to RabbitMQ queue
4. Consumer picks up message and updates status

**Message Example**:
```typescript
{
  type: 'document_processing',
  blob_metadata_id: documentPayload.blob_metadata_id,
  tenant_id: documentPayload.tenant_id,
  user_id: documentPayload.user_id,
  status: 'processing_completed',
  processed_markdown: `# Processed Document: ${filename}\n\nMock content...`,
  timestamp: new Date().toISOString()
}
```

### End-to-End Flow

1. **User uploads file** → Status: `processing` (spinner icon)
2. **Rita sends webhook** → External automation platform downloads file
3. **Automation platform processes document** → Parse, chunk, embed, vectorize (3-30 seconds)
4. **Automation platform publishes to queue** → `processing_completed` or `processing_failed`
5. **Consumer updates database** → Status: `processed` or `failed`
6. **Consumer sends SSE event** → `document_update` event
7. **Frontend receives SSE** → Invalidates query cache
8. **TanStack Query refetches** → Automatic UI update
9. **User sees result** → Badge changes to "Processed" ✅ or "Failed" ❌
10. **Toast notification** → Success/error message with "View" action

**Latency**: Typical SSE latency from queue message to frontend update is **< 1 second**.

### Error Handling & Recovery

#### Metadata Error Cleanup

**Problem**: Failed documents store error in `metadata.error`. After reprocessing successfully, the old error should be cleared.

**Solution**: The `handleProcessingCompleted` method automatically removes the `error` key:
```sql
metadata = CASE
  WHEN metadata ? 'error' THEN metadata - 'error'
  ELSE metadata
END
```

#### Reprocess After Failure

Users can click "Reprocess" in the file context menu to:
1. Send document back to automation platform via webhook
2. Update status to `processing`
3. Wait for new status update via RabbitMQ

### Configuration

**Environment Variables**:
```bash
# Backend
DOCUMENT_PROCESSING_QUEUE=document_processing_status

# RAG Service
RITA_RABBITMQ_URL=amqp://username:password@rabbitmq:5672
RITA_DOCUMENT_PROCESSING_QUEUE_NAME=document_processing_status
```

**Queue Configuration**:
- Queue: `document_processing_status`
- Durable: `true` (survives broker restarts)
- Auto-delete: `false` (persists when no consumers)

### Monitoring & Debugging

**Backend Logs** (`DocumentProcessingConsumer`):
```
[info] Received document processing status message
[info] Processing document status update
[info] Document processing completed successfully
[info] SSE event sent
```

**Frontend Logs** (`SSEContext`):
```
[SSE] Document update received: { blobMetadataId, filename, status }
```

**RabbitMQ Management**:
- Monitor queue depth (should be near 0)
- Check message rate (messages/sec)
- View consumer count (should be ≥ 1)

### Performance Considerations

1. **Database Updates**: Uses indexed lookups on `blob_metadata.id` and `organization_id`
2. **SSE Broadcasting**: Sends only to affected user (or organization if no user_id)
3. **Query Invalidation**: TanStack Query only refetches file list when needed
4. **RabbitMQ ACK**: Messages acknowledged only after successful processing

### Testing

**Backend Tests** (`test_send_document_processing_status.py`):
```bash
cd platform_scripts/rita_messages/send_document_processing_status
python3 test_send_document_processing_status.py
```

**Test Coverage**:
- ✅ Successful processing message
- ✅ Failed processing message
- ✅ Missing required field validation
- ✅ Invalid status validation
- ✅ Processing without user_id (system processing)

**Integration Testing**:
1. Upload document → Verify `status='processing'`
2. Wait 3 seconds (mock service)
3. Verify status updates to `'processed'`
4. Verify SSE event received
5. Verify toast notification shown
6. Verify badge updated in UI

---

## Database Schema

### Table 1: `blobs` (Content Storage)

Stores raw, deduplicated binary file content.

```sql
CREATE TABLE blobs (
    blob_id UUID PRIMARY KEY,              -- Changed from SERIAL to UUID (migration 114)
    data BYTEA NOT NULL,                   -- Raw binary content
    digest TEXT UNIQUE NOT NULL            -- SHA-256 hash (deduplication key)
);

CREATE INDEX idx_blobs_digest ON blobs(digest);
```

**Key Properties**:
- `blob_id`: UUID primary key for efficient joins
- `digest`: SHA-256 hash of `data` - enforces uniqueness (deduplication)
- One blob can be referenced by multiple metadata records

### Table 2: `blob_metadata` (Context Storage)

Stores all contextual information about a blob (the "document").

```sql
CREATE TABLE blob_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blob_id UUID NOT NULL REFERENCES blobs(blob_id) ON DELETE CASCADE,

    -- Ownership
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,

    -- File properties
    filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,              -- Size in bytes
    mime_type TEXT NOT NULL,

    -- Processing pipeline
    status TEXT DEFAULT 'uploaded' NOT NULL, -- 'uploaded', 'processing', 'processed', 'failed'
    processed_markdown TEXT,                 -- RAG pipeline output

    -- Flexible metadata storage
    metadata JSONB DEFAULT '{}' NOT NULL,    -- Custom tags, descriptions, etc.

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_blob_metadata_blob_id ON blob_metadata(blob_id);
CREATE INDEX idx_blob_metadata_organization_id ON blob_metadata(organization_id);
CREATE INDEX idx_blob_metadata_user_id ON blob_metadata(user_id);
CREATE INDEX idx_blob_metadata_status ON blob_metadata(status);
CREATE INDEX idx_blob_metadata_created_at ON blob_metadata(created_at);
CREATE INDEX idx_blob_metadata_filename ON blob_metadata(filename);
```

**Key Properties**:
- `id`: UUID primary key representing a unique "document" instance
- `blob_id`: Foreign key to `blobs` table (many-to-one relationship)
- **One blob → Many metadata records** (same file uploaded by different users)
- `metadata` JSONB field stores flexible, unstructured data (e.g., `{ "content": "..." }` for text content)

### Removed: `message_documents` Junction Table

**Previously**: A junction table linked messages to documents (many-to-many relationship).

**Deprecated in migration 121**: The `message_documents` table has been removed. Document associations with messages are now handled by the **automation platform**, not by database junction tables.

**Rationale**:
- Document IDs are passed to the webhook when messages are created
- The external service manages document-message relationships in its own storage
- Eliminates redundant data storage and complexity
- Aligns with microservices architecture (separation of concerns)

---

## API Endpoints

### 1. Upload File - `POST /api/files/upload`

**Implementation**: `packages/api-server/src/routes/files.ts:68`

**Request**:
```typescript
Content-Type: multipart/form-data

{
  file: File,              // Binary file data
  content?: string         // Optional text content (stored in metadata.content)
}
```

**Backend Flow**:
1. Calculate SHA-256 hash of file buffer
2. Begin database transaction
3. Check if blob exists: `SELECT blob_id FROM blobs WHERE digest = $1`
   - If exists: Reuse `blob_id` (deduplication)
   - If not: Insert new blob: `INSERT INTO blobs (data, digest) VALUES ($1, $2)`
4. Insert metadata record: `INSERT INTO blob_metadata (...) VALUES (...)`
5. Commit transaction
6. Send webhook event to external service (document processing)

**Response**:
```json
{
  "document": {
    "id": "uuid",
    "filename": "example.pdf",
    "size": 102400,
    "type": "application/pdf",
    "status": "processing",
    "created_at": "2025-10-12T12:00:00Z"
  }
}
```

**Note**: Status is `'processing'` immediately after upload since RAG processing begins via webhook.

**File Size Limits**:
- Default: 100MB (configurable via `FILE_SIZE_LIMIT_KB` env var)
- Enforced by multer middleware

**Allowed MIME Types**:
- Images: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- Documents: `application/pdf`, `text/plain`, `text/markdown`
- Office: `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Spreadsheets: `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

**Webhook Integration**:
After successful upload, sends webhook to external service:
```typescript
{
  source: 'rita-documents',
  action: 'document_uploaded',
  tenant_id: organizationId,
  user_id: userId,
  user_email: userEmail,
  blob_metadata_id: metadataId,
  blob_id: blobId,
  document_url: downloadUrl,
  file_type: mimeType,
  file_size: sizeBytes,
  original_filename: filename,
  timestamp: ISO8601
}
```

---

### 2. Create Text Content - `POST /api/files/content`

**Implementation**: `packages/api-server/src/routes/files.ts:183`

**Purpose**: Store text content as a blob (enables deduplication for text too)

**Request**:
```json
{
  "content": "Plain text content here...",
  "filename": "my-article.txt",
  "metadata": { "custom": "fields" }  // Optional
}
```

**Backend Flow**:
1. Convert text to Buffer: `Buffer.from(content, 'utf8')`
2. Calculate SHA-256 hash
3. Check if text blob exists (deduplication works for text too!)
4. Insert/reuse blob + create metadata record
5. Store custom metadata in `metadata` JSONB field

**Response**:
```json
{
  "document": {
    "id": "uuid",
    "filename": "my-article.txt",
    "size": 1024,
    "type": "text/plain",
    "status": "processing",
    "created_at": "2025-10-12T12:00:00Z"
  }
}
```

---

### 3. List Documents - `GET /api/files`

**Implementation**: `packages/api-server/src/routes/files.ts:324`

**Query Parameters**:
- `limit` (default: 50)
- `offset` (default: 0)

**Backend Query**:
```sql
SELECT
  bm.id,
  bm.filename as file_name,
  bm.file_size,
  bm.mime_type,
  bm.status,
  bm.metadata,
  bm.created_at,
  bm.updated_at,
  CASE
    WHEN bm.metadata->>'content' IS NOT NULL THEN 'text'
    ELSE 'binary'
  END as content_type
FROM blob_metadata bm
WHERE bm.organization_id = $1 AND bm.user_id = $2
ORDER BY bm.created_at DESC
LIMIT $3 OFFSET $4
```

**Note**: Status filter removed - returns documents in all statuses (`processing`, `processed`, `failed`).

**Response**:
```json
{
  "documents": [
    {
      "id": "uuid-1",
      "file_name": "report.pdf",
      "file_size": 102400,
      "mime_type": "application/pdf",
      "status": "processed",
      "content_type": "binary",
      "metadata": {},
      "created_at": "2025-10-12T12:00:00Z",
      "updated_at": "2025-10-12T12:00:05Z"
    },
    {
      "id": "uuid-2",
      "file_name": "data.xlsx",
      "file_size": 45000,
      "mime_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "status": "processing",
      "content_type": "binary",
      "metadata": {},
      "created_at": "2025-10-12T12:01:00Z",
      "updated_at": "2025-10-12T12:01:00Z"
    },
    {
      "id": "uuid-3",
      "file_name": "corrupted.pdf",
      "file_size": 5000,
      "mime_type": "application/pdf",
      "status": "failed",
      "content_type": "binary",
      "metadata": { "error": "Unable to parse PDF: Corrupted file header" },
      "created_at": "2025-10-12T11:55:00Z",
      "updated_at": "2025-10-12T11:55:03Z"
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

**Note**: Returns documents in all processing statuses. Frontend filters by status using UI dropdowns.

**Content Type Detection**:
- `content_type: 'text'` if `metadata->>'content' IS NOT NULL`
- `content_type: 'binary'` otherwise

---

### 4. Download File - `GET /api/files/:documentId/download`

**Implementation**: `packages/api-server/src/routes/files.ts:271`

**Backend Query**:
```sql
SELECT
  bm.id,
  bm.filename as file_name,
  bm.mime_type,
  b.data as file_content,
  bm.status
FROM blob_metadata bm
JOIN blobs b ON bm.blob_id = b.blob_id
WHERE bm.id = $1 AND bm.organization_id = $2
```

**Note**: Status filter removed - allows downloading documents regardless of processing status.

**Response Headers**:
```
Content-Type: {mime_type}
Content-Disposition: attachment; filename="{filename}"
Content-Length: {size}
```

**Response Body**: Raw binary data from `blobs.data`

---

### 5. Delete Document - `DELETE /api/files/:documentId`

**Implementation**: `packages/api-server/src/routes/files.ts:481`

**Backend Query**:
```sql
DELETE FROM blob_metadata
WHERE id = $1 AND organization_id = $2 AND user_id = $3
RETURNING id
```

**Behavior**:
- Deletes only the metadata record (preserves blob if referenced by others)
- Cascade delete removes from `message_documents` due to foreign key constraint
- Orphaned blobs can be cleaned up via separate maintenance task (future work)

**Response**:
```json
{
  "deleted": true
}
```

---

### 6. Process Document - `POST /api/files/:documentId/process`

**Implementation**: `packages/api-server/src/routes/files.ts:377`

**Purpose**: Trigger document processing webhook (reprocess documents in any status)

**Request**:
```json
{
  "enable_processing": true
}
```

**Backend Flow**:
1. Verify document exists (accepts any status)
2. Send webhook to external service (same payload as upload webhook)
3. Update document status to `processing`

**Note**: This endpoint allows reprocessing documents that failed or need re-indexing.

**Response**:
```json
{
  "success": true,
  "message": "Document sent for processing",
  "document_id": "uuid"
}
```

---

## Frontend Implementation

### Location
- `packages/client/src/hooks/api/useFiles.ts` - TanStack Query hooks
- `packages/client/src/hooks/useFileUpload.ts` - File upload wrapper
- `packages/client/src/services/api.ts` - API client (fileApi)

### React Hooks

#### `useFiles()` - List Documents
```typescript
const { data, isLoading, error } = useFiles()

// data structure:
{
  documents: FileDocument[],
  total: number,
  limit: number,
  offset: number
}
```

#### `useUploadFile()` - Upload File
```typescript
const uploadMutation = useUploadFile()

uploadMutation.mutate(file, {
  onSuccess: (data) => {
    console.log('Uploaded:', data.document)
  },
  onError: (error) => {
    console.error('Upload failed:', error)
  }
})
```

**Features**:
- Automatic query invalidation (refreshes file list on success)
- Handles `multipart/form-data` encoding
- Error handling with custom `ApiError`

#### `useCreateContent()` - Create Text Content
```typescript
const createMutation = useCreateContent()

createMutation.mutate({
  content: 'My text content',
  filename: 'article.txt',
  metadata: { source: 'user-input' }
})
```

#### `useDownloadFile()` - Download File
```typescript
const downloadMutation = useDownloadFile()

downloadMutation.mutate({
  documentId: 'uuid',
  filename: 'example.pdf'
})
```

**Implementation**:
- Fetches blob via download endpoint
- Creates temporary URL with `URL.createObjectURL()`
- Triggers browser download with programmatic `<a>` click
- Cleans up URL object

#### `useDeleteFile()` - Delete File
```typescript
const deleteMutation = useDeleteFile()

deleteMutation.mutate(documentId)
```

### TypeScript Interface

```typescript
export interface FileDocument {
  id: string
  filename: string
  size: number
  type: string                          // mime_type
  status: string                        // 'uploaded', 'processing', 'processed', 'failed'
  content_type?: 'text' | 'binary' | 'unknown'
  metadata?: any
  created_at?: Date
  updated_at?: Date
}
```

### API Client (`fileApi`)

**Location**: `packages/client/src/services/api.ts`

**Methods**:
- `uploadFile(file: File)` - FormData upload
- `createContent(data)` - JSON text content creation
- `downloadFile(documentId)` - Fetch blob as Response
- `listDocuments()` - Paginated list
- `deleteDocument(documentId)` - Delete metadata

**Authentication**:
- Uses cookie-based session authentication
- Automatically refreshes Keycloak JWT if expires in <5s
- Handles 401 responses with auto-logout

---

## Migration History

### Previous Architecture: Single-Table Storage

**Old Schema** (migration 110):
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  organization_id UUID,
  user_id UUID,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  file_content BYTEA,        -- ❌ Duplicated for identical files
  content TEXT,              -- ❌ No deduplication
  document_id UUID,          -- External service reference
  metadata JSONB,
  processed_markdown TEXT,
  status TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Problems**:
- No deduplication (same file uploaded by 10 users = 10x storage)
- Tight coupling of content and metadata
- Difficult to scale storage separately

### New Architecture: Content-Addressable Storage

**Introduced in**:
- Migration 113: Created `blobs` and `blob_metadata` tables
- Migration 114: Changed `blobs.blob_id` from SERIAL to UUID

**Benefits**:
- Storage efficiency via SHA-256 deduplication
- Clean separation of concerns (content vs. context)
- Multi-tenancy support (one blob, many contexts)
- Scalable (can move blobs to object storage like S3 in future)

**Migration Status**:
- ✅ `blobs` table created (migration 113)
- ✅ `blob_metadata` table created (migration 113)
- ✅ `blob_id` changed from SERIAL to UUID (migration 114)
- ✅ Backend API fully migrated to new schema
- ✅ Frontend hooks compatible (no changes needed)
- ✅ Old `documents` table removed (migration 121)
- ✅ `message_documents` junction table removed (migration 121)

---

## Future Enhancements

### 1. Orphaned Blob Cleanup

**Problem**: Deleting metadata leaves blobs if no other references exist

**Solution**: Background job to clean up orphaned blobs
```sql
DELETE FROM blobs
WHERE blob_id NOT IN (SELECT DISTINCT blob_id FROM blob_metadata);
```

**Considerations**:
- Run during off-peak hours
- Add safety check (only delete blobs older than X days)
- Monitor storage savings

### 2. External Blob Storage (S3/R2)

**Current**: Blobs stored in PostgreSQL `BYTEA` column
**Future**: Move to object storage for scalability

**Implementation**:
- Keep `blobs` table structure
- Store S3 key in `digest` field OR add new `storage_location` column
- `data` field becomes nullable (external storage indicator)
- API downloads fetch from S3 instead of database

**Benefits**:
- Reduced database size
- Better performance for large files
- Cost optimization (object storage cheaper than DB storage)

### 3. File Processing Pipeline Integration

**Status**: ✅ **IMPLEMENTED** (See "Document Processing Status System" section)

**Features**:
- ✅ Real-time status tracking via RabbitMQ + SSE
- ✅ Database updates (`status`, `processed_markdown`, `metadata.error`)
- ✅ Automatic error cleanup on successful reprocessing
- ✅ Manual reprocess functionality for failed documents
- ✅ UI indicators with animated status badges
- ✅ Toast notifications with navigation actions

**Future Enhancements**:
- [ ] Automatic retry logic for transient failures
- [ ] Processing timeout detection (mark as failed if >5min)
- [ ] Processing progress percentage (0-100%)
- [ ] Batch reprocessing for multiple documents

### 4. Deduplication Metrics Dashboard

**Track**:
- Total storage saved via deduplication
- Most common duplicate files
- Deduplication rate percentage

**Implementation**:
```sql
SELECT
  b.digest,
  COUNT(bm.id) as reference_count,
  bm.file_size,
  (COUNT(bm.id) - 1) * bm.file_size as storage_saved
FROM blobs b
JOIN blob_metadata bm ON b.blob_id = bm.blob_id
GROUP BY b.digest, bm.file_size
HAVING COUNT(bm.id) > 1
ORDER BY storage_saved DESC;
```

---

## Testing Checklist

### Backend API Tests

- [x] Upload same file twice → Only one blob created, two metadata records
- [x] Different users upload same file → Shared blob, separate metadata
- [x] File listing returns correct per-user metadata
- [x] File download retrieves correct blob data
- [x] File deletion removes only metadata, preserves blob if referenced
- [x] Large file handling (near size limit)
- [x] Concurrent uploads (race condition handling)
- [x] Invalid MIME type rejection
- [x] File size limit enforcement
- [x] Text content deduplication

### Frontend Tests

- [ ] File upload with drag-and-drop
- [ ] File upload with file selector
- [ ] Upload progress indication
- [ ] Error handling (size limit, network error, 401)
- [ ] File list pagination
- [ ] File download triggers browser download
- [ ] File deletion with confirmation
- [ ] Query invalidation after upload/delete

### Integration Tests

- [x] Upload → Webhook sent → Processing status update
- [x] Upload → List → Download → Verify data integrity
- [x] Multi-user upload of same file → Verify deduplication
- [x] Delete last reference → Blob becomes orphaned (future cleanup)

---

## Environment Variables

**Backend** (`packages/api-server/.env`):
- `FILE_SIZE_LIMIT_KB` - Max file size in KB (default: 102400 = 100MB)
- `AUTOMATION_WEBHOOK_URL` - External webhook endpoint for document processing
- `AUTOMATION_AUTH` - Authorization header for webhook requests
- `APP_URL` - Base URL for generating download links in webhooks

**Frontend** (`packages/client/.env`):
- `VITE_API_URL` - API base URL (e.g., `http://localhost:8000`)

---

## Security Considerations

### Authentication & Authorization

- All endpoints require authentication via cookie-based session
- Organization isolation via `organization_id` checks in queries
- User isolation via `user_id` checks in queries
- Download endpoint verifies ownership before returning blob data

### File Validation

- MIME type whitelist enforcement
- File size limits to prevent DoS
- SHA-256 integrity verification

### Data Privacy

- Blobs deduplicated globally, but metadata is per-user/org
- Deleting metadata doesn't expose blob to other users
- Download URLs require authentication (no public links)

### SQL Injection Prevention

- Parameterized queries (`$1`, `$2`, etc.)
- No string concatenation in SQL

---

## Performance Optimization

### Database Indexes

All critical foreign keys and query columns are indexed:
- `blobs.digest` - Fast deduplication lookups
- `blob_metadata.blob_id` - Fast joins
- `blob_metadata.organization_id` - Multi-tenancy isolation
- `blob_metadata.user_id` - User filtering
- `blob_metadata.status` - Status-based queries
- `blob_metadata.created_at` - Sorting/pagination

### Query Optimization

**List Documents**:
- Uses indexed columns in WHERE clause
- LIMIT/OFFSET pagination to avoid loading all records
- Separate COUNT query for total (efficient)

**Download**:
- Single JOIN query to fetch blob + metadata
- Indexed lookup on `blob_metadata.id`

**Upload**:
- Transaction ensures atomicity
- Digest lookup uses unique index (fast)

### Frontend Caching

- TanStack Query cache (5-minute stale time)
- Automatic cache invalidation on mutations
- Optimistic updates for better UX (future)

---

## Error Handling

### Backend Error Responses

**400 Bad Request**:
```json
{ "error": "No file provided" }
{ "error": "File type not allowed" }
{ "error": "File size exceeds 100MB limit" }
```

**404 Not Found**:
```json
{ "error": "Document not found" }
```

**500 Internal Server Error**:
```json
{ "error": "Failed to upload file" }
{ "error": "Failed to download file" }
```

### Frontend Error Handling

**Upload Errors**:
- File too large → Show user-friendly message with limit
- Network error → Display retry button
- 401 Unauthorized → Auto-logout and redirect to login

**Download Errors**:
- 404 → "File no longer available"
- Network error → "Download failed, please retry"

---

## Monitoring & Observability

### Logging

**Backend Logs**:
```typescript
console.log('[WebhookService] Sending event:', { source, action, tenant_id })
console.error('[WebhookService] Attempt failed:', { status, message, isRetryable })
console.log('[WebhookService] Webhook failure stored in database')
```

**Key Events to Monitor**:
- File upload success/failure
- Webhook delivery success/failure
- Deduplication hits (reused blob)
- Large file uploads (>10MB)

### Metrics to Track

1. **Storage Metrics**:
   - Total blob storage used
   - Storage saved via deduplication
   - Average file size
   - Largest files

2. **Usage Metrics**:
   - Files uploaded per day/week/month
   - Downloads per day
   - Deduplication rate (% of uploads that reused existing blobs)

3. **Performance Metrics**:
   - Upload latency (p50, p95, p99)
   - Download latency
   - Database query times

4. **Error Metrics**:
   - Upload failure rate
   - Webhook failure rate
   - File type rejection rate

---

## References

### Documentation
- **Migration Plan**: `docs/blobbifier-migration-plan.md` (outdated, superseded by this doc)
- **Processing Status Plan**: `docs/document-processing-status-implementation.md` - Implementation plan for status system

### Database Migrations
- `110_replace_file_storage.sql` - Old documents table schema
- `113_add_content_addressable_storage.sql` - New blobs/blob_metadata tables
- `114_change_blobs_id_to_uuid.sql` - UUID migration

### Backend Implementation
- **File Routes**: `packages/api-server/src/routes/files.ts` - Upload, download, list, delete, process endpoints
- **Document Consumer**: `packages/api-server/src/consumers/DocumentProcessingConsumer.ts` - RabbitMQ consumer for status updates
- **SSE Service**: `packages/api-server/src/services/sse.ts` - Server-Sent Events broadcasting
- **SSE Types**: Document update event types (processing status)
- **Webhook Service**: `packages/api-server/src/services/WebhookService.ts` - External service integration

### Frontend Implementation
- **Hooks**: `packages/client/src/hooks/api/useFiles.ts` - TanStack Query hooks (upload, download, reprocess)
- **SSE Context**: `packages/client/src/contexts/SSEContext.tsx` - SSE connection & event handling
- **UI Component**: `packages/client/src/components/FilesV1Content.tsx` - Status badges, filters, reprocess
- **API Client**: `packages/client/src/services/api.ts` - File API methods

### External Service Integration
- **Activity Script**: `platform_scripts/rita_messages/send_document_processing_status/` - Python automation activities
  - `send_document_processing_status.py` - Main activity
  - `send_document_processing_status.json` - Configuration
  - `send_document_processing_status.txt` - Documentation
  - `test_send_document_processing_status.py` - Test suite

### Testing
- **Mock Service**: `packages/mock-service/src/index.ts:1627-1659` - Simulates document processing with 3s delay
- **Activity Tests**: All 5 tests passing (success, failure, validation)
