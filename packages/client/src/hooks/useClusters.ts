import { useQuery } from '@tanstack/react-query';
import { clustersApi, ticketsApi } from '@/services/api';
import type {
	ClusterSortOption,
	ClusterTicketsQueryParams,
	ClusterListItem,
	ClusterDetails,
} from '@/types/cluster';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

// Mock clusters for demo mode (list view)
const DEMO_CLUSTERS: ClusterListItem[] = [
	{
		id: 'cluster-1',
		name: 'Password Resets',
		subcluster_name: null,
		ticket_count: 523,
		needs_response_count: 45,
		kb_status: 'FOUND',
		config: { auto_respond: false, auto_populate: false },
		created_at: '2024-01-15T10:00:00Z',
		updated_at: '2024-01-20T14:30:00Z',
	},
	{
		id: 'cluster-2',
		name: 'Email Signatures',
		subcluster_name: 'Outlook',
		ticket_count: 312,
		needs_response_count: 28,
		kb_status: 'FOUND',
		config: { auto_respond: false, auto_populate: false },
		created_at: '2024-01-10T09:00:00Z',
		updated_at: '2024-01-19T11:00:00Z',
	},
	{
		id: 'cluster-3',
		name: 'VPN Connection Issues',
		subcluster_name: null,
		ticket_count: 287,
		needs_response_count: 52,
		kb_status: 'FOUND',
		config: { auto_respond: false, auto_populate: false },
		created_at: '2024-01-12T08:00:00Z',
		updated_at: '2024-01-21T09:15:00Z',
	},
	{
		id: 'cluster-4',
		name: 'Software Installation',
		subcluster_name: 'Microsoft Office',
		ticket_count: 456,
		needs_response_count: 34,
		kb_status: 'FOUND',
		config: { auto_respond: false, auto_populate: false },
		created_at: '2024-01-08T14:00:00Z',
		updated_at: '2024-01-18T16:45:00Z',
	},
	{
		id: 'cluster-5',
		name: 'Printer Setup',
		subcluster_name: null,
		ticket_count: 198,
		needs_response_count: 15,
		kb_status: 'GAP',
		config: { auto_respond: false, auto_populate: false },
		created_at: '2024-01-05T11:00:00Z',
		updated_at: '2024-01-17T10:30:00Z',
	},
	{
		id: 'cluster-6',
		name: 'Account Lockouts',
		subcluster_name: null,
		ticket_count: 741,
		needs_response_count: 89,
		kb_status: 'FOUND',
		config: { auto_respond: false, auto_populate: false },
		created_at: '2024-01-03T07:00:00Z',
		updated_at: '2024-01-22T08:00:00Z',
	},
];

// Mock cluster details for demo mode
const DEMO_CLUSTER_DETAILS: Record<string, ClusterDetails> = {
	'cluster-1': {
		id: 'cluster-1',
		organization_id: 'demo-org',
		model_id: 'model-1',
		name: 'Password Resets',
		subcluster_name: null,
		config: { auto_respond: false, auto_populate: false },
		kb_status: 'FOUND',
		kb_articles_count: 3,
		ticket_count: 523,
		open_count: 45,
		created_at: '2024-01-15T10:00:00Z',
		updated_at: '2024-01-20T14:30:00Z',
	},
	'cluster-2': {
		id: 'cluster-2',
		organization_id: 'demo-org',
		model_id: 'model-1',
		name: 'Email Signatures',
		subcluster_name: 'Outlook',
		config: { auto_respond: false, auto_populate: false },
		kb_status: 'FOUND',
		kb_articles_count: 2,
		ticket_count: 312,
		open_count: 28,
		created_at: '2024-01-10T09:00:00Z',
		updated_at: '2024-01-19T11:00:00Z',
	},
	'cluster-3': {
		id: 'cluster-3',
		organization_id: 'demo-org',
		model_id: 'model-1',
		name: 'VPN Connection Issues',
		subcluster_name: null,
		config: { auto_respond: false, auto_populate: false },
		kb_status: 'FOUND',
		kb_articles_count: 4,
		ticket_count: 287,
		open_count: 52,
		created_at: '2024-01-12T08:00:00Z',
		updated_at: '2024-01-21T09:15:00Z',
	},
	'cluster-4': {
		id: 'cluster-4',
		organization_id: 'demo-org',
		model_id: 'model-1',
		name: 'Software Installation',
		subcluster_name: 'Microsoft Office',
		config: { auto_respond: false, auto_populate: false },
		kb_status: 'FOUND',
		kb_articles_count: 5,
		ticket_count: 456,
		open_count: 34,
		created_at: '2024-01-08T14:00:00Z',
		updated_at: '2024-01-18T16:45:00Z',
	},
	'cluster-5': {
		id: 'cluster-5',
		organization_id: 'demo-org',
		model_id: 'model-1',
		name: 'Printer Setup',
		subcluster_name: null,
		config: { auto_respond: false, auto_populate: false },
		kb_status: 'GAP',
		kb_articles_count: 0,
		ticket_count: 198,
		open_count: 15,
		created_at: '2024-01-05T11:00:00Z',
		updated_at: '2024-01-17T10:30:00Z',
	},
	'cluster-6': {
		id: 'cluster-6',
		organization_id: 'demo-org',
		model_id: 'model-1',
		name: 'Account Lockouts',
		subcluster_name: null,
		config: { auto_respond: false, auto_populate: false },
		kb_status: 'FOUND',
		kb_articles_count: 2,
		ticket_count: 741,
		open_count: 89,
		created_at: '2024-01-03T07:00:00Z',
		updated_at: '2024-01-22T08:00:00Z',
	},
};

// Query Keys
export const clusterKeys = {
	all: ['clusters'] as const,
	lists: () => [...clusterKeys.all, 'list'] as const,
	list: (sort?: ClusterSortOption) => [...clusterKeys.lists(), { sort }] as const,
	details: () => [...clusterKeys.all, 'detail'] as const,
	detail: (id: string) => [...clusterKeys.details(), id] as const,
	tickets: () => [...clusterKeys.all, 'tickets'] as const,
	ticketList: (id: string, params?: ClusterTicketsQueryParams) =>
		[...clusterKeys.tickets(), id, params] as const,
	kbArticles: () => [...clusterKeys.all, 'kb-articles'] as const,
	kbArticleList: (id: string) => [...clusterKeys.kbArticles(), id] as const,
};

export const ticketKeys = {
	all: ['tickets'] as const,
	details: () => [...ticketKeys.all, 'detail'] as const,
	detail: (id: string) => [...ticketKeys.details(), id] as const,
};

/**
 * List all clusters for the organization
 * @param sort - Sort option (volume, automation, recent)
 * @returns Query with array of clusters
 */
export function useClusters(sort?: ClusterSortOption) {
	return useQuery({
		queryKey: clusterKeys.list(sort),
		queryFn: async () => {
			// Demo mode: return mock data
			if (DEMO_MODE) {
				return DEMO_CLUSTERS;
			}
			const response = await clustersApi.list({ sort });
			return response.data;
		},
		staleTime: 30000, // 30 seconds
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
			// Demo mode: return mock data
			if (DEMO_MODE) {
				const cluster = DEMO_CLUSTER_DETAILS[id!];
				if (cluster) return cluster;
				throw new Error('Cluster not found');
			}
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
	params?: ClusterTicketsQueryParams
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
