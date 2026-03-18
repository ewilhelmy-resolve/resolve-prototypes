import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserProfile } from "@/types/profile";
import { profileKeys, useProfilePermissions } from "../useProfile";

const originalDemoMode = import.meta.env.VITE_DEMO_MODE;

describe("useProfilePermissions - role-based permission checks", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		import.meta.env.VITE_DEMO_MODE = "false";
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
			},
		});
		vi.clearAllMocks();
	});

	afterEach(() => {
		import.meta.env.VITE_DEMO_MODE = originalDemoMode;
	});

	const createWrapper = (profile?: UserProfile | null) => {
		if (profile) {
			queryClient.setQueryData(profileKeys.detail(), profile);
		}
		return ({ children }: { children: React.ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	};

	const ownerProfile: UserProfile = {
		user: {
			id: "user-123",
			email: "test@example.com",
			firstName: "Test",
			lastName: "User",
		},
		organization: {
			id: "org-123",
			name: "Test Org",
			role: "owner",
			memberCount: 5,
			createdAt: "2024-01-01T00:00:00Z",
		},
	};

	const adminProfile: UserProfile = {
		...ownerProfile,
		organization: { ...ownerProfile.organization, role: "admin" },
	};

	const userProfile: UserProfile = {
		...ownerProfile,
		organization: { ...ownerProfile.organization, role: "user" },
	};

	describe("Owner role", () => {
		it('should return true for hasRole("owner")', () => {
			const { result } = renderHook(() => useProfilePermissions(), {
				wrapper: createWrapper(ownerProfile),
			});
			expect(result.current.hasRole("owner")).toBe(true);
		});

		it("should return true for isOwner()", () => {
			const { result } = renderHook(() => useProfilePermissions(), {
				wrapper: createWrapper(ownerProfile),
			});
			expect(result.current.isOwner()).toBe(true);
		});

		it("should return false for isAdmin()", () => {
			const { result } = renderHook(() => useProfilePermissions(), {
				wrapper: createWrapper(ownerProfile),
			});
			expect(result.current.isAdmin()).toBe(false);
		});

		it("should return true for isOwnerOrAdmin()", () => {
			const { result } = renderHook(() => useProfilePermissions(), {
				wrapper: createWrapper(ownerProfile),
			});
			expect(result.current.isOwnerOrAdmin()).toBe(true);
		});

		it("should return true for canManageInvitations()", () => {
			const { result } = renderHook(() => useProfilePermissions(), {
				wrapper: createWrapper(ownerProfile),
			});
			expect(result.current.canManageInvitations()).toBe(true);
		});

		it("should return true for canManageMembers()", () => {
			const { result } = renderHook(() => useProfilePermissions(), {
				wrapper: createWrapper(ownerProfile),
			});
			expect(result.current.canManageMembers()).toBe(true);
		});

		it("should return true for canManageOrganization()", () => {
			const { result } = renderHook(() => useProfilePermissions(), {
				wrapper: createWrapper(ownerProfile),
			});
			expect(result.current.canManageOrganization()).toBe(true);
		});

		it("should return true for canDeleteConversations()", () => {
			const { result } = renderHook(() => useProfilePermissions(), {
				wrapper: createWrapper(ownerProfile),
			});
			expect(result.current.canDeleteConversations()).toBe(true);
		});
	});

	describe("Admin role", () => {
		it('should return false for hasRole("owner")', () => {
			const { result } = renderHook(() => useProfilePermissions(), {
				wrapper: createWrapper(adminProfile),
			});
			expect(result.current.hasRole("owner")).toBe(false);
		});

		it('should return true for hasRole("admin")', () => {
			const { result } = renderHook(() => useProfilePermissions(), {
				wrapper: createWrapper(adminProfile),
			});
			expect(result.current.hasRole("admin")).toBe(true);
		});

		it("should return false for isOwner()", () => {
			const { result } = renderHook(() => useProfilePermissions(), {
				wrapper: createWrapper(adminProfile),
			});
			expect(result.current.isOwner()).toBe(false);
		});

		it("should return true for isAdmin()", () => {
			const { result } = renderHook(() => useProfilePermissions(), {
				wrapper: createWrapper(adminProfile),
			});
			expect(result.current.isAdmin()).toBe(true);
		});

		it("should return true for isOwnerOrAdmin()", () => {
			const { result } = renderHook(() => useProfilePermissions(), {
				wrapper: createWrapper(adminProfile),
			});
			expect(result.current.isOwnerOrAdmin()).toBe(true);
		});

		it("should return true for canManageInvitations()", () => {
			const { result } = renderHook(() => useProfilePermissions(), {
				wrapper: createWrapper(adminProfile),
			});
			expect(result.current.canManageInvitations()).toBe(true);
		});

		it("should return true for canManageMembers()", () => {
			const { result } = renderHook(() => useProfilePermissions(), {
				wrapper: createWrapper(adminProfile),
			});
			expect(result.current.canManageMembers()).toBe(true);
		});

		it("should return false for canManageOrganization()", () => {
			const { result } = renderHook(() => useProfilePermissions(), {
				wrapper: createWrapper(adminProfile),
			});
			expect(result.current.canManageOrganization()).toBe(false);
		});

		it("should return true for canDeleteConversations()", () => {
			const { result } = renderHook(() => useProfilePermissions(), {
				wrapper: createWrapper(adminProfile),
			});
			expect(result.current.canDeleteConversations()).toBe(true);
		});
	});

	describe("User role", () => {
		it('should return false for hasRole("owner")', () => {
			const { result } = renderHook(() => useProfilePermissions(), {
				wrapper: createWrapper(userProfile),
			});
			expect(result.current.hasRole("owner")).toBe(false);
		});

		it('should return false for hasRole("admin")', () => {
			const { result } = renderHook(() => useProfilePermissions(), {
				wrapper: createWrapper(userProfile),
			});
			expect(result.current.hasRole("admin")).toBe(false);
		});

		it('should return true for hasRole("user")', () => {
			const { result } = renderHook(() => useProfilePermissions(), {
				wrapper: createWrapper(userProfile),
			});
			expect(result.current.hasRole("user")).toBe(true);
		});

		it("should return false for isOwner()", () => {
			const { result } = renderHook(() => useProfilePermissions(), {
				wrapper: createWrapper(userProfile),
			});
			expect(result.current.isOwner()).toBe(false);
		});

		it("should return false for isAdmin()", () => {
			const { result } = renderHook(() => useProfilePermissions(), {
				wrapper: createWrapper(userProfile),
			});
			expect(result.current.isAdmin()).toBe(false);
		});

		it("should return false for isOwnerOrAdmin()", () => {
			const { result } = renderHook(() => useProfilePermissions(), {
				wrapper: createWrapper(userProfile),
			});
			expect(result.current.isOwnerOrAdmin()).toBe(false);
		});

		it("should return false for canManageInvitations()", () => {
			const { result } = renderHook(() => useProfilePermissions(), {
				wrapper: createWrapper(userProfile),
			});
			expect(result.current.canManageInvitations()).toBe(false);
		});

		it("should return false for canManageMembers()", () => {
			const { result } = renderHook(() => useProfilePermissions(), {
				wrapper: createWrapper(userProfile),
			});
			expect(result.current.canManageMembers()).toBe(false);
		});

		it("should return false for canManageOrganization()", () => {
			const { result } = renderHook(() => useProfilePermissions(), {
				wrapper: createWrapper(userProfile),
			});
			expect(result.current.canManageOrganization()).toBe(false);
		});

		it("should return false for canDeleteConversations()", () => {
			const { result } = renderHook(() => useProfilePermissions(), {
				wrapper: createWrapper(userProfile),
			});
			expect(result.current.canDeleteConversations()).toBe(false);
		});
	});

	describe("No profile loaded", () => {
		it("should return false for all permission checks when not authenticated", () => {
			const { result } = renderHook(() => useProfilePermissions(), {
				wrapper: createWrapper(null),
			});

			expect(result.current.hasRole("owner")).toBe(false);
			expect(result.current.isOwner()).toBe(false);
			expect(result.current.isAdmin()).toBe(false);
			expect(result.current.isOwnerOrAdmin()).toBe(false);
			expect(result.current.canManageInvitations()).toBe(false);
			expect(result.current.canManageMembers()).toBe(false);
			expect(result.current.canManageOrganization()).toBe(false);
			expect(result.current.canDeleteConversations()).toBe(false);
		});
	});

	describe("Array role checks", () => {
		it('should return true for hasRole(["owner", "admin"]) when user is admin', () => {
			const { result } = renderHook(() => useProfilePermissions(), {
				wrapper: createWrapper(adminProfile),
			});
			expect(result.current.hasRole(["owner", "admin"])).toBe(true);
		});

		it('should return false for hasRole(["owner"]) when user is admin', () => {
			const { result } = renderHook(() => useProfilePermissions(), {
				wrapper: createWrapper(adminProfile),
			});
			expect(result.current.hasRole(["owner"])).toBe(false);
		});
	});
});
