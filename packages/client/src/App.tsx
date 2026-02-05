import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type React from "react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Toaster } from "@/components/ui/sonner";
import { useProfile } from "@/hooks/api/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { usePendo } from "@/hooks/usePendo";
import { usePlatformFlagsInit } from "@/hooks/usePlatformFlags";
import { CrashPage } from "@/components/CrashPage";
import { CitationProvider } from "./contexts/CitationContext";
import { QueryProvider } from "./providers/QueryProvider";
import { AppRouter } from "./router";

const AppContent: React.FC = () => {
	const { t } = useTranslation(["errors", "common"]);
	const { authenticated, sessionReady, logout } = useAuth();
	const queryClient = useQueryClient();
	const {
		isLoading: isLoadingProfile,
		error: profileError,
		failureCount,
	} = useProfile();

	// Initialize Pendo analytics when user logs in
	usePendo();

	// Initialize platform feature flags after profile loads
	usePlatformFlagsInit();

	// Force logout if profile fetch fails after all retries (initial + 2 retries = 3 total attempts)
	useEffect(() => {
		if (authenticated && sessionReady && profileError && !isLoadingProfile && failureCount >= 3) {
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
					<p className="text-muted-foreground">{t("common:states.loading")}</p>
				</div>
			</div>
		);
	}

	// If profile fetch failed after all retries, show error and prompt re-login
	if (authenticated && sessionReady && profileError && failureCount >= 3) {
		return (
			<CrashPage
				title={t("errors:generic.profileLoad.title")}
				description={t("errors:generic.profileLoad.description")}
				actionLabel={t("common:actions.goToLogin")}
				onAction={() => {
					window.location.href = '/login';
				}}
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
