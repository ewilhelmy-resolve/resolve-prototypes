/**
 * TicketDetailHeader.test.tsx - Unit tests for TicketDetailHeader component
 *
 * Tests navigation between tickets using prev/next IDs:
 * - Chevron render order (up before down)
 * - Position indicator display
 * - Disabled states for navigation buttons
 * - Navigation with search params preservation
 *
 * TDD RED phase: these tests target the refactored interface
 * and are expected to fail against the current implementation.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TestProviders } from "@/test/mocks/providers";
import { TicketDetailHeader } from "./TicketDetailHeader";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return { ...actual, useNavigate: () => mockNavigate };
});

describe("TicketDetailHeader", () => {
	const defaultProps = {
		ticketId: "t-2",
		externalId: "INC-1002",
		clusterId: "c-1",
		prevTicketId: "t-1",
		nextTicketId: "t-3",
		currentPosition: 1,
		totalTickets: 5,
		onReviewAIResponse: vi.fn(),
	} as any;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders ChevronUp (previous) before ChevronDown (next) in DOM", () => {
		render(
			<TestProviders>
				<TicketDetailHeader {...defaultProps} />
			</TestProviders>,
		);

		const prevBtn = screen.getByLabelText("navigation.previousTicket");
		const nextBtn = screen.getByLabelText("navigation.nextTicket");

		expect(
			prevBtn.compareDocumentPosition(nextBtn) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it("shows position indicator when currentPosition and totalTickets provided", () => {
		render(
			<TestProviders>
				<TicketDetailHeader
					{...defaultProps}
					currentPosition={2}
					totalTickets={42}
				/>
			</TestProviders>,
		);

		expect(screen.getByText("navigation.positionOf")).toBeInTheDocument();
	});

	it("disables previous button when prevTicketId is null", () => {
		render(
			<TestProviders>
				<TicketDetailHeader {...defaultProps} prevTicketId={null} />
			</TestProviders>,
		);

		const prevBtn = screen.getByLabelText("navigation.previousTicket");
		expect(prevBtn).toBeDisabled();
	});

	it("disables next button when nextTicketId is null", () => {
		render(
			<TestProviders>
				<TicketDetailHeader {...defaultProps} nextTicketId={null} />
			</TestProviders>,
		);

		const nextBtn = screen.getByLabelText("navigation.nextTicket");
		expect(nextBtn).toBeDisabled();
	});

	it("disables both buttons when neither prevTicketId nor nextTicketId provided", () => {
		render(
			<TestProviders>
				<TicketDetailHeader
					{...defaultProps}
					prevTicketId={undefined}
					nextTicketId={undefined}
				/>
			</TestProviders>,
		);

		const prevBtn = screen.getByLabelText("navigation.previousTicket");
		const nextBtn = screen.getByLabelText("navigation.nextTicket");
		expect(prevBtn).toBeDisabled();
		expect(nextBtn).toBeDisabled();
	});

	it("navigates to next ticket with search params and incremented index", async () => {
		const user = userEvent.setup();

		render(
			<TestProviders>
				<TicketDetailHeader
					{...defaultProps}
					nextTicketId="t-3"
					clusterId="c-1"
					searchParams="sort=created_at&sort_dir=desc&tab=needs_response"
					currentPosition={1}
				/>
			</TestProviders>,
		);

		const nextBtn = screen.getByLabelText("navigation.nextTicket");
		await user.click(nextBtn);

		expect(mockNavigate).toHaveBeenCalledWith(
			"/tickets/c-1/t-3?sort=created_at&sort_dir=desc&tab=needs_response&idx=2",
		);
	});

	it("navigates to previous ticket with search params and decremented index", async () => {
		const user = userEvent.setup();

		render(
			<TestProviders>
				<TicketDetailHeader
					{...defaultProps}
					prevTicketId="t-1"
					clusterId="c-1"
					searchParams="sort=created_at&sort_dir=desc&tab=needs_response"
					currentPosition={1}
				/>
			</TestProviders>,
		);

		const prevBtn = screen.getByLabelText("navigation.previousTicket");
		await user.click(prevBtn);

		expect(mockNavigate).toHaveBeenCalledWith(
			"/tickets/c-1/t-1?sort=created_at&sort_dir=desc&tab=needs_response&idx=0",
		);
	});
});
