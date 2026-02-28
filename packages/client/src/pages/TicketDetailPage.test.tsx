/**
 * TicketDetailPage.test.tsx - TDD RED phase tests for URL-param-driven
 * neighbor-ticket navigation refactor.
 *
 * These tests target the REFACTORED component that:
 * 1. Reads URL search params (idx, sort, sort_dir, tab, search)
 * 2. Calls useClusterTickets with offset/limit derived from idx
 * 3. Derives prev/next ticket IDs from the 3-ticket window
 * 4. Passes prevTicketId, nextTicketId, currentPosition, totalTickets,
 *    searchParams to TicketDetailHeader
 */

import { render } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock hooks
// ---------------------------------------------------------------------------
const mockUseTicket = vi.fn();
const mockUseClusterTickets = vi.fn();

vi.mock("@/hooks/useClusters", () => ({
	useTicket: (...args: unknown[]) => mockUseTicket(...args),
	useClusterTickets: (...args: unknown[]) => mockUseClusterTickets(...args),
}));

// ---------------------------------------------------------------------------
// Mock react-router-dom  (default: full search params with idx=5)
// ---------------------------------------------------------------------------
const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams(
	"sort=subject&sort_dir=asc&tab=completed&search=vpn&idx=5",
);

vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return {
		...actual,
		useParams: () => ({ clusterId: "cluster-1", ticketId: "t-current" }),
		useNavigate: () => mockNavigate,
		useSearchParams: () => [mockSearchParams],
	};
});

// ---------------------------------------------------------------------------
// Mock heavy sub-components that need auth / complex context
// ---------------------------------------------------------------------------
vi.mock("@/components/layouts/RitaLayout", () => ({
	default: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
}));

vi.mock("@/components/tickets/ReviewAIResponseSheet", () => ({
	default: () => null,
}));

vi.mock("@/components/tickets/TicketDetailsCard", () => ({
	default: () => <div data-testid="ticket-details-card" />,
}));

// ---------------------------------------------------------------------------
// Mock TicketDetailHeader to capture props for assertion
// ---------------------------------------------------------------------------
const mockTicketDetailHeaderProps = vi.fn();

