import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FeedbackBanner } from "./feedback-banner";

describe("FeedbackBanner", () => {
	describe("Rendering", () => {
		it("renders title", () => {
			render(<FeedbackBanner title="Success!" />);
			expect(screen.getByText("Success!")).toBeInTheDocument();
		});

		it("renders description when provided", () => {
			render(
				<FeedbackBanner title="Success!" description="Your changes were saved." />
			);
			expect(screen.getByText("Your changes were saved.")).toBeInTheDocument();
		});

		it("does not render description when not provided", () => {
			render(<FeedbackBanner title="Success!" />);
			const banner = screen.getByText("Success!").closest("div");
			expect(banner?.querySelector(".pl-\\[34px\\]")).not.toBeInTheDocument();
		});
	});

	describe("Variants", () => {
		it("renders success variant with green styling", () => {
			const { container } = render(
				<FeedbackBanner variant="success" title="Success!" />
			);
			const banner = container.firstChild as HTMLElement;
			expect(banner).toHaveClass("bg-green-50", "border-green-300");
		});

		it("renders destructive variant with red styling", () => {
			const { container } = render(
				<FeedbackBanner variant="destructive" title="Error!" />
			);
			const banner = container.firstChild as HTMLElement;
			expect(banner).toHaveClass("bg-red-50", "border-red-300");
		});

		it("renders enriched variant with purple gradient", () => {
			const { container } = render(
				<FeedbackBanner variant="enriched" title="Enriched!" />
			);
			const banner = container.firstChild as HTMLElement;
			expect(banner).toHaveStyle({ backgroundImage: expect.stringContaining("linear-gradient") });
		});

		it("defaults to success variant", () => {
			const { container } = render(<FeedbackBanner title="Message" />);
			const banner = container.firstChild as HTMLElement;
			expect(banner).toHaveClass("bg-green-50");
		});
	});

	describe("Dismissible", () => {
		it("shows dismiss button by default", () => {
			render(<FeedbackBanner title="Message" />);
			expect(screen.getByLabelText("accessibility.dismissBanner")).toBeInTheDocument();
		});

		it("hides dismiss button when dismissible is false", () => {
			render(<FeedbackBanner title="Message" dismissible={false} />);
			expect(screen.queryByLabelText("accessibility.dismissBanner")).not.toBeInTheDocument();
		});

		it("calls onDismiss when dismiss button is clicked", async () => {
			const user = userEvent.setup();
			const onDismiss = vi.fn();
			render(<FeedbackBanner title="Message" onDismiss={onDismiss} />);

			await user.click(screen.getByLabelText("accessibility.dismissBanner"));
			expect(onDismiss).toHaveBeenCalledTimes(1);
		});
	});

	describe("Props", () => {
		it("applies custom className", () => {
			const { container } = render(
				<FeedbackBanner title="Message" className="custom-class" />
			);
			const banner = container.firstChild as HTMLElement;
			expect(banner).toHaveClass("custom-class");
		});
	});
});
