# Knowledge Base Article Deletion Feature

## Feature Overview

Implement complete document deletion workflow for knowledge base articles, including database cleanup and webhook notification to Barista (platform RAG service).

## Requirements

### Functional Requirements

1. **Delete from blob metadata table** - Remove article metadata entry
2. **Trigger Barista webhook** - Notify platform with "document_deleted" action
3. **Webhook payload** must include:
   - `blob_id` - The content-addressable blob identifier
   - `article_id` - The metadata ID (temporary field name for compatibility)
   - `tenant_id` - The organization identifier
4. **Smart blob cleanup** - Only delete blob if no other metadata references it
5. **Immediate UI response** - Follow upload pattern (non-blocking webhook)

### Non-Functional Requirements

- **Atomic operations** - Use database transactions
- **Error handling** - Log webhook failures without blocking deletion
- **Reference counting** - Prevent orphaned blob deletion when shared
- **Audit trail** - Webhook failures logged to `rag_webhook_failures` table

## Current State Analysis

### Existing DELETE Endpoint
**Location**: `packages/api-server/src/routes/files.ts:481`

**Current Implementation**:
```typescript
router.delete('/:documentId', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { documentId } = req.params;

    const result = await withOrgContext(
      authReq.user.id,
      authReq.user.activeOrganizationId,
      async (client) => {
        // Delete only metadata record (preserve blob for other references)
        const deleteResult = await client.query(
          'DELETE FROM blob_metadata WHERE id = $1 AND organization_id = $2 AND user_id = $3 RETURNING id',
          [documentId, authReq.user.activeOrganizationId, authReq.user.id]
        );

        return deleteResult.rows.length > 0;
      }
    );

    if (!result) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ deleted: true });

  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});
```

**Missing**:
- ❌ No webhook call to Barista
- ❌ No blob cleanup logic (blobs orphaned over time)
- ❌ No transaction safety for multi-step operation
- ❌ No metadata captured before deletion (blob_id lost)

### Existing Webhook Service
**Location**: `packages/api-server/src/services/WebhookService.ts:64`

**Current Methods**:
- `sendMessageEvent()` - For chat messages (action: "message_created")
- `sendDocumentEvent()` - For uploads (action: "document_uploaded")
- `sendGenericEvent()` - For arbitrary events

**Pattern to Follow**:
```typescript
async sendDocumentEvent(params: {
  organizationId: string;
  userId: string;
  userEmail: string;
  blobMetadataId: string;
  blobId: string;
  documentUrl: string;
  fileType: string;
  fileSize: number;
  originalFilename: string;
}): Promise<WebhookResponse>
```

## Implementation Plan

### Step 1: Add Webhook Payload Type
**File**: `packages/api-server/src/types/webhook.ts`

**Add new interface**:
```typescript
export interface DocumentDeletePayload extends BaseWebhookPayload {
  source: 'rita-documents';
  action: 'document_deleted';
  blob_metadata_id: string; // article_id (temporary name for compatibility)
  blob_id: string;           // blobs.blob_id
}
```

**Update union type**:
```typescript
export type WebhookPayload =
  | MessageWebhookPayload
  | DocumentProcessingPayload
  | DocumentDeletePayload  // <-- Add this
  | (BaseWebhookPayload & Record<string, any>);
```

### Step 2: Add WebhookService Method
**File**: `packages/api-server/src/services/WebhookService.ts`

**Add method after `sendDocumentEvent()`**:
```typescript
/**
 * Send document deletion webhook event
 */
async sendDocumentDeleteEvent(params: {
  organizationId: string;
  userId: string;
  userEmail: string;
  blobMetadataId: string;
  blobId: string;
}): Promise<WebhookResponse> {
  const payload: DocumentDeletePayload = {
    source: 'rita-documents',
    action: 'document_deleted',
    user_email: params.userEmail,
    user_id: params.userId,
    tenant_id: params.organizationId,
    blob_metadata_id: params.blobMetadataId,
    blob_id: params.blobId,
    timestamp: new Date().toISOString()
  };

  return this.sendEvent(payload);
}
```

### Step 3: Enhance DELETE Endpoint
**File**: `packages/api-server/src/routes/files.ts:481`

