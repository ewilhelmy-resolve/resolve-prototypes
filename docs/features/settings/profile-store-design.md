# Profile Store Design Document

## Overview

This document describes the design and implementation of a centralized Profile Store for the RITA Go frontend application. The Profile Store provides a single source of truth for user context, including user information and organization membership with role-based permissions.

## Problem Statement

Currently, the RITA Go frontend:
- ❌ Has no access to user's organization role
- ❌ Cannot implement role-based UI (show/hide features for owner/admin/user)
- ❌ Cannot enforce client-side permission checks
- ❌ Requires multiple API calls to get complete user context

The backend provides role information via:
- `GET /api/organizations/current` - Returns `{ id, name, user_role, member_count }`
- `GET /api/organizations` - Returns list with roles per org

But the frontend has no mechanism to fetch and store this data.

## Design Goals

1. **Single Source of Truth** - One place for all user context (user + org + role)
2. **Simple Developer Experience** - One hook (`useProfile()`) for all user data
3. **Type Safety** - Full TypeScript support with strict types
4. **Lifecycle Management** - Automatic fetch after login, clear on logout
5. **Permission Helpers** - Built-in methods for role checks (`isOwner()`, `canManageInvitations()`)
6. **Performance** - Cache profile data, avoid redundant fetches
7. **Separation of Concerns** - Keep auth (tokens) separate from profile (context)

## Architecture

### Hybrid Approach: TanStack Query + Zustand

RITA Go follows a **hybrid state management pattern** (consistent with existing patterns for conversations and data sources):

- **TanStack Query**: Manages server state (fetching, caching, invalidation, refetching)
- **Zustand Store**: Provides convenience accessors and permission helpers (read-only computed state)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Frontend State                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐    ┌─────────────────────────────────────┐  │
│  │   Auth Store     │    │      TanStack Query Cache           │  │
│  │  (authStore)     │    │                                     │  │
│  ├──────────────────┤    │  ┌───────────────────────────────┐ │  │
│  │ - authenticated  │    │  │  Profile Query                │ │  │
│  │ - token          │    │  │  Key: ['profile']             │ │  │
│  │ - refreshToken   │    │  │  Data: UserProfile            │ │  │
│  │ - tokenExpiry    │    │  │  - user (id, email, name)     │ │  │
│  │ - sessionReady   │    │  │  - organization (id, name,    │ │  │
│  │                  │    │  │      role, memberCount)       │ │  │
│  │ Actions:         │    │  │                               │ │  │
│  │ - login()        │    │  │  Auto-refetch on:             │ │  │
│  │ - logout()       │    │  │  - Window focus               │ │  │
│  │ - initialize()   │    │  │  - Manual invalidation        │ │  │
│  └──────────────────┘    │  │  - SSE events (future)        │ │  │
│         │                │  └───────────────────────────────┘ │  │
│         │                └─────────────────────────────────────┘  │
│         │                             │                           │
│         │                             │                           │
│         │                ┌────────────▼────────────────┐          │
│         └───────────────►│  useProfile() Hook          │          │
│                          │  (combines both sources)    │          │
│                          │                             │          │
│                          │  Returns:                   │          │
│                          │  - profile (from query)     │          │
│                          │  - loading, error (query)   │          │
│                          │  - refetch() (query)        │          │
│                          │  - isOwner() (computed)     │          │
│                          │  - isAdmin() (computed)     │          │
│                          │  - canManage*() (computed)  │          │
│                          └─────────────────────────────┘          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Benefits:**
- ✅ Automatic cache invalidation and refetching
- ✅ Stale-while-revalidate pattern (instant UI updates)
- ✅ Built-in loading, error states
- ✅ Window focus refetching
- ✅ Consistent with existing conversation/data source patterns
- ✅ Simple invalidation on mutations (`queryClient.invalidateQueries({ queryKey: profileKeys.detail() })`)

### Data Flow

