import type React from "react";
import { Navigate } from "react-router-dom";
import { CrashPage } from "@/components/CrashPage";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SSEProvider } from "@/contexts/SSEContext";
import { useAuthStore } from "@/stores/auth-store.ts";

interface ProtectedRouteProps {
	children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
	const { authenticated, loading, initialized, error } = useAuthStore();
	const apiUrl = import.meta.env.VITE_API_URL || "";

	// Wait for initialization to complete
	if (!initialized || loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-lg">
					{error ? "Authentication Error" : "Loading..."}
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

	// Wrap authenticated content with SSEProvider and ErrorBoundary
	// This ensures SSE is available to all protected routes and errors are caught
	return (
		<SSEProvider apiUrl={apiUrl} enabled={authenticated && initialized}>
			<ErrorBoundary
				fallback={(_error, reset) => (
					<CrashPage
						fullScreen={false}
						title="Something went wrong"
						description="An unexpected error occurred. Please try again."
						actionLabel="Go Back"
						onAction={() => window.history.back()}
						onRefresh={reset}
					/>
				)}
			>
				{children}
			</ErrorBoundary>
		</SSEProvider>
	);
}
