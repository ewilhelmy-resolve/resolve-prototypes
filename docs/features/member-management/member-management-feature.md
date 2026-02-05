# Member Management Feature - Design & Implementation

**Status:** ✅ Phase 1 Complete
**Date:** October 2025
**Version:** 1.0

## Overview

The Member Management feature provides comprehensive organization member administration capabilities, including role management, status control, and member removal. This feature is built with a phased approach, with Phase 1 focusing on core member management without hard deletion.

## Architecture

### Database Schema

**Migration:** `126_add_member_management.sql`

```sql
-- Added to organization_members table
ALTER TABLE organization_members
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_organization_members_active
  ON organization_members(organization_id, is_active);
```

**Key Tables:**
- `user_profiles` - User information (email, first_name, last_name) - UUID-based
- `organization_members` - Organization membership (role, is_active, joined_at) - UUID-based
- `conversations` - Used for activity metrics (conversations_count)
- `audit_logs` - SOC2-compliant audit trail for all member actions

**Important:** The legacy `users` table (INTEGER id) is **not used** in this feature. All queries use `user_profiles` (UUID user_id) to avoid type mismatches.

### Type System

**Location:** `src/types/member.ts`

**Core Types:**
```typescript
export type OrganizationRole = 'owner' | 'admin' | 'user';

export interface Member {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: OrganizationRole;
  isActive: boolean;
  joinedAt: string;
  conversationsCount: number;
  lastActive?: string;
}

export interface MemberDetails extends Member {}

export interface MemberListResult {
  members: Member[];
  total: number;
}

export interface ListMembersOptions {
  limit?: number;
  offset?: number;
  role?: OrganizationRole;
  sortBy?: 'email' | 'role' | 'joinedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface RemovedMember {
  success: boolean;
  message: string;
  removedMember: {
    id: string;
    email: string;
    role: string;
  };
}

export type MemberAction =
  | 'list_members'
  | 'view_member'
  | 'update_role'
  | 'update_status'
  | 'remove_member'
  | 'delete_member'; // Phase 2
```

**Design Decisions:**
- `invitedBy` field was removed from Phase 1 (not tracking invitations yet)
- `MemberDetails` currently identical to `Member` (placeholder for future expansion)
- All operations return full member objects for consistency

## API Endpoints

### Phase 1 Endpoints (✅ Implemented & Tested)

#### 1. List Members
```
GET /api/organizations/members
Auth: owner, admin
Query Parameters:
  - role?: 'owner' | 'admin' | 'user'
  - limit?: number (default: 50)
  - offset?: number (default: 0)
  - sortBy?: 'email' | 'role' | 'joinedAt' (default: 'joinedAt')
  - sortOrder?: 'asc' | 'desc' (default: 'desc')

Response: {
  members: Member[],
  total: number
}
```

**Features:**
- Returns conversation counts for each member
- Supports filtering by role
- Pagination and sorting
- Only active and inactive members (not removed)

#### 2. Get Member Details
```
GET /api/organizations/members/:userId
Auth: owner, admin

Response: {
  member: MemberDetails
}
```

**Features:**
- Full member profile with activity metrics
- Includes conversation count

#### 3. Update Member Role
```
PATCH /api/organizations/members/:userId/role
Auth: owner only
Body: {
  role: 'owner' | 'admin' | 'user'
}

Response: {
  success: true,
  member: Member,
  message: string
}
```

**Business Rules:**
- ❌ Cannot change own role
- ❌ Cannot demote last active owner
- ✅ Creates audit log entry
- ✅ Triggers SSE event `member_role_updated`

#### 4. Update Member Status
```
PATCH /api/organizations/members/:userId/status
Auth: owner (all), admin (user only)
Body: {
  isActive: boolean
}

Response: {
  success: true,
  member: Member,
  message: string
}
```

**Business Rules:**
- ❌ Cannot change own status
- ❌ Cannot deactivate last active owner
- ❌ Admins can only deactivate regular users (not owners/admins)
- ✅ Creates audit log entry
- ✅ Triggers SSE event `member_status_updated`

#### 5. Remove Member (Soft Delete)
```
DELETE /api/organizations/members/:userId
Auth: owner (all), admin (user only)

Response: {
  success: true,
  message: string,
  removedMember: {
    id: string,
    email: string,
    role: string
  }
}
```

**Business Rules:**
- ❌ Cannot remove yourself
- ❌ Cannot remove last active owner
- ❌ Admins can only remove regular users (not owners/admins)
- ✅ Deletes organization_members record (soft delete)
- ✅ Preserves user_profiles record (user account remains)
- ✅ Creates audit log entry
- ✅ Triggers SSE event `member_removed`

### Phase 2 Endpoints (❌ Not Implemented)