**Replace entire endpoint with**:
```typescript
// Delete document with webhook notification and smart blob cleanup
router.delete('/:documentId', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { documentId } = req.params;

    const result = await withOrgContext(
      authReq.user.id,
      authReq.user.activeOrganizationId,
      async (client) => {
        // Begin transaction for atomic deletion
        await client.query('BEGIN');

        try {
          // 1. Fetch metadata BEFORE deletion (need blob_id for webhook)
          const metadataResult = await client.query(
            'SELECT id, blob_id, filename, organization_id FROM blob_metadata WHERE id = $1 AND organization_id = $2 AND user_id = $3',
            [documentId, authReq.user.activeOrganizationId, authReq.user.id]
          );

          if (metadataResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return null; // Not found
          }

          const metadata = metadataResult.rows[0];
          const blobId = metadata.blob_id;

          // 2. Delete metadata record
          await client.query(
            'DELETE FROM blob_metadata WHERE id = $1',
            [documentId]
          );

          // 3. Check if blob is still referenced by other metadata
          const blobRefCount = await client.query(
            'SELECT COUNT(*) as count FROM blob_metadata WHERE blob_id = $1',
            [blobId]
          );

          const refCount = parseInt(blobRefCount.rows[0].count, 10);

          // 4. Delete blob only if no other references exist
          if (refCount === 0) {
            await client.query(
              'DELETE FROM blobs WHERE blob_id = $1',
              [blobId]
            );
            console.log(`[FileDelete] Deleted orphaned blob ${blobId}`);
          } else {
            console.log(`[FileDelete] Preserved blob ${blobId} (${refCount} references remaining)`);
          }

          await client.query('COMMIT');
          return metadata;

        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      }
    );

    if (!result) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // 5. Send deletion webhook (non-blocking - don't wait for response)
    webhookService.sendDocumentDeleteEvent({
      organizationId: authReq.user.activeOrganizationId,
      userId: authReq.user.id,
      userEmail: authReq.user.email,
      blobMetadataId: result.id.toString(),
      blobId: result.blob_id.toString()
    }).catch(webhookError => {
      console.error('[FileDelete] Webhook failed for deleted document:', webhookError);
      // Webhook failure doesn't affect deletion success
    });

    // 6. Return immediate success to frontend
    res.json({
      deleted: true,
      document_id: result.id,
      blob_id: result.blob_id
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});
```

## Database Schema Reference

