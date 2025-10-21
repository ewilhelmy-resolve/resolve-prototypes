import { Loader2 } from "lucide-react";
import type React from "react";
import { Toaster } from "@/components/ui/sonner";
import { useProfile } from "@/hooks/api/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { CrashPage } from "@/components/CrashPage";
import { CitationProvider } from "./contexts/CitationContext";
import { QueryProvider } from "./providers/QueryProvider";
import { AppRouter } from "./router";

const AppContent: React.FC = () => {
	const { authenticated, sessionReady } = useAuth();
	const {
		isLoading: isLoadingProfile,
		error: profileError,
		failureCount,
	} = useProfile();

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
			<CrashPage
				title="Unable to load your profile"
				description="We couldn't load your profile after multiple attempts. Please sign in again."
				actionLabel="Go to Login"
				onAction={() => {
					window.location.href = '/login';
				}}
				icon={
					<div className="rounded-full bg-destructive/10 p-3">
						<Loader2 className="h-8 w-8 text-destructive" />
					</div>
				}
			/>
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
