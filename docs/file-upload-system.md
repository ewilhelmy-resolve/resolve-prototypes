# Rita File Upload System - Technical Documentation

## Overview

The Rita file upload system implements a **content-addressable blob storage** architecture with automatic deduplication, enabling efficient storage of files across multiple users and organizations while maintaining per-user metadata.

**Status**: ✅ **FULLY IMPLEMENTED** (Migration from `documents` table to `blobs`/`blob_metadata` completed)

**Last Updated**: 2025-10-10

---

## Architecture Summary

### Sequence Diagram: File Upload and Message Flow

```mermaid
sequenceDiagram
    actor User
    participant Frontend as Rita Frontend
    participant API as Rita Backend API
    participant DB as Rita Database
    participant RAG as External RAG Service
    participant RabbitMQ

    Note over User,RAG: File Upload Flow

    User->>Frontend: 1. Select & upload file
    Frontend->>API: 2. POST /api/files/upload<br/>(multipart/form-data)

    API->>API: 3. Calculate SHA-256 hash
    API->>DB: 4. SELECT blob_id FROM blobs<br/>WHERE digest = hash

    alt Blob does not exist
        API->>DB: 5a. INSERT INTO blobs (data, digest)
    else Blob exists (deduplication)
        API->>API: 5b. Reuse existing blob_id
    end

    API->>DB: 6. INSERT INTO blob_metadata<br/>(blob_id, organization_id, user_id, filename, ...)
    DB-->>API: 7. Return metadata record

    API->>RAG: 8. Send webhook<br/>{action: "document_uploaded",<br/> blob_metadata_id, document_url, ...}

    RAG->>API: 9. GET /api/files/:id/download
    API->>DB: 10. SELECT data FROM blobs<br/>JOIN blob_metadata
    DB-->>API: 11. Return blob data
    API-->>RAG: 12. Binary file content

    RAG->>RAG: 13. Process document<br/>(parse, chunk, embed)
    RAG-->>API: 14. 200 OK

    API-->>Frontend: 15. {document: {id, filename, size, ...}}
    Frontend-->>User: 16. Show upload success

    Note over User,RabbitMQ: Chat Message Flow

    User->>Frontend: 17. Type message in chat
    Frontend->>API: 18. POST /api/conversations/:id/messages<br/>{content}

    API->>DB: 19. INSERT INTO messages<br/>(role='user', status='pending')
    DB-->>API: 20. Return message record

    API->>DB: 21. SELECT role, message FROM messages<br/>(build transcript)
    DB-->>API: 22. Return conversation history

    API->>RAG: 23. Send webhook<br/>{action: "message_created",<br/> message_id, transcript, ...}
    RAG-->>API: 24. 200 OK

    API->>DB: 25. UPDATE messages SET status='sent'
    API-->>Frontend: 26. {message: {id, status: 'sent', ...}}
    Frontend-->>User: 27. Show message sent

    Note over RAG,Frontend: Async Processing via RabbitMQ

    RAG->>RAG: 28. Generate AI response<br/>(query context + LLM)

    RAG->>RabbitMQ: 29. Publish to chat.responses queue<br/>{message_id, tenant_id,<br/> conversation_id, user_id, response}

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

**Deprecated in migration 121**: The `message_documents` table has been removed. Document associations with messages are now handled by the **external RAG service**, not by database junction tables.

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
    "status": "uploaded",
    "created_at": "2025-10-10T12:00:00Z"
  }
}
```

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
    "status": "uploaded",
    "created_at": "2025-10-10T12:00:00Z"
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
WHERE bm.organization_id = $1 AND bm.user_id = $2 AND bm.status = 'uploaded'
ORDER BY bm.created_at DESC
LIMIT $3 OFFSET $4
```

**Response**:
```json
{
  "documents": [
    {
      "id": "uuid",
      "file_name": "example.pdf",
      "file_size": 102400,
      "mime_type": "application/pdf",
      "status": "uploaded",
      "content_type": "binary",
      "metadata": {},
      "created_at": "2025-10-10T12:00:00Z",
      "updated_at": "2025-10-10T12:00:00Z"
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

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
WHERE bm.id = $1 AND bm.organization_id = $2 AND bm.status = 'uploaded'
```

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

**Purpose**: Trigger document processing webhook (e.g., RAG pipeline)

**Request**:
```json
{
  "enable_processing": true
}
```

**Backend Flow**:
1. Verify document exists and is in `uploaded` status
2. Send webhook to external service (same payload as upload webhook)
3. Update document status to `processing`

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

**Current**: Webhook sends event, external service processes
**Future**: Track processing status and results

**Enhancements**:
- Update `blob_metadata.status` based on SSE events from external service
- Store processed results in `processed_markdown` field
- Add retry logic for failed processing
- Display processing status in UI

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

- **Migration Plan**: `docs/blobbifier-migration-plan.md` (outdated, superseded by this doc)
- **Database Migrations**:
  - `110_replace_file_storage.sql` - Old documents table schema
  - `113_add_content_addressable_storage.sql` - New blobs/blob_metadata tables
  - `114_change_blobs_id_to_uuid.sql` - UUID migration
- **Backend Implementation**: `packages/api-server/src/routes/files.ts`
- **Frontend Implementation**: `packages/client/src/hooks/api/useFiles.ts`
- **Webhook Service**: `packages/api-server/src/services/WebhookService.ts`