### blob_metadata Table
```sql
CREATE TABLE blob_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blob_id INTEGER NOT NULL REFERENCES blobs(blob_id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    status TEXT DEFAULT 'processing',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### blobs Table
```sql
CREATE TABLE blobs (
    blob_id SERIAL PRIMARY KEY,
    data BYTEA NOT NULL,
    digest TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Key Insight**:
- Multiple `blob_metadata` entries can reference the same `blob_id` (deduplication)
- Deleting metadata should NOT automatically delete blob if other metadata references it
- Foreign key has `ON DELETE CASCADE`, but we want smarter cleanup logic

## Testing Plan

### Test Case 1: Delete Single-Referenced Document
**Setup**: Upload unique document (not a duplicate)
**Action**: Delete the document
**Expected**:
- ✅ Metadata deleted from `blob_metadata`
- ✅ Blob deleted from `blobs` (ref count = 0)
- ✅ Webhook sent with correct payload
- ✅ Frontend receives immediate success response

**Validation**:
```sql
-- Should return 0 rows
SELECT * FROM blob_metadata WHERE id = '<document_id>';
SELECT * FROM blobs WHERE blob_id = '<blob_id>';
```

### Test Case 2: Delete Shared-Blob Document
**Setup**:
1. Upload document A
2. Upload identical document B (same content → same blob_id)
**Action**: Delete document A
**Expected**:
- ✅ Metadata A deleted from `blob_metadata`
- ✅ Blob preserved in `blobs` (ref count = 1, document B still references it)
- ✅ Webhook sent for document A deletion
- ✅ Frontend receives immediate success response

**Validation**:
```sql
-- Should return 0 rows (A deleted)
SELECT * FROM blob_metadata WHERE id = '<document_a_id>';

-- Should return 1 row (B still exists)
SELECT * FROM blob_metadata WHERE id = '<document_b_id>';

-- Should return 1 row (blob preserved)
SELECT * FROM blobs WHERE blob_id = '<shared_blob_id>';
```

### Test Case 3: Webhook Payload Verification
**Setup**: Upload and delete a document
**Action**: Inspect webhook payload sent to Barista
**Expected Payload**:
```json
{
  "source": "rita-documents",
  "action": "document_deleted",
  "user_email": "user@example.com",
  "user_id": "uuid-user-id",
  "tenant_id": "uuid-organization-id",
  "blob_metadata_id": "uuid-metadata-id",
  "blob_id": "123",
  "timestamp": "2025-10-14T10:30:00.000Z"
}
```

**Validation**:
- Check `rag_webhook_failures` table for any logged failures
- Monitor webhook service logs for success confirmation

### Test Case 4: Transaction Rollback on Error
**Setup**: Mock database error during blob deletion
**Action**: Attempt to delete document
**Expected**:
- ✅ Transaction rolled back
- ✅ Metadata NOT deleted (remains in database)
- ✅ Blob NOT deleted
- ✅ Frontend receives 500 error response

### Test Case 5: Webhook Failure Handling
**Setup**: Configure invalid webhook URL or kill webhook service
**Action**: Delete a document
**Expected**:
- ✅ Metadata deleted successfully
- ✅ Blob deleted (if orphaned)
- ✅ Frontend receives immediate success (deletion not blocked)
- ✅ Webhook failure logged to console and `rag_webhook_failures` table
- ✅ No error response to frontend

## Task Status

### Backend Implementation
- [x] Add `DocumentDeletePayload` interface to `webhook.ts`
- [x] Update `WebhookPayload` union type
- [x] Add `sendDocumentDeleteEvent()` method to `WebhookService.ts`
- [x] Replace DELETE endpoint in `files.ts` with enhanced version
- [ ] Test metadata-only deletion (single reference)
- [ ] Test smart blob cleanup (multiple references)
- [ ] Test webhook delivery to Barista
- [ ] Test transaction rollback on errors

### Frontend Integration (Future)
- [ ] Wire up delete button in knowledge base UI
- [ ] Add confirmation dialog before deletion
- [ ] Show toast notification on success/failure
- [ ] Invalidate TanStack Query cache after deletion
- [ ] Add optimistic UI update (immediate removal from list)
- [ ] Handle error states gracefully

### Documentation
- [x] Create implementation plan document
- [x] Document webhook payload structure
- [ ] Update API documentation with DELETE endpoint changes
- [ ] Add troubleshooting guide for webhook failures

## Security Considerations

1. **Authorization**: Endpoint validates `user_id` and `organization_id` before deletion
2. **Audit Trail**: Webhook failures logged to `rag_webhook_failures` for compliance
3. **Transaction Safety**: ROLLBACK on errors prevents partial state
4. **Reference Integrity**: Smart cleanup prevents accidental data loss

## Performance Considerations

1. **Non-Blocking Webhook**: Immediate response to frontend, webhook runs asynchronously
2. **Reference Counting**: Single COUNT query to check blob references
3. **Transaction Scope**: Minimal transaction duration (fetch, delete, count, delete)
4. **Index Requirements**: Ensure `blob_metadata.blob_id` has index for fast counting

## Rollout Strategy

### Phase 1: Backend Implementation (Current)
- Implement all backend changes
- Test with Postman/curl
- Verify webhook delivery to Barista

### Phase 2: Frontend Integration
- Add delete button to UI
- Wire up mutation
- Test end-to-end flow

### Phase 3: Monitoring
- Monitor `rag_webhook_failures` table for issues
- Set up alerts for high webhook failure rates
- Track blob storage savings from cleanup

## Related Files

- `packages/api-server/src/routes/files.ts` - DELETE endpoint (line 481)
- `packages/api-server/src/services/WebhookService.ts` - Webhook service (line 64)
- `packages/api-server/src/types/webhook.ts` - Webhook type definitions
- `packages/api-server/src/database/migrations/113_add_content_addressable_storage.sql` - Schema
- `packages/client/src/hooks/useKnowledgeBase.ts` - Frontend hook (future integration)

## Questions & Decisions

### Q: Should we wait for webhook response before returning success?
**A**: No. Follow upload pattern - return immediate success, webhook runs async.

### Q: What if blob is referenced by metadata from different users/orgs?
**A**: Reference counting is global across all metadata. Blob deleted only when ALL references gone.

### Q: Should we soft-delete or hard-delete?
**A**: Hard delete. No requirement for soft-delete or recycle bin functionality.

### Q: What if Barista webhook fails?
**A**: Log to `rag_webhook_failures` table. Barista can replay failed webhooks from this table.

---

**Document Version**: 1.0
**Created**: 2025-10-14
**Status**: Implementation Complete
