import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShareModal } from "./ShareModal";

describe("ShareModal", () => {
	const defaultProps = {
		open: true,
		onOpenChange: vi.fn(),
	};

	describe("Rendering", () => {
		it("renders title", () => {
			render(<ShareModal {...defaultProps} />);
			expect(screen.getByText("Share RITA")).toBeInTheDocument();
		});

		it("renders description", () => {
			render(<ShareModal {...defaultProps} />);
			expect(
				screen.getByText("Search for team members to share RITA access with")
			).toBeInTheDocument();
		});

		it("renders search input", () => {
			render(<ShareModal {...defaultProps} />);
			expect(
				screen.getByPlaceholderText("Search by name or email...")
			).toBeInTheDocument();
		});

		it("renders Cancel and Share buttons", () => {
			render(<ShareModal {...defaultProps} />);
			expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /Share with/ })).toBeInTheDocument();
		});

		it("does not render when closed", () => {
			render(<ShareModal {...defaultProps} open={false} />);
			expect(screen.queryByText("Share RITA")).not.toBeInTheDocument();
		});
	});

	describe("Search functionality", () => {
		it("shows search results when typing", async () => {
			const user = userEvent.setup();
			render(<ShareModal {...defaultProps} />);

			const searchInput = screen.getByPlaceholderText("Search by name or email...");
			await user.type(searchInput, "Sarah");

			expect(screen.getByText("Sarah Johnson")).toBeInTheDocument();
		});

		it("filters users by name", async () => {
			const user = userEvent.setup();
			render(<ShareModal {...defaultProps} />);

			const searchInput = screen.getByPlaceholderText("Search by name or email...");
			await user.type(searchInput, "Mike");

			expect(screen.getByText("Mike Chen")).toBeInTheDocument();
			expect(screen.queryByText("Sarah Johnson")).not.toBeInTheDocument();
		});

		it("filters users by email", async () => {
			const user = userEvent.setup();
			render(<ShareModal {...defaultProps} />);

			const searchInput = screen.getByPlaceholderText("Search by name or email...");
			await user.type(searchInput, "emily.r@");

			expect(screen.getByText("Emily Rodriguez")).toBeInTheDocument();
		});

		it("shows no results message when no match", async () => {
			const user = userEvent.setup();
			render(<ShareModal {...defaultProps} />);

			const searchInput = screen.getByPlaceholderText("Search by name or email...");
			await user.type(searchInput, "nonexistent");

			expect(screen.getByText(/No users found/)).toBeInTheDocument();
		});

		it("shows Add new user button when no results", async () => {
			const user = userEvent.setup();
			render(<ShareModal {...defaultProps} />);

			const searchInput = screen.getByPlaceholderText("Search by name or email...");
			await user.type(searchInput, "nonexistent");

			expect(
				screen.getByRole("button", { name: /Add new user in Settings/ })
			).toBeInTheDocument();
		});
	});

	describe("User selection", () => {
		it("adds user to selection when clicked", async () => {
			const user = userEvent.setup();
			render(<ShareModal {...defaultProps} />);

			const searchInput = screen.getByPlaceholderText("Search by name or email...");
			await user.type(searchInput, "Sarah");
			await user.click(screen.getByText("Sarah Johnson"));

			expect(screen.getByText("Selected users (1)")).toBeInTheDocument();
		});

		it("updates share button count", async () => {
			const user = userEvent.setup();
			render(<ShareModal {...defaultProps} />);

			const searchInput = screen.getByPlaceholderText("Search by name or email...");
			await user.type(searchInput, "Sarah");
			await user.click(screen.getByText("Sarah Johnson"));

			expect(screen.getByRole("button", { name: "Share with 1 user" })).toBeInTheDocument();
		});

		it("disables share button when no users selected", () => {
			render(<ShareModal {...defaultProps} />);
			const shareBtn = screen.getByRole("button", { name: /Share with/ });
			expect(shareBtn).toBeDisabled();
		});
	});

	describe("Interactions", () => {
		it("calls onOpenChange when Cancel is clicked", async () => {
			const user = userEvent.setup();
			const onOpenChange = vi.fn();
			render(<ShareModal {...defaultProps} onOpenChange={onOpenChange} />);

			await user.click(screen.getByRole("button", { name: "Cancel" }));

			expect(onOpenChange).toHaveBeenCalledWith(false);
		});

		it("calls onNavigateToSettings when Add new user is clicked", async () => {
			const user = userEvent.setup();
			const onNavigateToSettings = vi.fn();
			render(
				<ShareModal
					{...defaultProps}
					onNavigateToSettings={onNavigateToSettings}
				/>
			);

			const searchInput = screen.getByPlaceholderText("Search by name or email...");
			await user.type(searchInput, "nonexistent");
			await user.click(screen.getByRole("button", { name: /Add new user/ }));

			expect(onNavigateToSettings).toHaveBeenCalled();
		});
	});
});
