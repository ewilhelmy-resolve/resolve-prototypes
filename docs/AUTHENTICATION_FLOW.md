# Rita Authentication Flow Documentation

## Overview

This document explains the authentication architecture for the Rita project, which uses a Zustand-based global state management system with Keycloak for identity management and JWT tokens for API communication.

## Architecture Components

### Core Components
- **Rita Go (Client)**: React/TypeScript frontend with Zustand state management
- **API Server**: Node.js backend with session management
- **Keycloak**: Identity provider and authentication server

### Client-Side Architecture
- **AuthManager**: Singleton managing Keycloak instance and global token refresh
- **AuthStore (Zustand)**: Global state management with persistence
- **useAuth Hook**: Clean React interface for components

## High-Level Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant RG as Rita Go (Client)
    participant API as API Server
    participant KC as Keycloak

    Note over RG: App Startup
    RG->>KC: Silent SSO Check (iframe)
    alt Already Authenticated
        KC-->>RG: User + Token
        RG->>API: Create Session (POST /auth/login)
        API-->>RG: Session Cookie
        Note over RG: User can access protected routes
    else Not Authenticated
        KC-->>RG: login_required
        Note over RG: Redirect to login page
    end

    Note over U,KC: Login Flow
    U->>RG: Click "Sign in"
    RG->>KC: Redirect to Keycloak login
    U->>KC: Enter credentials
    KC->>RG: Redirect with authorization code
    RG->>KC: Exchange code for tokens
    KC-->>RG: JWT Access + Refresh Token
    RG->>API: Create Session (POST /auth/login)
    API-->>RG: Session Cookie

    Note over RG: User authenticated, access granted

    Note over RG: Token Refresh (Background)
    loop Every minute
        RG->>RG: Check token expiry
        alt Token expires in <5 min
            RG->>KC: Refresh token
            KC-->>RG: New JWT tokens
            RG->>API: Update session
        end
    end

    Note over U,API: API Requests
    RG->>API: API Request + Session Cookie
    API->>API: Validate session
    alt Session valid
        API-->>RG: Response data
    else Session invalid
        API-->>RG: 401 Unauthorized
        RG->>KC: Force logout
    end

    Note over U,KC: Logout Flow
    U->>RG: Click logout
    RG->>API: DELETE /auth/logout
    API-->>RG: Clear session cookie
    RG->>KC: Keycloak logout
    KC-->>RG: Redirect to login page
```

## Detailed Client-Side Flow

```mermaid
sequenceDiagram
    participant App as App.tsx
    participant Store as AuthStore (Zustand)
    participant Mgr as AuthManager
    participant KC as Keycloak
    participant API as API Server
    participant Route as ProtectedRoute

    Note over App: Application Startup
    App->>Store: initialize() called in main.tsx
    Store->>Mgr: initialize()
    Mgr->>KC: keycloak.init({ onLoad: 'check-sso' })

    Note over KC: Silent SSO Check via iframe
    alt User Previously Authenticated
        KC-->>Mgr: authenticated: true + tokens
        Mgr->>KC: loadUserProfile()
        KC-->>Mgr: User profile data
        Mgr->>API: POST /auth/login (create session)
        API-->>Mgr: Session cookie set
        Mgr->>Mgr: startTokenRefreshTimer()
        Mgr->>Store: emit('auth:success', authResult)
        Store->>Store: Update state (authenticated: true, user, tokens)

    else User Not Authenticated
        KC-->>Mgr: authenticated: false
        Mgr->>Store: Return authResult (authenticated: false)
        Store->>Store: Update state (authenticated: false)
    end

    Store->>Store: Set loading: false, initialized: true

    Note over Route: Route Protection Check
    Route->>Store: Check auth state
    alt Authenticated
        Route->>Route: Render protected component
    else Not Authenticated
        Route->>Route: Navigate to /login
    end

    Note over Store,KC: Background Token Refresh
    loop Every 60 seconds
        Mgr->>Mgr: checkAndRefreshToken()
        Mgr->>KC: Check token expiry
        alt Token expires in <5 minutes
            Mgr->>KC: updateToken(30)
            KC-->>Mgr: New tokens
            Mgr->>API: Update session with new token
            Mgr->>Store: emit('token:refreshed', tokens)
            Store->>Store: Update token state
        end
    end

    Note over Store,KC: Login Flow (User Initiated)
    Store->>Mgr: login(redirectPath)
    Mgr->>KC: keycloak.login({ redirectUri })
    KC->>KC: Redirect to Keycloak login page
    Note over KC: User enters credentials
    KC->>App: Redirect back with auth code
    KC->>Mgr: onAuthSuccess callback
    Mgr->>Mgr: startTokenRefreshTimer()
    Mgr->>Store: emit('auth:success', authResult)
    Store->>Store: Update authenticated state

    Note over Store,API: Logout Flow
    Store->>API: DELETE /auth/logout
    Store->>Mgr: logout()
    Mgr->>Mgr: stopTokenRefreshTimer()
    Mgr->>KC: keycloak.logout()
    Store->>Store: Clear all auth state
