/**
 * ClusterDetailTable.test.tsx - TDD RED phase tests for pagination bug.
 *
 * Bug: The debounce sync effect (lines 121-131) includes `updateParams` in its
 * dependency array. `updateParams` depends on `setSearchParams` from React
 * Router, which is NOT referentially stable across URL changes. When the user
 * clicks "Next" and the URL updates (page=1), `setSearchParams` gets a new
 * reference, `updateParams` is recreated, the effect fires, and page resets
 * back to "0".
 *
 * These tests demonstrate the bug by asserting that pagination buttons change
 * the page param correctly without the effect resetting it.
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

// Return value immediately (no debounce delay)
vi.mock("@/hooks/useDebounce", () => ({
	useDebounce: <T,>(value: T, _delay?: number): T => value,
}));

vi.mock("@/lib/table-utils", () => ({
	renderSortIcon: () => null,
}));

vi.mock("@/components/tickets/ReviewAIResponseSheet", () => ({
	default: () => null,
}));

// ---------------------------------------------------------------------------
// Helper: renders current URL search params so tests can assert on them
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

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
describe("ClusterDetailTable pagination", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseClusterTickets.mockReturnValue({
			data: defaultResponse,
			isLoading: false,
			error: null,
		});
	});

	// -------------------------------------------------------------------
	// 1. Next button advances page and does not reset to 0
	// -------------------------------------------------------------------
	it("pagination Next button advances page and does not reset to 0", async () => {
		const user = userEvent.setup();

		// Start at page 0 with has_more: true so Next is enabled
		mockUseClusterTickets.mockReturnValue({
			data: defaultResponse,
			isLoading: false,
			error: null,
		});

		const { getByTestId } = render(
			<TestProviders initialEntries={["/clusters/cluster-1?page=0"]}>
				<ClusterDetailTable clusterId="cluster-1" />
				<LocationDisplay />
			</TestProviders>,
		);

		// Verify initial page is 0
		const locationEl = getByTestId("location-search");
		expect(locationEl.textContent).toContain("page=0");

		// After clicking Next, mock should return page 1 data
		mockUseClusterTickets.mockReturnValue({
			data: page1Response,
			isLoading: false,
			error: null,
		});

		// Click the Next button
		const nextButton = screen.getByRole("button", {
			name: /table\.pagination\.next/i,
		});
		await user.click(nextButton);

		// The URL should now contain page=1, NOT page=0
		// BUG: The debounce effect resets page to "0" because updateParams
		// reference changes when setSearchParams updates
		await waitFor(() => {
			const search = getByTestId("location-search").textContent ?? "";
			expect(search).toContain("page=1");
		});
	});

	// -------------------------------------------------------------------
	// 2. Previous button goes back to previous page
	// -------------------------------------------------------------------
	it("pagination Previous button goes back to previous page", async () => {
		const user = userEvent.setup();

		// Start at page 1
		mockUseClusterTickets.mockReturnValue({
			data: page1Response,
			isLoading: false,
			error: null,
		});

		const { getByTestId } = render(
			<TestProviders initialEntries={["/clusters/cluster-1?page=1"]}>
				<ClusterDetailTable clusterId="cluster-1" />
				<LocationDisplay />
			</TestProviders>,
		);

		// Verify initial page is 1
		await waitFor(() => {
			expect(getByTestId("location-search").textContent).toContain("page=1");
		});

		// After clicking Previous, mock returns page 0 data
		mockUseClusterTickets.mockReturnValue({
			data: defaultResponse,
			isLoading: false,
			error: null,
		});

		// Click the Previous button
		const prevButton = screen.getByRole("button", {
			name: /table\.pagination\.previous/i,
		});
		await user.click(prevButton);

		// The URL should now contain page=0
		await waitFor(() => {
			const search = getByTestId("location-search").textContent ?? "";
			expect(search).toContain("page=0");
		});
	});

	// -------------------------------------------------------------------
	// 3. Does not crash when source_metadata.source is a number (Freshservice)
	// -------------------------------------------------------------------
	it("does not crash when source_metadata.source is a non-string value", async () => {
		// Freshservice stores source as a number (e.g. 2), not a string
		const freshserviceTickets = makeTickets(2, {
			source_metadata: { source: 2, id: 12345 },
		});

		mockUseClusterTickets.mockReturnValue({
			data: {
				data: freshserviceTickets,
				pagination: { total: 2, limit: 10, offset: 0, has_more: false },
			},
			isLoading: false,
			error: null,
		});

		render(
			<TestProviders initialEntries={["/clusters/cluster-1"]}>
				<ClusterDetailTable clusterId="cluster-1" />
			</TestProviders>,
		);

		// Should render ticket subjects without crashing
		expect(screen.getByText("Ticket subject 0")).toBeInTheDocument();
		expect(screen.getByText("Ticket subject 1")).toBeInTheDocument();
	});

	// -------------------------------------------------------------------
	// 4. Page does not reset when search has not changed
	// -------------------------------------------------------------------
	it("page does not reset when search has not changed", async () => {
		// Start at page 2 with no search
		mockUseClusterTickets.mockReturnValue({
			data: page2Response,
			isLoading: false,
			error: null,
		});

		const { getByTestId } = render(
			<TestProviders initialEntries={["/clusters/cluster-1?page=2"]}>
				<ClusterDetailTable clusterId="cluster-1" />
				<LocationDisplay />
			</TestProviders>,
		);

		// After initial render + effects settle, page should still be 2.
		// BUG: The effect fires because updateParams ref changes on mount,
		// and since isInitialMount check only blocks the very first render,
		// subsequent ref changes from setSearchParams re-trigger the effect
		// and reset page to "0".
		await waitFor(() => {
			const search = getByTestId("location-search").textContent ?? "";
			expect(search).toContain("page=2");
		});
	});
});
