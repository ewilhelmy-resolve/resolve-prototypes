import type { KeycloakProfile } from 'keycloak-js';

// Custom User interface for database-first user data
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  organizationId?: string;
}

export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    message: string,
    public cause?: unknown,
    // public retryable = false
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export type AuthErrorCode =
  | 'INIT_FAILED'
  | 'LOGIN_FAILED'
  | 'AUTH_FAILED'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_REFRESH_FAILED'
  | 'SESSION_INVALID'
  | 'NETWORK_ERROR'
  | 'CONFIG_ERROR'
  | 'MAX_RETRIES';

export interface AuthResult {
  authenticated: boolean;
  user: User | KeycloakProfile | null;
  token: string | null;
  refreshToken: string | null;
  tokenExpiry: number | null;
  sessionReady?: boolean;
}

export interface AuthState {
  // Core authentication state
  authenticated: boolean;
  loading: boolean;
  initialized: boolean;

  // User information
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  tokenExpiry: number | null;

  // Session state
  sessionReady: boolean;
  sessionExpiry: number | null;

  // UI state
  loginRedirectPath: string | null;

  // Error handling
  error: AuthError | null;
  retryCount: number;
}

export interface AuthActions {
  // Initialization
  initialize: () => Promise<void>;
  reset: () => void;

  // Authentication flows
  login: (redirectPath?: string) => Promise<void>;
  logout: (redirectUri?: string) => Promise<void>;
  silentLogin: () => Promise<boolean>;

  // Token management
  refreshAuthToken: () => Promise<boolean>;
  clearTokens: () => void;

  // Session management
  createSession: () => Promise<boolean>;
  clearSession: () => void;

  // User management
  setUser: (user: User | null) => void;

  // Error handling
  setError: (error: AuthError) => void;
  clearError: () => void;
  retry: () => Promise<void>;
}

export type AuthStore = AuthState & AuthActions;

export interface AuthEventPayload extends Record<string | symbol, unknown> {
  'auth:success': AuthResult;
  'auth:error': AuthError;
  'auth:force-logout': undefined;
  'token:refreshed': {
    token: string;
    refreshToken: string;
    tokenExpiry: number;
  };
  'token:expired': undefined;
  'session:ready': undefined;
  'session:error': Error;
}

// Helper function to convert KeycloakProfile to User
export function keycloakProfileToUser(profile: KeycloakProfile): User {
  return {
    id: profile.id || '',
    email: profile.email || '',
    firstName: profile.firstName,
    lastName: profile.lastName,
    username: profile.username,
  };
}