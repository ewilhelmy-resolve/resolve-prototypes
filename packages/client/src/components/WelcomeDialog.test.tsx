import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WelcomeDialog from "./WelcomeDialog";

// Mock the profile hooks
vi.mock("@/hooks/api/useProfile", () => ({
	useProfile: vi.fn(),
	useProfilePermissions: vi.fn(),
}));

import { useProfile, useProfilePermissions } from "@/hooks/api/useProfile";

describe("WelcomeDialog", () => {
	const defaultProps = {
		open: true,
		onOpenChange: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		// Default mock values
		vi.mocked(useProfile).mockReturnValue({
			data: { user: { firstName: "John" } },
		} as any);
		vi.mocked(useProfilePermissions).mockReturnValue({
			isOwnerOrAdmin: () => false,
		} as any);
	});

	describe("Rendering", () => {
		it("renders welcome message with user name", () => {
			render(<WelcomeDialog {...defaultProps} />);
			expect(screen.getByText(/Welcome to RITA Go, John/)).toBeInTheDocument();
		});

		it("renders fallback name when user name not available", () => {
			vi.mocked(useProfile).mockReturnValue({
				data: { user: {} },
			} as any);

			render(<WelcomeDialog {...defaultProps} />);
			expect(screen.getByText(/Welcome to RITA Go, there/)).toBeInTheDocument();
		});

		it("renders trial information", () => {
			render(<WelcomeDialog {...defaultProps} />);
			expect(
				screen.getByText(/Enjoy your free 90-day trial/)
			).toBeInTheDocument();
		});

		it("renders Get Started button", () => {
			render(<WelcomeDialog {...defaultProps} />);
			expect(screen.getByRole("button", { name: "Get Started" })).toBeInTheDocument();
		});

		it("renders Learn how link", () => {
			render(<WelcomeDialog {...defaultProps} />);
			expect(
				screen.getByRole("button", { name: /Learn how RITA Go works/ })
			).toBeInTheDocument();
		});

		it("does not render when closed", () => {
			render(<WelcomeDialog {...defaultProps} open={false} />);
			expect(screen.queryByText(/Welcome to RITA Go/)).not.toBeInTheDocument();
		});
	});

	describe("Role-based content", () => {
		it("shows admin content for admin users", () => {
			vi.mocked(useProfilePermissions).mockReturnValue({
				isOwnerOrAdmin: () => true,
			} as any);

			render(<WelcomeDialog {...defaultProps} />);

			expect(
				screen.getByText(/Connect your knowledge sources/)
			).toBeInTheDocument();
			expect(
				screen.getByText(/Invite your teammates/)
			).toBeInTheDocument();
		});

		it("shows user content for regular users", () => {
			vi.mocked(useProfilePermissions).mockReturnValue({
				isOwnerOrAdmin: () => false,
			} as any);

			render(<WelcomeDialog {...defaultProps} />);

			expect(
				screen.getByText(/Your Admin has connected your workspace/)
			).toBeInTheDocument();
			expect(screen.getByText(/Search verified knowledge/)).toBeInTheDocument();
		});
	});

	describe("Interactions", () => {
		it("calls onOpenChange when Get Started is clicked", async () => {
			const user = userEvent.setup();
			const onOpenChange = vi.fn();
			render(<WelcomeDialog {...defaultProps} onOpenChange={onOpenChange} />);

			await user.click(screen.getByRole("button", { name: "Get Started" }));

			expect(onOpenChange).toHaveBeenCalledWith(false);
		});

		it("opens external link when Learn how is clicked", async () => {
			const user = userEvent.setup();
			const windowOpen = vi.spyOn(window, "open").mockImplementation(() => null);

			render(<WelcomeDialog {...defaultProps} />);

			await user.click(
				screen.getByRole("button", { name: /Learn how RITA Go works/ })
			);

			expect(windowOpen).toHaveBeenCalledWith(
				expect.stringContaining("help.resolve.io"),
				"_blank",
				"noopener,noreferrer"
			);

			windowOpen.mockRestore();
		});
	});
});
