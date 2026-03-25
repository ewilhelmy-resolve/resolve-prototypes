import {
	keepPreviousData,
	useInfiniteQuery,
	useQuery,
} from "@tanstack/react-query";
import { clustersApi, ticketsApi } from "@/services/api";
import type {
	ClustersQueryParams,
	ClusterTicketsQueryParams,
} from "@/types/cluster";

// Query Keys
export const clusterKeys = {
	all: ["clusters"] as const,
	lists: () => [...clusterKeys.all, "list"] as const,
	list: (params?: ClustersQueryParams) =>
		[...clusterKeys.lists(), params] as const,
	details: () => [...clusterKeys.all, "detail"] as const,
	detail: (id: string) => [...clusterKeys.details(), id] as const,
	tickets: () => [...clusterKeys.all, "tickets"] as const,
	ticketList: (id: string, params?: ClusterTicketsQueryParams) =>
		[...clusterKeys.tickets(), id, params] as const,
	kbArticles: () => [...clusterKeys.all, "kb-articles"] as const,
	kbArticleList: (id: string) => [...clusterKeys.kbArticles(), id] as const,
};

export const ticketKeys = {
	all: ["tickets"] as const,
	details: () => [...ticketKeys.all, "detail"] as const,
	detail: (id: string) => [...ticketKeys.details(), id] as const,
};

/**
 * Options for useClusters hook
 */
interface UseClustersOptions extends ClustersQueryParams {
	/** Whether the query should be enabled (default: true) */
	enabled?: boolean;
}

/**
 * Options for useInfiniteClusters hook
 */
interface UseInfiniteClustersOptions extends ClustersQueryParams {
	/** Whether the query should be enabled (default: true) */
	enabled?: boolean;
}

/**
 * List all clusters for the organization
 * @param options - Query params (sort, period, limit, cursor, kb_status, search) and enabled flag
 * @returns Query with clusters and pagination info
 */
export function useClusters(options?: UseClustersOptions) {
	const { enabled = true, ...params } = options ?? {};

	return useQuery({
		queryKey: clusterKeys.list(params),
		queryFn: async () => {
			const response = await clustersApi.list(params);
			return response; // Returns { data, pagination }
		},
		staleTime: 30000, // 30 seconds
		placeholderData: keepPreviousData, // Keep previous data while fetching to avoid focus loss
		enabled,
	});
}

/**
 * List clusters with infinite scroll pagination
 * @param options - Query params (sort, period, limit, kb_status, search) and enabled flag
 * @returns Infinite query with clusters pages and pagination helpers
 */
export function useInfiniteClusters(options?: UseInfiniteClustersOptions) {
	const { enabled = true, ...params } = options ?? {};

	return useInfiniteQuery({
		queryKey: [...clusterKeys.lists(), "infinite", params],
		queryFn: async ({ pageParam }) => {
			const response = await clustersApi.list({
				...params,
				offset: pageParam,
			});
			return response;
		},
		initialPageParam: 0,
		getNextPageParam: (lastPage) =>
			lastPage.pagination.has_more
				? lastPage.pagination.offset + lastPage.pagination.limit
				: undefined,
		staleTime: 30000,
		enabled,
	});
}

/**
 * Get cluster details by ID
 * @param id - Cluster UUID
 * @returns Query with cluster details
 */
export function useClusterDetails(id: string | undefined) {
	return useQuery({
		queryKey: clusterKeys.detail(id as string),
		queryFn: async () => {
			const response = await clustersApi.getDetails(id as string);
			return response.data;
		},
		enabled: !!id,
		staleTime: 30000,
	});
}

interface UseClusterTicketsOptions {
	keepPrevious?: boolean;
}

/**
 * Get paginated tickets for a cluster
 * @param id - Cluster UUID
 * @param params - Query params (tab, offset, limit, sort, sort_dir, search)
 * @param options - Hook options (keepPrevious to retain data while refetching)
 * @returns Query with tickets and pagination info
 */
export function useClusterTickets(
	id: string | undefined,
	params?: ClusterTicketsQueryParams,
	options?: UseClusterTicketsOptions,
) {
	return useQuery({
		queryKey: clusterKeys.ticketList(id as string, params),
		queryFn: async () => {
			const response = await clustersApi.getTickets(id as string, params);
			return response;
		},
		enabled: !!id,
		staleTime: 30000,
		...(options?.keepPrevious && { placeholderData: keepPreviousData }),
	});
}

/**
 * Get KB articles linked to a cluster
 * @param id - Cluster UUID
 * @returns Query with KB articles
 */
export function useClusterKbArticles(id: string | undefined) {
	return useQuery({
		queryKey: clusterKeys.kbArticleList(id as string),
		queryFn: async () => {
			const response = await clustersApi.getKbArticles(id as string);
			return response.data;
		},
		enabled: !!id,
		staleTime: 30000,
	});
}

/**
 * Get cluster actions map (whether each cluster has a linked Resolve Action workflow)
 * TODO: wire to real actions API when available
 */
export function useClusterActions() {
	return useQuery({
		queryKey: ["cluster-actions"],
		queryFn: async () => {
			return {} as Record<string, boolean>;
		},
		staleTime: 30000,
	});
}

/**
 * Get a single ticket by ID
 * @param id - Ticket UUID
 * @returns Query with ticket details
 */
export function useTicket(id: string | undefined) {
	return useQuery({
		queryKey: ticketKeys.detail(id as string),
		queryFn: async () => {
			const response = await ticketsApi.getById(id as string);
			return response.data;
		},
		enabled: !!id,
		staleTime: 30000,
	});
}
