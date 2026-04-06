import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agentApi } from "@/services/api.ts";

// Query keys
export const agentKeys = {
	all: ["agents"] as const,
	lists: () => [...agentKeys.all, "list"] as const,
	list: (filters: Record<string, string | undefined>) =>
		[...agentKeys.lists(), filters] as const,
	details: () => [...agentKeys.all, "detail"] as const,
	detail: (id: string) => [...agentKeys.details(), id] as const,
};

export function useAgents(filters?: { name?: string; active?: string }) {
	return useQuery({
		queryKey: agentKeys.list(filters ?? {}),
		queryFn: async () => {
			const response = await agentApi.list(filters);
			return response;
		},
		staleTime: 1000 * 60 * 2, // 2 minutes
	});
}

export function useDeleteAgent() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (eid: string) => {
			return agentApi.delete(eid);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
		},
	});
}