#### 6. Permanent Delete Member
```
DELETE /api/organizations/members/:userId/permanent
Auth: owner only
Status: 501 NOT_IMPLEMENTED

Response: {
  error: "Hard delete not implemented",
  code: "NOT_IMPLEMENTED",
  message: "Permanent member deletion will be available in Phase 2..."
}
```

**Future Requirements:**
- Webhook integration with Keycloak for account deletion
- Complete data purge (conversations, audit logs, etc.)
- Cannot be undone

#### 7. Delete Own Account
```
DELETE /api/organizations/members/self/permanent
Auth: any authenticated user
Status: 501 NOT_IMPLEMENTED

Response: {
  error: "Delete own account not implemented",
  code: "NOT_IMPLEMENTED",
  message: "Self-deletion will be available in Phase 2..."
}
```

**Future Requirements:**
- Delete user from all organizations
- If last owner, delete organization
- Webhook to Keycloak for account cleanup

## Service Layer

**Location:** `src/services/memberService.ts`

### Core Methods

**1. `listMembers(organizationId, options)`**
- Queries `organization_members` + `user_profiles` + `conversations`
- Dynamic filtering, sorting, and pagination
- Returns total count for pagination UI

**2. `getMemberDetails(organizationId, userId)`**
- Full member profile with conversation count
- Uses same query structure as listMembers for consistency

**3. `updateMemberRole(organizationId, userId, newRole, performedBy)`**
- Transaction-wrapped role update
- Checks: self-modification, last owner protection
- Creates audit log and SSE event
- Returns updated member object

**4. `updateMemberStatus(organizationId, userId, isActive, performedBy)`**
- Transaction-wrapped status update
- Permission check via `canPerformAction()`
- Checks: self-modification, last owner protection
- Creates audit log and SSE event
- Returns updated member object

**5. `removeMember(organizationId, userId, performedBy)`**
- Transaction-wrapped member removal
- Permission check via `canPerformAction()`
- Checks: self-removal, last owner protection
- Deletes from organization_members (preserves user_profiles)
- Creates audit log and SSE event
- Returns removal confirmation

### Helper Methods

**`isLastActiveOwner(organizationId, userId)`**
- Counts other active owners (excluding specified user)
- Prevents organization lockout

**`canPerformAction(organizationId, performerId, targetId, action)`**
- Enforces role hierarchy:
  - **Owners:** Can manage all members (except self)
  - **Admins:** Can only manage regular users (not owners/admins)
  - **Users:** Cannot manage anyone
- Returns boolean

### SQL Patterns

**Critical:** All queries use `user_profiles` table, **NOT** legacy `users` table:

```sql
-- ✅ CORRECT: UUID ↔ UUID join
SELECT up.user_id, up.email, om.role
FROM user_profiles up
INNER JOIN organization_members om ON up.user_id = om.user_id
WHERE om.organization_id = $1

-- ❌ WRONG: INTEGER ↔ UUID join (causes PostgreSQL error 42883)
SELECT u.id, u.email, om.role
FROM users u
INNER JOIN organization_members om ON u.id = om.user_id  -- TYPE MISMATCH!
WHERE om.organization_id = $1
```

**Type Casting:**
```sql
-- COUNT returns BIGINT, cast to INTEGER for consistency
COALESCE(COUNT(*)::INTEGER, 0) as conversations_count
```

## Routes Layer

**Location:** `src/routes/members.ts`

### Middleware Stack

All routes use:
1. `authenticateUser` - Verifies session and loads user context
2. `requireRole([...])` - Enforces role-based access control

### Error Handling

Standardized error responses:
```typescript
// 400 Bad Request - Invalid input
{ error: string, code: string }

// 403 Forbidden - Permission denied
{ error: string, code: 'INSUFFICIENT_PERMISSIONS' }

// 404 Not Found - Member not found
{ error: string, code: 'MEMBER_NOT_FOUND' }

// 409 Conflict - Business rule violation
{ error: string, code: 'LAST_OWNER' | 'CANNOT_MODIFY_SELF' }

// 500 Internal Server Error
{ error: string, code: string }

// 501 Not Implemented - Phase 2 endpoints
{ error: string, code: 'NOT_IMPLEMENTED', message: string }
```

## Real-Time Updates (SSE)

**Service:** `src/services/sse.ts`

### Event Types

**1. `member_role_updated`**
```typescript
{
  type: 'member_role_updated',
  data: {
    userId: string,
    userEmail: string,
    oldRole: OrganizationRole,
    newRole: OrganizationRole,
    updatedBy: string,
    timestamp: string
  }
}
```

**2. `member_status_updated`**
```typescript
{
  type: 'member_status_updated',
  data: {
    userId: string,
    userEmail: string,
    isActive: boolean,
    updatedBy: string,
    timestamp: string
  }
}
```

**3. `member_removed`**
```typescript
{
  type: 'member_removed',
  data: {
    userId: string,
    userEmail: string,
    removedBy: string,
    timestamp: string
  }
}
```

