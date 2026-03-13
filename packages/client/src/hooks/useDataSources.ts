import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dataSourcesApi } from "@/services/api";
import type {
	DataSourceConnection,
	UpdateDataSourceRequest,
	VerifyDataSourceRequest,
} from "@/types/dataSource";
import { mlModelKeys, signalSyncStarted } from "./useActiveModel";

const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

const MOCK_CONFLUENCE: DataSourceConnection = {
	id: "demo-confluence-001",
	organization_id: "demo-org",
	type: "confluence",
	name: "Confluence",
	description: "IT Knowledge Base",
	settings: { spaces: "IT Support,HR Policies,Engineering" },
	status: "idle",
	last_sync_status: "completed",
	latest_options: {
		spaces: [
			{ title: "IT Support", sys_id: "it-support" },
			{ title: "HR Policies", sys_id: "hr-policies" },
			{ title: "Engineering", sys_id: "engineering" },
			{ title: "Finance", sys_id: "finance" },
		],
	},
	enabled: true,
	auto_sync: false,
	last_verification_at: "2026-03-01T10:00:00Z",
	last_verification_error: null,
	last_sync_at: "2026-03-10T14:30:00Z",
	last_sync_error: null,
	created_by: "demo-user",
	updated_by: "demo-user",
	created_at: "2026-01-15T09:00:00Z",
	updated_at: "2026-03-10T14:30:00Z",
};

const MOCK_DATA_SOURCES: DataSourceConnection[] = [
	MOCK_CONFLUENCE,
	{
		id: "demo-servicenow-001",
		organization_id: "demo-org",
		type: "servicenow",
		name: "ServiceNow",
		description: null,
		settings: {},
		status: "idle",
		last_sync_status: null,
		latest_options: null,
		enabled: false,
		auto_sync: false,
		last_verification_at: null,
		last_verification_error: null,
		last_sync_at: null,
		last_sync_error: null,
		created_by: "demo-user",
		updated_by: "demo-user",
		created_at: "2026-01-15T09:00:00Z",
		updated_at: "2026-01-15T09:00:00Z",
	},
];

// Query Keys
export const dataSourceKeys = {
	all: ["dataSources"] as const,
	lists: () => [...dataSourceKeys.all, "list"] as const,
	list: () => [...dataSourceKeys.lists()] as const,
	details: () => [...dataSourceKeys.all, "detail"] as const,
	detail: (id: string | undefined) =>
		[...dataSourceKeys.details(), id] as const,
};

// Ingestion Run Query Keys (ITSM Autopilot)
export const ingestionRunKeys = {
	all: ["ingestionRuns"] as const,
	latest: (connectionId: string) =>
		[...ingestionRunKeys.all, "latest", connectionId] as const,
};

/**
 * List all data sources
 * @returns Query with array of data sources
 */
export function useDataSources() {
	return useQuery({
		queryKey: dataSourceKeys.list(),
		queryFn: async () => {
			if (IS_DEMO_MODE) return MOCK_DATA_SOURCES;
			const response = await dataSourcesApi.list();
			return response.data;
		},
		staleTime: 30000,
	});
}

/**
 * Get single data source by ID
 * @param id - Data source UUID
 * @returns Query with single data source
 */
export function useDataSource(id: string | undefined) {
	return useQuery({
		queryKey: dataSourceKeys.detail(id),
		queryFn: async () => {
			if (!id) throw new Error("ID is required");
			if (IS_DEMO_MODE) {
				const found = MOCK_DATA_SOURCES.find((s) => s.id === id);
				if (!found) throw new Error("Source not found");
				return found;
			}
			const response = await dataSourcesApi.get(id);
			return response.data;
		},
		enabled: !!id,
		staleTime: 30000,
	});
}

/**
 * Seed default data sources (idempotent)
 * Called on mount of connections page
 */
export function useSeedDataSources() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			if (IS_DEMO_MODE) return { success: true, created: 0, existing: 2, message: "demo" };
			return dataSourcesApi.seed();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: dataSourceKeys.list() });
		},
	});
}

/**
 * Update data source configuration
 */
