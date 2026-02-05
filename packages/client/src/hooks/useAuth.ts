import { useMemo } from "react";
import { useAuthStore } from "../stores/auth-store";

export function useAuth() {
	const store = useAuthStore();

	// Memoize computed values to prevent unnecessary re-renders
	const computedValues = useMemo(
		() => ({
			isTokenExpired: store.tokenExpiry
				? Date.now() / 1000 > store.tokenExpiry
				: false,
			timeToExpiry: store.tokenExpiry
				? Math.max(0, store.tokenExpiry - Date.now() / 1000)
				: null,
			isSessionExpired: store.sessionExpiry
				? Date.now() / 1000 > store.sessionExpiry
				: false,
		}),
		[store.tokenExpiry, store.sessionExpiry],
	);

	return {
		// Core state
		authenticated: store.authenticated,
		loading: store.loading,
		initialized: store.initialized,
		user: store.user,
		token: store.token,
		sessionReady: store.sessionReady,
		error: store.error,
		retryCount: store.retryCount,

		// UI state
		loginRedirectPath: store.loginRedirectPath,

		// Actions
		login: store.login,
		logout: store.logout,
		refreshToken: store.refreshAuthToken,
		clearError: store.clearError,
		retry: store.retry,
		silentLogin: store.silentLogin,

		// Session management
		clearSession: store.clearSession,

		// Computed values
		...computedValues,

		// Utility methods
		hasValidToken: () => store.token && !computedValues.isTokenExpired,
		hasValidSession: () =>
			store.sessionReady && !computedValues.isSessionExpired,

		// User info helpers
		getUserId: () => store.user?.id,
		getUserEmail: () => store.user?.email,
		getUserName: () =>
			store.user?.username || (store.user as any)?.preferredUsername,
		getFullName: () => {
			if (!store.user) return null;
			const first = store.user.firstName || "";
			const last = store.user.lastName || "";
			return `${first} ${last}`.trim() || null;
		},
	};
}

// Selector hooks for specific parts of auth state (to minimize re-renders)
export const useAuthStatus = () =>
	useAuthStore((state) => ({
		authenticated: state.authenticated,
		loading: state.loading,
		initialized: state.initialized,
	}));

export const useAuthUser = () => useAuthStore((state) => state.user);

export const useAuthError = () =>
	useAuthStore((state) => ({
		error: state.error,
		retryCount: state.retryCount,
		clearError: state.clearError,
		retry: state.retry,
	}));

export const useAuthActions = () =>
	useAuthStore((state) => ({
		login: state.login,
		logout: state.logout,
		refreshToken: state.refreshAuthToken,
	}));

export default useAuth;
