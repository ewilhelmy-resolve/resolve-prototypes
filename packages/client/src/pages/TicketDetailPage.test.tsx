/**
 * TicketDetailPage.test.tsx - Tests for ticket detail page that passes
 * ticketIds array to TicketDetailHeader for navigation.
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
// Mock react-router-dom
// ---------------------------------------------------------------------------
vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return {
		...actual,
		useParams: () => ({ clusterId: "cluster-1", ticketId: "t-current" }),
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
				<span data-testid="header-ticket-ids">
					{JSON.stringify(props.ticketIds)}
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

const multiTicketResponse = {
	data: [{ id: "t-prev" }, { id: "t-current" }, { id: "t-next" }],
	pagination: { total: 42, limit: 100, has_more: false },
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
describe("TicketDetailPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockUseTicket.mockReturnValue({
			data: defaultTicket,
			isLoading: false,
			error: null,
		});

		mockUseClusterTickets.mockReturnValue({
			data: multiTicketResponse,
			isLoading: false,
			error: null,
		});
	});

	// -----------------------------------------------------------------------
	// 1. Passes ticketIds array to TicketDetailHeader
	// -----------------------------------------------------------------------
	it("passes ticketIds array to TicketDetailHeader", () => {
		render(
			<TestProviders initialEntries={["/tickets/cluster-1/t-current"]}>
				<TicketDetailPage />
			</TestProviders>,
		);

		expect(mockTicketDetailHeaderProps).toHaveBeenCalledWith(
			expect.objectContaining({
				ticketId: "t-current",
				externalId: "INC-001",
				clusterId: "cluster-1",
				ticketIds: ["t-prev", "t-current", "t-next"],
			}),
		);
	});

	// -----------------------------------------------------------------------
	// 2. Passes empty ticketIds when cluster tickets not loaded
	// -----------------------------------------------------------------------
	it("passes empty ticketIds when cluster tickets are not loaded", () => {
		mockUseClusterTickets.mockReturnValue({
			data: undefined,
			isLoading: true,
			error: null,
		});

		render(
			<TestProviders initialEntries={["/tickets/cluster-1/t-current"]}>
				<TicketDetailPage />
			</TestProviders>,
		);

		expect(mockTicketDetailHeaderProps).toHaveBeenCalledWith(
			expect.objectContaining({
				ticketIds: [],
			}),
		);
	});

	// -----------------------------------------------------------------------
	// 3. Shows loading state
	// -----------------------------------------------------------------------
	it("renders spinner when ticket is loading", () => {
		mockUseTicket.mockReturnValue({
			data: undefined,
			isLoading: true,
			error: null,
		});

		const { container } = render(
			<TestProviders initialEntries={["/tickets/cluster-1/t-current"]}>
				<TicketDetailPage />
			</TestProviders>,
		);

		// Loader2 from lucide renders an SVG with the animate-spin class
		const spinner = container.querySelector(".animate-spin");
		expect(spinner).toBeInTheDocument();
	});

	// -----------------------------------------------------------------------
	// 4. Shows error state when ticket not found
	// -----------------------------------------------------------------------
	it("renders error state when ticket fails to load", () => {
		mockUseTicket.mockReturnValue({
			data: undefined,
			isLoading: false,
			error: new Error("Not found"),
		});

		render(
			<TestProviders initialEntries={["/tickets/cluster-1/t-current"]}>
				<TicketDetailPage />
			</TestProviders>,
		);

		// Should not render the header when there's an error
		expect(mockTicketDetailHeaderProps).not.toHaveBeenCalled();
	});

	// -----------------------------------------------------------------------
	// 5. Passes correct ticketId and externalId
	// -----------------------------------------------------------------------
	it("passes ticketId and externalId from loaded ticket", () => {
		render(
			<TestProviders initialEntries={["/tickets/cluster-1/t-current"]}>
				<TicketDetailPage />
			</TestProviders>,
		);

		expect(mockTicketDetailHeaderProps).toHaveBeenCalledWith(
			expect.objectContaining({
				ticketId: "t-current",
				externalId: "INC-001",
			}),
		);
	});

	// -----------------------------------------------------------------------
	// 6. Renders ticket subject as heading
	// -----------------------------------------------------------------------
	it("renders ticket subject as heading", () => {
		const { getByText } = render(
			<TestProviders initialEntries={["/tickets/cluster-1/t-current"]}>
				<TicketDetailPage />
			</TestProviders>,
		);

		expect(getByText("VPN Issue")).toBeInTheDocument();
	});
});
