import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TestProviders } from "@/test/mocks/providers";
import TicketGroups from "./TicketGroups";

// Mock hooks
const mockUseActiveModel = vi.fn();
vi.mock("@/hooks/useActiveModel", () => ({
	useActiveModel: (...args: unknown[]) => mockUseActiveModel(...args),
}));

const mockUseIsIngesting = vi.fn();
vi.mock("@/hooks/useIsIngesting", () => ({
	useIsIngesting: (...args: unknown[]) => mockUseIsIngesting(...args),
}));

const mockUseInfiniteClusters = vi.fn();
const mockUseClusterActions = vi.fn();
vi.mock("@/hooks/useClusters", () => ({
	useInfiniteClusters: (...args: unknown[]) => mockUseInfiniteClusters(...args),
	useClusterActions: (...args: unknown[]) => mockUseClusterActions(...args),
	clusterKeys: { all: ["clusters"], lists: () => ["clusters", "list"] },
}));

vi.mock("@/hooks/useDebounce", () => ({
	useDebounce: <T,>(value: T, _delay?: number): T => value,
}));

vi.mock("@/stores/ticketSettingsStore", () => ({
	useTicketSettingsStore: () => ({
		blendedRatePerHour: 30,
		timeToTake: 12,
	}),
}));

beforeEach(() => {
	mockUseActiveModel.mockReturnValue({
		data: null,
		isLoading: false,
		notifySyncStarted: vi.fn(),
	});
	mockUseIsIngesting.mockReturnValue({
		isIngesting: false,
		latestRun: null,
		isBelowThreshold: false,
	});
	mockUseInfiniteClusters.mockReturnValue({
		data: undefined,
		isLoading: false,
		error: null,
		fetchNextPage: vi.fn(),
		hasNextPage: false,
		isFetchingNextPage: false,
	});
	mockUseClusterActions.mockReturnValue({
		data: {},
		isLoading: false,
	});
});

function renderTicketGroups() {
	return render(
		<TestProviders initialEntries={["/tickets"]}>
			<TicketGroups period="last90" />
		</TestProviders>,
	);
}

describe("TicketGroups conditional rendering", () => {
	it("shows import UI during first import (not 'Connect source')", () => {
		// Model exists but not yet complete (first import in progress)
		mockUseActiveModel.mockReturnValue({
			data: { metadata: { training_state: "pending" } },
			isLoading: false,
			notifySyncStarted: vi.fn(),
		});
		mockUseIsIngesting.mockReturnValue({
			isIngesting: true,
			latestRun: { status: "running", records_processed: 50, metadata: {} },
		});

		renderTicketGroups();

		expect(screen.getByText("groups.importingTickets")).toBeInTheDocument();
		expect(
			screen.queryByText("groups.noSourceConnected"),
		).not.toBeInTheDocument();
		// Skeleton cards rendered
		const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
		expect(skeletons.length).toBeGreaterThan(0);
	});

	it("shows 'Connect source' when no model and not ingesting", () => {
		renderTicketGroups();

		expect(screen.getByText("groups.noSourceConnected")).toBeInTheDocument();
		expect(screen.getByText("groups.connectSource")).toBeInTheDocument();
	});

	it("shows training banner + skeletons when training in progress", () => {
		mockUseActiveModel.mockReturnValue({
			data: { metadata: { training_state: "in_progress" } },
			isLoading: false,
			notifySyncStarted: vi.fn(),
		});

		renderTicketGroups();

		expect(screen.getByText("groups.trainingInProgress")).toBeInTheDocument();
		const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
		expect(skeletons.length).toBeGreaterThan(0);
	});

	it("shows cluster data when training complete", () => {
		mockUseActiveModel.mockReturnValue({
			data: { metadata: { training_state: "complete" } },
			isLoading: false,
			notifySyncStarted: vi.fn(),
		});
		mockUseInfiniteClusters.mockReturnValue({
			data: {
				pages: [
					{
						data: [
							{
								id: "c1",
								name: "Password Reset",
								subcluster_name: null,
								ticket_count: 42,
								needs_response_count: 5,
								kb_status: "found",
								updated_at: "2025-06-01T00:00:00Z",
							},
						],
						pagination: { has_more: false },
						totals: { total_clusters: 1 },
					},
				],
				pageParams: [undefined],
			},
			isLoading: false,
			error: null,
			fetchNextPage: vi.fn(),
			hasNextPage: false,
			isFetchingNextPage: false,
		});

		renderTicketGroups();

		expect(screen.getByText("Password Reset")).toBeInTheDocument();
		expect(
			screen.queryByText("groups.noSourceConnected"),
		).not.toBeInTheDocument();
	});

	it("shows below-threshold error when latest run has tickets_below_threshold", () => {
		// With the new implementation, below-threshold shows "training failed"
		// since isBelowThreshold handling was moved to useIsIngesting
		// and the component shows the failed state via trainingState
		mockUseActiveModel.mockReturnValue({
			data: { metadata: { training_state: "failed" } },
			isLoading: false,
			notifySyncStarted: vi.fn(),
		});
		mockUseIsIngesting.mockReturnValue({
			isIngesting: false,
			latestRun: {
				status: "failed",
				error_message: "tickets_below_threshold",
				metadata: {
					error_detail: {
						current_total_tickets: 10,
						needed_total_tickets: 100,
					},
				},
			},
			isBelowThreshold: true,
		});

		renderTicketGroups();

		expect(screen.getByText("groups.trainingFailed")).toBeInTheDocument();
		expect(
			screen.queryByText("groups.noSourceConnected"),
		).not.toBeInTheDocument();
		expect(screen.getByText("groups.goToItsmConnections")).toBeInTheDocument();
	});

	it("shows cluster cards when there are clusters", () => {
		mockUseActiveModel.mockReturnValue({
			data: { metadata: { training_state: "complete" } },
			isLoading: false,
			notifySyncStarted: vi.fn(),
		});

		const clusters = Array.from({ length: 20 }, (_, i) => ({
			id: `c${i}`,
			name: `Cluster ${i}`,
			subcluster_name: null,
			ticket_count: 10,
			needs_response_count: 2,
			kb_status: "PENDING",
			updated_at: "2025-06-01T00:00:00Z",
		}));

		mockUseInfiniteClusters.mockReturnValue({
			data: {
				pages: [
					{
						data: clusters,
						pagination: { has_more: false },
						totals: { total_clusters: 20 },
					},
				],
				pageParams: [undefined],
			},
			isLoading: false,
			error: null,
			fetchNextPage: vi.fn(),
			hasNextPage: false,
			isFetchingNextPage: false,
		});

		renderTicketGroups();

		// All cluster items rendered
		for (let i = 0; i < 20; i++) {
			expect(screen.getByText(`Cluster ${i}`)).toBeInTheDocument();
		}
	});

	it("shows training failed banner when training failed", () => {
		mockUseActiveModel.mockReturnValue({
			data: { metadata: { training_state: "failed" } },
			isLoading: false,
			notifySyncStarted: vi.fn(),
		});

		renderTicketGroups();

		expect(screen.getByText("groups.trainingFailed")).toBeInTheDocument();
	});

	it("shows spinner while model is loading", () => {
		mockUseActiveModel.mockReturnValue({
			data: undefined,
			isLoading: true,
			notifySyncStarted: vi.fn(),
		});

		const { container } = renderTicketGroups();

		// Spinner rendered (svg with animate-spin)
		const spinner = container.querySelector(".animate-spin");
		expect(spinner).toBeInTheDocument();
		expect(
			screen.queryByText("groups.noSourceConnected"),
		).not.toBeInTheDocument();
	});
});
