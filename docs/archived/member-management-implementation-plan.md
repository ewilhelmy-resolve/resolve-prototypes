# Member Management Implementation Plan

**Project:** Rita Member Management System
**Timeline:** Phase 1 - 2 weeks | Phase 2 - TBD
**Last Updated:** 2025-10-14

---

## Overview

This document provides a detailed implementation plan for the Rita Member Management System. The implementation is split into two phases:

- **Phase 1:** Core member management (view, roles, status, soft delete) - **2 weeks**
- **Phase 2:** Hard delete with webhook integration - **Future release**

**Key Decision:** Phase 1 will implement placeholder endpoints for hard delete operations that return HTTP 501 (Not Implemented) with clear messaging. This allows the core functionality to be delivered quickly while deferring the complex webhook-dependent features.

---

## Phase 1: Core Member Management

**Duration:** 2 weeks (10 working days)
**Team Size:** 1-2 developers
**Goal:** Deliver production-ready member listing, role management, status control, and soft removal

### Scope

| Feature | Status |
|---------|--------|
| List organization members with conversation counts | ✅ Phase 1 |
| View individual member details | ✅ Phase 1 |
| Update member roles (owner/admin/user) | ✅ Phase 1 |
| Activate/deactivate members | ✅ Phase 1 |
| Remove members (soft delete) | ✅ Phase 1 |
| Real-time updates via SSE | ✅ Phase 1 |
| Audit logging for all actions | ✅ Phase 1 |
| Permission enforcement | ✅ Phase 1 |
| Hard delete members | ❌ Phase 2 (501 placeholder) |
| Delete own account | ❌ Phase 2 (501 placeholder) |
| Organization deletion | ❌ Phase 2 (501 placeholder) |

---

## Phase 1 Detailed Timeline

### Week 1: Backend Implementation

#### Day 1-2: Foundation & Database

**Focus:** Database migration, type definitions, middleware updates

**Tasks:**

- [ ] **Database Migration** (`packages/api-server/src/database/migrations/XXX_add_member_management.sql`)
  - Add `is_active BOOLEAN NOT NULL DEFAULT true` to `organization_members`
  - Create index: `idx_organization_members_active`
  - Test migration on development database
  - Verify existing data defaults to active

- [ ] **Backend Type Definitions** (`packages/api-server/src/types/member.ts`)
  - Create `OrganizationRole` type
  - Create `Member`, `MemberDetails`, `MemberListResult` interfaces
  - Create `ListMembersOptions`, `RemovedMember` interfaces
  - Create `MemberAction` type for permission checks
  - Verify TypeScript compilation

- [ ] **Authentication Middleware Update** (`packages/api-server/src/middleware/auth.ts`)
  - Add database query to check `is_active` status
  - Return `403 NOT_MEMBER` if membership removed
  - Return `401 ACCOUNT_DISABLED` if user deactivated
  - Add logging for blocked requests
  - Write unit tests for new behavior

**Deliverables:**
- ✅ Migration file ready to deploy
- ✅ Type definitions exported
- ✅ Middleware blocks deactivated users
- ✅ Tests passing

**Review Checkpoint:** End of Day 2 - Review database schema, type safety, middleware behavior

---

#### Day 3-4: Service Layer

**Focus:** Business logic implementation in `MemberService`

**Tasks:**

