/**
 * Member Management Type Definitions
 * Matches backend API specification from member-management-feature.md
 */

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

export interface MemberListResponse {
  members: Member[];
  total: number;
}

export interface MemberListParams {
  limit?: number;
  offset?: number;
  role?: OrganizationRole;
  status?: 'active' | 'inactive';
  search?: string;
  sortBy?: 'name' | 'role' | 'status' | 'joinedAt' | 'conversationsCount';
  sortOrder?: 'asc' | 'desc';
}

export interface UpdateRoleRequest {
  role: OrganizationRole;
}

export interface UpdateStatusRequest {
  isActive: boolean;
}

export interface MemberResponse {
  member: MemberDetails;
}

export interface UpdateMemberResponse {
  success: boolean;
  member: Member;
  message: string;
}

export interface RemoveMemberResponse {
  success: boolean;
  message: string;
  removedMember: {
    id: string;
    email: string;
    role: string;
  };
}

export interface MemberAPIError {
  error: string;
  code: string;
}
