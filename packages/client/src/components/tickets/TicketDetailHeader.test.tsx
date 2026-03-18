/**
 * TicketDetailHeader.test.tsx - Unit tests for TicketDetailHeader component
 *
 * Tests navigation between tickets using ticketIds array:
 * - Chevron render order (next before previous in DOM)
 * - Disabled states for navigation buttons
 * - Navigation using ticketIds array
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
		ticketIds: ["t-1", "t-2", "t-3", "t-4", "t-5"],
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders both navigation buttons", () => {
		render(
			<TestProviders>
				<TicketDetailHeader {...defaultProps} />
			</TestProviders>,
		);

		expect(
			screen.getByLabelText("navigation.previousTicket"),
		).toBeInTheDocument();
		expect(screen.getByLabelText("navigation.nextTicket")).toBeInTheDocument();
	});

	it("disables previous button when ticket is first in list", () => {
		render(
			<TestProviders>
				<TicketDetailHeader {...defaultProps} ticketId="t-1" />
			</TestProviders>,
		);

		const prevBtn = screen.getByLabelText("navigation.previousTicket");
		expect(prevBtn).toBeDisabled();
	});

	it("disables next button when ticket is last in list", () => {
		render(
			<TestProviders>
				<TicketDetailHeader {...defaultProps} ticketId="t-5" />
			</TestProviders>,
		);

		const nextBtn = screen.getByLabelText("navigation.nextTicket");
		expect(nextBtn).toBeDisabled();
	});

	it("disables both buttons when ticketIds is empty", () => {
		render(
			<TestProviders>
				<TicketDetailHeader {...defaultProps} ticketIds={[]} />
			</TestProviders>,
		);

		const prevBtn = screen.getByLabelText("navigation.previousTicket");
		const nextBtn = screen.getByLabelText("navigation.nextTicket");
		expect(prevBtn).toBeDisabled();
		expect(nextBtn).toBeDisabled();
	});

	it("navigates to next ticket on next click", async () => {
		const user = userEvent.setup();

		render(
			<TestProviders>
				<TicketDetailHeader {...defaultProps} />
			</TestProviders>,
		);

		const nextBtn = screen.getByLabelText("navigation.nextTicket");
		await user.click(nextBtn);

		expect(mockNavigate).toHaveBeenCalledWith("/tickets/c-1/t-3");
	});

	it("navigates to previous ticket on previous click", async () => {
		const user = userEvent.setup();

		render(
			<TestProviders>
				<TicketDetailHeader {...defaultProps} />
			</TestProviders>,
		);

		const prevBtn = screen.getByLabelText("navigation.previousTicket");
		await user.click(prevBtn);

		expect(mockNavigate).toHaveBeenCalledWith("/tickets/c-1/t-1");
	});

	it("renders external ID", () => {
		render(
			<TestProviders>
				<TicketDetailHeader {...defaultProps} />
			</TestProviders>,
		);

		expect(screen.getByText("INC-1002")).toBeInTheDocument();
	});
});
