import { Loader2 } from "lucide-react";
import type React from "react";
import { Toaster } from "@/components/ui/sonner";
import { useProfile } from "@/hooks/api/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { CitationProvider } from "./contexts/CitationContext";
import { QueryProvider } from "./providers/QueryProvider";
import { AppRouter } from "./router";

const AppContent: React.FC = () => {
	const { authenticated, sessionReady } = useAuth();
	const {
		isLoading: isLoadingProfile,
		error: profileError,
	} = useProfile();

	// Show loading while profile is being fetched after login
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

	// Show error with retry option if profile fetch fails
	if (authenticated && sessionReady && profileError) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background p-4">
				<div className="flex flex-col items-center gap-4 text-center max-w-md">
					<div className="rounded-full bg-destructive/10 p-3">
						<Loader2 className="h-8 w-8 text-destructive" />
					</div>
					<div>
						<h2 className="text-lg font-semibold">Failed to load profile</h2>
						<p className="text-sm text-muted-foreground mt-1">
							We couldn't load your profile information. Please try refreshing
							the page.
						</p>
					</div>
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
