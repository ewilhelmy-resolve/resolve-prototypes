import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { organizationApi } from '@/services/api'
import { useAuthStore } from '@/stores/auth-store'
import type { UserProfile, OrganizationRole } from '@/types/profile'

// Query keys
export const profileKeys = {
  all: ['profile'] as const,
  detail: () => [...profileKeys.all, 'detail'] as const,
}

/**
 * Hook to fetch and access user profile (user + organization + role)
 *
 * Uses TanStack Query for server state management with automatic:
 * - Caching (stale-while-revalidate)
 * - Refetching on window focus
 * - Error handling and retries
 * - Loading states
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { data: profile, isLoading, error, refetch } = useProfile();
 *   const { isOwner, canManageInvitations } = useProfilePermissions();
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage error={error} />;
 *   if (!profile) return <NotAuthenticated />;
 *
 *   return (
 *     <div>
 *       <h1>Welcome {profile.user.email}</h1>
 *       <p>Organization: {profile.organization.name}</p>
 *       <p>Role: {profile.organization.role}</p>
 *
 *       {canManageInvitations() && <InviteButton />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useProfile() {
  const { user: authUser, authenticated, sessionReady } = useAuthStore()
  const queryClient = useQueryClient()

  // Clear profile cache when user logs out
  useEffect(() => {
    if (!authenticated) {
      queryClient.removeQueries({ queryKey: profileKeys.all })
    }
  }, [authenticated, queryClient])

  return useQuery({
    queryKey: profileKeys.detail(),
    queryFn: async () => {
      if (!authUser) {
        throw new Error('User not authenticated')
      }

      const { organization } = await organizationApi.getCurrentOrganization()

      const profile: UserProfile = {
        user: {
          id: authUser.id || '',
          email: authUser.email || '',
          firstName: authUser.firstName,
          lastName: authUser.lastName,
          username: authUser.username,
        },
        organization: {
          id: organization.id,
          name: organization.name,
          role: organization.user_role as OrganizationRole,
          memberCount: organization.member_count,
          createdAt: organization.created_at,
        },
      }

      return profile
    },
    enabled: authenticated && sessionReady && !!authUser,
    staleTime: 1000 * 60 * 5, // 5 minutes (profile data doesn't change often)
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    retry: 2,
  })
}

/**
 * Hook for permission helpers (computed from profile data)
 *
 * Provides role-based permission checks without directly exposing role.
 * All methods return `false` if profile is not loaded yet.
 *
 * @example
 * ```tsx
 * function AdminPanel() {
 *   const { isOwnerOrAdmin, canManageInvitations } = useProfilePermissions();
 *
 *   if (!isOwnerOrAdmin()) {
 *     return <Navigate to="/chat" />;
 *   }
 *
 *   return (
 *     <div>
 *       {canManageInvitations() && <InviteUsersSection />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useProfilePermissions() {
  const { data: profile } = useProfile()

  // Demo mode: grant full admin access
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'

  const hasRole = (role: OrganizationRole | OrganizationRole[]) => {
    // In demo mode, always return true for admin/owner checks
    if (isDemoMode) return true
    if (!profile?.organization.role) return false
    const roles = Array.isArray(role) ? role : [role]
    return roles.includes(profile.organization.role)
  }

  return {
    hasRole,
    isOwner: () => isDemoMode || hasRole('owner'),
    isAdmin: () => isDemoMode || hasRole('admin'),
    isOwnerOrAdmin: () => isDemoMode || hasRole(['owner', 'admin']),

    // Feature permissions
    canManageInvitations: () => isDemoMode || hasRole(['owner', 'admin']),
    canManageMembers: () => isDemoMode || hasRole(['owner', 'admin']),
    canManageOrganization: () => isDemoMode || hasRole('owner'),
    canDeleteConversations: () => isDemoMode || hasRole(['owner', 'admin']),
    canManageFiles: () => isDemoMode || hasRole(['owner', 'admin']),
  }
}
