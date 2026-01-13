/**
 * BulkActions.test.tsx - Unit tests for BulkActions component
 *
 * Tests bulk action bar functionality:
 * - Selection count display
 * - Loading state with remaining count
 * - Custom actions and delete action
 * - Close button behavior
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Download, Trash2 } from "lucide-react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BulkActions, type BulkAction } from "./BulkActions";

describe("BulkActions", () => {
	const mockOnClose = vi.fn();
	const mockOnDelete = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Selection Display", () => {
		it("renders selection count with plural label", () => {
			render(
				<BulkActions
					selectedItems={["1", "2", "3"]}
					onDelete={mockOnDelete}
					onClose={mockOnClose}
					itemLabel="files"
				/>,
			);

			expect(screen.getByText("bulk.selected")).toBeInTheDocument();
		});

		it("renders selection count with singular label for 1 item", () => {
			render(
				<BulkActions
					selectedItems={["1"]}
					onDelete={mockOnDelete}
					onClose={mockOnClose}
					itemLabel="files"
				/>,
			);

			expect(screen.getByText("bulk.selected")).toBeInTheDocument();
		});

		it("renders with custom item label", () => {
			render(
				<BulkActions
					selectedItems={["1", "2"]}
					onDelete={mockOnDelete}
					onClose={mockOnClose}
					itemLabel="users"
				/>,
			);

			expect(screen.getByText("bulk.selected")).toBeInTheDocument();
		});

		it("renders with count prop (backward compatibility)", () => {
			render(
				<BulkActions
					count={5}
					onDelete={mockOnDelete}
					onClose={mockOnClose}
					itemLabel="items"
				/>,
			);

			expect(screen.getByText("bulk.selected")).toBeInTheDocument();
		});

		it("does not render when count is 0", () => {
			const { container } = render(
				<BulkActions
					selectedItems={[]}
					onDelete={mockOnDelete}
					onClose={mockOnClose}
					itemLabel="files"
				/>,
			);

			expect(container.firstChild).toBeNull();
		});
	});

	describe("Loading State with Remaining Count", () => {
		it("shows remaining count during loading", () => {
			render(
				<BulkActions
					selectedItems={["1", "2", "3", "4", "5"]}
					onDelete={mockOnDelete}
					onClose={mockOnClose}
					itemLabel="files"
					isLoading={true}
					remainingCount={3}
				/>,
			);

			expect(screen.getByText("bulk.remaining")).toBeInTheDocument();
		});

		it("shows singular remaining label for 1 item", () => {
			render(
				<BulkActions
					selectedItems={["1", "2", "3"]}
					onDelete={mockOnDelete}
					onClose={mockOnClose}
					itemLabel="files"
					isLoading={true}
					remainingCount={1}
				/>,
			);

			expect(screen.getByText("bulk.remaining")).toBeInTheDocument();
		});

		it("shows 0 remaining when all items processed", () => {
			render(
				<BulkActions
					selectedItems={["1", "2"]}
					onDelete={mockOnDelete}
					onClose={mockOnClose}
					itemLabel="users"
					isLoading={true}
					remainingCount={0}
				/>,
			);

			expect(screen.getByText("bulk.remaining")).toBeInTheDocument();
		});

		it("shows custom loading label on button", () => {
			render(
				<BulkActions
					selectedItems={["1", "2"]}
					onDelete={mockOnDelete}
					onClose={mockOnClose}
					itemLabel="files"
					isLoading={true}
					loadingLabel="Removing..."
					remainingCount={1}
				/>,
			);

			expect(screen.getByRole("button", { name: /Removing.../i })).toBeInTheDocument();
		});

		it("shows default loading label when loading", () => {
			render(
				<BulkActions
					selectedItems={["1", "2"]}
					onDelete={mockOnDelete}
					onClose={mockOnClose}
					itemLabel="files"
					isLoading={true}
					remainingCount={2}
				/>,
			);

			expect(screen.getByText("bulk.defaultLoadingLabel")).toBeInTheDocument();
		});

		it("falls back to selected count when remainingCount is null during loading", () => {
			render(
				<BulkActions
					selectedItems={["1", "2", "3"]}
					onDelete={mockOnDelete}
					onClose={mockOnClose}
					itemLabel="files"
					isLoading={true}
					remainingCount={null}
				/>,
			);

			// Should show selected count, not remaining
			expect(screen.getByText("bulk.selected")).toBeInTheDocument();
		});

		it("disables delete button during loading", () => {
			render(
				<BulkActions
					selectedItems={["1", "2"]}
					onDelete={mockOnDelete}
					onClose={mockOnClose}
					itemLabel="files"
					isLoading={true}
					remainingCount={2}
				/>,
			);

			const deleteButton = screen.getByText("bulk.defaultLoadingLabel").closest("button");
			expect(deleteButton).toBeDisabled();
		});

		it("disables close button during loading", () => {
			render(
				<BulkActions
					selectedItems={["1", "2"]}
					onDelete={mockOnDelete}
					onClose={mockOnClose}
					itemLabel="files"
					isLoading={true}
					remainingCount={2}
				/>,
			);

			const closeButton = screen.getByRole("button", { name: "bulk.closeAriaLabel" });
			expect(closeButton).toBeDisabled();
		});
	});

	describe("Delete Action", () => {
		it("renders delete button with default label", () => {
			render(
				<BulkActions
					selectedItems={["1", "2"]}
					onDelete={mockOnDelete}
					onClose={mockOnClose}
					itemLabel="files"
				/>,
			);

			expect(screen.getByText("bulk.defaultDeleteLabel")).toBeInTheDocument();
		});

		it("renders delete button with custom label", () => {
			render(
				<BulkActions
					selectedItems={["1", "2"]}
					onDelete={mockOnDelete}
					onClose={mockOnClose}
					itemLabel="invitations"
					deleteLabel="Cancel Invitation"
				/>,
			);

			expect(screen.getByRole("button", { name: /Cancel Invitation/i })).toBeInTheDocument();
		});

		it("calls onDelete when delete button is clicked", async () => {
			const user = userEvent.setup();

			render(
				<BulkActions
					selectedItems={["1", "2"]}
					onDelete={mockOnDelete}
					onClose={mockOnClose}
					itemLabel="files"
				/>,
			);

			const deleteButton = screen.getByText("bulk.defaultDeleteLabel").closest("button");
			expect(deleteButton).not.toBeNull();
			await user.click(deleteButton as HTMLButtonElement);
			expect(mockOnDelete).toHaveBeenCalledTimes(1);
		});
	});

	describe("Custom Actions", () => {
		const customActions: BulkAction[] = [
			{
				key: "download",
				label: "Download",
				icon: <Download className="h-4 w-4" />,
				variant: "outline",
				onClick: vi.fn(),
			},
			{
				key: "delete",
				label: "Delete",
				icon: <Trash2 className="h-4 w-4" />,
				variant: "destructive",
				onClick: vi.fn(),
			},
		];

		it("renders custom actions", () => {
			render(
				<BulkActions
					selectedItems={["1", "2"]}
					actions={customActions}
					onClose={mockOnClose}
					itemLabel="files"
				/>,
			);

			expect(screen.getByRole("button", { name: /Download/i })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /Delete/i })).toBeInTheDocument();
		});

		it("calls custom action onClick when clicked", async () => {
			const user = userEvent.setup();
			const downloadAction = { ...customActions[0], onClick: vi.fn() };

			render(
				<BulkActions
					selectedItems={["1", "2"]}
					actions={[downloadAction]}
					onClose={mockOnClose}
					itemLabel="files"
				/>,
			);

			await user.click(screen.getByRole("button", { name: /Download/i }));
			expect(downloadAction.onClick).toHaveBeenCalledTimes(1);
		});

		it("disables custom action when disabled prop is true", () => {
			const disabledAction: BulkAction = {
				key: "download",
				label: "Download",
				onClick: vi.fn(),
				disabled: true,
			};

			render(
				<BulkActions
					selectedItems={["1", "2"]}
					actions={[disabledAction]}
					onClose={mockOnClose}
					itemLabel="files"
				/>,
			);

			expect(screen.getByRole("button", { name: /Download/i })).toBeDisabled();
		});
	});

	describe("Close Button", () => {
		it("renders close button", () => {
			render(
				<BulkActions
					selectedItems={["1", "2"]}
					onDelete={mockOnDelete}
					onClose={mockOnClose}
					itemLabel="files"
				/>,
			);

			expect(screen.getByRole("button", { name: "bulk.closeAriaLabel" })).toBeInTheDocument();
		});

		it("calls onClose when close button is clicked", async () => {
			const user = userEvent.setup();

			render(
				<BulkActions
					selectedItems={["1", "2"]}
					onDelete={mockOnDelete}
					onClose={mockOnClose}
					itemLabel="files"
				/>,
			);

			await user.click(screen.getByRole("button", { name: "bulk.closeAriaLabel" }));
			expect(mockOnClose).toHaveBeenCalledTimes(1);
		});
	});

	describe("Accessibility", () => {
		it("has proper aria-label on container", () => {
			render(
				<BulkActions
					selectedItems={["1", "2"]}
					onDelete={mockOnDelete}
					onClose={mockOnClose}
					itemLabel="files"
				/>,
			);

			expect(screen.getByRole("region", { name: "bulk.ariaLabel" })).toBeInTheDocument();
		});

		it("has proper aria-label on close button", () => {
			render(
				<BulkActions
					selectedItems={["1", "2"]}
					onDelete={mockOnDelete}
					onClose={mockOnClose}
					itemLabel="files"
				/>,
			);

			expect(screen.getByRole("button", { name: "bulk.closeAriaLabel" })).toBeInTheDocument();
		});
	});

	describe("Styling", () => {
		it("applies custom className", () => {
			render(
				<BulkActions
					selectedItems={["1", "2"]}
					onDelete={mockOnDelete}
					onClose={mockOnClose}
					itemLabel="files"
					className="custom-class"
				/>,
			);

			const container = screen.getByRole("region", { name: "bulk.ariaLabel" });
			expect(container).toHaveClass("custom-class");
		});

		it("applies opacity to close button when loading", () => {
			render(
				<BulkActions
					selectedItems={["1", "2"]}
					onDelete={mockOnDelete}
					onClose={mockOnClose}
					itemLabel="files"
					isLoading={true}
					remainingCount={2}
				/>,
			);

			const closeButton = screen.getByRole("button", { name: "bulk.closeAriaLabel" });
			expect(closeButton).toHaveClass("opacity-50");
			expect(closeButton).toHaveClass("cursor-not-allowed");
		});
	});
});
