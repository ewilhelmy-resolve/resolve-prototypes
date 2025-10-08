/**
 * ConnectionStatusBadge.test.tsx - Unit tests for connection status badge component
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { STATUS } from "@/constants/connectionSources";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";

describe("ConnectionStatusBadge", () => {
	describe("Status rendering", () => {
		it('should render "Verifying..." for VERIFYING status', () => {
			render(<ConnectionStatusBadge status={STATUS.VERIFYING} />);
			expect(screen.getByText("Verifying...")).toBeInTheDocument();
		});

		it('should render "Syncing..." for SYNCING status', () => {
			render(<ConnectionStatusBadge status={STATUS.SYNCING} />);
			expect(screen.getByText("Syncing...")).toBeInTheDocument();
		});

		it('should render "Connected" for CONNECTED status', () => {
			render(<ConnectionStatusBadge status={STATUS.CONNECTED} />);
			expect(screen.getByText("Connected")).toBeInTheDocument();
		});

		it('should render "Failed" for ERROR status', () => {
			render(<ConnectionStatusBadge status={STATUS.ERROR} />);
			expect(screen.getByText("Failed")).toBeInTheDocument();
		});

		it('should render "Not connected" for NOT_CONNECTED status', () => {
			render(<ConnectionStatusBadge status={STATUS.NOT_CONNECTED} />);
			expect(screen.getByText("Not connected")).toBeInTheDocument();
		});
	});

	describe("Override states", () => {
		it('should render "Retrying..." when isRetrying is true for ERROR status', () => {
			render(<ConnectionStatusBadge status={STATUS.ERROR} isRetrying={true} />);
			expect(screen.getByText("Retrying...")).toBeInTheDocument();
		});

		it('should render "Need Help" when showHelp is true for ERROR status', () => {
			render(<ConnectionStatusBadge status={STATUS.ERROR} showHelp={true} />);
			expect(screen.getByText("Need Help")).toBeInTheDocument();
		});

		it("should prioritize isRetrying over showHelp when both are true", () => {
			render(
				<ConnectionStatusBadge
					status={STATUS.ERROR}
					isRetrying={true}
					showHelp={true}
				/>,
			);
			expect(screen.getByText("Retrying...")).toBeInTheDocument();
			expect(screen.queryByText("Need Help")).not.toBeInTheDocument();
		});

		it("should not show override states for non-ERROR status", () => {
			render(
				<ConnectionStatusBadge
					status={STATUS.CONNECTED}
					isRetrying={true}
					showHelp={true}
				/>,
			);
			expect(screen.getByText("Connected")).toBeInTheDocument();
			expect(screen.queryByText("Retrying...")).not.toBeInTheDocument();
			expect(screen.queryByText("Need Help")).not.toBeInTheDocument();
		});
	});

	describe("Icon rendering", () => {
		it("should render loading icon for VERIFYING status", () => {
			const { container } = render(
				<ConnectionStatusBadge status={STATUS.VERIFYING} />,
			);
			const loadingIcon = container.querySelector(".animate-spin");
			expect(loadingIcon).toBeInTheDocument();
		});

		it("should render loading icon for SYNCING status", () => {
			const { container } = render(
				<ConnectionStatusBadge status={STATUS.SYNCING} />,
			);
			const loadingIcon = container.querySelector(".animate-spin");
			expect(loadingIcon).toBeInTheDocument();
		});

		it("should render check icon for CONNECTED status", () => {
			render(<ConnectionStatusBadge status={STATUS.CONNECTED} />);
			// CircleCheck icon should be present
			const badge = screen.getByText("Connected").closest("div");
			expect(badge).toBeInTheDocument();
		});
	});

	describe("Color styling", () => {
		it("should have blue border for VERIFYING status", () => {
			render(<ConnectionStatusBadge status={STATUS.VERIFYING} />);
			const badge = screen.getByText("Verifying...");
			expect(badge).toHaveClass("border-blue-500");
		});

		it("should have blue border for SYNCING status", () => {
			render(<ConnectionStatusBadge status={STATUS.SYNCING} />);
			const badge = screen.getByText("Syncing...");
			expect(badge).toHaveClass("border-blue-500");
		});

		it("should have green border for CONNECTED status", () => {
			render(<ConnectionStatusBadge status={STATUS.CONNECTED} />);
			const badge = screen.getByText("Connected");
			expect(badge).toHaveClass("border-green-500");
		});

		it("should have red border for ERROR status", () => {
			render(<ConnectionStatusBadge status={STATUS.ERROR} />);
			const badge = screen.getByText("Failed");
			expect(badge).toHaveClass("border-red-500");
		});

		it("should have orange border for Need Help state", () => {
			render(<ConnectionStatusBadge status={STATUS.ERROR} showHelp={true} />);
			const badge = screen.getByText("Need Help");
			expect(badge).toHaveClass("border-orange-500");
		});
	});
});