vi.mock("@/components/tickets/TicketDetailHeader", () => ({
	TicketDetailHeader: (props: Record<string, unknown>) => {
		mockTicketDetailHeaderProps(props);
		return (
			<div data-testid="ticket-detail-header">
				<span data-testid="header-prev-ticket-id">
					{String(props.prevTicketId ?? "")}
				</span>
				<span data-testid="header-next-ticket-id">
					{String(props.nextTicketId ?? "")}
				</span>
				<span data-testid="header-current-position">
					{String(props.currentPosition ?? "")}
				</span>
				<span data-testid="header-total-tickets">
					{String(props.totalTickets ?? "")}
				</span>
			</div>
		);
	},
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { TestProviders } from "@/test/mocks/providers";
import TicketDetailPage from "./TicketDetailPage";

// ---------------------------------------------------------------------------
// Shared default mock data
// ---------------------------------------------------------------------------
const defaultTicket = {
	id: "t-current",
	external_id: "INC-001",
	subject: "VPN Issue",
	description: "Cannot connect",
	priority: "medium",
	requester: "John",
	external_status: "Open",
	assigned_to: "Jane",
	created_at: "2025-01-01T00:00:00Z",
	updated_at: "2025-01-01T00:00:00Z",
	organization_id: "org-1",
	cluster_id: "cluster-1",
	data_source_connection_id: null,
	cluster_text: null,
	rita_status: "NEEDS_RESPONSE",
	source_metadata: {},
};

const threeTicketsResponse = {
	data: [{ id: "t-prev" }, { id: "t-current" }, { id: "t-next" }],
	pagination: { total: 42, limit: 3, offset: 4, has_more: true },
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
describe("TicketDetailPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Reset search params to default (idx=5 with sort params)
		mockSearchParams = new URLSearchParams(
			"sort=subject&sort_dir=asc&tab=completed&search=vpn&idx=5",
		);

		mockUseTicket.mockReturnValue({
			data: defaultTicket,
			isLoading: false,
			error: null,
		});

		mockUseClusterTickets.mockReturnValue({
			data: threeTicketsResponse,
			isLoading: false,
			error: null,
		});
	});

	// -----------------------------------------------------------------------
	// 1. Passes URL search params to useClusterTickets
	// -----------------------------------------------------------------------
	it("passes URL search params to useClusterTickets with correct offset and limit", () => {
		render(
			<TestProviders
				initialEntries={[
					"/tickets/cluster-1/t-current?sort=subject&sort_dir=asc&tab=completed&search=vpn&idx=5",
				]}
			>
				<TicketDetailPage />
			</TestProviders>,
		);

		expect(mockUseClusterTickets).toHaveBeenCalledWith(
			"cluster-1",
			{
				offset: 4,
				limit: 3,
				sort: "subject",
				sort_dir: "asc",
				tab: "completed",
				search: "vpn",
			},
			{ keepPrevious: true },
		);
	});

	// -----------------------------------------------------------------------
	// 2. Falls back gracefully when no idx
	// -----------------------------------------------------------------------
	it("does not call useClusterTickets with neighbor params when idx is absent", () => {
		mockSearchParams = new URLSearchParams("");

		render(
			<TestProviders initialEntries={["/tickets/cluster-1/t-current"]}>
				<TicketDetailPage />
			</TestProviders>,
		);

		// Should either not call useClusterTickets at all, or not pass
		// the offset/limit/sort params that come from idx-based navigation
		const calls = mockUseClusterTickets.mock.calls;
		const hasNeighborCall = calls.some(
			(call: unknown[]) =>
				call[1] &&
				typeof call[1] === "object" &&
				"offset" in (call[1] as Record<string, unknown>) &&
				"limit" in (call[1] as Record<string, unknown>) &&
				(call[1] as Record<string, unknown>).limit === 3,
		);
		expect(hasNeighborCall).toBe(false);
	});

	// -----------------------------------------------------------------------
	// 3. Derives prev/next correctly from results (middle ticket, idx=5)
	// -----------------------------------------------------------------------
	it("passes prevTicketId and nextTicketId to TicketDetailHeader for a middle ticket", () => {
		render(
			<TestProviders
				initialEntries={[
					"/tickets/cluster-1/t-current?sort=subject&sort_dir=asc&tab=completed&search=vpn&idx=5",
				]}
			>
				<TicketDetailPage />
			</TestProviders>,
		);

		// The refactored component should pass derived prev/next IDs
		expect(mockTicketDetailHeaderProps).toHaveBeenCalledWith(
			expect.objectContaining({
				prevTicketId: "t-prev",
				nextTicketId: "t-next",
				currentPosition: 5, // 0-based index; header adds +1 for display
				totalTickets: 42,
			}),
		);
	});

	// -----------------------------------------------------------------------
	// 4. Handles first ticket (idx=0) -- prevTicketId should be null
	// -----------------------------------------------------------------------
	it("passes null prevTicketId to TicketDetailHeader when viewing the first ticket (idx=0)", () => {
		mockSearchParams = new URLSearchParams("idx=0");

		mockUseClusterTickets.mockReturnValue({
			data: {
				data: [{ id: "t-current" }, { id: "t-next" }],
				pagination: { total: 42, limit: 3, offset: 0, has_more: true },
			},
			isLoading: false,
			error: null,
		});

		render(
			<TestProviders initialEntries={["/tickets/cluster-1/t-current?idx=0"]}>
				<TicketDetailPage />
			</TestProviders>,
		);

		expect(mockTicketDetailHeaderProps).toHaveBeenCalledWith(
			expect.objectContaining({
				prevTicketId: null,
				nextTicketId: "t-next",
				currentPosition: 0, // 0-based; header adds +1 for display
				totalTickets: 42,
			}),
		);
	});

	// -----------------------------------------------------------------------
	// 5. Shows loading state
	// -----------------------------------------------------------------------
	it("renders spinner when ticket is loading", () => {
		mockUseTicket.mockReturnValue({
			data: undefined,
			isLoading: true,
			error: null,
		});

		const { container } = render(
			<TestProviders initialEntries={["/tickets/cluster-1/t-current?idx=5"]}>
				<TicketDetailPage />
			</TestProviders>,
		);

		// Loader2 from lucide renders an SVG with the animate-spin class
		const spinner = container.querySelector(".animate-spin");
		expect(spinner).toBeInTheDocument();
	});

	// -----------------------------------------------------------------------
	// 6. URL tampering: idx beyond total disables navigation
	// -----------------------------------------------------------------------
	it("handles idx beyond total by disabling navigation", () => {
		mockSearchParams = new URLSearchParams("idx=999");

		mockUseClusterTickets.mockReturnValue({
			data: {
				data: [],
				pagination: { total: 42, limit: 3, offset: 998, has_more: false },
			},
			isLoading: false,
			error: null,
		});

		render(
			<TestProviders initialEntries={["/tickets/cluster-1/t-current?idx=999"]}>
				<TicketDetailPage />
			</TestProviders>,
		);

		// idx=999 with empty results: currentPosInResults = 999 - 998 = 1
		// results is empty so both neighbors resolve to null
		expect(mockTicketDetailHeaderProps).toHaveBeenCalledWith(
			expect.objectContaining({
				prevTicketId: null,
				nextTicketId: null,
			}),
		);
	});

	// -----------------------------------------------------------------------
	// 7. URL tampering: negative idx disables navigation
	// -----------------------------------------------------------------------
	it("handles negative idx gracefully", () => {
		mockSearchParams = new URLSearchParams("idx=-5");

		mockUseClusterTickets.mockReturnValue({
			data: {
				data: [{ id: "t-a" }, { id: "t-b" }, { id: "t-c" }],
				pagination: { total: 42, limit: 3, offset: 0, has_more: true },
			},
			isLoading: false,
			error: null,
		});

		render(
			<TestProviders initialEntries={["/tickets/cluster-1/t-current?idx=-5"]}>
				<TicketDetailPage />
			</TestProviders>,
		);

		// offset = max(0, -5 - 1) = 0
		// currentPosInResults = -5 - 0 = -5
		// -5 > 0 is false  => prevTicketId = null
		// -5 < 2 is true   => results[-4]?.id = undefined => null
		expect(mockTicketDetailHeaderProps).toHaveBeenCalledWith(
			expect.objectContaining({
				prevTicketId: null,
				nextTicketId: null,
			}),
		);
	});

	// -----------------------------------------------------------------------
	// 8. URL tampering: non-numeric idx disables navigation context
	// -----------------------------------------------------------------------
	it("handles non-numeric idx by disabling navigation context", () => {
		mockSearchParams = new URLSearchParams("idx=abc");

		render(
			<TestProviders initialEntries={["/tickets/cluster-1/t-current?idx=abc"]}>
				<TicketDetailPage />
			</TestProviders>,
		);

		// Number("abc") = NaN => hasNavContext = false
		// useClusterTickets should NOT be called with neighbor params (offset/limit=3)
		const calls = mockUseClusterTickets.mock.calls;
		const hasNeighborCall = calls.some(
			(call: unknown[]) =>
				call[1] &&
				typeof call[1] === "object" &&
				"offset" in (call[1] as Record<string, unknown>) &&
				"limit" in (call[1] as Record<string, unknown>) &&
				(call[1] as Record<string, unknown>).limit === 3,
		);
		expect(hasNeighborCall).toBe(false);
	});

	// -----------------------------------------------------------------------
	// 9. idx=0 with 2 results shows only next navigation
	// -----------------------------------------------------------------------
	it("handles idx=0 correctly showing only next navigation", () => {
		mockSearchParams = new URLSearchParams("idx=0");

		mockUseClusterTickets.mockReturnValue({
			data: {
				data: [{ id: "t-current" }, { id: "t-next" }],
				pagination: { total: 42, limit: 3, offset: 0, has_more: true },
			},
			isLoading: false,
			error: null,
		});

		render(
			<TestProviders initialEntries={["/tickets/cluster-1/t-current?idx=0"]}>
				<TicketDetailPage />
			</TestProviders>,
		);

		// offset = max(0, 0 - 1) = 0
		// currentPosInResults = 0 - 0 = 0
		// 0 > 0 is false => prevTicketId = null
		// 0 < 1 is true  => nextTicketId = "t-next"
		expect(mockTicketDetailHeaderProps).toHaveBeenCalledWith(
			expect.objectContaining({
				prevTicketId: null,
				nextTicketId: "t-next",
			}),
		);
	});
});
