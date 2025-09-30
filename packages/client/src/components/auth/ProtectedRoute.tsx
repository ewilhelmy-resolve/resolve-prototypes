import type React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store.ts';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { authenticated, loading, initialized, error } = useAuthStore();

  // Wait for initialization to complete
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

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}