export function useUpdateDataSource() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateDataSourceRequest }) =>
			dataSourcesApi.update(id, data),
		onSuccess: (response) => {
			// Update both list and detail queries
			queryClient.invalidateQueries({ queryKey: dataSourceKeys.list() });
			queryClient.invalidateQueries({
				queryKey: dataSourceKeys.detail(response.data.id),
			});
		},
	});
}

/**
 * Verify credentials (async - result via SSE)
 * Sets status to 'verifying' immediately, actual result comes via SSE
 */
export function useVerifyDataSource() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			id,
			payload,
		}: {
			id: string;
			payload: VerifyDataSourceRequest;
		}) => dataSourcesApi.verify(id, payload),
		onMutate: async ({ id }) => {
			// Optimistic update: set status to 'verifying'
			await queryClient.cancelQueries({ queryKey: dataSourceKeys.detail(id) });
			const previousData = queryClient.getQueryData<DataSourceConnection>(
				dataSourceKeys.detail(id),
			);

			queryClient.setQueryData<DataSourceConnection>(
				dataSourceKeys.detail(id),
				(old) => {
					if (!old) return old;
					return {
						...old,
						status: "verifying" as const,
						last_sync_error: null,
					};
				},
			);

			return { previousData };
		},
		onError: (_err, { id }, context) => {
			// Rollback optimistic update on error
			if (context?.previousData) {
				queryClient.setQueryData(
					dataSourceKeys.detail(id),
					context.previousData,
				);
			}
		},
		// Note: Success status update will come via SSE event
	});
}

/**
 * Trigger sync for a configured data source
 */
export function useTriggerSync() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => dataSourcesApi.sync(id),
		onSuccess: (response) => {
			// Invalidate queries to show 'syncing' status
			queryClient.invalidateQueries({
				queryKey: dataSourceKeys.detail(response.data.id),
			});
			queryClient.invalidateQueries({ queryKey: dataSourceKeys.list() });
		},
	});
}

/**
 * Cancel an ongoing sync operation
 */
export function useCancelSync() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => dataSourcesApi.cancelSync(id),
		onSuccess: (_, id) => {
			// Invalidate queries to show 'cancelled' status
			queryClient.invalidateQueries({ queryKey: dataSourceKeys.detail(id) });
			queryClient.invalidateQueries({ queryKey: dataSourceKeys.list() });
		},
	});
}

/**
 * Cancel an ongoing ingestion run (ticket sync)
 */
export function useCancelIngestion() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (connectionId: string) =>
			dataSourcesApi.cancelIngestion(connectionId),
		onSuccess: (_, connectionId) => {
			// Invalidate ingestion run query to show 'cancelled' status
			queryClient.invalidateQueries({
				queryKey: ingestionRunKeys.latest(connectionId),
			});
		},
	});
}

/**
 * Trigger ITSM ticket sync for autopilot clustering
 * Returns ingestion_run_id - status updates via SSE
 */
export function useSyncTickets() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			id,
			timeRangeDays,
		}: {
			id: string;
			timeRangeDays: number;
		}) => dataSourcesApi.syncTickets(id, { time_range_days: timeRangeDays }),
		onSuccess: (_, { id }) => {
			// Invalidate ingestion run query to show new syncing state
			queryClient.invalidateQueries({ queryKey: ingestionRunKeys.latest(id) });
			// Signal that a sync just started - this triggers aggressive polling
			// for the active model to quickly catch the training state change
			signalSyncStarted();
			queryClient.invalidateQueries({ queryKey: mlModelKeys.active() });
		},
	});
}

/**
 * Get the latest ingestion run for a data source (ITSM Autopilot)
 * Used to check if a ticket sync is in progress
 */
export function useLatestIngestionRun(connectionId: string | undefined) {
	return useQuery({
		queryKey: ingestionRunKeys.latest(connectionId ?? ""),
		queryFn: async () => {
			if (!connectionId) throw new Error("Connection ID is required");
			const response = await dataSourcesApi.getLatestIngestionRun(connectionId);
			return response.data;
		},
		enabled: !!connectionId,
		staleTime: 10000, // 10 seconds - more frequent refresh for active syncs
		refetchInterval: (query) => {
			const status = query.state.data?.status;
			if (status === "pending" || status === "running") {
				return 5000; // 5s polling during active ingestion
			}
			return false;
		},
	});
}
