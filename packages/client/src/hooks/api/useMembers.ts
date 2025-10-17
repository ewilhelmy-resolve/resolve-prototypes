import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ritaToast } from "@/components/ui/rita-toast";
import { memberApi } from "@/services/api";
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
				title: "Failed to update role",
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
				title: "Failed to update status",
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
				title: "Failed to remove member",
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
				title: "Failed to update profile",
				description: message,
			});
		},
	});
}
