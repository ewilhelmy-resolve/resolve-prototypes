import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { z } from "zod";
import { ConfirmFormDialog } from "./ConfirmFormDialog";

describe("ConfirmFormDialog", () => {
	const simpleSchema = z.object({
		name: z.string().min(1, "Name is required"),
	});

	const defaultProps = {
		trigger: <button>Open Dialog</button>,
		title: "Form Dialog",
		description: "Please fill out the form",
		validationSchema: simpleSchema,
		defaultValues: { name: "" },
		onConfirm: vi.fn(),
	};

	describe("Rendering", () => {
		it("renders trigger element", () => {
			render(<ConfirmFormDialog {...defaultProps} />);
			expect(screen.getByRole("button", { name: "Open Dialog" })).toBeInTheDocument();
		});

		it("opens dialog when trigger is clicked", async () => {
			const user = userEvent.setup();
			render(<ConfirmFormDialog {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: "Open Dialog" }));

			expect(screen.getByText("Form Dialog")).toBeInTheDocument();
			expect(screen.getByText("Please fill out the form")).toBeInTheDocument();
		});

		it("renders children when dialog is open", async () => {
			const user = userEvent.setup();
			render(
				<ConfirmFormDialog {...defaultProps}>
					<input data-testid="form-input" />
				</ConfirmFormDialog>
			);

			await user.click(screen.getByRole("button", { name: "Open Dialog" }));

			expect(screen.getByTestId("form-input")).toBeInTheDocument();
		});

		it("renders default action label", async () => {
			const user = userEvent.setup();
			render(<ConfirmFormDialog {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: "Open Dialog" }));

			expect(screen.getByRole("button", { name: "actions.confirm" })).toBeInTheDocument();
		});

		it("renders custom action label", async () => {
			const user = userEvent.setup();
			render(<ConfirmFormDialog {...defaultProps} actionLabel="Submit" />);

			await user.click(screen.getByRole("button", { name: "Open Dialog" }));

			expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
		});
	});

	describe("Validation", () => {
		it("disables confirm button when form is invalid", async () => {
			const user = userEvent.setup();
			render(<ConfirmFormDialog {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: "Open Dialog" }));

			const confirmBtn = screen.getByRole("button", { name: "actions.confirm" });
			expect(confirmBtn).toBeDisabled();
		});

		it("enables confirm button when form is valid", async () => {
			const user = userEvent.setup();
			const validProps = {
				...defaultProps,
				defaultValues: { name: "John" },
			};
			render(<ConfirmFormDialog {...validProps} />);

			await user.click(screen.getByRole("button", { name: "Open Dialog" }));

			await waitFor(() => {
				const confirmBtn = screen.getByRole("button", { name: "actions.confirm" });
				expect(confirmBtn).not.toBeDisabled();
			});
		});
	});

	describe("Interactions", () => {
		it("calls onConfirm with form data when confirmed", async () => {
			const user = userEvent.setup();
			const onConfirm = vi.fn();
			const validProps = {
				...defaultProps,
				defaultValues: { name: "John" },
				onConfirm,
			};
			render(<ConfirmFormDialog {...validProps} />);

			await user.click(screen.getByRole("button", { name: "Open Dialog" }));

			await waitFor(async () => {
				const confirmBtn = screen.getByRole("button", { name: "actions.confirm" });
				await user.click(confirmBtn);
			});

			expect(onConfirm).toHaveBeenCalledWith({ name: "John" });
		});

		it("calls onClose when cancelled", async () => {
			const user = userEvent.setup();
			const onClose = vi.fn();
			render(<ConfirmFormDialog {...defaultProps} onClose={onClose} />);

			await user.click(screen.getByRole("button", { name: "Open Dialog" }));
			await user.click(screen.getByRole("button", { name: "actions.cancel" }));

			expect(onClose).toHaveBeenCalledWith({
				formData: { name: "" },
				confirmed: false,
			});
		});

		it("calls onOpenChange when dialog state changes", async () => {
			const user = userEvent.setup();
			const onOpenChange = vi.fn();
			render(<ConfirmFormDialog {...defaultProps} onOpenChange={onOpenChange} />);

			await user.click(screen.getByRole("button", { name: "Open Dialog" }));

			expect(onOpenChange).toHaveBeenCalledWith(true);
		});
	});

	describe("Controlled mode", () => {
		it("respects controlled open state", () => {
			render(<ConfirmFormDialog {...defaultProps} open={true} />);
			expect(screen.getByText("Form Dialog")).toBeInTheDocument();
		});

		it("does not show dialog when controlled open is false", () => {
			render(<ConfirmFormDialog {...defaultProps} open={false} />);
			expect(screen.queryByText("Form Dialog")).not.toBeInTheDocument();
		});
	});

	describe("Action variants", () => {
		it("applies destructive styling when actionVariant is destructive", async () => {
			const user = userEvent.setup();
			const validProps = {
				...defaultProps,
				defaultValues: { name: "John" },
				actionVariant: "destructive" as const,
			};
			render(<ConfirmFormDialog {...validProps} />);

			await user.click(screen.getByRole("button", { name: "Open Dialog" }));

			await waitFor(() => {
				const confirmBtn = screen.getByRole("button", { name: "actions.confirm" });
				expect(confirmBtn).toHaveClass("bg-destructive");
			});
		});
	});
});
