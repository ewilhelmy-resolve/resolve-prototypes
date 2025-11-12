import type Keycloak from "keycloak-js";
import type { KeycloakLoginOptions, KeycloakLogoutOptions } from "keycloak-js";
import mitt, { type Emitter } from "mitt";
import {
	AuthError,
	type AuthEventPayload,
	type AuthResult,
} from "../types/auth";
import keycloak from "./keycloak";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export class AuthManager {
	private keycloak: Keycloak;
	private eventBus: Emitter<AuthEventPayload>;
	private initialized = false;
	private refreshTimer: NodeJS.Timeout | null = null;
	private refreshInterval = 60000; // 1 minute check interval
	private refreshThreshold = 300; // Refresh 5 minutes before expiry

	constructor() {
		this.eventBus = mitt<AuthEventPayload>();
		this.keycloak = keycloak;
		this.setupEventHandlers();
	}

	async initialize(): Promise<AuthResult> {
		if (this.initialized) {
			return this.getCurrentState();
		}

		try {
			const authenticated = await this.keycloak.init({
				onLoad: "check-sso",
				silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
				pkceMethod: "S256",
			});

			this.initialized = true;

			const result: AuthResult = {
				authenticated,
				user: this.keycloak.profile || null,
				token: this.keycloak.token || null,
				refreshToken: this.keycloak.refreshToken || null,
				tokenExpiry: this.keycloak.tokenParsed?.exp || null,
			};

			if (authenticated && this.keycloak.token) {
				await this.loadUserProfile();
				await this.createBackendSession();
				this.startTokenRefreshTimer();
				result.sessionReady = true;
				result.user = this.keycloak.profile || null;
				this.setReturningUserFlag();
			}

			return result;
		} catch (error) {
			console.error("AuthManager: Keycloak initialization failed:", error);
			this.initialized = true; // Mark as initialized to prevent retries
			throw new AuthError(
				"INIT_FAILED",
				error instanceof Error ? error.message : "Unknown error",
			);
		}
	}

	async login(options: KeycloakLoginOptions): Promise<void> {
		await this.keycloak.login(options);
	}

	async logout(options?: KeycloakLogoutOptions): Promise<void> {
		this.stopTokenRefreshTimer();
		await this.keycloak.logout(options);
	}

	/**
	 * Global token refresh timer - runs independently of React lifecycle
	 * Checks token expiry every minute and proactively refreshes tokens
	 */
	private startTokenRefreshTimer(): void {
		this.stopTokenRefreshTimer(); // Clear any existing timer

		this.refreshTimer = setInterval(async () => {
			await this.checkAndRefreshToken();
		}, this.refreshInterval);
	}

	private stopTokenRefreshTimer(): void {
		if (this.refreshTimer) {
			clearInterval(this.refreshTimer);
			this.refreshTimer = null;
		}
	}

	private async checkAndRefreshToken(): Promise<void> {
		if (!this.keycloak.token || !this.keycloak.tokenParsed?.exp) {
			return;
		}

		const timeToExpiry = this.keycloak.tokenParsed.exp - Date.now() / 1000;

		// Refresh token if it expires within threshold (5 minutes)
		if (timeToExpiry < this.refreshThreshold) {
			try {
				const refreshed = await this.keycloak.updateToken(30);
				if (refreshed) {
					this.eventBus.emit("token:refreshed", {
						token: this.keycloak.token!,
						refreshToken: this.keycloak.refreshToken!,
						tokenExpiry: this.keycloak.tokenParsed?.exp!,
					});

					// Backend auto-extends session cookie when near expiry (no action needed here)
				}
			} catch (error) {
				console.error("AuthManager: Token refresh failed:", error);
				this.eventBus.emit(
					"auth:error",
					new AuthError(
						"TOKEN_REFRESH_FAILED",
						error instanceof Error ? error.message : "Unknown error",
					),
				);

				// If refresh fails, stop the timer and force logout
				this.stopTokenRefreshTimer();
				this.eventBus.emit("auth:force-logout", undefined);
			}
		}
	}

	private setupEventHandlers(): void {
		this.keycloak.onAuthSuccess = () => {
			this.startTokenRefreshTimer(); // Ensure timer is running after successful auth
			this.eventBus.emit("auth:success", this.getCurrentState());
		};

		this.keycloak.onAuthError = (error) => {
			console.error("AuthManager: Keycloak onAuthError:", error);
			this.stopTokenRefreshTimer(); // Stop timer on auth error
			this.eventBus.emit(
				"auth:error",
				new AuthError(
					"AUTH_FAILED",
					typeof error === "string" ? error : "Authentication failed",
				),
			);
		};

		this.keycloak.onTokenExpired = () => {
			this.eventBus.emit("token:expired", undefined);
			// Don't handle refresh here - let the timer handle it proactively
		};

		this.keycloak.onAuthRefreshSuccess = () => {
			this.eventBus.emit("token:refreshed", {
				token: this.keycloak.token!,
				refreshToken: this.keycloak.refreshToken!,
				tokenExpiry: this.keycloak.tokenParsed?.exp!,
			});
		};

		this.keycloak.onAuthRefreshError = () => {
			console.error("AuthManager: Keycloak onAuthRefreshError");
			this.stopTokenRefreshTimer();
			this.eventBus.emit("auth:force-logout", undefined);
		};
	}

	private async loadUserProfile(): Promise<void> {
		try {
			await this.keycloak.loadUserProfile();
		} catch (error) {
			console.warn("AuthManager: Failed to load user profile:", error);
			// Don't fail initialization if profile loading fails
		}
	}

	private async createBackendSession(): Promise<void> {
		if (!this.keycloak.token) {
			console.warn("AuthManager: Cannot create session - no token available");
			return;
		}

		try {
			const response = await fetch(`${API_BASE_URL}/auth/login`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ accessToken: this.keycloak.token }),
				credentials: "include",
			});

			if (!response.ok) {
				throw new Error(`Session creation failed: ${response.status}`);
			}

			// Parse response to get user data from backend (including names from database)
			const data = await response.json();

			// Emit auth:success with user data from backend
			if (data.success && data.user) {
				this.eventBus.emit("auth:success", {
					authenticated: true,
					user: data.user,
					token: this.keycloak.token!,
					refreshToken: this.keycloak.refreshToken!,
					tokenExpiry: this.keycloak.tokenParsed?.exp || null,
					sessionReady: true,
				});
			}

			this.eventBus.emit("session:ready", undefined);
		} catch (error) {
			console.error("AuthManager: Failed to create backend session:", error);
			this.eventBus.emit(
				"session:error",
				error instanceof Error ? error : new Error("Unknown session error"),
			);
		}
	}

	private setReturningUserFlag(): void {
		const key = "rita_returning_user";
		const value = "true";
		const expiryDays = 365;

		// Set in localStorage
		localStorage.setItem(key, value);

		// Set in cookie (1 year expiry)
		const expiryDate = new Date();
		expiryDate.setDate(expiryDate.getDate() + expiryDays);
		const secure = window.location.protocol === "https:" ? "; Secure" : "";
		document.cookie = `${key}=${value}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax${secure}`;
	}

	private getCurrentState(): AuthResult {
		return {
			authenticated: this.keycloak.authenticated || false,
			user: this.keycloak.profile || null,
			token: this.keycloak.token || null,
			refreshToken: this.keycloak.refreshToken || null,
			tokenExpiry: this.keycloak.tokenParsed?.exp || null,
		};
	}

	// Public method to manually refresh token if needed
	async refreshToken(): Promise<boolean> {
		try {
			return await this.keycloak.updateToken(30);
		} catch (error) {
			console.error("AuthManager: Manual token refresh failed:", error);
			throw new AuthError(
				"TOKEN_REFRESH_FAILED",
				error instanceof Error ? error.message : "Unknown error",
			);
		}
	}

	// Cleanup method for testing and shutdown
	destroy(): void {
		this.stopTokenRefreshTimer();
		this.eventBus.all.clear();
	}

	// Public event methods using mitt API
	on<K extends keyof AuthEventPayload>(
		event: K,
		listener: (payload: AuthEventPayload[K]) => void,
	): void {
		this.eventBus.on(event, listener);
	}

	off<K extends keyof AuthEventPayload>(
		event: K,
		listener: (payload: AuthEventPayload[K]) => void,
	): void {
		this.eventBus.off(event, listener);
	}
}

// Create singleton instance
export const authManager = new AuthManager();
