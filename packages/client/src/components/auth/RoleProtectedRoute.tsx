import type React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { useProfile } from '@/hooks/api/useProfile';
import { SSEProvider } from '@/contexts/SSEContext';
import type { OrganizationRole } from '@/types/profile';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: OrganizationRole[];
  redirectTo?: string;
}

/**
 * RoleProtectedRoute - Protects routes based on user roles
 *
 * This component ensures:
 * 1. User is authenticated (via auth store)
 * 2. User's profile is loaded (via TanStack Query)
 * 3. User has one of the required roles
 *
 * @example
 * ```tsx
 * <RoleProtectedRoute allowedRoles={['owner', 'admin']}>
 *   <FilesV1Page />
 * </RoleProtectedRoute>
 * ```
 */
export function RoleProtectedRoute({
  children,
  allowedRoles,
  redirectTo = '/chat'
}: RoleProtectedRouteProps) {
  const { authenticated, loading, initialized, error } = useAuthStore();
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const apiUrl = import.meta.env.VITE_API_URL || '';

  // Demo mode: bypass auth and role checks
  if (DEMO_MODE) {
    return (
      <SSEProvider apiUrl={apiUrl} enabled={true}>
        {children}
      </SSEProvider>
    );
  }

  // Wait for auth initialization
  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">
          {error ? 'Authentication Error' : 'Loading...'}
        </div>
        {error && (
          <div className="mt-4 text-sm text-red-600 max-w-md text-center">
            {error.message}
          </div>
        )}
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  // Wait for profile to load
  if (isProfileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading profile...</div>
      </div>
    );
  }

  // Check if user has required role
  const userRole = profile?.organization.role;
  const hasRequiredRole = userRole && allowedRoles.includes(userRole);

  if (!hasRequiredRole) {
    return <Navigate to={redirectTo} replace />;
  }

  // Wrap authenticated content with SSEProvider
  return (
    <SSEProvider
      apiUrl={apiUrl}
      enabled={authenticated && initialized}
    >
      {children}
    </SSEProvider>
  );
}