```

## State Management Details

### AuthStore (Zustand) State
```typescript
interface AuthState {
  // Core authentication
  authenticated: boolean;
  loading: boolean;
  initialized: boolean;

  // User & tokens
  user: KeycloakProfile | null;
  token: string | null;
  refreshToken: string | null;
  tokenExpiry: number | null;

  // Session management
  sessionReady: boolean;
  loginRedirectPath: string | null;

  // Error handling
  error: AuthError | null;
  retryCount: number;
}
```

### Key State Transitions

```mermaid
stateDiagram-v2
    [*] --> Loading: App starts
    Loading --> Initialized_Unauthenticated: Keycloak check complete (not logged in)
    Loading --> Authenticated: Keycloak check complete (logged in)

    Initialized_Unauthenticated --> Authenticating: User clicks login
    Authenticating --> Authenticated: Login successful
    Authenticating --> Login_Error: Login failed
    Login_Error --> Initialized_Unauthenticated: Error cleared

    Authenticated --> Token_Refreshing: Token near expiry
    Token_Refreshing --> Authenticated: Refresh successful
    Token_Refreshing --> Force_Logout: Refresh failed

    Authenticated --> Logging_Out: User clicks logout
    Logging_Out --> Initialized_Unauthenticated: Logout complete

    Force_Logout --> Initialized_Unauthenticated: Auto logout complete
```

## Token Refresh Strategy

### Global Timer Implementation
The `AuthManager` implements a React-independent token refresh mechanism:

```typescript
// Starts when user authenticates
private startTokenRefreshTimer(): void {
  this.refreshTimer = setInterval(async () => {
    await this.checkAndRefreshToken();
  }, 60000); // Check every minute
}

// Runs independently of React component lifecycle
private async checkAndRefreshToken(): Promise<void> {
  const timeToExpiry = tokenParsed.exp - Date.now() / 1000;

  if (timeToExpiry < 300) { // 5 minutes before expiry
    // Proactively refresh token
    const refreshed = await keycloak.updateToken(30);
    if (refreshed) {
      // Update store and backend session
      this.eventBus.emit('token:refreshed', newTokens);
      await this.createBackendSession();
    }
  }
}
```

### Refresh Flow Diagram

```mermaid
flowchart TD
    A[Timer Tick - Every 60s] --> B{Token exists?}
    B -->|No| A
    B -->|Yes| C{Time to expiry < 5min?}
    C -->|No| A
    C -->|Yes| D[Call keycloak.updateToken]
    D --> E{Refresh successful?}
    E -->|Yes| F[Update AuthStore state]
    F --> G[Update backend session]
    G --> A
    E -->|No| H[Emit auth:error]
    H --> I[Stop refresh timer]
    I --> J[Force logout user]
    J --> K[Redirect to login]
```

## Error Handling Strategy

### Error Types
```typescript
type AuthErrorCode =
  | 'INIT_FAILED'          // Keycloak initialization failed
  | 'LOGIN_FAILED'         // User login attempt failed
  | 'AUTH_FAILED'          // General authentication error
  | 'TOKEN_REFRESH_FAILED' // Token refresh failed
  | 'SESSION_INVALID'      // Backend session invalid
  | 'NETWORK_ERROR'        // Network connectivity issue
  | 'MAX_RETRIES'          // Exceeded retry attempts
```

### Error Recovery Flow

```mermaid
flowchart TD
    A[Error Occurs] --> B{Error Type}
    B -->|INIT_FAILED| C[Set error state, allow manual retry]
    B -->|TOKEN_REFRESH_FAILED| D[Force logout, redirect to login]
    B -->|SESSION_INVALID| E[Clear session, maintain auth state]
    B -->|NETWORK_ERROR| F[Retry with exponential backoff]

    C --> G[User sees error + retry button]
    F --> H{Retry count < 3?}
    H -->|Yes| I[Wait 2^n seconds]
    I --> J[Retry operation]
    H -->|No| K[Set MAX_RETRIES error]

    D --> L[Clear all auth state]
    L --> M[Redirect to /login]
