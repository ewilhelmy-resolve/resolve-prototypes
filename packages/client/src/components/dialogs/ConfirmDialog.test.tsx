import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmDialog from "./ConfirmDialog";

describe("ConfirmDialog", () => {
	const defaultProps = {
		open: true,
		onOpenChange: vi.fn(),
		title: "Confirm Action",
		description: "Are you sure you want to proceed?",
		onConfirm: vi.fn(),
	};

	describe("Rendering", () => {
		it("renders title", () => {
			render(<ConfirmDialog {...defaultProps} />);
			expect(screen.getByText("Confirm Action")).toBeInTheDocument();
		});

		it("renders description", () => {
			render(<ConfirmDialog {...defaultProps} />);
			expect(
				screen.getByText("Are you sure you want to proceed?")
			).toBeInTheDocument();
		});

		it("renders default button labels", () => {
			render(<ConfirmDialog {...defaultProps} />);
			expect(screen.getByRole("button", { name: "actions.confirm" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "actions.cancel" })).toBeInTheDocument();
		});

		it("renders custom button labels", () => {
			render(
				<ConfirmDialog
					{...defaultProps}
					confirmLabel="Delete"
					cancelLabel="Keep"
				/>
			);
			expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Keep" })).toBeInTheDocument();
		});

		it("does not render when closed", () => {
			render(<ConfirmDialog {...defaultProps} open={false} />);
			expect(screen.queryByText("Confirm Action")).not.toBeInTheDocument();
		});
	});

	describe("Variants", () => {
		it("applies default variant styling", () => {
			render(<ConfirmDialog {...defaultProps} variant="default" />);
			const confirmBtn = screen.getByRole("button", { name: "actions.confirm" });
			expect(confirmBtn).toHaveClass("bg-primary");
		});

		it("applies destructive variant styling", () => {
			render(<ConfirmDialog {...defaultProps} variant="destructive" />);
			const confirmBtn = screen.getByRole("button", { name: "actions.confirm" });
			expect(confirmBtn).toHaveClass("bg-destructive");
		});
	});

	describe("Interactions", () => {
		it("calls onConfirm and closes when confirm is clicked", async () => {
			const user = userEvent.setup();
			const onConfirm = vi.fn();
			const onOpenChange = vi.fn();

			render(
				<ConfirmDialog
					{...defaultProps}
					onConfirm={onConfirm}
					onOpenChange={onOpenChange}
				/>
			);

			await user.click(screen.getByRole("button", { name: "actions.confirm" }));

			expect(onConfirm).toHaveBeenCalledTimes(1);
			expect(onOpenChange).toHaveBeenCalledWith(false);
		});

		it("calls onOpenChange when cancel is clicked", async () => {
			const user = userEvent.setup();
			const onOpenChange = vi.fn();

			render(<ConfirmDialog {...defaultProps} onOpenChange={onOpenChange} />);

			await user.click(screen.getByRole("button", { name: "actions.cancel" }));

			expect(onOpenChange).toHaveBeenCalledWith(false);
		});

		it("does not call onConfirm when cancel is clicked", async () => {
			const user = userEvent.setup();
			const onConfirm = vi.fn();

			render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

			await user.click(screen.getByRole("button", { name: "actions.cancel" }));

			expect(onConfirm).not.toHaveBeenCalled();
		});
	});
});