```
┌─────────────┐
│ User Login  │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ AuthManager         │
│ - Keycloak auth     │
│ - Token management  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ POST /auth/login    │
│ Returns:            │
│ - session cookie    │
│ - user (id, email)  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ authStore.login()   │
│ - Sets auth state   │
│ - Triggers event    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────────────┐
│ profileStore.fetchProfile() │
│ - Fetches org + role        │
└──────┬──────────────────────┘
       │
       ▼
┌───────────────────────────────┐
│ GET /api/organizations/current│
│ Returns:                      │
│ - id, name, user_role,        │
│   member_count                │
└──────┬────────────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Profile Ready           │
│ - User can access app   │
│ - Role-based UI enabled │
└─────────────────────────┘
```

## Data Schema

### ProfileStore State

```typescript
interface ProfileState {
  // Data
  profile: UserProfile | null;

  // Loading states
  loading: boolean;
  initialized: boolean;

  // Error handling
  error: ProfileError | null;
}

interface UserProfile {
  user: UserInfo;
  organization: OrganizationInfo;
}

interface UserInfo {
  id: string;
  email: string;
  // Additional fields from Keycloak profile
  firstName?: string;
  lastName?: string;
  username?: string;
}

interface OrganizationInfo {
  id: string;
  name: string;
  role: OrganizationRole;
  memberCount: number;
  createdAt?: string;
}

type OrganizationRole = 'owner' | 'admin' | 'user';

class ProfileError extends Error {
  constructor(
    public code: ProfileErrorCode,
    message: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'ProfileError';
  }
}

type ProfileErrorCode =
  | 'FETCH_FAILED'
  | 'NETWORK_ERROR'
  | 'UNAUTHORIZED'
  | 'NOT_MEMBER';
```

### ProfileStore Actions

```typescript
interface ProfileActions {
  // Core actions
  fetchProfile: () => Promise<void>;
  clearProfile: () => void;

  // Permission helpers (computed)
  hasRole: (role: OrganizationRole | OrganizationRole[]) => boolean;
  isOwner: () => boolean;
  isAdmin: () => boolean;
  isOwnerOrAdmin: () => boolean;

  // Feature permission helpers
  canManageInvitations: () => boolean;
  canManageMembers: () => boolean;
  canManageOrganization: () => boolean;
  canDeleteConversations: () => boolean;

  // Error handling
  clearError: () => void;
}

export type ProfileStore = ProfileState & ProfileActions;
```

## API Integration

### Backend Endpoint

**Endpoint:** `GET /api/organizations/current`

**Response:**
```json
{
  "organization": {
    "id": "uuid",
    "name": "Acme Corp",
    "user_role": "admin",
    "member_count": 5,
    "created_at": "2025-10-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - No valid session
- `404 Not Found` - User not in any organization (shouldn't happen in Rita)
- `500 Internal Server Error` - Database error

### API Service

```typescript
// services/api.ts
export const organizationApi = {
  getCurrentOrganization: () =>
    apiRequest<{
      organization: {
        id: string;
        name: string;
        user_role: string;
        member_count: number;
        created_at: string;
      }
    }>('/api/organizations/current'),

  // Existing method
  switchOrganization: (organizationId: string) => { ... }
};
```

## Implementation Details

### Query Keys

**File:** `src/hooks/api/useProfile.ts`

```typescript
// Query keys for profile data
export const profileKeys = {
  all: ['profile'] as const,
  detail: () => [...profileKeys.all, 'detail'] as const,
}
```

### TanStack Query Hook

**File:** `src/hooks/api/useProfile.ts`

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
 * 
 */

export function useProfile() {
  const { user: authUser, authenticated, sessionReady } = useAuthStore()

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
 * 
 */
export function useProfilePermissions() {
  const { data: profile } = useProfile()

  const hasRole = (role: OrganizationRole | OrganizationRole[]) => {
    if (!profile?.organization.role) return false
    const roles = Array.isArray(role) ? role : [role]
    return roles.includes(profile.organization.role)
  }

  return {
    hasRole,
    isOwner: () => hasRole('owner'),
    isAdmin: () => hasRole('admin'),
    isOwnerOrAdmin: () => hasRole(['owner', 'admin']),

    // Feature permissions
    canManageInvitations: () => hasRole(['owner', 'admin']),
    canManageMembers: () => hasRole(['owner', 'admin']),
    canManageOrganization: () => hasRole('owner'),
    canDeleteConversations: () => hasRole(['owner', 'admin']),
  }
}
```

### Invalidation Patterns

When organization data changes (e.g., user updates organization name or settings), you need to invalidate the profile cache:

