/**
 * ClusterDetailTable.test.tsx
 *
 * Tests covering:
 * - Pagination (offset-based, URL-synced)
 * - Tab system (open/all with counts, API param mapping)
 * - Server-side priority/status filters (params passed to hook)
 * - Table columns (Priority, Status, Assignment Group)
 * - Search with debounce
 * - Non-string source_metadata handling
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock hooks
// ---------------------------------------------------------------------------
const mockUseClusterTickets = vi.fn();

vi.mock("@/hooks/useClusters", () => ({
	useClusterTickets: (...args: unknown[]) => mockUseClusterTickets(...args),
}));

vi.mock("@/hooks/useDebounce", () => ({
	useDebounce: <T,>(value: T, _delay?: number): T => value,
}));

vi.mock("@/lib/table-utils", () => ({
	renderSortIcon: () => null,
}));

// ---------------------------------------------------------------------------
// Helper: renders current URL search params for assertions
// ---------------------------------------------------------------------------
function LocationDisplay() {
	const location = useLocation();
	return <div data-testid="location-search">{location.search}</div>;
}

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { TestProviders } from "@/test/mocks/providers";
import { ClusterDetailTable } from "./ClusterDetailTable";

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------
function makeTickets(count: number, overrides?: Record<string, unknown>) {
	return Array.from({ length: count }, (_, i) => ({
		id: `ticket-${i}`,
		organization_id: "org-1",
		cluster_id: "cluster-1",
		data_source_connection_id: null,
		external_id: `EXT-${i}`,
		subject: `Ticket subject ${i}`,
		description: `Description ${i}`,
		external_status: "Open",
		cluster_text: null,
		rita_status: "NEEDS_RESPONSE" as const,
		source_metadata: {},
		requester: "User",
		assigned_to: "Agent",
		priority: "medium",
		created_at: "2025-06-01T10:00:00Z",
		updated_at: "2025-06-01T10:00:00Z",
		...overrides,
	}));
}

const defaultResponse = {
	data: makeTickets(10),
	pagination: { total: 50, limit: 10, offset: 0, has_more: true },
};

const page1Response = {
	data: makeTickets(10),
	pagination: { total: 50, limit: 10, offset: 10, has_more: true },
};

const page2Response = {
	data: makeTickets(10),
	pagination: { total: 50, limit: 10, offset: 20, has_more: true },
};

const defaultProps = {
	clusterId: "cluster-1",
	totalCount: 50,
	openCount: 30,
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
describe("ClusterDetailTable", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseClusterTickets.mockReturnValue({
			data: defaultResponse,
			isLoading: false,
			isFetching: false,
			error: null,
		});
	});

	// ===================================================================
	// Pagination
	// ===================================================================
	describe("pagination", () => {
		it("Next button advances page and does not reset to 0", async () => {
			const user = userEvent.setup();

			const { getByTestId } = render(
				<TestProviders initialEntries={["/clusters/cluster-1?page=0"]}>
					<ClusterDetailTable {...defaultProps} />
					<LocationDisplay />
				</TestProviders>,
			);

			expect(getByTestId("location-search").textContent).toContain("page=0");

			mockUseClusterTickets.mockReturnValue({
				data: page1Response,
				isLoading: false,
				isFetching: false,
				error: null,
			});

			const nextButton = screen.getByRole("button", {
				name: /table\.pagination\.next/i,
			});
			await user.click(nextButton);

			await waitFor(() => {
				expect(getByTestId("location-search").textContent).toContain("page=1");
			});
		});

		it("Previous button goes back to previous page", async () => {
			const user = userEvent.setup();

			mockUseClusterTickets.mockReturnValue({
				data: page1Response,
				isLoading: false,
				isFetching: false,
				error: null,
			});

			const { getByTestId } = render(
				<TestProviders initialEntries={["/clusters/cluster-1?page=1"]}>
					<ClusterDetailTable {...defaultProps} />
					<LocationDisplay />
				</TestProviders>,
			);

			await waitFor(() => {
				expect(getByTestId("location-search").textContent).toContain("page=1");
			});

			mockUseClusterTickets.mockReturnValue({
				data: defaultResponse,
				isLoading: false,
				isFetching: false,
				error: null,
			});

			const prevButton = screen.getByRole("button", {
				name: /table\.pagination\.previous/i,
			});
			await user.click(prevButton);

			await waitFor(() => {
				expect(getByTestId("location-search").textContent).toContain("page=0");
			});
		});

		it("page does not reset when search has not changed", async () => {
			mockUseClusterTickets.mockReturnValue({
				data: page2Response,
				isLoading: false,
				isFetching: false,
				error: null,
			});

			const { getByTestId } = render(
				<TestProviders initialEntries={["/clusters/cluster-1?page=2"]}>
					<ClusterDetailTable {...defaultProps} />
					<LocationDisplay />
				</TestProviders>,
			);

			await waitFor(() => {
				expect(getByTestId("location-search").textContent).toContain("page=2");
			});
		});
	});

	// ===================================================================
	// Tabs
	// ===================================================================
	describe("tabs", () => {
		it("renders Open and All tabs with counts", () => {
			render(
				<TestProviders initialEntries={["/clusters/cluster-1"]}>
					<ClusterDetailTable {...defaultProps} />
				</TestProviders>,
			);

			expect(
				screen.getByRole("button", { name: /table\.tabs\.open.*\(30\)/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /table\.tabs\.all.*\(50\)/i }),
			).toBeInTheDocument();
		});

		it("defaults to Open tab with active styling", () => {
			render(
				<TestProviders initialEntries={["/clusters/cluster-1"]}>
					<ClusterDetailTable {...defaultProps} />
				</TestProviders>,
			);

			const openTab = screen.getByRole("button", {
				name: /table\.tabs\.open/i,
			});
			expect(openTab.className).toContain("border-foreground");
		});

		it("switching to All tab updates URL param", async () => {
			const user = userEvent.setup();

			const { getByTestId } = render(
				<TestProviders initialEntries={["/clusters/cluster-1"]}>
					<ClusterDetailTable {...defaultProps} />
					<LocationDisplay />
				</TestProviders>,
			);

			const allTab = screen.getByRole("button", {
				name: /table\.tabs\.all/i,
			});
			await user.click(allTab);

			await waitFor(() => {
				expect(getByTestId("location-search").textContent).toContain("tab=all");
			});
		});

		it("Open tab passes external_status=Open to API", () => {
			render(
				<TestProviders initialEntries={["/clusters/cluster-1?tab=open"]}>
					<ClusterDetailTable {...defaultProps} />
				</TestProviders>,
			);

			expect(mockUseClusterTickets).toHaveBeenCalledWith(
				"cluster-1",
				expect.objectContaining({
					external_status: "Open",
				}),
				expect.anything(),
			);
		});

		it("All tab passes no external_status to API", () => {
			render(
				<TestProviders initialEntries={["/clusters/cluster-1?tab=all"]}>
					<ClusterDetailTable {...defaultProps} />
				</TestProviders>,
			);

			expect(mockUseClusterTickets).toHaveBeenCalledWith(
				"cluster-1",
				expect.objectContaining({
					external_status: undefined,
				}),
				expect.anything(),
			);
		});
	});

	// ===================================================================
	// Server-side filters
	// ===================================================================
	describe("filters", () => {
		it("renders priority filter when options exist", () => {
			render(
				<TestProviders initialEntries={["/clusters/cluster-1"]}>
					<ClusterDetailTable {...defaultProps} />
				</TestProviders>,
			);

			expect(
				screen.getByRole("button", { name: /table\.headers\.priority/i }),
			).toBeInTheDocument();
		});

		it("passes priority filter to API when selected", async () => {
			const user = userEvent.setup();

			render(
				<TestProviders initialEntries={["/clusters/cluster-1"]}>
					<ClusterDetailTable {...defaultProps} />
				</TestProviders>,
			);

			const priorityTrigger = screen.getByRole("button", {
				name: /table\.headers\.priority/i,
			});
			await user.click(priorityTrigger);
			const mediumOption = await screen.findByRole("menuitem", {
				name: /Medium/i,
			});
			await user.click(mediumOption);

			await waitFor(() => {
				const lastCall =
					mockUseClusterTickets.mock.calls[
						mockUseClusterTickets.mock.calls.length - 1
					];
				expect(lastCall[1]).toEqual(
					expect.objectContaining({ priority: "medium" }),
				);
			});
		});

		it("status filter only shows on All tab", async () => {
			const user = userEvent.setup();
			const mixedTickets = [
				...makeTickets(1, { external_status: "Open" }),
				...makeTickets(1, {
					external_status: "Closed",
					id: "ticket-closed-0",
				}),
			];

			mockUseClusterTickets.mockReturnValue({
				data: {
					data: mixedTickets,
					pagination: { total: 2, limit: 10, offset: 0, has_more: false },
				},
				isLoading: false,
				isFetching: false,
				error: null,
			});

			render(
				<TestProviders initialEntries={["/clusters/cluster-1"]}>
					<ClusterDetailTable {...defaultProps} />
				</TestProviders>,
			);

			// On Open tab, status filter should not be visible
			expect(
				screen.queryByRole("button", { name: /table\.headers\.status/i }),
			).not.toBeInTheDocument();

			// Switch to All tab
			const allTab = screen.getByRole("button", {
				name: /table\.tabs\.all/i,
			});
			await user.click(allTab);

			// Status filter should now be visible
			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /table\.headers\.status/i }),
				).toBeInTheDocument();
			});
		});

		it("resets filters when switching tabs", async () => {
			const user = userEvent.setup();

			render(
				<TestProviders initialEntries={["/clusters/cluster-1"]}>
					<ClusterDetailTable {...defaultProps} />
				</TestProviders>,
			);

			// Apply priority filter
			const priorityTrigger = screen.getByRole("button", {
				name: /table\.headers\.priority/i,
			});
			await user.click(priorityTrigger);
			const mediumOption = await screen.findByRole("menuitem", {
				name: /Medium/i,
			});
			await user.click(mediumOption);

			// Switch to All tab
			const allTab = screen.getByRole("button", {
				name: /table\.tabs\.all/i,
			});
			await user.click(allTab);

			// Priority should be reset (hook called with priority: undefined)
			await waitFor(() => {
				const lastCall =
					mockUseClusterTickets.mock.calls[
						mockUseClusterTickets.mock.calls.length - 1
					];
				expect(lastCall[1]).toEqual(
					expect.objectContaining({ priority: undefined }),
				);
			});
		});
	});

	// ===================================================================
	// Table columns
	// ===================================================================
	describe("columns", () => {
		it("renders new columns: Priority, Status, Assignment Group", () => {
			render(
				<TestProviders initialEntries={["/clusters/cluster-1"]}>
					<ClusterDetailTable {...defaultProps} />
				</TestProviders>,
			);

			const headers = screen.getAllByRole("columnheader");
			const headerTexts = headers.map((h) => h.textContent);

			expect(headerTexts).toContain("table.headers.priority");
			expect(headerTexts).toContain("table.headers.status");
			expect(headerTexts).toContain("table.headers.assignmentGroup");
		});

		it("renders Priority, Status, and Assignment Group cell data", () => {
			const tickets = makeTickets(1, {
				priority: "high",
				external_status: "Open",
				assigned_to: "Support Team",
			});

			mockUseClusterTickets.mockReturnValue({
				data: {
					data: tickets,
					pagination: { total: 1, limit: 10, offset: 0, has_more: false },
				},
				isLoading: false,
				isFetching: false,
				error: null,
			});

			render(
				<TestProviders initialEntries={["/clusters/cluster-1"]}>
					<ClusterDetailTable {...defaultProps} />
				</TestProviders>,
			);

			expect(screen.getByText("High")).toBeInTheDocument();
			expect(screen.getByText("Open")).toBeInTheDocument();
			expect(screen.getByText("Support Team")).toBeInTheDocument();
		});

		it("shows em-dash for missing Priority, Status, and Assignment Group", () => {
			const tickets = makeTickets(1, {
				priority: null,
				external_status: "",
				assigned_to: null,
			});

			mockUseClusterTickets.mockReturnValue({
				data: {
					data: tickets,
					pagination: { total: 1, limit: 10, offset: 0, has_more: false },
				},
				isLoading: false,
				isFetching: false,
				error: null,
			});

			render(
				<TestProviders initialEntries={["/clusters/cluster-1?tab=all"]}>
					<ClusterDetailTable {...defaultProps} />
				</TestProviders>,
			);

			const emDashes = screen.getAllByText("\u2014");
			expect(emDashes.length).toBeGreaterThanOrEqual(3);
		});
	});

	// ===================================================================
	// Search
	// ===================================================================
	describe("search", () => {
		it("renders search input with placeholder", () => {
			render(
				<TestProviders initialEntries={["/clusters/cluster-1"]}>
					<ClusterDetailTable {...defaultProps} />
				</TestProviders>,
			);

			expect(
				screen.getByPlaceholderText("table.searchPlaceholder"),
			).toBeInTheDocument();
		});

		it("search input stays in DOM during refetch", async () => {
			const user = userEvent.setup();

			render(
				<TestProviders initialEntries={["/clusters/cluster-1"]}>
					<ClusterDetailTable {...defaultProps} />
				</TestProviders>,
			);

			const searchInput = screen.getByPlaceholderText(
				"table.searchPlaceholder",
			);
			await user.type(searchInput, "test query");

			mockUseClusterTickets.mockReturnValue({
				data: defaultResponse,
				isLoading: true,
				isFetching: true,
				error: null,
			});

			expect(
				screen.getByPlaceholderText("table.searchPlaceholder"),
			).toBeInTheDocument();
		});
	});

	// ===================================================================
	// Edge cases
	// ===================================================================
	describe("edge cases", () => {
		it("does not crash when source_metadata.source is a non-string value", () => {
			const freshserviceTickets = makeTickets(2, {
				source_metadata: { source: 2, id: 12345 },
			});

			mockUseClusterTickets.mockReturnValue({
				data: {
					data: freshserviceTickets,
					pagination: { total: 2, limit: 10, offset: 0, has_more: false },
				},
				isLoading: false,
				isFetching: false,
				error: null,
			});

			render(
				<TestProviders initialEntries={["/clusters/cluster-1"]}>
					<ClusterDetailTable {...defaultProps} />
				</TestProviders>,
			);

			expect(screen.getByText("Ticket subject 0")).toBeInTheDocument();
			expect(screen.getByText("Ticket subject 1")).toBeInTheDocument();
		});
	});
});
