# File Access Control - Design Document

## Overview
This document defines the access control model for file/document operations in the Rita API, including upload, listing, download, processing, and deletion based on user roles within an organization.

---

## Current Implementation Issues

### Problem Statement
The current file listing endpoint (`GET /api/files`) filters by both `organization_id` AND `user_id`, meaning:
- ✅ Owner can see only their own uploaded files
- ❌ Admin cannot see files uploaded by owner or other users
- ❌ No organization-wide file visibility for privileged roles

**Current Query:**
```sql
WHERE bm.organization_id = $1 AND bm.user_id = $2
```

This creates a **user-scoped** file system instead of an **organization-scoped** file system with role-based access control.

---

## Proposed Access Control Model

### Role Definitions
- **Owner**: Full control over organization, including all files
- **Admin**: Elevated privileges for managing organization resources
- **User**: Standard member with read-only access (no file operations)

### Access Matrix

| Operation | Owner | Admin | User | Notes |
|-----------|-------|-------|------|-------|
| **List Files** | All org files | All org files | ❌ Forbidden | Admin/Owner see `user_id` field |
| **Upload Files** | ✅ | ✅ | ❌ Forbidden | Only privileged roles can upload |
| **Download Files** | All org files | All org files | ❌ Forbidden | Only privileged roles can download |
| **Process Files** | All org files | All org files | ❌ Forbidden | Trigger document processing |
| **Delete Files** | All org files | All org files | ❌ Forbidden | Permanent deletion with audit log |

### Design Principles

1. **Organization-Scoped for Privileged Roles Only**
   - Owners and Admins manage organization-wide file resources
   - They need visibility into all files for compliance, auditing, and support
   - File operations are administrative functions

2. **No File Access for Standard Members**
   - Regular users cannot interact with the file system
   - Files are managed by organization administrators
   - Use case: Knowledge base management, document repository, compliance docs

3. **Explicit Ownership Tracking**
   - Include `user_id` in responses for Admin/Owner to know who uploaded each file
   - Useful for audit trails and support scenarios
   - Track which admin performed which action

4. **Consistent Authorization Pattern**
   - All file operations require `admin` or `owner` role
   - Clear 403 Forbidden responses for unauthorized users
   - Easy to reason about and maintain

---

## Implementation Plan

### Phase 1: Add Role-Based Authorization Middleware

**Changes Required:**
Add `requireRole(['owner', 'admin'])` middleware to ALL file endpoints (following the same pattern used in `packages/api-server/src/routes/invitations.ts`):

```typescript
import { authenticateUser, requireRole } from '../middleware/auth.js';

// Upload
router.post('/upload', authenticateUser, requireRole(['owner', 'admin']), handleUpload, async (req, res) => {
  // ... handler code
});

// Create text content
router.post('/content', authenticateUser, requireRole(['owner', 'admin']), async (req, res) => {
  // ... handler code
});

// List files
router.get('/', authenticateUser, requireRole(['owner', 'admin']), async (req, res) => {
  // ... handler code
});

// Download file
router.get('/:documentId/download', authenticateUser, requireRole(['owner', 'admin']), async (req, res) => {
  // ... handler code
});

// Process file
router.post('/:documentId/process', authenticateUser, requireRole(['owner', 'admin']), async (req, res) => {
  // ... handler code
});

// Delete file
router.delete('/:documentId', authenticateUser, requireRole(['owner', 'admin']), async (req, res) => {
  // ... handler code
});
```

**Middleware Behavior:**
- `authenticateUser`: Validates session and populates `req.user` with user details
- `requireRole(['owner', 'admin'])`: Checks `req.user.role` and returns `403 Forbidden` if role not in list
- Both middleware are already implemented in `packages/api-server/src/middleware/auth.ts`

**Reference Implementation:**
See `packages/api-server/src/routes/invitations.ts` for working example:
```typescript
// Line 41: POST /api/invitations/send
router.post('/send', authenticateUser, requireRole(['owner', 'admin']), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  // ... handler has access to authReq.user.id, authReq.user.role, etc.
});
```

**Implementation Checklist:**
- [ ] Import `authenticateUser` and `requireRole` from `../middleware/auth.js`
- [ ] Add both middleware to ALL file endpoints in correct order
- [ ] Cast `req` to `AuthenticatedRequest` type in handlers
- [ ] Access user details via `authReq.user.id`, `authReq.user.role`, `authReq.user.activeOrganizationId`
- [ ] Remove manual role checks from handler code (middleware handles it)

### Phase 2: Update File Listing Query

**Current Query:**
```sql
WHERE bm.organization_id = $1 AND bm.user_id = $2
```

**New Query (Simpler):**
```sql
WHERE bm.organization_id = $1
ORDER BY bm.created_at DESC
```

