import type Keycloak from 'keycloak-js';
import type { KeycloakLoginOptions, KeycloakLogoutOptions } from 'keycloak-js';
import mitt, { type Emitter } from 'mitt';
import keycloak from './keycloak';
import { AuthError, AuthResult, AuthEventPayload } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

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
      console.log('AuthManager: Starting Keycloak initialization...');
      const authenticated = await this.keycloak.init({
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
        pkceMethod: 'S256',
      });

      this.initialized = true;
      console.log('AuthManager: Keycloak initialization successful, authenticated:', authenticated);

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
      }

      return result;
    } catch (error) {
      console.error('AuthManager: Keycloak initialization failed:', error);
      this.initialized = true; // Mark as initialized to prevent retries
      throw new AuthError('INIT_FAILED', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async login(options: KeycloakLoginOptions): Promise<void> {
    console.log('AuthManager: Starting login with options:', options);
    await this.keycloak.login(options);
  }

  async logout(options?: KeycloakLogoutOptions): Promise<void> {
    console.log('AuthManager: Starting logout');
    this.stopTokenRefreshTimer();
    await this.keycloak.logout(options);
  }

  /**
   * Global token refresh timer - runs independently of React lifecycle
   * Checks token expiry every minute and proactively refreshes tokens
   */
  private startTokenRefreshTimer(): void {
    this.stopTokenRefreshTimer(); // Clear any existing timer
    console.log('AuthManager: Starting token refresh timer');

    this.refreshTimer = setInterval(async () => {
      await this.checkAndRefreshToken();
    }, this.refreshInterval);
  }

  private stopTokenRefreshTimer(): void {
    if (this.refreshTimer) {
      console.log('AuthManager: Stopping token refresh timer');
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private async checkAndRefreshToken(): Promise<void> {
    if (!this.keycloak.token || !this.keycloak.tokenParsed?.exp) {
      return;
    }

    const timeToExpiry = this.keycloak.tokenParsed.exp - Date.now() / 1000;
    console.log(`AuthManager: Token expires in ${Math.floor(timeToExpiry)} seconds`);

    // Refresh token if it expires within threshold (5 minutes)
    if (timeToExpiry < this.refreshThreshold) {
      try {
        console.log('AuthManager: Refreshing token proactively');
        const refreshed = await this.keycloak.updateToken(30);
        if (refreshed) {
          console.log('AuthManager: Token refreshed successfully');
          this.eventBus.emit('token:refreshed', {
            token: this.keycloak.token!,
            refreshToken: this.keycloak.refreshToken!,
            tokenExpiry: this.keycloak.tokenParsed?.exp!,
          });

          // Update backend session with new token
          await this.createBackendSession();
        }
      } catch (error) {
        console.error('AuthManager: Token refresh failed:', error);
        this.eventBus.emit('auth:error', new AuthError('TOKEN_REFRESH_FAILED', error instanceof Error ? error.message : 'Unknown error'));

        // If refresh fails, stop the timer and force logout
        this.stopTokenRefreshTimer();
        this.eventBus.emit('auth:force-logout', undefined);
      }
    }
  }

  private setupEventHandlers(): void {
    this.keycloak.onAuthSuccess = () => {
      console.log('AuthManager: Keycloak onAuthSuccess fired');
      this.startTokenRefreshTimer(); // Ensure timer is running after successful auth
      this.eventBus.emit('auth:success', this.getCurrentState());
    };

    this.keycloak.onAuthError = (error) => {
      console.error('AuthManager: Keycloak onAuthError:', error);
      this.stopTokenRefreshTimer(); // Stop timer on auth error
      this.eventBus.emit('auth:error', new AuthError('AUTH_FAILED', typeof error === 'string' ? error : 'Authentication failed'));
    };

    this.keycloak.onTokenExpired = () => {
      console.log('AuthManager: Keycloak onTokenExpired');
      this.eventBus.emit('token:expired', undefined);
      // Don't handle refresh here - let the timer handle it proactively
    };

    this.keycloak.onAuthRefreshSuccess = () => {
      console.log('AuthManager: Keycloak onAuthRefreshSuccess');
      this.eventBus.emit('token:refreshed', {
        token: this.keycloak.token!,
        refreshToken: this.keycloak.refreshToken!,
        tokenExpiry: this.keycloak.tokenParsed?.exp!,
      });
    };

    this.keycloak.onAuthRefreshError = () => {
      console.error('AuthManager: Keycloak onAuthRefreshError');
      this.stopTokenRefreshTimer();
      this.eventBus.emit('auth:force-logout', undefined);
    };
  }

  private async loadUserProfile(): Promise<void> {
    try {
      console.log('AuthManager: Loading user profile...');
      await this.keycloak.loadUserProfile();
      console.log('AuthManager: User profile loaded successfully');
    } catch (error) {
      console.warn('AuthManager: Failed to load user profile:', error);
      // Don't fail initialization if profile loading fails
    }
  }

  private async createBackendSession(): Promise<void> {
    if (!this.keycloak.token) {
      console.warn('AuthManager: Cannot create session - no token available');
      return;
    }

    try {
      console.log('AuthManager: Creating backend session...');
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: this.keycloak.token }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Session creation failed: ${response.status}`);
      }

      console.log('AuthManager: Backend session created successfully');
      this.eventBus.emit('session:ready', undefined);
    } catch (error) {
      console.error('AuthManager: Failed to create backend session:', error);
      this.eventBus.emit('session:error', error instanceof Error ? error : new Error('Unknown session error'));
    }
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
      console.log('AuthManager: Manual token refresh requested');
      return await this.keycloak.updateToken(30);
    } catch (error) {
      console.error('AuthManager: Manual token refresh failed:', error);
      throw new AuthError('TOKEN_REFRESH_FAILED', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Cleanup method for testing and shutdown
  destroy(): void {
    console.log('AuthManager: Destroying instance');
    this.stopTokenRefreshTimer();
    this.eventBus.all.clear();
  }

  // Public event methods using mitt API
  on<K extends keyof AuthEventPayload>(
    event: K,
    listener: (payload: AuthEventPayload[K]) => void
  ): void {
    this.eventBus.on(event, listener);
  }

  off<K extends keyof AuthEventPayload>(
    event: K,
    listener: (payload: AuthEventPayload[K]) => void
  ): void {
    this.eventBus.off(event, listener);
  }
}

// Create singleton instance
export const authManager = new AuthManager();