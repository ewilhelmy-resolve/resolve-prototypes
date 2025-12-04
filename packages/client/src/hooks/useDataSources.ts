import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dataSourcesApi } from '@/services/api';
import type {
  DataSourceConnection,
  UpdateDataSourceRequest,
  VerifyDataSourceRequest,
} from '@/types/dataSource';

// Query Keys
export const dataSourceKeys = {
  all: ['dataSources'] as const,
  lists: () => [...dataSourceKeys.all, 'list'] as const,
  list: () => [...dataSourceKeys.lists()] as const,
  details: () => [...dataSourceKeys.all, 'detail'] as const,
  detail: (id: string) => [...dataSourceKeys.details(), id] as const,
};

/**
 * List all data sources
 * @returns Query with array of data sources
 */
export function useDataSources() {
  return useQuery({
    queryKey: dataSourceKeys.list(),
    queryFn: async () => {
      const response = await dataSourcesApi.list();
      return response.data; // Unwrap { data: DataSourceConnection[] }
    },
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Get single data source by ID
 * @param id - Data source UUID
 * @returns Query with single data source
 */
export function useDataSource(id: string | undefined) {
  return useQuery({
    queryKey: dataSourceKeys.detail(id!),
    queryFn: async () => {
      const response = await dataSourcesApi.get(id!);
      return response.data; // Unwrap { data: DataSourceConnection }
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
    mutationFn: dataSourcesApi.seed,
    onSuccess: () => {
      // Invalidate list query to refetch with seeded data
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
      queryClient.invalidateQueries({ queryKey: dataSourceKeys.detail(response.data.id) });
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
    mutationFn: ({ id, payload }: { id: string; payload: VerifyDataSourceRequest }) =>
      dataSourcesApi.verify(id, payload),
    onMutate: async ({ id }) => {
      // Optimistic update: set status to 'verifying'
      await queryClient.cancelQueries({ queryKey: dataSourceKeys.detail(id) });
      const previousData = queryClient.getQueryData<DataSourceConnection>(dataSourceKeys.detail(id));

      queryClient.setQueryData<DataSourceConnection>(dataSourceKeys.detail(id), (old) => {
        if (!old) return old;
        return { ...old, status: 'verifying' as const };
      });

      return { previousData };
    },
    onError: (_err, { id }, context) => {
      // Rollback optimistic update on error
      if (context?.previousData) {
        queryClient.setQueryData(dataSourceKeys.detail(id), context.previousData);
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
      queryClient.invalidateQueries({ queryKey: dataSourceKeys.detail(response.data.id) });
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
 * Trigger ITSM ticket sync for autopilot clustering
 * Returns ingestion_run_id - status updates via SSE
 */
export function useSyncTickets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, timeRangeDays }: { id: string; timeRangeDays: number }) =>
      dataSourcesApi.syncTickets(id, { time_range_days: timeRangeDays }),
    onSuccess: (_, { id }) => {
      // Invalidate queries to reflect syncing state
      queryClient.invalidateQueries({ queryKey: dataSourceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: dataSourceKeys.list() });
    },
  });
}