**Response Schema (Always include user_id):**
```typescript
{
  documents: [
    {
      id: string,
      filename: string,
      file_size: number,
      mime_type: string,
      status: string,
      user_id: string,  // ← Who uploaded this file
      created_at: timestamp,
      updated_at: timestamp,
      content_type: 'text' | 'binary'
    }
  ],
  total: number,
  limit: number,
  offset: number
}
```

### Phase 3: Update Download, Process, Delete Queries

**Remove `user_id` filter from all queries** since role middleware handles authorization:

```typescript
// Download
WHERE bm.id = $1 AND bm.organization_id = $2
// No user_id filter needed

// Process
WHERE bm.id = $1 AND bm.organization_id = $2
// No user_id filter needed

// Delete
WHERE id = $1 AND organization_id = $2
// No user_id filter needed
```

### Phase 4: Add Audit Logging

**Track which admin performed which action (following invitations.ts pattern):**
```typescript
// Success logging
logger.info({
  organizationId: authReq.user.activeOrganizationId,
  userId: authReq.user.id,
  documentId: result.id,
  filename: result.filename,
  fileSize: result.file_size
}, 'File uploaded');

logger.info({
  organizationId: authReq.user.activeOrganizationId,
  userId: authReq.user.id,
  documentId: documentId
}, 'File deleted');

// Error logging
logger.error({
  error,
  userId: authReq.user.id,
  organizationId: authReq.user.activeOrganizationId,
  documentId: documentId
}, 'Failed to delete file');
```

**Logging Best Practices (from invitations.ts):**
- Use `logger.info()` for successful operations
- Use `logger.error()` for failures (include error object)
- Include context: `organizationId`, `userId`, operation-specific fields
- Use descriptive messages: `'File uploaded'`, `'File deleted'`, `'Failed to delete file'`
- Log AFTER successful operations, not before

### Phase 5: Error Handling & Input Validation

**Pattern from invitations.ts (lines 48-55, 142-152):**

```typescript
// Input validation (at the start of handler)
router.get('/', authenticateUser, requireRole(['owner', 'admin']), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { limit = '50', offset = '0' } = req.query;

    // Validate query parameters if needed
    const parsedLimit = parseInt(limit as string, 10);
    const parsedOffset = parseInt(offset as string, 10);

    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return res.status(400).json({ error: 'Invalid limit. Must be between 1 and 100.' });
    }

    // ... rest of handler
  } catch (error) {
    logger.error({ error }, 'Failed to list files');
    res.status(500).json({ error: 'Failed to list files' });
  }
});
```

**Error Handling Best Practices:**

1. **Specific Error Messages** (invitations.ts lines 142-152):
```typescript
catch (error) {
  logger.error({ error }, 'Failed to delete file');

  if (error instanceof Error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'File not found',
        code: 'FILE_NOT_FOUND'
      });
    }
    if (error.message.includes('Permission denied')) {
      return res.status(403).json({
        error: 'Permission denied',
        code: 'FORBIDDEN'
      });
    }
  }

  res.status(500).json({ error: 'Failed to delete file' });
}
```

2. **Structured Error Responses**:
- Always include descriptive `error` message
- Optionally include `code` for programmatic handling
- Use appropriate HTTP status codes (400, 403, 404, 500)
- Log errors before returning response

3. **Input Validation Checklist**:
- [ ] Validate required fields exist
- [ ] Validate data types (string, number, boolean)
- [ ] Validate ranges (min/max values)
- [ ] Validate formats (IDs, file types)
- [ ] Return 400 Bad Request for invalid input
- [ ] Provide clear error messages

### Phase 6: Add Endpoint Documentation

**JSDoc Pattern from invitations.ts (lines 35-40, 158-162):**

```typescript
/**
 * POST /api/files/upload
 * Upload a file to organization knowledge base
 * Auth: Required (owner/admin)
 * Rate Limit: Consider adding if abuse is a concern
 */
router.post('/upload', authenticateUser, requireRole(['owner', 'admin']), handleUpload, async (req, res) => {
  // ... handler
});

/**
 * GET /api/files
 * List all files in the organization
 * Auth: Required (owner/admin)
 */
router.get('/', authenticateUser, requireRole(['owner', 'admin']), async (req, res) => {
  // ... handler
});

/**
 * DELETE /api/files/:documentId
 * Delete a file from organization (triggers webhook for external cleanup)
 * Auth: Required (owner/admin)
 */
router.delete('/:documentId', authenticateUser, requireRole(['owner', 'admin']), async (req, res) => {
  // ... handler
});
```

**Documentation Checklist:**
- [ ] Add JSDoc comment above each endpoint
- [ ] Document HTTP method and path
- [ ] Document auth requirements
- [ ] Document rate limits (if applicable)
- [ ] Document special behavior (webhooks, external integrations)
- [ ] Keep comments concise (3-5 lines max)

---

## Migration Strategy

