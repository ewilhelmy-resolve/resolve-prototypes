import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import i18n from "@/i18n";
import { ritaToast } from "@/components/ui/rita-toast";
import { memberApi } from "@/services/api";
import { useAuthStore } from "@/stores/auth-store";
import type {
	MemberListParams,
	OrganizationRole,
} from "@/types/member";

/**
 * Query Keys for Cache Management
 */
export const memberKeys = {
	all: ["members"] as const,
	lists: () => [...memberKeys.all, "list"] as const,
	list: (params: MemberListParams) => [...memberKeys.lists(), params] as const,
	detail: (userId: string) => [...memberKeys.all, "detail", userId] as const,
};

/**
 * Hook: List Members
 *
 * Fetches paginated list of members with optional filters
 *
 * @param params - Query parameters for filtering and pagination
 * @example
 * const { data, isLoading, error } = useMembers({ role: 'admin', limit: 20 })
 */
export function useMembers(params: MemberListParams = {}) {
	return useQuery({
		queryKey: memberKeys.list(params),
		queryFn: () => memberApi.listMembers(params),
		staleTime: 30000, // Consider data fresh for 30 seconds
	});
}

/**
 * Hook: Get Member Details
 *
 * Fetches detailed information about a specific member
 *
 * @param userId - Member user ID
 * @param enabled - Whether to run query (default: true)
 * @example
 * const { data, isLoading } = useMemberDetails(userId)
 */
export function useMemberDetails(userId: string, enabled = true) {
	return useQuery({
		queryKey: memberKeys.detail(userId),
		queryFn: () => memberApi.getMember(userId),
		enabled: enabled && !!userId,
	});
}

/**
 * Hook: Update Member Role
 *
 * Updates a member's role (owner only)
 * Invalidates member lists on success
 *
 * @example
 * const { mutate, isPending } = useUpdateMemberRole()
 * mutate({ userId: 'uuid', role: 'admin' })
 */
export function useUpdateMemberRole() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			userId,
			role,
		}: {
			userId: string;
			role: OrganizationRole;
		}) => memberApi.updateMemberRole(userId, role),
		onSuccess: (_data, variables) => {
			// Invalidate member lists to refetch
			queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
			queryClient.invalidateQueries({
				queryKey: memberKeys.detail(variables.userId),
			});
		},
		onError: (error: any) => {
			const message = error.message || "Failed to update member role";
			ritaToast.error({
				title: i18n.t("error.roleUpdateFailed", { ns: "toast" }),
				description: message,
			});
		},
	});
}

/**
 * Hook: Update Member Status
 *
 * Updates a member's active status (owner/admin with restrictions)
 * Invalidates member lists on success
 *
 * @example
 * const { mutate, isPending } = useUpdateMemberStatus()
 * mutate({ userId: 'uuid', isActive: false })
 */
export function useUpdateMemberStatus() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
			memberApi.updateMemberStatus(userId, isActive),
		onSuccess: (_data, variables) => {
			// Invalidate member lists to refetch
			queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
			queryClient.invalidateQueries({
				queryKey: memberKeys.detail(variables.userId),
			});

		},
		onError: (error: any) => {
			const message = error.message || "Failed to update member status";
			ritaToast.error({
				title: i18n.t("error.statusUpdateFailed", { ns: "toast" }),
				description: message,
			});
		},
	});
}

/**
 * Hook: Remove Member
 *
 * Removes a member from the organization (soft delete)
 * Invalidates member lists on success
 *
 * @example
 * const { mutate, isPending } = useRemoveMember()
 * mutate({ userId: 'uuid' })
 */
export function useRemoveMember() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ userId }: { userId: string }) =>
			memberApi.removeMember(userId),
		onSuccess: (_data) => {
			// Invalidate member lists to refetch
			queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
		},
		onError: (error: any) => {
			const message = error.message || "Failed to remove member";
			ritaToast.error({
				title: i18n.t("error.memberRemoveFailed", { ns: "toast" }),
				description: message,
			});
		},
	});
}

/**
 * Hook: Update Member Profile
 *
 * Updates a member's profile (firstName, lastName) (owner/admin only)
 * Invalidates member lists on success
 *
 * @example
 * const { mutate, isPending } = useUpdateMemberProfile()
 * mutate({ userId: 'uuid', firstName: 'John', lastName: 'Doe' })
 */
export function useUpdateMemberProfile() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			userId,
			data,
		}: {
			userId: string;
			data: { firstName?: string; lastName?: string };
		}) => memberApi.updateMemberProfile(userId, data),
		onSuccess: (_data, variables) => {
			// Invalidate member lists to refetch
			queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
			queryClient.invalidateQueries({
				queryKey: memberKeys.detail(variables.userId),
			});
		},
		onError: (error: any) => {
			const message = error.message || "Failed to update member profile";
			ritaToast.error({
				title: i18n.t("error.profileUpdateFailed", { ns: "toast" }),
				description: message,
			});
		},
	});
}

/**
 * Hook: Delete Member Permanently
 *
 * Permanently deletes a member (hard delete with Keycloak cleanup)
 * Owner only - irreversible action that deletes from database, Keycloak, and external storage
 * If deleting an owner who is the last/only member, deletes entire organization
 *
 * @example
 * const { mutate, isPending } = useDeleteMemberPermanent()
 * mutate({ userId: 'uuid', reason: 'Violated terms of service' })
 */
export function useDeleteMemberPermanent() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
			memberApi.deleteMemberPermanent(userId, reason),
		onSuccess: () => {
			// Invalidate member lists to refetch
			queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
			ritaToast.success({
				title: i18n.t("success.memberDeleted", { ns: "toast" }),
				description: i18n.t("descriptions.memberDeletedDesc", { ns: "toast" }),
			});
		},
		onError: (error: any) => {
			const message = error.message || "Failed to delete member";
			ritaToast.error({
				title: i18n.t("error.memberDeleteFailed", { ns: "toast" }),
				description: message,
			});
		},
	});
}

/**
 * Hook: Delete Own Account
 *
 * Deletes the current user's account (hard delete with Keycloak cleanup)
 * If owner and last/sole member → deletes entire organization and all members
 *
 * ⚠️ After success, user will be logged out via auth store and redirected to login
 *
 * @example
 * const { mutate, isPending } = useDeleteOwnAccount()
 * mutate({ reason: 'User requested account deletion' })
 */
export function useDeleteOwnAccount() {
	const logout = useAuthStore((state) => state.logout);

	return useMutation({
		mutationFn: ({ reason }: { reason?: string }) =>
			memberApi.deleteOwnAccount(reason),
		onSuccess: () => {
			ritaToast.success({
				title: i18n.t("success.accountDeleted", { ns: "toast" }),
				description: i18n.t("descriptions.accountDeletedDesc", { ns: "toast" }),
			});

			// Wait briefly to show toast, then logout via auth store
			setTimeout(async () => {
				// Use Rita's auth store logout method which handles:
				// 1. Backend /auth/logout call
				// 2. Keycloak logout
				// 3. State cleanup
				// 4. Redirect to login
				// Note: Keycloak requires absolute URL for redirect
				const redirectUri = `${window.location.origin}/login?accountDeleted=true`;
				await logout(redirectUri);
			}, 2000);
		},
		onError: (error: any) => {
			const message = error.message || "Failed to delete account";
			ritaToast.error({
				title: i18n.t("error.accountDeleteFailed", { ns: "toast" }),
				description: message,
			});
		},
	});
}
