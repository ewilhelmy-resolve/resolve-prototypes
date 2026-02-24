/**
 * Autopilot Settings Hooks
 * TanStack Query hook for GET + mutation for PATCH
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type AutopilotSettingsData,
	autopilotSettingsApi,
	type UpdateAutopilotSettingsPayload,
} from "@/services/api";

export const autopilotSettingsKeys = {
	all: ["autopilot-settings"] as const,
};

/**
 * Fetch autopilot settings for the active organization.
 * Lazy-creates with defaults on first access.
 */
export function useAutopilotSettings() {
	return useQuery({
		queryKey: autopilotSettingsKeys.all,
		queryFn: async () => {
			const response = await autopilotSettingsApi.get();
			return response.data;
		},
	});
}

/**
 * Mutation to update autopilot settings.
 * Invalidates cache on success.
 */
export function useUpdateAutopilotSettings() {
	const queryClient = useQueryClient();

	return useMutation<
		AutopilotSettingsData,
		Error,
		UpdateAutopilotSettingsPayload
	>({
		mutationFn: async (data) => {
			const response = await autopilotSettingsApi.update(data);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: autopilotSettingsKeys.all,
			});
		},
	});
}
