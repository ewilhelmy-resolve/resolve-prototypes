/**
 * Profile Update Mutation Hook
 * Implements optimistic updates with rollback on error
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import {
	profileApi,
	type UpdateProfileRequest,
	type UpdateProfileResponse,
} from "@/services/api/profile";
import type { User } from "@/types/auth";
import { profileKeys } from "./useProfile";

interface MutationContext {
	previousUser: User | null;
}

export function useUpdateProfile() {
	const queryClient = useQueryClient();
	const { user, setUser } = useAuthStore();

	return useMutation<
		UpdateProfileResponse,
		Error,
		UpdateProfileRequest,
		MutationContext
	>({
		mutationFn: (data: UpdateProfileRequest) => profileApi.updateProfile(data),

		// Optimistic update - immediately update UI before API response
		onMutate: async (variables: UpdateProfileRequest) => {
			// Cancel any outgoing refetches to avoid overwriting optimistic update
			await queryClient.cancelQueries({ queryKey: profileKeys.all });

			// Snapshot the previous value for rollback
			const previousUser = user;

			// Optimistically update the auth store
			if (user) {
				const optimisticUser: User = {
					...user,
					...(variables.firstName !== undefined && {
						firstName: variables.firstName,
					}),
					...(variables.lastName !== undefined && {
						lastName: variables.lastName,
					}),
				};
				setUser(optimisticUser);
			}

			// Return context with previous value for rollback
			return { previousUser };
		},

		// On success, update with server response
		onSuccess: (data: UpdateProfileResponse) => {
			const serverUser: User = {
				id: data.user.id,
				email: data.user.email,
				firstName: data.user.firstName || undefined,
				lastName: data.user.lastName || undefined,
				organizationId: user?.organizationId,
			};
			setUser(serverUser);
		},

		// On error, rollback to previous state
		onError: (error: Error, _variables, context) => {
			console.error("Profile update failed:", error);
			if (context?.previousUser) {
				setUser(context.previousUser);
			}
		},

		// Always invalidate profile cache after mutation settles
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: profileKeys.all });
		},
	});
}
