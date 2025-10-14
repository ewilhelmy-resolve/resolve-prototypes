/**
 * Profile Store Types
 *
 * Type definitions for user profile data including user information
 * and organization membership with role-based permissions.
 */

export type OrganizationRole = 'owner' | 'admin' | 'user'

export interface UserInfo {
  id: string
  email: string
  firstName?: string
  lastName?: string
  username?: string
}

export interface OrganizationInfo {
  id: string
  name: string
  role: OrganizationRole
  memberCount: number
  createdAt?: string
}

export interface UserProfile {
  user: UserInfo
  organization: OrganizationInfo
}

export class ProfileError extends Error {
  constructor(
    public code: ProfileErrorCode,
    message: string,
    public cause?: unknown
  ) {
    super(message)
    this.name = 'ProfileError'
  }
}

export type ProfileErrorCode =
  | 'FETCH_FAILED'
  | 'NETWORK_ERROR'
  | 'UNAUTHORIZED'
  | 'NOT_MEMBER'