- [ ] **Create MemberService** (`packages/api-server/src/services/memberService.ts`)

  **Methods to Implement:**

  1. `listMembers(organizationId, options)` - List members with filters
     - JOIN with `user_profiles` table for profile data
     - LEFT JOIN with `conversations` to count per user
     - Support filters: role, limit, offset, sortBy
     - Return `{ members: Member[], total: number }`

  2. `getMemberDetails(organizationId, userId)` - Get single member
     - Include invitation history if available
     - Return full `MemberDetails` object

  3. `updateMemberRole(organizationId, userId, newRole, performedBy)` - Change role
     - Check: Cannot change own role
     - Check: Cannot demote last active owner
     - Update `organization_members.role`
     - Create audit log entry
     - Trigger SSE event: `member_role_updated`
     - Return updated `Member`

  4. `updateMemberStatus(organizationId, userId, isActive, performedBy)` - Activate/deactivate
     - Check: Cannot change own status
     - Check: Cannot deactivate last active owner
     - Check: Admin can only deactivate users (not admins/owners)
     - Update `organization_members.is_active`
     - Create audit log entry
     - Trigger SSE event: `member_status_updated`
     - Return updated `Member`

  5. `removeMember(organizationId, userId, performedBy)` - Soft delete
     - Check: Cannot remove self
     - Check: Cannot remove last active owner
     - Check: Admin can only remove users (not admins/owners)
     - DELETE from `organization_members` (preserves user_profiles record)
     - Clear `active_organization_id` in `user_profiles` table
     - Create audit log entry
     - Trigger SSE event: `member_removed`
     - Return `RemovedMember`

  6. `isLastActiveOwner(organizationId, userId)` - Helper
     - Count active owners in organization
     - Return true if userId is the only active owner

  7. `canPerformAction(organizationId, performerId, targetId, action)` - Permission helper
     - Fetch both user roles
     - Apply permission matrix logic
     - Return boolean

  **Phase 2 Placeholder Methods:**

  8. `deleteMemberPermanent()` - Throw error
     ```typescript
     throw new Error('Hard delete not implemented - Phase 2 feature');
     ```

  9. `deleteOwnAccount()` - Throw error
     ```typescript
     throw new Error('Delete own account not implemented - Phase 2 feature');
     ```

- [ ] **Unit Tests** (`packages/api-server/src/services/__tests__/memberService.test.ts`)
  - Test each method with valid inputs
  - Test permission checks (last owner, self-modification)
  - Test error cases (not found, forbidden)
  - Test SSE event triggering
  - Test audit log creation
  - Mock database queries

**Deliverables:**
- ✅ `MemberService` class with 7 working methods + 2 placeholders
- ✅ All business logic tests passing
- ✅ SSE events triggered correctly

**Review Checkpoint:** End of Day 4 - Review service layer logic, test coverage, permission enforcement

---

#### Day 5-6: Routes & Integration

**Focus:** REST API endpoints and route registration

**Tasks:**

- [ ] **Create Member Routes** (`packages/api-server/src/routes/members.ts`)

  **Endpoints to Implement:**

  1. `GET /api/organizations/members` - List members
     - Middleware: `authenticateUser`, `requireRole(['owner', 'admin'])`
     - Parse query params: limit, offset, role, sortBy, sortOrder
     - Validate with Zod schema (optional but recommended)
     - Call `memberService.listMembers()`
     - Return `200 OK` with `{ members, total }`
     - Error handling: 500 on service failure

  2. `GET /api/organizations/members/:userId` - Get member details
     - Middleware: `authenticateUser`, `requireRole(['owner', 'admin'])`
     - Validate UUID format
     - Call `memberService.getMemberDetails()`
     - Return `200 OK` with `{ member }`
     - Error handling: 404 if not found, 500 on failure

  3. `PATCH /api/organizations/members/:userId/role` - Update role
     - Middleware: `authenticateUser`, `requireRole(['owner'])`
     - Validate request body: `{ role: 'owner' | 'admin' | 'user' }`
     - Call `memberService.updateMemberRole()`
     - Return `200 OK` with updated member
     - Error handling: 403, 404, 409 (last owner), 500

  4. `PATCH /api/organizations/members/:userId/status` - Update status
     - Middleware: `authenticateUser`, `requireRole(['owner', 'admin'])`
     - Validate request body: `{ isActive: boolean }`
     - Additional permission check via `canPerformAction()`
     - Call `memberService.updateMemberStatus()`
     - Return `200 OK` with updated member
     - Error handling: 403, 404, 409, 500

  5. `DELETE /api/organizations/members/:userId` - Remove member (soft)
     - Middleware: `authenticateUser`, `requireRole(['owner', 'admin'])`
     - Additional permission check via `canPerformAction()`
     - Call `memberService.removeMember()`
     - Return `200 OK` with removal confirmation
     - Error handling: 403, 404, 409, 500

  **Phase 2 Placeholder Endpoints:**

  6. `DELETE /api/organizations/members/:userId/permanent` - Hard delete
     - Middleware: `authenticateUser`, `requireRole(['owner'])`
     - Return `501 Not Implemented`:
     ```json
     {
       "error": "Hard delete not implemented",
       "code": "NOT_IMPLEMENTED",
       "message": "This feature will be available in Phase 2"
     }
     ```

  7. `DELETE /api/organizations/members/self/permanent` - Delete own account
     - Middleware: `authenticateUser`
     - Return `501 Not Implemented`:
     ```json
     {
       "error": "Delete own account not implemented",
       "code": "NOT_IMPLEMENTED",
       "message": "This feature will be available in Phase 2"
     }
     ```

