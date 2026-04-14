import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { agentApi } from "@/services/api.ts";
import type { AgentConfig } from "@/types/agent";

const AGENTS_PAGE_SIZE = 20;

// Query keys
export const agentKeys = {
	all: ["agents"] as const,
	lists: () => [...agentKeys.all, "list"] as const,
	list: (filters: Record<string, string | undefined>) =>
		[...agentKeys.lists(), filters] as const,
	details: () => [...agentKeys.all, "detail"] as const,
	detail: (id: string) => [...agentKeys.details(), id] as const,
};

export function useAgents(filters?: {
	name?: string;
	active?: string;
	search?: string;
}) {
	return useQuery({
		queryKey: agentKeys.list(filters ?? {}),
		queryFn: () => agentApi.list(filters),
		staleTime: 1000 * 60 * 2, // 2 minutes
	});
}

export function useInfiniteAgents(filters?: {
	name?: string;
	active?: string;
	search?: string;
}) {
	return useInfiniteQuery({
		queryKey: [...agentKeys.lists(), "infinite", filters ?? {}] as const,
		queryFn: async ({ pageParam }) => {
			const response = await agentApi.list({
				...filters,
				limit: AGENTS_PAGE_SIZE,
				offset: pageParam,
			});
			return response;
		},
		getNextPageParam: (lastPage) => {
			if (!lastPage.hasMore) return undefined;
			return lastPage.offset + lastPage.limit;
		},
		initialPageParam: 0,
		staleTime: 1000 * 60 * 2,
	});
}

export function useAgent(eid: string | undefined) {
	return useQuery({
		queryKey: agentKeys.detail(eid ?? ""),
		queryFn: () => agentApi.get(eid as string),
		enabled: !!eid,
		staleTime: 1000 * 60 * 2,
	});
}

export function useCheckAgentName(name: string) {
	return useQuery({
		queryKey: [...agentKeys.all, "check-name", name],
		queryFn: () => agentApi.checkName(name),
		enabled: name.trim().length > 0,
		staleTime: 1000 * 30,
	});
}

export function useCreateAgent() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: Partial<AgentConfig>) => agentApi.create(data),
		onSuccess: (newAgent) => {
			if (newAgent.id) {
				queryClient.setQueryData(agentKeys.detail(newAgent.id), newAgent);
			}
			queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
		},
	});
}

export function useUpdateAgent() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ eid, data }: { eid: string; data: Partial<AgentConfig> }) =>
			agentApi.update(eid, data),
		onSuccess: (updatedAgent, { eid }) => {
			queryClient.setQueryData(agentKeys.detail(eid), updatedAgent);
			queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
		},
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

export function useGenerateAgent() {
	return useMutation({
		mutationFn: (data: {
			name: string;
			description?: string;
			instructions?: string;
			iconId?: string;
			iconColorId?: string;
			conversationStarters?: string[];
			guardrails?: string[];
		}) => agentApi.generate(data),
	});
}

export function useAgentCreationInput() {
	return useMutation({
		mutationFn: (data: {
			creationId: string;
			prevExecutionId: string;
			prompt: string;
		}) => agentApi.sendCreationInput(data),
	});
}

export function useCancelAgentCreation() {
	return useMutation({
		mutationFn: (data: { creationId: string }) => agentApi.cancelCreation(data),
	});
}
