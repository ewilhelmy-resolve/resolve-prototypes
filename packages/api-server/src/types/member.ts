/**
 * Member Management Type Definitions
 *
 * These types define the data structures for member management operations
 * including listing, updating roles, managing status, and removal.
 *
 * Phase 1: Core member management (no hard delete)
 * Phase 2: Hard delete operations (future)
 */

/**
 * Organization role types
 * - owner: Full control over organization
 * - admin: Can manage members (except owners) and settings
 * - user: Basic member with no management permissions
 */
export type OrganizationRole = 'owner' | 'admin' | 'user';

/**
 * Member object returned from API
 * Includes basic user info, role, status, and activity metrics
 */
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

/**
 * Extended member details with additional information
 * Used by getMemberDetails endpoint
 */
export interface MemberDetails {
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

/**
 * Result object for list members endpoint
 * Includes pagination support
 */
export interface MemberListResult {
  members: Member[];
  total: number;
}

/**
 * Options for listing members
 * Supports filtering, sorting, and pagination
 */
export interface ListMembersOptions {
  limit?: number;
  offset?: number;
  role?: OrganizationRole;
  status?: 'active' | 'inactive';
  search?: string;
  sortBy?: 'name' | 'role' | 'status' | 'joinedAt' | 'conversationsCount';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Result object for remove member operation (soft delete)
 * Phase 1: Only soft delete (removes membership, preserves user account)
 */
export interface RemovedMember {
  success: boolean;
  message: string;
  removedMember: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Result object for hard delete operation
 * Phase 2: Permanent deletion with webhook to Keycloak
 */
export interface DeletedMember {
  success: boolean;
  message: string;
  deletedMember: {
    id: string;
    email: string;
    role: string;
  };
  webhook: {
    triggered: boolean;
    status: string;
  };
}

/**
 * Actions that can be performed on members
 * Used for permission checking
 */
export type MemberAction =
  | 'list_members'
  | 'view_member'
  | 'update_role'
  | 'update_status'
  | 'remove_member'
  | 'delete_member'; // Phase 2