- [ ] **Register Routes** (`packages/api-server/src/index.ts`)
  - Import: `import memberRoutes from './routes/members.js';`
  - Register BEFORE `/api/organizations`:
    ```typescript
    app.use('/api/organizations/members', authenticateUser, addUserContextToLogs, memberRoutes);
    app.use('/api/organizations', authenticateUser, addUserContextToLogs, organizationRoutes);
    ```
  - Update startup logging to include member endpoints

- [ ] **Add Validation** (Optional but recommended)
  - Install Zod: `npm install zod`
  - Create validation schemas for request bodies
  - Add validation middleware

- [ ] **Integration Tests** (`packages/api-server/src/routes/__tests__/members.test.ts`)
  - Test each endpoint with different roles
  - Test query parameter handling
  - Test error responses (401, 403, 404, 409, 500, 501)
  - Test permission enforcement
  - Use supertest for HTTP testing

**Deliverables:**
- ✅ 5 working endpoints + 2 placeholder endpoints
- ✅ Routes registered correctly
- ✅ Integration tests passing
- ✅ Proper error handling

**Review Checkpoint:** End of Day 6 - API testing with Postman/curl, review error handling, verify 501 responses

---

#### Day 6: SSE Events

**Focus:** Real-time update infrastructure

**Tasks:**

- [ ] **Add SSE Event Types** (`packages/api-server/src/services/sse.ts`)

  Add three new interfaces:

  ```typescript
  export interface MemberRoleUpdatedEvent {
    type: 'member_role_updated';
    data: {
      userId: string;
      userEmail: string;
      oldRole: 'owner' | 'admin' | 'user';
      newRole: 'owner' | 'admin' | 'user';
      updatedBy: string;
      timestamp: string;
    };
  }

  export interface MemberStatusUpdatedEvent {
    type: 'member_status_updated';
    data: {
      userId: string;
      userEmail: string;
      isActive: boolean;
      updatedBy: string;
      timestamp: string;
    };
  }

  export interface MemberRemovedEvent {
    type: 'member_removed';
    data: {
      userId: string;
      userEmail: string;
      removedBy: string;
      timestamp: string;
    };
  }
  ```

  Update union type:
  ```typescript
  export type SSEEvent =
    | MessageUpdateEvent
    | NewMessageEvent
    | DataSourceUpdateEvent
    | DocumentUpdateEvent
    | MemberRoleUpdatedEvent
    | MemberStatusUpdatedEvent
    | MemberRemovedEvent;
  ```

- [ ] **Test SSE Broadcasting**
  - Manually trigger events from service methods
  - Verify events received in browser console
  - Test with multiple connected clients

**Deliverables:**
- ✅ SSE types defined
- ✅ Events broadcast correctly
- ✅ TypeScript compilation clean

---

### Week 2: Frontend Implementation & Testing

#### Day 7-8: Frontend Foundation

