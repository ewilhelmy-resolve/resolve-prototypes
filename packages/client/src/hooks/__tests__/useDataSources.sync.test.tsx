import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the API
vi.mock("@/services/api", () => ({
	dataSourcesApi: {
		syncTickets: vi.fn(),
		getLatestIngestionRun: vi.fn(),
		cancelIngestion: vi.fn(),
	},
}));

// Mock useActiveModel hooks
vi.mock("@/hooks/useActiveModel", () => ({
	mlModelKeys: {
		active: () => ["mlModels", "active"],
	},
	signalSyncStarted: vi.fn(),
}));

import { signalSyncStarted } from "@/hooks/useActiveModel";
import { dataSourcesApi } from "@/services/api";
import {
	ingestionRunKeys,
	useCancelIngestion,
	useLatestIngestionRun,
	useSyncTickets,
} from "../useDataSources";

const mockedApi = vi.mocked(dataSourcesApi);
const mockedSignalSyncStarted = vi.mocked(signalSyncStarted);

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	return { wrapper, queryClient };
}

describe("ingestionRunKeys", () => {
	it("generates correct query keys", () => {
		expect(ingestionRunKeys.all).toEqual(["ingestionRuns"]);
		expect(ingestionRunKeys.latest("conn-123")).toEqual([
			"ingestionRuns",
			"latest",
			"conn-123",
		]);
	});
});

describe("useSyncTickets", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls dataSourcesApi.syncTickets with correct params", async () => {
		mockedApi.syncTickets.mockResolvedValueOnce({
			ingestion_run_id: "run-1",
			status: "SYNCING",
			message: "Sync started",
		});

		const { wrapper } = createWrapper();
		const { result } = renderHook(() => useSyncTickets(), { wrapper });

		await act(async () => {
			await result.current.mutateAsync({ id: "ds-1", timeRangeDays: 30 });
		});

		expect(mockedApi.syncTickets).toHaveBeenCalledWith("ds-1", {
			time_range_days: 30,
		});
	});

	it("invalidates ingestion run query on success", async () => {
		mockedApi.syncTickets.mockResolvedValueOnce({
			ingestion_run_id: "run-1",
			status: "SYNCING",
			message: "Sync started",
		});

		const { wrapper, queryClient } = createWrapper();
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

		const { result } = renderHook(() => useSyncTickets(), { wrapper });

		await act(async () => {
			await result.current.mutateAsync({ id: "ds-1", timeRangeDays: 30 });
		});

		expect(invalidateSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				queryKey: ingestionRunKeys.latest("ds-1"),
			}),
		);
	});

	it("calls signalSyncStarted() on success", async () => {
		mockedApi.syncTickets.mockResolvedValueOnce({
			ingestion_run_id: "run-1",
			status: "SYNCING",
			message: "Sync started",
		});

		const { wrapper } = createWrapper();
		const { result } = renderHook(() => useSyncTickets(), { wrapper });

		await act(async () => {
			await result.current.mutateAsync({ id: "ds-1", timeRangeDays: 7 });
		});

		expect(mockedSignalSyncStarted).toHaveBeenCalledOnce();
	});

	it("handles errors", async () => {
		mockedApi.syncTickets.mockRejectedValueOnce(new Error("Sync failed"));

		const { wrapper } = createWrapper();
		const { result } = renderHook(() => useSyncTickets(), { wrapper });

		await act(async () => {
			await expect(
				result.current.mutateAsync({ id: "ds-1", timeRangeDays: 30 }),
			).rejects.toThrow("Sync failed");
		});

		expect(mockedSignalSyncStarted).not.toHaveBeenCalled();
	});
});

describe("useLatestIngestionRun", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("fetches latest ingestion run and returns data", async () => {
		const mockRun = {
			id: "run-1",
			organization_id: "org-1",
			data_source_connection_id: "conn-123",
			started_by: "user-1",
			status: "completed" as const,
			records_processed: 150,
			records_failed: 0,
			metadata: { progress: { total_estimated: 150 } },
			error_message: null,
			completed_at: "2025-01-01T00:00:00Z",
			created_at: "2025-01-01T00:00:00Z",
			updated_at: "2025-01-01T00:00:00Z",
		};

		mockedApi.getLatestIngestionRun.mockResolvedValueOnce({
			data: mockRun,
		});

		const { wrapper } = createWrapper();
		const { result } = renderHook(() => useLatestIngestionRun("conn-123"), {
			wrapper,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(mockedApi.getLatestIngestionRun).toHaveBeenCalledWith("conn-123");
		expect(result.current.data).toEqual(mockRun);
	});

	it("disabled when connectionId is undefined", () => {
		const { wrapper } = createWrapper();
		const { result } = renderHook(() => useLatestIngestionRun(undefined), {
			wrapper,
		});

		expect(result.current.fetchStatus).toBe("idle");
		expect(mockedApi.getLatestIngestionRun).not.toHaveBeenCalled();
	});

	it("returns null data when no ingestion run exists", async () => {
		mockedApi.getLatestIngestionRun.mockResolvedValueOnce({
			data: null,
		});

		const { wrapper } = createWrapper();
		const { result } = renderHook(() => useLatestIngestionRun("conn-456"), {
			wrapper,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.data).toBeNull();
	});
});

describe("useCancelIngestion", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls dataSourcesApi.cancelIngestion with connectionId", async () => {
		mockedApi.cancelIngestion.mockResolvedValueOnce({
			success: true,
			message: "Cancelled",
		});

		const { wrapper } = createWrapper();
		const { result } = renderHook(() => useCancelIngestion(), { wrapper });

		await act(async () => {
			await result.current.mutateAsync("conn-123");
		});

		expect(mockedApi.cancelIngestion).toHaveBeenCalledWith("conn-123");
	});

	it("invalidates ingestion run query on success", async () => {
		mockedApi.cancelIngestion.mockResolvedValueOnce({
			success: true,
			message: "Cancelled",
		});

		const { wrapper, queryClient } = createWrapper();
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

		const { result } = renderHook(() => useCancelIngestion(), { wrapper });

		await act(async () => {
			await result.current.mutateAsync("conn-789");
		});

		expect(invalidateSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				queryKey: ingestionRunKeys.latest("conn-789"),
			}),
		);
	});

	it("handles errors", async () => {
		mockedApi.cancelIngestion.mockRejectedValueOnce(new Error("Cancel failed"));

		const { wrapper } = createWrapper();
		const { result } = renderHook(() => useCancelIngestion(), { wrapper });

		await act(async () => {
			await expect(result.current.mutateAsync("conn-123")).rejects.toThrow(
				"Cancel failed",
			);
		});
	});
});
