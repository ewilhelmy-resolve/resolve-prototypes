# Blobbifier Migration Plan: Content-Addressable File Storage

## Overview

This document outlines the migration from the current single-table file storage system to a new content-addressable blob storage system with deduplication capabilities.

## Current Architecture

### Existing Schema
```sql
-- Single table storing files with binary data
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  file_content BYTEA,  -- Raw binary data stored per document
  content TEXT,        -- Text content alternative
  status TEXT DEFAULT 'uploaded',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Current API Flow
1. **Upload**: `POST /api/files/upload` → Insert directly into `documents` table
2. **List**: `GET /api/files` → Query `documents` table
3. **Download**: `GET /api/files/:id/download` → Fetch `file_content` from `documents`
4. **Delete**: `DELETE /api/files/:id` → Remove record from `documents`

### Current Frontend Implementation
- `FileDocument` interface with `id`, `filename`, `size`, `type`, `status`
- TanStack Query hooks: `useFiles()`, `useUploadFile()`, `useDownloadFile()`
- FilesPage with drag-and-drop upload UI

## New Architecture: Content-Addressable Storage

### New Schema (Already Created)
```sql
-- Deduplicated blob storage table
CREATE TABLE blobs (
    blob_id SERIAL PRIMARY KEY,
    data BYTEA NOT NULL,           -- Raw binary data (stored once)
    digest TEXT UNIQUE NOT NULL   -- SHA-256 hash for deduplication
);

-- Metadata table linking to blobs
CREATE TABLE blob_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blob_id INTEGER NOT NULL REFERENCES blobs(blob_id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID NOT NULL,
    filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    status TEXT DEFAULT 'uploaded',
    processed_markdown TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Benefits
1. **Storage Efficiency**: Identical files stored only once via SHA-256 deduplication
2. **Multi-tenancy**: Same blob can have different metadata per organization/user
3. **Scalability**: Separate concerns of data storage vs. contextual metadata
4. **Integrity**: Content-addressable storage ensures data consistency

## Migration Strategy

### Phase 1: Backend API Updates ✅ (Current Task)

#### Changes Required:

**1. File Upload Endpoint (`POST /api/files/upload`)**
```typescript
// New flow:
1. Calculate SHA-256 hash of uploaded file
2. Check if blob exists by digest
3. If not exists: Insert into `blobs` table
4. Insert metadata into `blob_metadata` table
5. Return same response format (maintain API contract)
```

**2. File List Endpoint (`GET /api/files`)**
```sql
-- New query joins blob_metadata with organizations
SELECT
  bm.id,
  bm.filename,
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
```

**3. File Download Endpoint (`GET /api/files/:id/download`)**
```sql
-- New query joins to get blob data
SELECT bm.filename, bm.mime_type, b.data
FROM blob_metadata bm
JOIN blobs b ON bm.blob_id = b.blob_id
WHERE bm.id = $1 AND bm.organization_id = $2
```

**4. File Delete Endpoint (`DELETE /api/files/:id`)**
```sql
-- Delete only metadata (blob may be referenced by others)
DELETE FROM blob_metadata
WHERE id = $1 AND organization_id = $2 AND user_id = $3
-- Note: Orphaned blobs can be cleaned up via separate maintenance task
```

### Phase 2: Frontend Updates (If Needed)

**Expected Impact**: ⚠️ **MINIMAL** - API contracts remain the same

The frontend should continue working without changes because:
- Response formats are maintained
- HTTP endpoints remain the same
- `FileDocument` interface fields are preserved
- Error handling patterns unchanged

**Potential Updates**:
- Enhanced error messages for deduplication feedback
- Optional: Show storage efficiency metrics
- Optional: Handle new metadata fields if exposed

### Phase 3: Testing & Validation

**Test Cases**:
1. **Upload same file twice** → Verify deduplication (only one blob record)
2. **Different users upload same file** → Separate metadata, shared blob
3. **File listing** → Correct metadata returned per user/org
4. **File download** → Correct blob data retrieved
5. **File deletion** → Only metadata removed, blob preserved if referenced
6. **Large file handling** → Performance comparison vs old system
7. **Concurrent uploads** → Race condition handling for blob creation

### Phase 4: Migration of Existing Data (Future)

```sql
-- Migration script to move existing documents to new schema
INSERT INTO blobs (data, digest)
SELECT file_content, encode(sha256(file_content), 'hex')
FROM documents
WHERE file_content IS NOT NULL
ON CONFLICT (digest) DO NOTHING;

INSERT INTO blob_metadata (blob_id, organization_id, user_id, filename, file_size, mime_type, status, metadata)
SELECT b.blob_id, d.organization_id, d.user_id, d.file_name, d.file_size, d.mime_type, d.status,
       json_build_object('content', d.content)
FROM documents d
JOIN blobs b ON b.digest = encode(sha256(d.file_content), 'hex')
WHERE d.file_content IS NOT NULL;
```

## Implementation Plan

### Step 1: Update Backend File Routes ✅ (In Progress)
- [ ] Modify upload endpoint with hash calculation and deduplication logic
- [ ] Update list endpoint to query blob_metadata with proper joins
- [ ] Update download endpoint to join with blobs table
- [ ] Update delete endpoint to remove only metadata
- [ ] Add proper transaction handling for atomic operations

### Step 2: Update Content Creation Endpoint
- [ ] Modify text content creation to use new schema
- [ ] Handle text content storage in metadata JSONB field

### Step 3: Test Backend Changes
- [ ] Unit tests for deduplication logic
- [ ] Integration tests for all file operations
- [ ] Performance testing with concurrent uploads

### Step 4: Frontend Verification
- [ ] Verify existing frontend works without changes
- [ ] Test drag-and-drop upload functionality
- [ ] Test file listing and download features
- [ ] Validate error handling remains functional

### Step 5: Deploy & Monitor
- [ ] Deploy backend changes
- [ ] Monitor for any API contract breaks
- [ ] Verify storage efficiency gains
- [ ] Check for any performance impacts

## Risk Mitigation

**Risk**: API contract changes breaking frontend
**Mitigation**: Maintain exact response formats, add comprehensive tests

**Risk**: Race conditions during blob creation
**Mitigation**: Use database transactions and proper error handling

**Risk**: Performance degradation from joins
**Mitigation**: Add proper indexes, benchmark before/after

**Risk**: Existing data becomes inaccessible
**Mitigation**: Implement gradual migration, maintain backward compatibility

## Success Metrics

1. **Storage Efficiency**: Measure reduction in total storage usage
2. **Performance**: Upload/download times remain comparable
3. **Reliability**: Zero data loss during migration
4. **API Compatibility**: Frontend continues working without changes
5. **Deduplication Rate**: Track percentage of duplicate files avoided

## Rollback Plan

If issues arise:
1. Revert API endpoints to use `documents` table
2. Keep new blob tables for future retry
3. Monitor for any data inconsistencies
4. Plan improved migration approach

---

**Current Status**: 🟡 Backend API updates in progress
**Next Action**: Implement upload endpoint with deduplication logic
**Timeline**: Backend changes (2-3 days), Testing (1-2 days), Deployment (1 day)