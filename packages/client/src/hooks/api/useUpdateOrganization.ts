/**
 * Organization Update Mutation Hook
 * Implements optimistic updates with automatic cache invalidation
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationApi } from "@/services/api";
import { profileKeys } from "./useProfile";

interface UpdateOrganizationResponse {
	success: boolean;
	organization: {
		id: string;
		name: string;
		created_at: string;
		updated_at: string;
	};
}

interface MutationVariables {
	organizationId: string;
	name: string;
}

export function useUpdateOrganization() {
	const queryClient = useQueryClient();

	return useMutation<
		UpdateOrganizationResponse,
		Error,
		MutationVariables
	>({
		mutationFn: ({ organizationId, name }: MutationVariables) =>
			organizationApi.updateOrganization(organizationId, { name }),

		// On success, invalidate profile cache to refetch organization data
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: profileKeys.all });
		},

		onError: (error: Error) => {
			console.error("Organization update failed:", error);
		},
	});
}
