import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageStatus } from "./MessageStatus";

describe("MessageStatus", () => {
	describe("Status rendering", () => {
		it("renders pending status", () => {
			render(<MessageStatus status="pending" />);
			expect(screen.getByText("Pending")).toBeInTheDocument();
			expect(screen.getByText("⏳")).toBeInTheDocument();
		});

		it("renders processing status", () => {
			render(<MessageStatus status="processing" />);
			expect(screen.getByText("Processing")).toBeInTheDocument();
			expect(screen.getByText("⚙️")).toBeInTheDocument();
		});

		it("renders completed status", () => {
			render(<MessageStatus status="completed" />);
			expect(screen.getByText("Completed")).toBeInTheDocument();
			expect(screen.getByText("✅")).toBeInTheDocument();
		});

		it("renders failed status", () => {
			render(<MessageStatus status="failed" />);
			expect(screen.getByText("Failed")).toBeInTheDocument();
			expect(screen.getByText("❌")).toBeInTheDocument();
		});
	});

	describe("Status styling", () => {
		it("applies yellow styling for pending", () => {
			const { container } = render(<MessageStatus status="pending" />);
			const badge = container.firstChild as HTMLElement;
			expect(badge).toHaveClass("bg-yellow-100", "text-yellow-800");
		});

		it("applies blue styling for processing", () => {
			const { container } = render(<MessageStatus status="processing" />);
			const badge = container.firstChild as HTMLElement;
			expect(badge).toHaveClass("bg-blue-100", "text-blue-800");
		});

		it("applies green styling for completed", () => {
			const { container } = render(<MessageStatus status="completed" />);
			const badge = container.firstChild as HTMLElement;
			expect(badge).toHaveClass("bg-green-100", "text-green-800");
		});

		it("applies red styling for failed", () => {
			const { container } = render(<MessageStatus status="failed" />);
			const badge = container.firstChild as HTMLElement;
			expect(badge).toHaveClass("bg-red-100", "text-red-800");
		});
	});

	describe("Error message", () => {
		it("shows error indicator when failed with errorMessage", () => {
			render(
				<MessageStatus status="failed" errorMessage="Connection timeout" />
			);
			expect(screen.getByText("(Error)")).toBeInTheDocument();
		});

		it("does not show error indicator when failed without errorMessage", () => {
			render(<MessageStatus status="failed" />);
			expect(screen.queryByText("(Error)")).not.toBeInTheDocument();
		});

		it("does not show error indicator for non-failed status with errorMessage", () => {
			render(
				<MessageStatus status="completed" errorMessage="Some message" />
			);
			expect(screen.queryByText("(Error)")).not.toBeInTheDocument();
		});

		it("has title attribute with error message", () => {
			render(
				<MessageStatus status="failed" errorMessage="Connection timeout" />
			);
			const errorSpan = screen.getByText("(Error)");
			expect(errorSpan).toHaveAttribute("title", "Connection timeout");
		});
	});

	describe("Props", () => {
		it("applies custom className", () => {
			const { container } = render(
				<MessageStatus status="pending" className="custom-class" />
			);
			const badge = container.firstChild as HTMLElement;
			expect(badge).toHaveClass("custom-class");
		});
	});
});