### Database Changes
**None required** - Existing schema already supports this model:
- `blob_metadata.organization_id` ✅
- `blob_metadata.user_id` ✅
- Role information comes from session/JWT ✅

### API Changes
1. ⚠️ **BREAKING for Regular Users**: All file endpoints now return 403 Forbidden for non-admin/owner roles
2. ✅ **Non-Breaking for Admin/Owner**: They will now see ALL org files (expansion of access)
3. ✅ **Response Schema**: Always includes `user_id` field (non-breaking addition)

### Rollout Plan
1. **Communicate breaking change** to frontend team and API consumers
2. **Update frontend** to hide file management UI for regular users
3. **Deploy backend changes** with role-based middleware
4. **Update API documentation** with new authorization requirements
5. **Monitor logs** for 403 errors from affected users

---

## Security Considerations

### Authorization Validation
- ✅ Role information must come from trusted source (session/JWT)
- ✅ Always validate `organization_id` in queries (RLS protection)
- ✅ Prevent privilege escalation (user cannot fake admin role)

### Audit Logging
Add audit logs for privileged actions:
```typescript
logger.info({
  action: 'file_access',
  adminId: authReq.user.id,
  fileOwnerId: metadata.user_id,
  documentId: documentId,
  operation: 'download' | 'delete' | 'process'
}, 'Admin accessed user file');
```

### Privacy Compliance
- Document that admin/owner can access all org files
- Include in terms of service / privacy policy
- Consider "private file" feature flag for future (user can mark files as private)

---

## Testing Plan

### Unit Tests
- [ ] Regular user receives 403 Forbidden on all file endpoints
- [ ] Admin sees all org files (not just own files)
- [ ] Owner sees all org files (not just own files)
- [ ] Admin can upload/download/process/delete any org file
- [ ] Owner can upload/download/process/delete any org file
- [ ] Cross-organization access is blocked (org_id validation)

### Integration Tests
- [ ] Owner uploads file → Admin can list/download it
- [ ] Admin uploads file → Owner can list/download it
- [ ] Regular user attempts upload → 403 Forbidden
- [ ] Regular user attempts list → 403 Forbidden
- [ ] Regular user attempts download → 403 Forbidden
- [ ] Admin deletes owner's file → webhook fires → database cleaned up

### Security Tests
- [ ] Privilege escalation attempt (user modifies role in request) → Still 403
- [ ] Cross-org file access attempt (documentId from different org) → 404
- [ ] Audit log verification for all admin file operations
- [ ] Role validation happens at middleware level (cannot be bypassed)

---

## Future Enhancements

### 1. File Sharing (Phase 2)
- Add `shared_with` field to `blob_metadata`
- Allow users to explicitly share files with other org members
- Shared files bypass ownership checks

### 2. Private Files Flag (Phase 3)
- Add `is_private` boolean to `blob_metadata`
- Private files hidden from admin/owner unless explicitly granted access
- Use case: Personal documents in shared workspace

### 3. File Permissions System (Phase 4)
- Granular permissions: `read`, `write`, `delete`, `share`
- Role-based defaults with per-file overrides
- ACL table: `file_permissions(document_id, user_id, permission)`

### 4. File Organization Features
- Folders/tags for better organization
- Team-level file collections (subset of org)
- File versioning and history

---

## Open Questions

1. **Should we add "uploaded_by" user info in download responses?**
   - Useful for audit trails
   - Could add `X-Uploaded-By-User-Id` header in response
   - Decision: ✅ Yes, add to audit logging

2. **What happens when a user is removed from org?**
   - Option A: Keep files and reassign to org (preserve data)
   - Option B: Delete files automatically (clean up)
   - Option C: Mark as "orphaned" for admin review
   - **Recommendation**: Option A (preserve data, update `user_id` to org owner)

3. **Should we version this API for backward compatibility?**
   - Option A: Breaking change in current API (simpler, faster rollout)
   - Option B: Create `/api/v2/files` with new behavior (maintains compatibility)
   - **Recommendation**: Option A with proper communication and migration period

4. **File size limits and quotas**
   - Should we add organization-level storage quotas?
   - Should we add per-file or per-user upload limits beyond current 100MB?
   - Decision: Phase 2 enhancement

---

## References

- Related: [Member Management API Design](./member-management-api.md)
- Schema: `packages/api-server/migrations/*.sql` (blobs, blob_metadata tables)
- Auth Middleware: `packages/api-server/src/middleware/auth.ts`
- File Routes: `packages/api-server/src/routes/files.ts`

---

## Approval & Sign-off

- [ ] Backend Lead Review
- [ ] Security Team Review
- [ ] Product Manager Approval
- [ ] Frontend Team Notified (API changes)
- [ ] Documentation Updated

---

**Document Version:** 1.0
**Last Updated:** 2025-10-16
**Author:** Engineering Team
**Status:** Draft / Under Review