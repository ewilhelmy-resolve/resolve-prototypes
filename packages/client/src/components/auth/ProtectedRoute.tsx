import type React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store.ts';
import { SSEProvider } from '@/contexts/SSEContext';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { authenticated, loading, initialized, error } = useAuthStore();
  const apiUrl = import.meta.env.VITE_API_URL || '';

  // Demo mode: bypass auth completely
  if (DEMO_MODE) {
    return (
      <SSEProvider apiUrl={apiUrl} enabled={true}>
        {children}
      </SSEProvider>
    );
  }

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

  // Wrap authenticated content with SSEProvider
  // This ensures SSE is available to all protected routes
  return (
    <SSEProvider
      apiUrl={apiUrl}
      enabled={authenticated && initialized}
    >
      {children}
    </SSEProvider>
  );
}