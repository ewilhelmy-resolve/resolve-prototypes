import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type React from "react";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { useProfile } from "@/hooks/api/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { CitationProvider } from "./contexts/CitationContext";
import { QueryProvider } from "./providers/QueryProvider";
import { AppRouter } from "./router";

const AppContent: React.FC = () => {
	const { authenticated, sessionReady, logout } = useAuth();
	const queryClient = useQueryClient();
	const {
		isLoading: isLoadingProfile,
		error: profileError,
		failureCount,
	} = useProfile();

	// Force logout if profile fetch fails after all retries (initial + 2 retries = 3 total attempts)
	useEffect(() => {
		if (authenticated && sessionReady && profileError && !isLoadingProfile && failureCount >= 3) {
			// All retries exhausted, force Keycloak logout
			console.log('Profile fetch failed after all retries, forcing logout', {
				failureCount,
				error: profileError
			});

			// Clear all cached data first
			queryClient.clear();

			// Force logout - this will clear Keycloak session and redirect to login
			logout(`${window.location.origin}/login`);
		}
	}, [authenticated, sessionReady, profileError, isLoadingProfile, failureCount, queryClient, logout]);

	// Show loading while profile is being fetched or retrying after login
	// This includes: initial load + retry attempts (but not when retries exhausted)
	if (authenticated && sessionReady && isLoadingProfile) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background">
				<div className="flex flex-col items-center gap-4">
					<Loader2 className="h-8 w-8 animate-spin text-primary" />
					<p className="text-muted-foreground">Loading...</p>
				</div>
			</div>
		);
	}

	// If profile fetch failed after all retries, show error and prompt re-login
	if (authenticated && sessionReady && profileError && failureCount >= 3) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background p-4">
				<div className="flex flex-col items-center gap-4 text-center max-w-md">
					<div className="rounded-full bg-destructive/10 p-3">
						<Loader2 className="h-8 w-8 text-destructive" />
					</div>
					<div>
						<h2 className="text-lg font-semibold">Unable to load your profile</h2>
						<p className="text-sm text-muted-foreground mt-1">
							We couldn't load your profile after multiple attempts. Please sign in again.
						</p>
					</div>
					<button
						onClick={() => {
							window.location.href = '/login';
						}}
						className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
					>
						Go to Login
					</button>
				</div>
			</div>
		);
	}

	return (
		<>
			<AppRouter />
			<Toaster />
		</>
	);
};

const App: React.FC = () => {
	return (
		<QueryProvider>
			<CitationProvider defaultVariant="collapsible-list">
				<AppContent />
			</CitationProvider>
		</QueryProvider>
	);
};

export default App;
