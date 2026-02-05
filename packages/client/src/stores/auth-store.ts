import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { authManager } from "../services/auth-manager";
import { AuthError, type AuthStore, type User, keycloakProfileToUser } from "../types/auth";
import type { KeycloakProfile } from "keycloak-js";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

// Helper to ensure user is always User type
const normalizeUser = (user: User | KeycloakProfile | null): User | null => {
	if (!user) return null;
	// If it's already a User (has required 'id' as string), return as is
	if ('id' in user && typeof user.id === 'string') return user as User;
	// Otherwise convert KeycloakProfile to User
	return keycloakProfileToUser(user as KeycloakProfile);
};

const useAuthStore = create<AuthStore>()(
	persist(
		immer((set, get) => {
			// Set up event listeners for AuthManager
			const setupEventListeners = () => {
				authManager.on("auth:success", (result) => {
					set((state) => {
						state.authenticated = result.authenticated;
						state.user = normalizeUser(result.user);
						state.token = result.token;
						state.refreshToken = result.refreshToken;
						state.tokenExpiry = result.tokenExpiry;
						if (result.sessionReady) {
							state.sessionReady = true;
						}
						state.error = null;
						state.retryCount = 0;
					});
				});

				authManager.on("auth:error", (error) => {
					console.log("AuthStore: Received auth:error event", error);
					set((state) => {
						state.error = error;
						state.loading = false;
					});
				});

				authManager.on("auth:force-logout", () => {
					console.log("AuthStore: Received auth:force-logout event");
					get().logout();
				});

				authManager.on(
					"token:refreshed",
					({ token, refreshToken, tokenExpiry }) => {
						console.log("AuthStore: Received token:refreshed event");
						set((state) => {
							state.token = token;
							state.refreshToken = refreshToken;
							state.tokenExpiry = tokenExpiry;
						});
					},
				);

				authManager.on("session:ready", () => {
					set((state) => {
						state.sessionReady = true;
					});
				});

				authManager.on("session:error", (error) => {
					console.warn("AuthStore: Session error:", error);
					// Don't fail auth on session errors, just log them
				});
			};

			// Initialize event listeners immediately
			setupEventListeners();

			return {
				// Initial state
				authenticated: false,
				loading: true,
				initialized: false,
				user: null,
				token: null,
				refreshToken: null,
				tokenExpiry: null,
				sessionReady: false,
				sessionExpiry: null,
				loginRedirectPath: null,
				error: null,
				retryCount: 0,

				// Actions
				initialize: async () => {
					const state = get();
					if (state.initialized) {
						console.log("AuthStore: Already initialized");
						return;
					}

					console.log("AuthStore: Starting initialization");
					set((state) => {
						state.loading = true;
						state.error = null;
					});

					try {
						const result = await authManager.initialize();

						set((state) => {
							state.authenticated = result.authenticated;
							// Don't set user here - let auth:success event handler set it from backend
							state.token = result.token;
							state.refreshToken = result.refreshToken;
							state.tokenExpiry = result.tokenExpiry;
							state.initialized = true;
							state.loading = false;

							if (result.sessionReady) {
								state.sessionReady = true;
							}
						});

					} catch (error) {
						console.error("AuthStore: Initialization failed:", error);
						set((state) => {
							state.error =
								error instanceof AuthError
									? error
									: new AuthError("INIT_FAILED", "Unknown error");
							state.loading = false;
							state.initialized = true;
						});
					}
				},

				reset: () => {
					console.log("AuthStore: Resetting state");
					set((state) => {
						state.authenticated = false;
						state.loading = true;
						state.initialized = false;
						state.user = null;
						state.token = null;
						state.refreshToken = null;
						state.tokenExpiry = null;
						state.sessionReady = false;
						state.sessionExpiry = null;
						state.loginRedirectPath = null;
						state.error = null;
						state.retryCount = 0;
					});
				},

				login: async (redirectPath) => {
					console.log("AuthStore: Starting login with redirect:", redirectPath);
					set((state) => {
						state.loginRedirectPath = redirectPath || null;
						state.error = null;
					});

					try {
						await authManager.login({
							redirectUri: `${window.location.origin}${redirectPath || "/chat"}`,
						});
					} catch (error) {
						console.error("AuthStore: Login failed:", error);
						set((state) => {
							state.error =
								error instanceof AuthError
									? error
									: new AuthError("LOGIN_FAILED", "Login failed");
						});
					}
				},

				logout: async (redirectUri) => {
					console.log("AuthStore: Starting logout");
					set((state) => {
						state.sessionReady = false;
						state.loading = true;
					});

					try {
						// Clear backend session
						await fetch(`${API_BASE_URL}/auth/logout`, {
							method: "DELETE",
							credentials: "include",
						});
					} catch (error) {
						console.warn("AuthStore: Backend logout failed:", error);
					}

					try {
						await authManager.logout({
							redirectUri: redirectUri || window.location.origin,
						});
					} catch (error) {
						console.error("AuthStore: Keycloak logout failed:", error);
					}

					// Clear returning user flag
					const key = "rita_returning_user";
					localStorage.removeItem(key);
					document.cookie = `${key}=; Max-Age=0; path=/; SameSite=Lax`;

				// Clear all auth state
					set((state) => {
						state.authenticated = false;
						state.user = null;
						state.token = null;
						state.refreshToken = null;
						state.tokenExpiry = null;
						state.sessionReady = false;
						state.sessionExpiry = null;
						state.loginRedirectPath = null;
						state.error = null;
						state.retryCount = 0;
						state.loading = false;
					});
				},

				silentLogin: async () => {
					console.log("AuthStore: Attempting silent login");
					try {
						// This would trigger the check-sso flow
						const result = await authManager.initialize();
						return result.authenticated;
					} catch (error) {
						console.error("AuthStore: Silent login failed:", error);
						return false;
					}
				},

				refreshAuthToken: async () => {
					console.log("AuthStore: Manual token refresh requested");
					try {
						return await authManager.refreshToken();
					} catch (error) {
						console.error("AuthStore: Token refresh failed:", error);
						set((state) => {
							state.error =
								error instanceof AuthError
									? error
									: new AuthError(
											"TOKEN_REFRESH_FAILED",
											"Token refresh failed",
										);
						});
						return false;
					}
				},

				clearTokens: () => {
					console.log("AuthStore: Clearing tokens");
					set((state) => {
						state.token = null;
						state.refreshToken = null;
						state.tokenExpiry = null;
					});
				},

				createSession: async () => {
					console.log("AuthStore: Creating session (handled by AuthManager)");
					// This is handled automatically by AuthManager
					return get().sessionReady;
				},

				clearSession: () => {
					console.log("AuthStore: Clearing session");
					set((state) => {
						state.sessionReady = false;
						state.sessionExpiry = null;
					});
				},

				setUser: (user) => {
					set((state) => {
						state.user = user;
					});
				},

				setError: (error) => {
					console.log("AuthStore: Setting error:", error);
					set((state) => {
						state.error = error;
					});
				},

				clearError: () => {
					console.log("AuthStore: Clearing error");
					set((state) => {
						state.error = null;
						state.retryCount = 0;
					});
				},

				retry: async () => {
					const state = get();
					console.log(
						"AuthStore: Retrying initialization, attempt:",
						state.retryCount + 1,
					);

					if (state.retryCount >= 3) {
						set((state) => {
							state.error = new AuthError(
								"MAX_RETRIES",
								"Maximum retry attempts exceeded",
							);
						});
						return;
					}

					// Exponential backoff
					const delay = 2 ** state.retryCount * 1000;
					await new Promise((resolve) => setTimeout(resolve, delay));

					set((state) => {
						state.retryCount += 1;
						state.initialized = false; // Allow re-initialization
					});

					await get().initialize();
				},
			};
		}),
		{
			name: "auth-storage",
			storage: createJSONStorage(() => sessionStorage),
			partialize: (state) => ({
				loginRedirectPath: state.loginRedirectPath,
				// Don't persist sensitive data like tokens
			}),
		},
	),
);

export { useAuthStore };
export default useAuthStore;