**Pattern 1: After Organization Update Mutation**
```typescript
// hooks/api/useOrganization.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { organizationApi } from '@/services/api'
import { profileKeys } from './useProfile'

export function useUpdateOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { name: string }) => {
      return await organizationApi.updateOrganization(data)
    },
    onSuccess: () => {
      // Invalidate profile to refetch with new organization data
      queryClient.invalidateQueries({ queryKey: profileKeys.detail() })

      toast.success('Organization updated successfully')
    },
  })
}

// Usage in component:
function OrganizationSettings() {
  const updateOrg = useUpdateOrganization()

  const handleSubmit = (data) => {
    updateOrg.mutate({ name: data.organizationName })
  }
}
```

**Pattern 2: After Role Change (via SSE)**
```typescript
// contexts/SSEContext.tsx
import { useQueryClient } from '@tanstack/react-query'
import { profileKeys } from '@/hooks/api/useProfile'

export const SSEProvider: React.FC<SSEProviderProps> = ({ children }) => {
  const queryClient = useQueryClient()

  const handleMessage = useCallback((event: SSEEvent) => {
    // ... existing message handlers

    if (event.type === 'organization_update') {
      console.log('[SSE] Organization update received:', event.data)

      // Invalidate profile to refetch with updated data
      queryClient.invalidateQueries({ queryKey: profileKeys.detail() })

      // Show toast if needed
      if (event.data.updateType === 'name') {
        toast.info('Organization name updated')
      } else if (event.data.updateType === 'role') {
        toast.info('Your role has been updated')
      }
    }
  }, [queryClient])

  // ... rest of SSE setup
}
```

**Pattern 3: Manual Refetch**
```typescript
// Component that allows manual profile refresh
function ProfileRefreshButton() {
  const { refetch, isFetching } = useProfile()

  return (
    <Button
      onClick={() => refetch()}
      disabled={isFetching}
    >
      {isFetching ? 'Refreshing...' : 'Refresh Profile'}
    </Button>
  )
}
```

**Pattern 4: Optimistic Update (Advanced)**
```typescript
export function useUpdateOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { name: string }) => {
      return await organizationApi.updateOrganization(data)
    },

    // Optimistically update cache before API response
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: profileKeys.detail() })

      // Snapshot current value
      const previousProfile = queryClient.getQueryData(profileKeys.detail())

      // Optimistically update
      queryClient.setQueryData(profileKeys.detail(), (old: UserProfile) => ({
        ...old,
        organization: {
          ...old.organization,
          name: newData.name,
        },
      }))

      return { previousProfile }
    },

    // Rollback on error
    onError: (err, newData, context) => {
      queryClient.setQueryData(profileKeys.detail(), context.previousProfile)
      toast.error('Failed to update organization')
    },

    // Always refetch after mutation
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.detail() })
    },
  })
}
```

## Integration with Existing Auth Flow

### Current Auth Flow (Before)

```
1. User visits app
2. authStore.initialize()
3. AuthManager checks Keycloak
4. If authenticated:
   - Get JWT tokens
   - POST /auth/login (create session cookie)
   - authStore sets: { authenticated: true, user, token }
   - sessionReady = true
5. App renders with user data
```

### New Auth Flow (After)

```
1. User visits app
2. authStore.initialize()
3. AuthManager checks Keycloak
4. If authenticated:
   - Get JWT tokens
   - POST /auth/login (create session cookie)
   - authStore sets: { authenticated: true, user, token }
   - sessionReady = true

   NEW STEP:
   5. useProfile() hook detects sessionReady
   6. profileStore.fetchProfile()
   7. GET /api/organizations/current
   8. profileStore sets: { profile: { user, organization } }

9. App renders with full user context (user + org + role)
```

### Logout Flow

```
1. User clicks logout
2. authStore.logout()
3. DELETE /auth/logout (clear session cookie)
4. AuthManager.logout() (clear Keycloak tokens)
5. authStore sets: { authenticated: false, user: null }

   NEW STEP:
   6. useProfile() detects !authenticated
   7. profileStore.clearProfile()

8. Redirect to login
```

## Usage Examples

### Example 1: Role-Based UI

