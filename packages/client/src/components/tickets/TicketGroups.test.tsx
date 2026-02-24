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

const mockUseClusters = vi.fn();
vi.mock("@/hooks/useClusters", () => ({
	useClusters: (...args: unknown[]) => mockUseClusters(...args),
	clusterKeys: { all: ["clusters"], lists: () => ["clusters", "list"] },
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
	mockUseClusters.mockReturnValue({
		data: undefined,
		isLoading: false,
		error: null,
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
		mockUseActiveModel.mockReturnValue({
			data: null,
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
		mockUseClusters.mockReturnValue({
			data: {
				data: [
					{
						id: "c1",
						name: "Password Reset",
						subcluster_name: null,
						ticket_count: 42,
						kb_status: "found",
					},
				],
				pagination: { has_more: false },
				totals: { total_clusters: 1 },
			},
			isLoading: false,
			error: null,
		});

		renderTicketGroups();

		expect(screen.getByText("Password Reset")).toBeInTheDocument();
		expect(
			screen.queryByText("groups.noSourceConnected"),
		).not.toBeInTheDocument();
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

	it("shows below-threshold error when latest run has tickets_below_threshold", () => {
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

		expect(
			screen.getByText("groups.ticketsBelowThreshold"),
		).toBeInTheDocument();
		expect(
			screen.queryByText("groups.noSourceConnected"),
		).not.toBeInTheDocument();
		expect(screen.getByText("groups.goToItsmConnections")).toBeInTheDocument();
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