**Broadcast:** All events sent to entire organization via `sseService.sendToOrganization()`

## Audit Logging

All member management actions create audit log entries:

**Actions Logged:**
- `update_member_role` - Role changes
- `activate_member` / `deactivate_member` - Status changes
- `remove_member` - Member removal

**Metadata Includes:**
- `targetUserId` - Member being acted upon
- `targetEmail` - Member email
- `oldRole` / `newRole` - For role changes
- `oldStatus` / `newStatus` - For status changes
- `removalType: 'soft'` - For removals

**Compliance:** SOC2 Type II compliant audit trail

## Permission Model

### Role Hierarchy

```
owner > admin > user
```

### Permission Matrix

| Action | Owner | Admin | User |
|--------|-------|-------|------|
| List members | ✅ | ✅ | ❌ |
| View member details | ✅ | ✅ | ❌ |
| Update any role | ✅ | ❌ | ❌ |
| Update owner/admin status | ✅ | ❌ | ❌ |
| Update user status | ✅ | ✅ | ❌ |
| Remove owner/admin | ✅ | ❌ | ❌ |
| Remove user | ✅ | ✅ | ❌ |
| Permanent delete (Phase 2) | ✅ | ❌ | ❌ |

**Special Rules:**
- ❌ Cannot modify self (role, status, removal)
- ❌ Cannot demote/deactivate/remove last active owner

## Testing Summary

### Test Results (✅ All Passing)

**1. GET /api/organizations/members**
- ✅ Returns member list with conversation counts
- ✅ Pagination works correctly
- ✅ Filtering by role works
- ✅ Sorting works (email, role, joinedAt)

**2. GET /api/organizations/members/:userId**
- ✅ Returns member details with metrics
- ✅ 404 for non-existent members

**3. PATCH /api/organizations/members/:userId/role**
- ✅ Owner can change user to admin
- ✅ Owner can change admin to user
- ✅ Role updates reflected immediately
- ✅ SSE event triggered

**4. PATCH /api/organizations/members/:userId/status**
- ✅ Owner can deactivate users
- ✅ Owner can reactivate users
- ✅ Status updates reflected immediately
- ✅ SSE event triggered

**5. DELETE /api/organizations/members/:userId**
- ✅ Member removed from organization
- ✅ Member no longer appears in list
- ✅ User profile preserved (soft delete)
- ✅ SSE event triggered

**6. Phase 2 Placeholder Endpoints**
- ✅ DELETE /:userId/permanent returns 501
- ✅ DELETE /self/permanent returns 501
- ✅ Proper error messages explaining Phase 2 requirement

### Test Session Cookie
```
rita_session=753113b16285631e45fcaddac040376a3589335392b81e70268fa2c2fc18d600
```

## Known Issues & Fixes Applied

### Issue 1: PostgreSQL Type Mismatch (Error 42883)
**Problem:** Joining `users.id` (INTEGER) with `organization_members.user_id` (UUID)

**Solution:** Use `user_profiles.user_id` (UUID) instead of `users` table

**Affected Methods:**
- ✅ Fixed: `listMembers()`
- ✅ Fixed: `getMemberDetails()`
- ✅ Fixed: `updateMemberRole()`
- ✅ Fixed: `updateMemberStatus()`
- ✅ Fixed: `removeMember()`

### Issue 2: COUNT Type Casting
**Problem:** COUNT returns BIGINT, needs explicit cast

**Solution:** Add `::INTEGER` cast to all COUNT operations

### Issue 3: Legacy Users Table Reference
**Problem:** `removeMember()` tried to UPDATE `users.active_organization_id`

**Solution:** Removed legacy UPDATE - only work with `user_profiles` and `organization_members`

## Future Enhancements (Phase 2)

### Hard Delete Operations
- Webhook integration with Keycloak
- Complete data purge across all tables
- Organization deletion if last owner removes self

### Invitation System
- Add `invitedBy` field tracking
- Pending invitations table
- Invitation acceptance flow

### Advanced Member Management
- Bulk operations (activate/deactivate/remove multiple)
- Member search and advanced filtering
- Export member list to CSV
- Member activity reports

### Audit Trail UI
- View audit log for specific member
- Filter by action type
- Export audit logs for compliance

## References

**Related Files:**
- Database: `src/database/migrations/126_add_member_management.sql`
- Types: `src/types/member.ts`
- Service: `src/services/memberService.ts`
- Routes: `src/routes/members.ts`
- SSE Types: `src/services/sse.ts`
- Auth Middleware: `src/middleware/auth.ts`

**Related Documentation:**
- SOC2 Compliance: [Audit Logging Requirements]
- SSE Architecture: [Real-Time Events]
- Authentication: [Keycloak Integration]

---

**Document Version:** 1.0
**Last Updated:** October 16, 2025
**Implementation Status:** ✅ Phase 1 Complete