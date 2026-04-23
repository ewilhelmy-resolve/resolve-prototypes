import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import {
	demoDelay,
	fakeConversationStarters,
	fakeImproveInstructions,
	MOCK_AGENT_CONFIGS,
	MOCK_AGENTS_LIST,
} from "@/data/mock-agents-demo";
import type { AgentConfig, AgentState, AgentTableRow } from "@/types/agent";

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

// -----------------------------------------------------------------------------
// Demo branch: every hook below returns static/mock data instead of calling the
// real backend. Keeps the prototype branch self-contained so the builder demos
// (PTO + Laptop Loan) don't depend on the LLM / agentic service being up.
// Restore the original implementation from git history when the backend is
// stable and this branch is ready to rejoin main.
// -----------------------------------------------------------------------------

function filterAgents(
	list: AgentTableRow[],
	filters?: {
		name?: string;
		state?: AgentState;
		search?: string;
		owner?: "me" | "others";
	},
): AgentTableRow[] {
	if (!filters) return list;
	return list.filter((a) => {
		if (filters.state && a.state !== filters.state) return false;
		const needle = (filters.search || filters.name || "").toLowerCase();
		if (needle && !a.name.toLowerCase().includes(needle)) return false;
		// owner filter is a no-op in demo mode (everything is "me")
		return true;
	});
}

export function useAgents(filters?: {
	name?: string;
	state?: AgentState;
	search?: string;
	owner?: "me" | "others";
}) {
	return useQuery({
		queryKey: agentKeys.list(filters ?? {}),
		queryFn: async () => {
			const filtered = filterAgents(MOCK_AGENTS_LIST, filters);
			return demoDelay({
				agents: filtered,
				limit: AGENTS_PAGE_SIZE,
				offset: 0,
				hasMore: false,
			});
		},
		staleTime: 1000 * 60 * 2,
	});
}

export function useInfiniteAgents(filters?: {
	name?: string;
	state?: AgentState;
	search?: string;
	owner?: "me" | "others";
}) {
	return useInfiniteQuery({
		queryKey: [...agentKeys.lists(), "infinite", filters ?? {}] as const,
		queryFn: async () => {
			const filtered = filterAgents(MOCK_AGENTS_LIST, filters);
			return demoDelay({
				agents: filtered,
				limit: AGENTS_PAGE_SIZE,
				offset: 0,
				hasMore: false,
			});
		},
		getNextPageParam: () => undefined,
		initialPageParam: 0,
		staleTime: 1000 * 60 * 2,
	});
}

export function useAgent(eid: string | undefined) {
	return useQuery({
		queryKey: agentKeys.detail(eid ?? ""),
		queryFn: async () => {
			const config = eid ? MOCK_AGENT_CONFIGS[eid] : undefined;
			if (!config) {
				throw new Error(`Demo agent ${eid} not found`);
			}
			return demoDelay(config);
		},
		enabled: !!eid,
		staleTime: 1000 * 60 * 2,
	});
}

export function useCheckAgentName(name: string) {
	return useQuery({
		queryKey: [...agentKeys.all, "check-name", name],
		queryFn: async () => {
			// Always say the name is available in demo mode.
			return demoDelay({ available: true });
		},
		enabled: name.trim().length > 0,
		staleTime: 1000 * 30,
	});
}

export function useCreateAgent() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: Partial<AgentConfig>) => {
			const id = `demo-${Date.now()}`;
			const created: AgentConfig = {
				name: data.name ?? "Untitled Agent",
				description: data.description ?? "",
				instructions: data.instructions ?? "",
				role: data.role ?? "",
				iconId: data.iconId ?? "bot",
				iconColorId: data.iconColorId ?? "slate",
				agentType: data.agentType ?? null,
				conversationStarters: data.conversationStarters ?? [],
				knowledgeSources: data.knowledgeSources ?? [],
				tools: data.tools ?? [],
				skills: data.skills,
				guardrails: data.guardrails ?? [],
				responsibilities: data.responsibilities,
				completionCriteria: data.completionCriteria,
				hasRequiredConnections: data.hasRequiredConnections ?? false,
				capabilities: data.capabilities ?? {
					webSearch: true,
					imageGeneration: false,
					useAllWorkspaceContent: false,
				},
				id,
				state: "DRAFT",
			};
			return demoDelay(created);
		},
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
		mutationFn: async ({
			eid,
			data,
		}: {
			eid: string;
			data: Partial<AgentConfig>;
		}) => {
			const existing = MOCK_AGENT_CONFIGS[eid] ?? {};
			const merged: AgentConfig = {
				...(existing as AgentConfig),
				...data,
				id: eid,
			};
			return demoDelay(merged);
		},
		onSuccess: (updatedAgent, { eid }) => {
			queryClient.setQueryData(agentKeys.detail(eid), updatedAgent);
			queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
		},
	});
}

export function useDeleteAgent() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (_eid: string) => {
			return demoDelay({ success: true, message: "Deleted (demo)" });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
		},
	});
}

export function useGenerateAgent() {
	return useMutation({
		mutationFn: async (_data: {
			name: string;
			description?: string;
			instructions?: string;
			iconId?: string;
			iconColorId?: string;
			conversationStarters?: string[];
			guardrails?: string[];
			targetAgentEid?: string;
			updatePrompt?: string;
			generateDescription?: boolean;
		}) => {
			return demoDelay({
				mode: "async" as const,
				creationId: `demo-creation-${Date.now()}`,
			});
		},
	});
}

export function useAgentCreationInput() {
	return useMutation({
		mutationFn: async (_data: {
			creationId: string;
			prevExecutionId: string;
			prompt: string;
			targetAgentEid?: string;
		}) => {
			return demoDelay({ success: true });
		},
	});
}

export function useCancelAgentCreation() {
	return useMutation({
		mutationFn: async (_data: { creationId: string }) => {
			return demoDelay({ success: true });
		},
	});
}

export function useImproveInstructionsMutation() {
	return useMutation({
		mutationFn: async (data: {
			instructions: string;
			agentConfig: {
				name?: string;
				role?: string;
				description?: string;
				agentType?: string | null;
				guardrails?: string[];
				conversationStarters?: string[];
				tools?: string[];
				knowledgeSources?: string[];
				capabilities?: { webSearch?: boolean; imageGeneration?: boolean };
				responsibilities?: string;
				completionCriteria?: string;
			};
		}) => {
			return demoDelay(fakeImproveInstructions(data.instructions));
		},
	});
}

export function useGenerateConversationStartersMutation() {
	return useMutation({
		mutationFn: async (data: {
			agentConfig: {
				name?: string;
				role?: string;
				description?: string;
				instructions?: string;
				agentType?: string | null;
				guardrails?: string[];
				conversationStarters?: string[];
				tools?: string[];
				knowledgeSources?: string[];
				capabilities?: { webSearch?: boolean; imageGeneration?: boolean };
				responsibilities?: string;
				completionCriteria?: string;
			};
		}) => {
			return demoDelay({
				starters: fakeConversationStarters(data.agentConfig.name ?? ""),
			});
		},
	});
}

export function useExecuteAgent() {
	return useMutation({
		mutationFn: async (_args: {
			eid: string;
			message: string;
			transcript?: string;
		}) => {
			return demoDelay({ executionRequestId: `demo-exec-${Date.now()}` });
		},
	});
}
