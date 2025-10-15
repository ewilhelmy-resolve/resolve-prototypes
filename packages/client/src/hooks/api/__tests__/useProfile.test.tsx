import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useProfilePermissions, profileKeys } from '../useProfile'
import type { UserProfile } from '@/types/profile'
import type { ReactNode } from 'react'

// Create a wrapper with QueryClient for testing
function createWrapper(profile: UserProfile | null = null) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
      },
    },
  })

  // Mock the profile query data if provided
  if (profile) {
    queryClient.setQueryData(profileKeys.detail(), profile)
  }

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

// Mock profile data
const mockOwnerProfile: UserProfile = {
  user: {
    id: '1',
    email: 'owner@example.com',
    firstName: 'Owner',
    lastName: 'User',
  },
  organization: {
    id: 'org-1',
    name: 'Test Organization',
    role: 'owner',
    memberCount: 10,
    createdAt: '2025-01-01T00:00:00Z',
  },
}

const mockAdminProfile: UserProfile = {
  user: {
    id: '2',
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
  },
  organization: {
    id: 'org-1',
    name: 'Test Organization',
    role: 'admin',
    memberCount: 10,
    createdAt: '2025-01-01T00:00:00Z',
  },
}

const mockUserProfile: UserProfile = {
  user: {
    id: '3',
    email: 'user@example.com',
    firstName: 'Regular',
    lastName: 'User',
  },
  organization: {
    id: 'org-1',
    name: 'Test Organization',
    role: 'user',
    memberCount: 10,
    createdAt: '2025-01-01T00:00:00Z',
  },
}

describe('useProfilePermissions', () => {
  describe('when profile is null', () => {
    it('should return false for all permissions', () => {
      const { result } = renderHook(() => useProfilePermissions(), {
        wrapper: createWrapper(null),
      })

      expect(result.current.isOwner()).toBe(false)
      expect(result.current.isAdmin()).toBe(false)
      expect(result.current.isOwnerOrAdmin()).toBe(false)
      expect(result.current.canManageInvitations()).toBe(false)
      expect(result.current.canManageMembers()).toBe(false)
      expect(result.current.canManageOrganization()).toBe(false)
      expect(result.current.canDeleteConversations()).toBe(false)
    })
  })

  describe('when user is owner', () => {
    it('should return true for owner-specific permissions', () => {
      const { result } = renderHook(() => useProfilePermissions(), {
        wrapper: createWrapper(mockOwnerProfile),
      })

      expect(result.current.isOwner()).toBe(true)
      expect(result.current.isAdmin()).toBe(false)
      expect(result.current.isOwnerOrAdmin()).toBe(true)
    })

    it('should allow all feature permissions', () => {
      const { result } = renderHook(() => useProfilePermissions(), {
        wrapper: createWrapper(mockOwnerProfile),
      })

      expect(result.current.canManageInvitations()).toBe(true)
      expect(result.current.canManageMembers()).toBe(true)
      expect(result.current.canManageOrganization()).toBe(true)
      expect(result.current.canDeleteConversations()).toBe(true)
    })

    it('should allow checking for multiple roles', () => {
      const { result } = renderHook(() => useProfilePermissions(), {
        wrapper: createWrapper(mockOwnerProfile),
      })

      expect(result.current.hasRole('owner')).toBe(true)
      expect(result.current.hasRole(['owner', 'admin'])).toBe(true)
      expect(result.current.hasRole(['admin', 'user'])).toBe(false)
    })
  })

  describe('when user is admin', () => {
    it('should return true for admin-specific permissions', () => {
      const { result } = renderHook(() => useProfilePermissions(), {
        wrapper: createWrapper(mockAdminProfile),
      })

      expect(result.current.isOwner()).toBe(false)
      expect(result.current.isAdmin()).toBe(true)
      expect(result.current.isOwnerOrAdmin()).toBe(true)
    })

    it('should allow most feature permissions except organization management', () => {
      const { result } = renderHook(() => useProfilePermissions(), {
        wrapper: createWrapper(mockAdminProfile),
      })

      expect(result.current.canManageInvitations()).toBe(true)
      expect(result.current.canManageMembers()).toBe(true)
      expect(result.current.canManageOrganization()).toBe(false) // Only owner
      expect(result.current.canDeleteConversations()).toBe(true)
    })

    it('should allow checking for multiple roles', () => {
      const { result } = renderHook(() => useProfilePermissions(), {
        wrapper: createWrapper(mockAdminProfile),
      })

      expect(result.current.hasRole('admin')).toBe(true)
      expect(result.current.hasRole(['owner', 'admin'])).toBe(true)
      expect(result.current.hasRole('owner')).toBe(false)
    })
  })

  describe('when user is regular user', () => {
    it('should return false for elevated permissions', () => {
      const { result } = renderHook(() => useProfilePermissions(), {
        wrapper: createWrapper(mockUserProfile),
      })

      expect(result.current.isOwner()).toBe(false)
      expect(result.current.isAdmin()).toBe(false)
      expect(result.current.isOwnerOrAdmin()).toBe(false)
    })

    it('should not allow any management feature permissions', () => {
      const { result } = renderHook(() => useProfilePermissions(), {
        wrapper: createWrapper(mockUserProfile),
      })

      expect(result.current.canManageInvitations()).toBe(false)
      expect(result.current.canManageMembers()).toBe(false)
      expect(result.current.canManageOrganization()).toBe(false)
      expect(result.current.canDeleteConversations()).toBe(false)
    })

    it('should only match user role', () => {
      const { result } = renderHook(() => useProfilePermissions(), {
        wrapper: createWrapper(mockUserProfile),
      })

      expect(result.current.hasRole('user')).toBe(true)
      expect(result.current.hasRole(['owner', 'admin'])).toBe(false)
      expect(result.current.hasRole(['user', 'admin'])).toBe(true)
    })
  })
})

describe('profileKeys', () => {
  it('should generate correct query keys', () => {
    expect(profileKeys.all).toEqual(['profile'])
    expect(profileKeys.detail()).toEqual(['profile', 'detail'])
  })
})