```tsx
import { useProfile, useProfilePermissions } from '@/hooks/api/useProfile'

function InviteUsersButton() {
  const { canManageInvitations } = useProfilePermissions()

  // Hide button for regular users
  if (!canManageInvitations()) {
    return null
  }

  return (
    <Button onClick={handleInvite}>
      Invite Users
    </Button>
  )
}
```

### Example 2: Role Display

```tsx
import { useProfile } from '@/hooks/api/useProfile'

function UserProfileCard() {
  const { data: profile, isLoading, error } = useProfile()

  if (isLoading) return <Skeleton />
  if (error) return <ErrorAlert error={error} />
  if (!profile) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{profile.user.email}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Organization: {profile.organization.name}</p>
        <Badge variant={getRoleBadgeVariant(profile.organization.role)}>
          {profile.organization.role}
        </Badge>
      </CardContent>
    </Card>
  )
}
```

### Example 3: Permission Check in Handler

```tsx
import { useProfilePermissions } from '@/hooks/api/useProfile'

function DeleteConversationButton({ conversationId }: Props) {
  const { canDeleteConversations } = useProfilePermissions()

  const handleDelete = async () => {
    // Double-check permission (backend will also check)
    if (!canDeleteConversations()) {
      toast.error('You do not have permission to delete conversations')
      return
    }

    await conversationApi.delete(conversationId)
    toast.success('Conversation deleted')
  }

  return (
    <Button
      onClick={handleDelete}
      disabled={!canDeleteConversations()}
    >
      Delete
    </Button>
  )
}
```

### Example 4: Conditional Routing

```tsx
import { useProfile, useProfilePermissions } from '@/hooks/api/useProfile'
import { Navigate } from 'react-router-dom'

function AdminPage() {
  const { data: profile, isLoading } = useProfile()
  const { isOwnerOrAdmin } = useProfilePermissions()

  if (isLoading) return <LoadingPage />

  if (!isOwnerOrAdmin()) {
    return <Navigate to="/chat" replace />
  }

  return (
    <div>
      <h1>Admin Dashboard</h1>
      {/* Admin content */}
    </div>
  )
}
```

### Example 5: Update Organization with Invalidation

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { organizationApi } from '@/services/api'
import { profileKeys } from '@/hooks/api/useProfile'

function OrganizationSettingsForm() {
  const { data: profile } = useProfile()
  const queryClient = useQueryClient()

  const updateOrg = useMutation({
    mutationFn: (data: { name: string }) =>
      organizationApi.updateOrganization(data),
    onSuccess: () => {
      // Profile cache automatically refetches with new org name
      queryClient.invalidateQueries({ queryKey: profileKeys.detail() })
      toast.success('Organization updated')
    },
  })

  const handleSubmit = (values: { name: string }) => {
    updateOrg.mutate(values)
  }

  return (
    <Form onSubmit={handleSubmit}>
      <Input
        name="name"
        defaultValue={profile?.organization.name}
      />
      <Button type="submit" disabled={updateOrg.isPending}>
        {updateOrg.isPending ? 'Saving...' : 'Save'}
      </Button>
    </Form>
  )
}
```

## Error Handling

### Error States

```typescript
// Profile fetch failed
{
  profile: null,
  loading: false,
  error: ProfileError('FETCH_FAILED', 'Failed to fetch profile')
}

// Network error
{
  profile: null,
  loading: false,
  error: ProfileError('NETWORK_ERROR', 'Network request failed')
}

