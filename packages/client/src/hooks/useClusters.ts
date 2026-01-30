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
interface UseInfiniteClustersOptions
	extends Omit<ClustersQueryParams, "cursor"> {
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
				cursor: pageParam,
			});
			return response;
		},
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) =>
			lastPage.pagination.has_more
				? lastPage.pagination.next_cursor
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
		queryKey: clusterKeys.detail(id!),
		queryFn: async () => {
			const response = await clustersApi.getDetails(id!);
			return response.data;
		},
		enabled: !!id,
		staleTime: 30000,
	});
}

/**
 * Get paginated tickets for a cluster
 * @param id - Cluster UUID
 * @param params - Query params (tab, cursor, limit)
 * @returns Query with tickets and pagination info
 */
export function useClusterTickets(
	id: string | undefined,
	params?: ClusterTicketsQueryParams,
) {
	return useQuery({
		queryKey: clusterKeys.ticketList(id!, params),
		queryFn: async () => {
			const response = await clustersApi.getTickets(id!, params);
			return response;
		},
		enabled: !!id,
		staleTime: 30000,
	});
}

/**
 * Get KB articles linked to a cluster
 * @param id - Cluster UUID
 * @returns Query with KB articles
 */
export function useClusterKbArticles(id: string | undefined) {
	return useQuery({
		queryKey: clusterKeys.kbArticleList(id!),
		queryFn: async () => {
			const response = await clustersApi.getKbArticles(id!);
			return response.data;
		},
		enabled: !!id,
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
		queryKey: ticketKeys.detail(id!),
		queryFn: async () => {
			const response = await ticketsApi.getById(id!);
			return response.data;
		},
		enabled: !!id,
		staleTime: 30000,
	});
}
