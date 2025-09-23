import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type Keycloak from 'keycloak-js';
import type { KeycloakProfile } from 'keycloak-js';
import keycloak from '../services/keycloak';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

interface AuthContextType {
  keycloak: Keycloak;
  authenticated: boolean;
  loading: boolean;
  sessionReady: boolean;
  userProfile: KeycloakProfile | null;
  login: () => void;
  logout: () => void;
  token: string | undefined;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<KeycloakProfile | null>(null);
  const [token, setToken] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);

  const syncTokenToCreateSessionCookie = useCallback(async (kcInstance: Keycloak) => {
    console.log('syncTokenToCreateSessionCookie called');
    if (!kcInstance.token) {
      console.error('Cannot create session cookie: Keycloak token is missing.');
      return;
    }
    try {
      console.log('Creating session cookie...');
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: kcInstance.token }),
        credentials: 'include', // Important to receive the cookie
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Session cookie creation failed:', response.status, errorData);
        return;
      }

      console.log('Session cookie created/updated successfully.');
      console.log('🍪 Cookie creation COMPLETE');
      setSessionReady(true);
    } catch (error) {
      console.error('Failed to create session cookie:', error);
    }
  }, []);

  useEffect(() => {
    let initialized = false;

    const initKeycloak = async () => {
      if (initialized) return;
      initialized = true;

      try {
        console.log('Starting Keycloak init...');
        const auth = await keycloak.init({
          onLoad: 'check-sso',
          silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
          pkceMethod: 'S256',
        });

        console.log('Keycloak init successful, authenticated:', auth);
        setAuthenticated(auth);
        setToken(keycloak.token);

        if (auth && keycloak.token) {
          try {
            console.log('Loading user profile...');
            const profile = await keycloak.loadUserProfile();
            console.log('User profile loaded, calling syncToken...');
            setUserProfile(profile);
            await syncTokenToCreateSessionCookie(keycloak);
          } catch (profileError) {
            console.warn('Profile loading failed, but auth is valid:', profileError);
            // Profile loading can fail but auth still works - create session anyway
            await syncTokenToCreateSessionCookie(keycloak);
          }
        }
      } catch (error) {
        console.error('Keycloak init failed:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        console.error('Error stack:', (error as Error)?.stack);
      } finally {
        console.log('Setting loading=false');
        setLoading(false);
      }
    };

    initKeycloak();

    keycloak.onAuthSuccess = () => {
      console.log('Keycloak onAuthSuccess fired, token:', !!keycloak.token);
      setAuthenticated(true);
      setToken(keycloak.token);
      if (keycloak.token) {
        keycloak.loadUserProfile().then(profile => {
          setUserProfile(profile);
          syncTokenToCreateSessionCookie(keycloak);
        }).catch(error => {
          console.warn('Profile loading failed in onAuthSuccess:', error);
          syncTokenToCreateSessionCookie(keycloak);
        });
      }
    };

    keycloak.onAuthError = (error) => {
      console.error('Authentication error:', error);
      setAuthenticated(false);
      setUserProfile(null);
      setToken(undefined);
      setSessionReady(false);
    };

    keycloak.onAuthRefreshSuccess = () => {
      setToken(keycloak.token);
      syncTokenToCreateSessionCookie(keycloak);
    };

    keycloak.onTokenExpired = () => {
      keycloak.updateToken(30).catch(() => {
        console.error('Failed to refresh token');
        keycloak.logout();
      });
    };

  }, [syncTokenToCreateSessionCookie]);

  const login = useCallback(() => {
    keycloak.login({
      redirectUri: window.location.origin + '/chat'
    });
  }, []);

  const logout = useCallback(() => {
    setSessionReady(false);
    fetch(`${API_BASE_URL}/auth/logout`, { method: 'DELETE', credentials: 'include' })
      .catch(err => console.error('Backend logout failed:', err))
      .finally(() => {
        keycloak.logout({ redirectUri: window.location.origin });
      });
  }, []);

  const value = {
    keycloak,
    authenticated,
    loading,
    sessionReady,
    userProfile,
    login,
    logout,
    token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}