// User not authenticated
{
  profile: null,
  loading: false,
  error: ProfileError('UNAUTHORIZED', 'User not authenticated')
}
```

### Error UI Example

```tsx
function ProfileErrorBoundary({ children }: Props) {
  const { error, refetch, isError } = useProfile()

  if (isError && error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Failed to load profile</AlertTitle>
        <AlertDescription>
          {error.message}
          <Button onClick={() => refetch()}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return <>{children}</>
}
```

## Testing Strategy

### Unit Tests

```typescript
// hooks/__tests__/useProfilePermissions.test.tsx
import { renderHook } from '@testing-library/react'
import { useProfile, useProfilePermissions } from '@/hooks/api/useProfile'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const createWrapper = (profile: UserProfile | null) => {
  const queryClient = new QueryClient()

  // Mock the profile query data
  if (profile) {
    queryClient.setQueryData(['profile', 'detail'], profile)
  }

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useProfilePermissions', () => {
  it('should return false for all permissions when no profile', () => {
    const { result } = renderHook(() => useProfilePermissions(), {
      wrapper: createWrapper(null),
    })

    expect(result.current.isOwner()).toBe(false)
    expect(result.current.canManageInvitations()).toBe(false)
  })

  it('should check owner permissions correctly', () => {
    const mockProfile: UserProfile = {
      user: { id: '1', email: 'owner@example.com' },
      organization: { id: '1', name: 'Test Org', role: 'owner', memberCount: 5 },
    }

    const { result } = renderHook(() => useProfilePermissions(), {
      wrapper: createWrapper(mockProfile),
    })

    expect(result.current.isOwner()).toBe(true)
    expect(result.current.isAdmin()).toBe(false)
    expect(result.current.isOwnerOrAdmin()).toBe(true)
    expect(result.current.canManageInvitations()).toBe(true)
    expect(result.current.canManageOrganization()).toBe(true)
  })

  it('should check admin permissions correctly', () => {
    const mockProfile: UserProfile = {
      user: { id: '1', email: 'admin@example.com' },
      organization: { id: '1', name: 'Test Org', role: 'admin', memberCount: 5 },
    }

    const { result } = renderHook(() => useProfilePermissions(), {
      wrapper: createWrapper(mockProfile),
    })

    expect(result.current.isOwner()).toBe(false)
    expect(result.current.isAdmin()).toBe(true)
    expect(result.current.isOwnerOrAdmin()).toBe(true)
    expect(result.current.canManageInvitations()).toBe(true)
    expect(result.current.canManageOrganization()).toBe(false) // Only owner
  })

  it('should check user permissions correctly', () => {
    const mockProfile: UserProfile = {
      user: { id: '1', email: 'user@example.com' },
      organization: { id: '1', name: 'Test Org', role: 'user', memberCount: 5 },
    }

    const { result } = renderHook(() => useProfilePermissions(), {
      wrapper: createWrapper(mockProfile),
    })

    expect(result.current.isOwner()).toBe(false)
    expect(result.current.isOwnerOrAdmin()).toBe(false)
    expect(result.current.canManageInvitations()).toBe(false)
  })
})
```

### Integration Tests

```typescript
// hooks/__tests__/useProfile.test.tsx
describe('useProfile', () => {
  it('should auto-fetch when authenticated', async () => {
    const { result } = renderHook(() => useProfile(), {
      wrapper: ({ children }) => (
        <AuthProvider authenticated={true} sessionReady={true}>
          {children}
        </AuthProvider>
      ),
    })

    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })
  })

  it('should invalidate on logout', () => {
    const { result } = renderHook(() => useProfile())

    // Profile should be disabled when not authenticated
    expect(result.current.fetchStatus).toBe('idle')
  })
})
```

## Performance Considerations

### Caching Strategy (TanStack Query)
- **Stale-While-Revalidate**: Shows cached data immediately, refetches in background
- **Stale Time**: 5 minutes (profile data changes infrequently)
- **Garbage Collection**: 10 minutes (formerly cacheTime)
- **Automatic Refetching**: On window focus, network reconnection
- **Manual Invalidation**: Via `queryClient.invalidateQueries()`

### When Profile Refetches
- Initial authentication (when `enabled: true`)
- Window focus (user returns to tab)
- Network reconnection (after being offline)
- Manual refetch (`refetch()` call)
- Cache invalidation (mutations, SSE events)

### Bundle Size
- TanStack Query: Already included (~15KB)
- No additional dependencies needed
- Profile types: ~1KB

### Network Requests
- One API call after login: `GET /api/organizations/current`
- Response size: ~200 bytes
- Cached for 5 minutes (staleTime)
- Background refetch is non-blocking

### Comparison to Zustand-Only Approach

| Feature | TanStack Query | Zustand Only |
|---------|---------------|--------------|
| Cache invalidation | ✅ Built-in | ❌ Manual |
| Stale-while-revalidate | ✅ Built-in | ❌ Manual |
| Window focus refetch | ✅ Built-in | ❌ Manual |
| Loading states | ✅ Built-in | ✅ Manual |
| Error handling | ✅ Built-in | ✅ Manual |
| Optimistic updates | ✅ Built-in | ✅ Manual |
| Bundle size | ~15KB (shared) | ~4KB |

**Decision**: Use TanStack Query for consistency with existing patterns (conversations, data sources, files).

## Migration Plan

### Phase 1: Implementation (Day 1-2)
- [ ] Create `types/profile.ts` with TypeScript interfaces
- [ ] Add `organizationApi.getCurrentOrganization()` to `services/api.ts`
- [ ] Create `hooks/api/useProfile.ts` with TanStack Query implementation
- [ ] Export `profileKeys` for cache invalidation
- [ ] Write unit tests for permission helpers

### Phase 2: Integration (Day 2-3)
- [ ] Update SSE context to invalidate profile cache on organization updates
- [ ] Add profile query to existing QueryProvider
- [ ] Test auto-fetch on login
- [ ] Test cache invalidation patterns
- [ ] Verify window focus refetching works

### Phase 3: Adoption (Day 3-5)
- [ ] Update invitation UI to use `canManageInvitations()`
- [ ] Add role badges to user profile displays
- [ ] Update member management UI
- [ ] Add admin-only sections with permission checks
- [ ] Document usage in CLAUDE.md

### Phase 4: Validation (Day 5)
- [ ] E2E tests for role-based access
- [ ] Manual testing with different roles (owner, admin, user)
- [ ] Test cache invalidation after org name change
- [ ] Test SSE-based profile updates
- [ ] Security review (verify backend always validates)
- [ ] Performance testing (profile fetch < 200ms)

## Security Considerations

### Client-Side Permissions
⚠️ **Important:** Client-side permission checks are for **UX only**, NOT security.

- Client-side checks hide/show UI elements
- Backend MUST always validate permissions
- Never trust client-side role data for security decisions

### Backend Validation
All protected endpoints use `requireRole` middleware:
```typescript
router.post('/api/invitations/send',
  authenticateUser,
  requireRole(['owner', 'admin']),
  handler
);
```

Backend always queries database for role, never trusts client.

## Future Enhancements

### Multi-Organization Support
If Rita later supports multiple organizations:

```typescript
interface ProfileState {
  profile: UserProfile | null;
  organizations: OrganizationInfo[];  // List of all orgs
  activeOrganizationId: string | null;

