import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProfilePermissions } from '../useProfile';
import { useAuthStore } from '../../../stores/auth-store';
import { organizationApi } from '../../../services/api';
import type React from 'react';

// Mock the auth store
vi.mock('../../../stores/auth-store', () => ({
  useAuthStore: vi.fn(),
}));

// Mock the organization API
vi.mock('../../../services/api', () => ({
  organizationApi: {
    getCurrentOrganization: vi.fn(),
  },
}));

describe('useProfilePermissions - role-based permission checks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  const mockAuthStore = (authenticated = true, sessionReady = true) => {
    (useAuthStore as any).mockImplementation((selector?: any) => {
      const state = {
        authenticated,
        loading: false,
        initialized: true,
        sessionReady,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          username: 'testuser',
        },
        token: 'mock-token',
        tokenExpiry: Date.now() / 1000 + 3600,
        sessionExpiry: Date.now() / 1000 + 7200,
        error: null,
        retryCount: 0,
        loginRedirectPath: null,
        login: vi.fn(),
        logout: vi.fn(),
        refreshAuthToken: vi.fn(),
        clearError: vi.fn(),
        retry: vi.fn(),
        silentLogin: vi.fn(),
        clearSession: vi.fn(),
      };
      return selector ? selector(state) : state;
    });
  };

  describe('Owner role', () => {
    beforeEach(() => {
      mockAuthStore();
      (organizationApi.getCurrentOrganization as any).mockResolvedValue({
        organization: {
          id: 'org-123',
          name: 'Test Org',
          user_role: 'owner',
          member_count: 5,
          created_at: '2024-01-01T00:00:00Z',
        },
      });
    });

    it('should return true for hasRole("owner")', async () => {
      const { result } = renderHook(() => useProfilePermissions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.hasRole('owner')).toBe(true);
      });
    });

    it('should return true for isOwner()', async () => {
      const { result } = renderHook(() => useProfilePermissions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isOwner()).toBe(true);
      });
    });

    it('should return false for isAdmin()', async () => {
      const { result } = renderHook(() => useProfilePermissions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isAdmin()).toBe(false);
      });
    });

    it('should return true for isOwnerOrAdmin()', async () => {
      const { result } = renderHook(() => useProfilePermissions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isOwnerOrAdmin()).toBe(true);
      });
    });

    it('should return true for canManageInvitations()', async () => {
      const { result } = renderHook(() => useProfilePermissions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.canManageInvitations()).toBe(true);
      });
    });

    it('should return true for canManageMembers()', async () => {
      const { result } = renderHook(() => useProfilePermissions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.canManageMembers()).toBe(true);
      });
    });

    it('should return true for canManageOrganization()', async () => {
      const { result } = renderHook(() => useProfilePermissions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.canManageOrganization()).toBe(true);
      });
    });

    it('should return true for canDeleteConversations()', async () => {
      const { result } = renderHook(() => useProfilePermissions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.canDeleteConversations()).toBe(true);
      });
    });
  });

  describe('Admin role', () => {
    beforeEach(() => {
      mockAuthStore();
      (organizationApi.getCurrentOrganization as any).mockResolvedValue({
        organization: {
          id: 'org-123',
          name: 'Test Org',
          user_role: 'admin',
          member_count: 5,
          created_at: '2024-01-01T00:00:00Z',
        },
      });
    });

    it('should return false for hasRole("owner")', async () => {
      const { result } = renderHook(() => useProfilePermissions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.hasRole('owner')).toBe(false);
      });
    });

    it('should return true for hasRole("admin")', async () => {
      const { result } = renderHook(() => useProfilePermissions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.hasRole('admin')).toBe(true);
      });
    });

    it('should return false for isOwner()', async () => {
      const { result } = renderHook(() => useProfilePermissions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isOwner()).toBe(false);
      });
    });

    it('should return true for isAdmin()', async () => {
      const { result } = renderHook(() => useProfilePermissions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isAdmin()).toBe(true);
      });
    });

    it('should return true for isOwnerOrAdmin()', async () => {
      const { result } = renderHook(() => useProfilePermissions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isOwnerOrAdmin()).toBe(true);
      });
    });

    it('should return true for canManageInvitations()', async () => {
      const { result } = renderHook(() => useProfilePermissions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.canManageInvitations()).toBe(true);
      });
    });

    it('should return true for canManageMembers()', async () => {
      const { result } = renderHook(() => useProfilePermissions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.canManageMembers()).toBe(true);
      });
    });

    it('should return false for canManageOrganization()', async () => {
      const { result } = renderHook(() => useProfilePermissions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.canManageOrganization()).toBe(false);
      });
    });

    it('should return true for canDeleteConversations()', async () => {
      const { result } = renderHook(() => useProfilePermissions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.canDeleteConversations()).toBe(true);
      });
    });
  });

  describe('User role', () => {
    beforeEach(() => {
      mockAuthStore();
      (organizationApi.getCurrentOrganization as any).mockResolvedValue({
        organization: {
          id: 'org-123',
          name: 'Test Org',
          user_role: 'user',
          member_count: 5,
          created_at: '2024-01-01T00:00:00Z',
        },
      });
    });

    it('should return false for hasRole("owner")', async () => {
      const { result } = renderHook(() => useProfilePermissions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.hasRole('owner')).toBe(false);
      });
    });

    it('should return false for hasRole("admin")', async () => {
      const { result } = renderHook(() => useProfilePermissions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.hasRole('admin')).toBe(false);
      });
    });

    it('should return true for hasRole("user")', async () => {
      const { result } = renderHook(() => useProfilePermissions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.hasRole('user')).toBe(true);
      });
    });

    it('should return false for isOwner()', async () => {
      const { result } = renderHook(() => useProfilePermissions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isOwner()).toBe(false);
      });
    });

    it('should return false for isAdmin()', async () => {
      const { result } = renderHook(() => useProfilePermissions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isAdmin()).toBe(false);
      });
    });

    it('should return false for isOwnerOrAdmin()', async () => {
      const { result } = renderHook(() => useProfilePermissions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isOwnerOrAdmin()).toBe(false);
      });
    });

    it('should return false for canManageInvitations()', async () => {
      const { result } = renderHook(() => useProfilePermissions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.canManageInvitations()).toBe(false);
      });
    });

    it('should return false for canManageMembers()', async () => {
      const { result } = renderHook(() => useProfilePermissions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.canManageMembers()).toBe(false);
      });
    });

    it('should return false for canManageOrganization()', async () => {
      const { result } = renderHook(() => useProfilePermissions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.canManageOrganization()).toBe(false);
      });
    });

    it('should return false for canDeleteConversations()', async () => {
      const { result } = renderHook(() => useProfilePermissions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.canDeleteConversations()).toBe(false);
      });
    });
  });

  describe('No profile loaded', () => {
    beforeEach(() => {
      mockAuthStore(false, false);
    });

    it('should return false for all permission checks when not authenticated', async () => {
      const { result } = renderHook(() => useProfilePermissions(), { wrapper: createWrapper() });

      expect(result.current.hasRole('owner')).toBe(false);
      expect(result.current.isOwner()).toBe(false);
      expect(result.current.isAdmin()).toBe(false);
      expect(result.current.isOwnerOrAdmin()).toBe(false);
      expect(result.current.canManageInvitations()).toBe(false);
      expect(result.current.canManageMembers()).toBe(false);
      expect(result.current.canManageOrganization()).toBe(false);
      expect(result.current.canDeleteConversations()).toBe(false);
    });
  });

  describe('Array role checks', () => {
    beforeEach(() => {
      mockAuthStore();
      (organizationApi.getCurrentOrganization as any).mockResolvedValue({
        organization: {
          id: 'org-123',
          name: 'Test Org',
          user_role: 'admin',
          member_count: 5,
          created_at: '2024-01-01T00:00:00Z',
        },
      });
    });

    it('should return true for hasRole(["owner", "admin"]) when user is admin', async () => {
      const { result } = renderHook(() => useProfilePermissions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.hasRole(['owner', 'admin'])).toBe(true);
      });
    });

    it('should return false for hasRole(["owner"]) when user is admin', async () => {
      const { result } = renderHook(() => useProfilePermissions(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.hasRole(['owner'])).toBe(false);
      });
    });
  });
});
