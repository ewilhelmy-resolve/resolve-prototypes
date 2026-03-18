/**
 * ClusterDetailTable.test.tsx - Tests for cluster detail table with
 * cursor-based pagination and source icon handling.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
	pagination: {
		total: 50,
		limit: 20,
		has_more: true,
		next_cursor: "cursor-page-2",
	},
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
	// 1. Next button is enabled when has_more is true
	// -------------------------------------------------------------------
	it("pagination Next button is enabled when has_more is true", async () => {
		render(
			<TestProviders initialEntries={["/clusters/cluster-1"]}>
				<ClusterDetailTable clusterId="cluster-1" />
			</TestProviders>,
		);

		const nextButton = screen.getByRole("button", {
			name: /table\.pagination\.next/i,
		});
		expect(nextButton).not.toBeDisabled();
	});

	// -------------------------------------------------------------------
	// 2. First button is disabled when no cursor is set (first page)
	// -------------------------------------------------------------------
	it("First button is disabled on initial page load", async () => {
		render(
			<TestProviders initialEntries={["/clusters/cluster-1"]}>
				<ClusterDetailTable clusterId="cluster-1" />
			</TestProviders>,
		);

		const firstButton = screen.getByRole("button", {
			name: /table\.pagination\.first/i,
		});
		expect(firstButton).toBeDisabled();
	});

	// -------------------------------------------------------------------
	// 3. Next button is disabled when has_more is false
	// -------------------------------------------------------------------
	it("Next button is disabled when has_more is false", async () => {
		mockUseClusterTickets.mockReturnValue({
			data: {
				data: makeTickets(5),
				pagination: { total: 5, limit: 20, has_more: false },
			},
			isLoading: false,
			error: null,
		});

		render(
			<TestProviders initialEntries={["/clusters/cluster-1"]}>
				<ClusterDetailTable clusterId="cluster-1" />
			</TestProviders>,
		);

		const nextButton = screen.getByRole("button", {
			name: /table\.pagination\.next/i,
		});
		expect(nextButton).toBeDisabled();
	});

	// -------------------------------------------------------------------
	// 4. Does not crash when source_metadata.source is a number (Freshservice)
	// -------------------------------------------------------------------
	it("does not crash when source_metadata.source is a non-string value", async () => {
		// Freshservice stores source as a number (e.g. 2), not a string
		const freshserviceTickets = makeTickets(2, {
			source_metadata: { source: 2, id: 12345 },
		});

		mockUseClusterTickets.mockReturnValue({
			data: {
				data: freshserviceTickets,
				pagination: { total: 2, limit: 20, has_more: false },
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
	// 5. Clicking Next then First returns to first page
	// -------------------------------------------------------------------
	it("clicking Next enables the First button", async () => {
		const user = userEvent.setup();

		render(
			<TestProviders initialEntries={["/clusters/cluster-1"]}>
				<ClusterDetailTable clusterId="cluster-1" />
			</TestProviders>,
		);

		const nextButton = screen.getByRole("button", {
			name: /table\.pagination\.next/i,
		});
		const firstButton = screen.getByRole("button", {
			name: /table\.pagination\.first/i,
		});

		// First button should be disabled initially
		expect(firstButton).toBeDisabled();

		// Click Next
		await user.click(nextButton);

		// After clicking Next, First button should be enabled
		await waitFor(() => {
			expect(firstButton).not.toBeDisabled();
		});
	});
});