  // New actions
  switchOrganization: (orgId: string) => Promise<void>;
  listOrganizations: () => Promise<void>;
}
```

### Real-Time Updates
If role changes should update immediately:
- Subscribe to SSE events for role changes
- Auto-refresh profile on `organization:role_updated` event

### Caching with TTL
Add cache expiration:
```typescript
interface ProfileState {
  profile: UserProfile | null;
  lastFetchedAt: number | null;
  ttl: number; // 5 minutes

  // Auto-refresh if stale
  shouldRefresh: () => boolean;
}
```

## Open Questions

1. **Should we persist profile to localStorage?**
   - Pro: Faster initial load
   - Con: Stale data risk
   - **Decision:** No - always fetch fresh on login

2. **Should profile fetch be blocking?**
   - Pro: Guarantees role data before rendering
   - Con: Slower time-to-interactive
   - **Decision:** Non-blocking, show loading state

3. **What happens if profile fetch fails?**
   - Option A: Block app, show error
   - Option B: Show degraded experience (hide role-based features)
   - **Decision:** Show error with retry, allow basic app usage

4. **Should we add organization switching in v1?**
   - **Decision:** No - out of scope (single-org constraint)

## Success Metrics

- ✅ Profile fetch < 200ms
- ✅ Zero redundant API calls
- ✅ 100% type safety
- ✅ No permission bypass bugs
- ✅ Clear error messages
- ✅ Simple developer experience

## References

- Backend API: `packages/api-server/src/routes/organizations.ts`
- Auth Middleware: `packages/api-server/src/middleware/auth.ts`
- Auth Store: `packages/client/src/stores/auth-store.ts`
- Auth Types: `packages/client/src/types/auth.ts`

---

**Document Status:** Draft
**Last Updated:** 2025-10-14
**Author:** Claude (AI Assistant)
**Reviewers:** Pending