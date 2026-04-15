/**
 * SSEContext ingestion_run_update invalidation tests
 *
 * Verifies that when an ingestion_run_update SSE event arrives with a final
 * status (completed/failed), the data sources list query is invalidated so
 * the connections list page picks up the updated last_sync_at.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Capture the onMessage handler from useSSE
let capturedOnMessage: ((event: unknown) => void) | undefined;

vi.mock("@/hooks/useSSE", () => ({
	useSSE: (opts: { onMessage?: (event: unknown) => void }) => {
		capturedOnMessage = opts.onMessage;
		return {
			isConnected: true,
			connect: vi.fn(),
			disconnect: vi.fn(),
			reconnect: vi.fn(),
		};
	},
}));

// Suppress toasts
vi.mock("@/components/custom/rita-toast", () => ({
	ritaToast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

// Suppress i18n
vi.mock("@/i18n", () => ({
	default: { t: (key: string) => key },
}));

// Mock connection sources utils
vi.mock("@/components/connection-sources/utils", () => ({
	errorI18nKey: () => null,
}));

import { dataSourceKeys } from "@/hooks/useDataSources";
import { SSEProvider } from "../SSEContext";

function createTestEnv() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
		},
	});
	const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

	function Wrapper({ children }: { children: ReactNode }) {
		return (
			<MemoryRouter>
				<QueryClientProvider client={queryClient}>
					<SSEProvider apiUrl="http://test">{children}</SSEProvider>
				</QueryClientProvider>
			</MemoryRouter>
		);
	}

	// Render provider to capture the handler
	render(
		<Wrapper>
			<div />
		</Wrapper>,
	);

	if (!capturedOnMessage) {
		throw new Error("useSSE onMessage was not captured");
	}

	return { queryClient, invalidateSpy, sendEvent: capturedOnMessage };
}

describe("SSEContext - ingestion_run_update list invalidation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		capturedOnMessage = undefined;
	});

	it("invalidates dataSourceKeys.list() on completed ingestion", () => {
		const { invalidateSpy, sendEvent } = createTestEnv();

		sendEvent({
			type: "ingestion_run_update",
			data: {
				ingestion_run_id: "run-1",
				connection_id: "conn-1",
				status: "completed",
				records_processed: 100,
				records_failed: 0,
			},
		});

		expect(invalidateSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				queryKey: dataSourceKeys.list(),
			}),
		);
	});

	it("invalidates dataSourceKeys.list() on failed ingestion", () => {
		const { invalidateSpy, sendEvent } = createTestEnv();

		sendEvent({
			type: "ingestion_run_update",
			data: {
				ingestion_run_id: "run-2",
				connection_id: "conn-1",
				status: "failed",
				error_message: "tickets_below_threshold",
			},
		});

		expect(invalidateSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				queryKey: dataSourceKeys.list(),
			}),
		);
	});

	it("does NOT invalidate dataSourceKeys.list() on running status", () => {
		const { invalidateSpy, sendEvent } = createTestEnv();

		sendEvent({
			type: "ingestion_run_update",
			data: {
				ingestion_run_id: "run-3",
				connection_id: "conn-1",
				status: "running",
				records_processed: 25,
				total_estimated: 100,
			},
		});

		expect(invalidateSpy).not.toHaveBeenCalledWith(
			expect.objectContaining({
				queryKey: dataSourceKeys.list(),
			}),
		);
	});
});