**Focus:** Type definitions, API client, React Query hooks

**Tasks:**

- [ ] **Frontend Type Definitions** (`packages/client/src/types/member.ts`)

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
    invitedBy?: string;
  }

  export interface MemberDetails extends Member {
    invitedBy?: {
      id: string;
      email: string;
    };
  }

  export interface MemberListResponse {
    members: Member[];
    total: number;
  }

  export interface MemberListParams {
    limit?: number;
    offset?: number;
    role?: OrganizationRole;
    sortBy?: 'email' | 'role' | 'joinedAt';
    sortOrder?: 'asc' | 'desc';
  }
  ```

- [ ] **API Client** (`packages/client/src/services/api.ts`)

  Add `memberApi` object:

  ```typescript
  export const memberApi = {
    listMembers: (params?: MemberListParams) =>
      apiRequest<MemberListResponse>('/api/organizations/members', {
        method: 'GET',
        // Convert params to query string
      }),

    getMember: (userId: string) =>
      apiRequest<MemberDetailsResponse>(`/api/organizations/members/${userId}`),

    updateMemberRole: (userId: string, role: OrganizationRole) =>
      apiRequest(`/api/organizations/members/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),

    updateMemberStatus: (userId: string, isActive: boolean) =>
      apiRequest(`/api/organizations/members/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      }),

    removeMember: (userId: string) =>
      apiRequest(`/api/organizations/members/${userId}`, {
        method: 'DELETE',
      }),
  };
  ```

- [ ] **Update Error Handling** (`packages/client/src/services/api.ts`)

  Add handling for new error codes in `apiRequest`:

  ```typescript
  if (error.code === 'ACCOUNT_DISABLED') {
    toast.error('Account Disabled', {
      description: error.error || 'Your account has been disabled',
    });
    setTimeout(() => {
      window.location.href = '/logout';
    }, 2000);
    throw new Error(error.error);
  }

  if (error.code === 'NOT_MEMBER') {
    toast.error('Access Revoked', {
      description: 'You are no longer a member of this organization',
    });
    setTimeout(() => {
      window.location.href = '/logout';
    }, 2000);
    throw new Error(error.error);
  }
  ```

- [ ] **React Query Hooks** (`packages/client/src/hooks/api/useMembers.ts`)

  Implement hooks:

  1. `useMembers(params?)` - List members query
  2. `useMemberDetails(userId)` - Get member details query
  3. `useUpdateMemberRole()` - Role update mutation
  4. `useUpdateMemberStatus()` - Status update mutation
  5. `useRemoveMember()` - Remove member mutation

  All mutations should:
  - Invalidate `memberKeys.lists()` on success
  - Show toast notifications
  - Handle errors gracefully

- [ ] **Merged Data Hook** (`packages/client/src/hooks/api/useMembersWithInvites.ts`)

  Create hook that merges members and pending invitations:

  ```typescript
  export function useMembersWithInvites() {
    const { data: membersData, isLoading: membersLoading } = useMembers();
    const { data: invitesData, isLoading: invitesLoading } = useInvitations({
      status: ['pending', 'expired']
    });

    const combined = useMemo(() => {
      // Transform members to MemberRow type
      // Transform invites to InviteRow type
      // Combine and sort by date
      return [...memberRows, ...inviteRows];
    }, [membersData, invitesData]);

    return {
      data: combined,
      isLoading: membersLoading || invitesLoading,
      memberCount: membersData?.total || 0,
      inviteCount: invitesData?.invitations.length || 0
    };
  }
  ```

- [ ] **Hook Unit Tests** (`packages/client/src/hooks/api/__tests__/useMembers.test.tsx`)
  - Test query hooks fetch data correctly
  - Test mutation hooks invalidate cache
  - Test error handling
  - Test toast notifications
  - Use React Testing Library + TanStack Query test utils

**Deliverables:**
- ✅ Frontend types match backend
- ✅ API client working
- ✅ All hooks implemented
- ✅ Hook tests passing

**Review Checkpoint:** End of Day 8 - Test API calls from frontend, verify error handling, review hook behavior

---

#### Day 9: SSE Integration

**Focus:** Real-time updates in frontend

**Tasks:**

- [ ] **Update SSE Context** (`packages/client/src/contexts/SSEContext.tsx`)

  Add event handlers after existing handlers:

  ```typescript
  } else if (event.type === 'member_role_updated') {
    console.log('[SSE] Member role updated:', event.data);

    queryClient.invalidateQueries({ queryKey: memberKeys.lists() });

    const profile = queryClient.getQueryData(profileKeys.detail());
    if (profile?.user.id === event.data.userId) {
      queryClient.invalidateQueries({ queryKey: profileKeys.detail() });
      toast.info('Your role has been updated', {
        description: `You are now ${event.data.newRole}`,
      });
    } else {
      toast.info('Member role updated', {
        description: `${event.data.userEmail} is now ${event.data.newRole}`,
      });
    }
  } else if (event.type === 'member_status_updated') {
    console.log('[SSE] Member status updated:', event.data);

    queryClient.invalidateQueries({ queryKey: memberKeys.lists() });

    const profile = queryClient.getQueryData(profileKeys.detail());
    if (profile?.user.id === event.data.userId) {
      queryClient.invalidateQueries({ queryKey: profileKeys.detail() });

      if (!event.data.isActive) {
        toast.error('Your account has been disabled', {
          description: 'Contact your organization administrator',
        });
        setTimeout(() => {
          window.location.href = '/logout';
        }, 2000);
      } else {
        toast.success('Your account has been activated');
      }
    } else {
      const status = event.data.isActive ? 'activated' : 'deactivated';
      toast.info(`Member ${status}`, {
        description: `${event.data.userEmail} has been ${status}`,
      });
    }
  } else if (event.type === 'member_removed') {
    console.log('[SSE] Member removed:', event.data);

    queryClient.invalidateQueries({ queryKey: memberKeys.lists() });

    const profile = queryClient.getQueryData(profileKeys.detail());
    if (profile?.user.id === event.data.userId) {
      toast.error('You have been removed from the organization');
      setTimeout(() => {
        window.location.href = '/logout';
      }, 2000);
    } else {
      toast.info('Member removed', {
        description: `${event.data.userEmail} has been removed`,
      });
    }
  }
  ```

- [ ] **Test Real-Time Updates**
  - Open two browser windows with different users
  - Perform actions in one window
  - Verify events received and UI updates in other window
  - Test logout redirect for affected user

**Deliverables:**
- ✅ SSE handlers implemented
- ✅ Real-time updates working
- ✅ Logout redirect functional

---

#### Day 10-12: UI Components

**Focus:** User interface implementation

**Tasks:**

- [ ] **Members List Page** (`packages/client/src/pages/MembersPage.tsx`)

  **Layout:**
  ```
  ┌─────────────────────────────────────────────────┐
  │ Team Members                    [Invite] Button │
  │ 10 members · 2 pending invitations              │
  ├─────────────────────────────────────────────────┤
  │ [Search] [Role Filter] [Status Filter]          │
  ├─────────────────────────────────────────────────┤
  │ Avatar │ Name      │ Email         │ Role       │
  │        │ John Doe  │ john@ex.com   │ Owner      │
  │ 🔵     │           │               │ Active     │
  │        │           │               │ 5 convos   │
  ├────────┼───────────┼───────────────┼────────────┤
  │ 📧     │ jane@... │ jane@ex.com   │ User       │
  │        │           │               │ Pending    │
  │        │           │               │ Invited by │
  └────────┴───────────┴───────────────┴────────────┘
  ```

  **Features:**
  - Use `useMembersWithInvites()` for merged data
  - Filter by role (owner/admin/user)
  - Filter by status (active/inactive/pending/expired)
  - Search by name or email
  - Sort by name, role, or join date
  - Permission-based action menus
  - Responsive design (mobile-friendly)

  **Action Menu (for Members):**
  - Edit Role (owner only)
  - Activate/Deactivate (owner/admin)
  - Remove from Organization (owner/admin)
  - Delete Permanently (show "Coming in Phase 2" tooltip)

  **Action Menu (for Invites):**
  - Resend Invitation
  - Cancel Invitation

- [ ] **Edit Role Dialog** (`packages/client/src/components/dialogs/EditRoleDialog.tsx`)

  **Features:**
  - Dropdown: Owner / Admin / User
  - Warning if demoting last owner
  - Confirmation button
  - Loading state during mutation
  - Error handling

- [ ] **Manage Status Dialog** (`packages/client/src/components/dialogs/ManageStatusDialog.tsx`)

  **Features:**
  - Toggle: Activate / Deactivate
  - Optional reason field
  - Warning if deactivating last owner
  - Confirmation button
  - Loading state
  - Error handling

- [ ] **Remove Member Dialog** (`packages/client/src/components/dialogs/RemoveMemberDialog.tsx`)

  **Features:**
  - Display member details (name, email, role)
  - Warning message: "This will remove {email} from the organization. They will lose access to all conversations and files."
  - Clarification: "This is a soft delete - the user account remains and they can be re-invited."
  - Confirmation: Type email to confirm (optional)
  - Loading state
  - Error handling

- [ ] **Navigation Link** (Add to settings menu)
  - Add "Team Members" link to sidebar/settings
  - Permission check: Only show to owners/admins

- [ ] **Component Tests** (`packages/client/src/pages/__tests__/MembersPage.test.tsx`)
  - Test rendering with different roles
  - Test filters and search
  - Test action menu visibility
  - Test dialog interactions
  - Use React Testing Library

**Deliverables:**
- ✅ Members page fully functional
- ✅ All dialogs working
- ✅ Navigation integrated
- ✅ Component tests passing
- ✅ Responsive design verified

**Review Checkpoint:** End of Day 12 - Full UI walkthrough, test with different roles, verify permissions

---

#### Day 13-14: Testing & Documentation

**Focus:** Comprehensive testing and documentation

**Tasks:**

- [ ] **Backend Tests**
  - Review all unit tests (service layer)
  - Review all integration tests (routes)
  - Review middleware tests
  - Add any missing edge case tests
  - Ensure test coverage > 80%

- [ ] **Frontend Tests**
  - Review all hook tests
  - Review all component tests
  - Add SSE event handler tests
  - Ensure test coverage > 70%

- [ ] **E2E Tests** (`packages/e2e/tests/member-management.spec.ts`)

  Create Playwright tests:

  1. **List Members as Owner**
     - Login as owner
     - Navigate to Team Members
     - Verify all members visible
     - Verify conversation counts

  2. **Update Member Role**
     - Login as owner
     - Open Edit Role dialog
     - Change user to admin
     - Verify SSE update in UI
     - Verify audit log created

  3. **Deactivate Member**
     - Login as owner
     - Open Manage Status dialog
     - Deactivate a user
     - Login as that user
     - Verify API blocked with 401

  4. **Remove Member**
     - Login as owner
     - Open Remove Member dialog
     - Confirm removal
     - Verify member removed from list
     - Verify user can be re-invited

  5. **Permission Enforcement**
     - Login as admin
     - Verify cannot edit roles
     - Verify cannot deactivate owner
     - Verify can deactivate regular users

  6. **Real-Time Updates**
     - Open two browser sessions
     - Perform action in one
     - Verify update in other via SSE

- [ ] **Manual Testing Checklist**
  - [ ] List members loads correctly
  - [ ] Conversation counts accurate
  - [ ] Filters work (role, status)
  - [ ] Search works (name, email)
  - [ ] Edit role - owner can change any role
  - [ ] Edit role - cannot demote last owner
  - [ ] Deactivate - blocks API access immediately
  - [ ] Deactivate - cannot deactivate last owner
  - [ ] Deactivate - admin can only deactivate users
  - [ ] Remove member - soft deletes membership
  - [ ] Remove member - cannot remove last owner
  - [ ] Remove member - admin can only remove users
  - [ ] SSE updates work in real-time
  - [ ] Affected user gets logged out
  - [ ] Phase 2 endpoints return 501
  - [ ] Audit logs created for all actions
  - [ ] Permission matrix enforced
  - [ ] Mobile responsive design works

- [ ] **Documentation**
  - [ ] Update main README with member management features
  - [ ] Document API endpoints in API docs
  - [ ] Add migration notes
  - [ ] Document Phase 2 placeholders
  - [ ] Create user guide for admins
  - [ ] Update CHANGELOG

- [ ] **Deployment Preparation**
  - [ ] Review environment variables
  - [ ] Ensure migration runs on staging
  - [ ] Verify database indices created
  - [ ] Test with production-like data
  - [ ] Performance testing (load test with 100+ members)

**Deliverables:**
- ✅ All tests passing (unit, integration, E2E)
- ✅ Test coverage targets met
- ✅ Documentation complete
- ✅ Ready for staging deployment

**Review Checkpoint:** End of Day 14 - Final review meeting, demo to stakeholders, sign-off for Phase 1

---

## Phase 1 Success Criteria

Phase 1 is considered complete when:

- ✅ **Feature Completeness:**
  - Owners/admins can list all organization members
  - Members display conversation counts
  - Owners can update member roles
  - Owners/admins can activate/deactivate members
  - Deactivated users cannot access API (401 blocked)
  - Owners/admins can remove members (soft delete)
  - Hard delete endpoints return 501 with clear message

- ✅ **Technical Quality:**
  - All actions logged in `audit_logs` table
  - Real-time updates work via SSE
  - Permission matrix fully enforced
  - All tests passing (unit, integration, E2E)
  - Test coverage: Backend > 80%, Frontend > 70%
  - TypeScript compilation clean (no errors)
  - No console errors in browser

- ✅ **User Experience:**
  - UI is responsive on mobile and desktop
  - Loading states show during operations
  - Error messages are clear and helpful
  - Toast notifications provide feedback
  - Permission checks prevent invalid actions
  - Navigation is intuitive

- ✅ **Documentation:**
  - API endpoints documented
  - User guide for admins created
  - Phase 2 roadmap communicated
  - Migration instructions clear

- ✅ **Production Readiness:**
  - Migration tested on staging
  - Performance acceptable (< 200ms API response)
  - Security review completed
  - Stakeholder approval received

---

## Phase 2: Hard Delete Operations (Future)

**Status:** Not Yet Scheduled
**Estimated Duration:** 1-2 weeks
**Prerequisites:** Phase 1 deployed and stable in production

### Scope

- ✅ Permanent member deletion (hard delete)
- ✅ Keycloak user cleanup via webhook
- ✅ Delete own account functionality
- ✅ Organization deletion when last owner deletes self
- ✅ Blocking webhook integration (wait for success)
- ✅ Transaction management with rollback
- ✅ Webhook retry logic with exponential backoff

### High-Level Plan

**Week 1: Backend**

1. **Days 1-2:** Webhook Service Updates
   - Update `WebhookService` to return success/failure
   - Add retry logic (2 retries, exponential backoff)
   - Add 10-second timeout
   - Add webhook failure metrics

2. **Days 3-5:** Hard Delete Implementation
   - Remove placeholder methods from `MemberService`
   - Implement `deleteMemberPermanent()` with blocking webhook
   - Add transaction management (ROLLBACK on webhook failure)
   - Implement `deleteOwnAccount()` with organization deletion logic
   - Add SSE events: `member_deleted`, `organization_deleted`
   - Write comprehensive tests

**Week 2: Frontend & Testing**

3. **Days 6-8:** Frontend Updates
   - Add "Delete Permanently" action to member menu
   - Create `DeleteMemberPermanentlyDialog` with warnings
   - Update SSE handlers for hard delete events
   - Add webhook failure error handling

4. **Days 9-10:** Testing & Deployment
   - Unit tests for hard delete service methods
   - Integration tests with mocked webhooks
   - E2E tests for full delete flow
   - Test webhook timeout and retry scenarios
   - Staging deployment and validation

### Key Technical Challenges

1. **Webhook Blocking Strategy**
   - Must wait for webhook response before database deletion
   - Timeout must be reasonable (10s)
   - Retry logic for transient failures
   - Clear error messages when webhook fails

2. **Transaction Management**
   - Begin transaction
   - Trigger webhook (blocking)
   - If webhook fails: ROLLBACK
   - If webhook succeeds: Delete data + COMMIT
   - Ensure no partial deletions

3. **Organization Deletion**
   - When last owner deletes self, trigger full org deletion
   - Deactivate all members first
   - Delete all conversations, messages, files
   - Trigger webhook for each member
   - Atomic operation (all or nothing)

4. **Data Cascade**
   - Delete conversations by user
   - Delete messages by user
   - Delete uploaded files
   - Delete user profile
   - Delete user record
   - Respect foreign key constraints

---

## Risk Management

### Phase 1 Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Migration fails on large dataset | High | Test on production copy first |
| Middleware query slows down all requests | Medium | Add database index, cache if needed |
| SSE events not received | Medium | Add retry logic, fallback polling |
| Permission matrix bugs | High | Comprehensive test coverage |
| UI not mobile-friendly | Low | Test on real devices early |

### Phase 2 Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Webhook service unavailable | Critical | Blocking strategy prevents orphaned accounts |
| Webhook times out | High | 10s timeout + retry logic |
| Partial deletion (database but not Keycloak) | Critical | Transaction rollback on webhook failure |
| Organization deletion takes too long | Medium | Background job for large orgs |

---

## Team Communication

### Daily Standup
- What did I complete yesterday?
- What am I working on today?
- Any blockers?

### Code Review Guidelines
- All code must be reviewed before merge
- Tests must pass in CI
- No console.log statements in production code
- Follow TypeScript strict mode
- Follow existing code style

### Deployment Process
1. Merge to `main` branch
2. Run migration on staging
3. Deploy backend to staging
4. Deploy frontend to staging
5. Run E2E tests on staging
6. If all pass, deploy to production
7. Monitor logs and metrics

---

## Resources

- **Design Document:** `/docs/member-management-system.md`
- **API Documentation:** `/docs/api.md` (to be updated)
- **Database Schema:** `/packages/api-server/src/database/migrations/`
- **Existing Patterns:**
  - Invitation system: `/packages/api-server/src/services/InvitationService.ts`
  - Organization routes: `/packages/api-server/src/routes/organizations.ts`
  - SSE service: `/packages/api-server/src/services/sse.ts`

---

## Questions & Decisions Log

### Decision 1: Two-Phase Approach
**Question:** Should we implement hard delete in Phase 1 or defer it?
**Decision:** Defer to Phase 2. Hard delete requires complex webhook integration and transaction management. Phase 1 soft delete is sufficient for most use cases.
**Date:** 2025-10-14
**Decided By:** Team

### Decision 2: Placeholder Endpoints
**Question:** Should we add routes for Phase 2 features now or later?
**Decision:** Add routes now that return HTTP 501. This allows frontend to gracefully handle "not implemented" and provides clear communication to users.
**Date:** 2025-10-14
**Decided By:** Team

### Decision 3: Middleware Performance
**Question:** Is adding a database query to every authenticated request acceptable?
**Decision:** Yes. The query is a simple primary key lookup (< 1ms) and provides critical security enforcement. We can add caching later if needed.
**Date:** 2025-10-14
**Decided By:** Team

---

**Last Updated:** 2025-10-14
**Next Review:** End of Phase 1 (Day 14)