```

## Security Considerations

### Token Storage
- **Access tokens**: Stored in memory only (Zustand store)
- **Refresh tokens**: Stored in memory only (Zustand store)
- **Session cookies**: HTTP-only cookies set by backend
- **No localStorage**: Prevents XSS token theft

### Session Management
- **Dual authentication**: JWT tokens (stateless) + session cookies (stateful)
- **Backend validation**: API server validates session on each request
- **Auto logout**: Failed token refresh triggers automatic logout
- **Secure cookies**: Session cookies are HTTP-only and secure

### PKCE Flow
Keycloak initialization uses PKCE (Proof Key for Code Exchange):
```typescript
keycloak.init({
  onLoad: 'check-sso',
  pkceMethod: 'S256', // SHA256 code challenge
})
```

## React StrictMode Compatibility

### Problem Solved
The previous React Context implementation suffered from double initialization in StrictMode:

```mermaid
sequenceDiagram
    participant SM as StrictMode
    participant AC as AuthContext (Old)
    participant KC as Keycloak
    participant Route as ProtectedRoute

    Note over SM: Development Mode
    SM->>AC: Mount component
    AC->>KC: init() - First call
    SM->>AC: Unmount component (StrictMode)
    SM->>AC: Re-mount component (StrictMode)
    AC->>KC: init() - Second call (RACE CONDITION)

    Note over Route: Brief moment where loading=false, auth=false
    Route->>Route: Redirect to /login (FLASH!)
    KC-->>AC: First init completes
    Route->>Route: Redirect back to /chat
```

### Solution Implementation
The new Zustand approach initializes once at app startup:

```mermaid
sequenceDiagram
    participant SM as StrictMode
    participant Main as main.tsx
    participant Store as AuthStore
    participant Mgr as AuthManager
    participant Route as ProtectedRoute

    Note over Main: App Startup - Before React
    Main->>Store: initialize() - Single call
    Store->>Mgr: initialize() - Singleton
    Mgr->>Mgr: Set initialized = true

    Note over SM: StrictMode Mount/Unmount
    SM->>Route: Mount ProtectedRoute
    Route->>Store: Check auth state
    Store->>Store: Return consistent state
    SM->>Route: Unmount (StrictMode)
    SM->>Route: Re-mount (StrictMode)
    Route->>Store: Check auth state (same result)

    Note over Route: No flash - consistent state throughout
```

## Component Integration

### useAuth Hook Usage
```typescript
function MyComponent() {
  const {
    authenticated,
    loading,
    user,
    login,
    logout
  } = useAuth();

  if (loading) return <Spinner />;
  if (!authenticated) return <LoginButton onClick={login} />;

  return <WelcomeUser user={user} onLogout={logout} />;
}
```

### Selective Subscriptions
```typescript
// Only re-render when auth status changes
const { authenticated, loading } = useAuthStatus();

// Only re-render when user data changes
const user = useAuthUser();

// Only re-render when errors occur
const { error, retry } = useAuthError();
```

## Development vs Production

### Development Environment
- **Silent SSO check**: May timeout if Keycloak server not running
- **Console logging**: Detailed auth flow logging enabled
- **StrictMode**: Double-rendering handled gracefully
- **Hot reloading**: Auth state persists across code changes

### Production Environment
- **Silent SSO check**: Should succeed if user previously authenticated
- **Minimal logging**: Only errors logged to console
- **Optimized builds**: No development overhead
- **Session persistence**: Auth state survives page refreshes

## Monitoring and Debugging

### Key Log Messages
```typescript
// Successful flows
"AuthManager: Keycloak initialization successful"
"AuthStore: Initialization completed successfully"
"AuthManager: Token refreshed successfully"

// Error conditions
"AuthManager: Token refresh failed"
"AuthStore: Initialization failed"
"AuthManager: Failed to create backend session"
```

### State Debugging
The Zustand store integrates with Redux DevTools for debugging:
- View auth state changes in real-time
- Time-travel debugging for auth flows
- Action history for troubleshooting

This architecture provides a robust, scalable, and maintainable authentication system that handles all edge cases while providing excellent developer experience.