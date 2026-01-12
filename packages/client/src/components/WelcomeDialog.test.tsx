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
			// Translation key is "welcome.title" with interpolation
			expect(screen.getByText(/welcome\.title/)).toBeInTheDocument();
		});

		it("renders fallback name when user name not available", () => {
			vi.mocked(useProfile).mockReturnValue({
				data: { user: {} },
			} as any);

			render(<WelcomeDialog {...defaultProps} />);
			// Still renders the translation key
			expect(screen.getByText(/welcome\.title/)).toBeInTheDocument();
		});

		it("renders trial information", () => {
			render(<WelcomeDialog {...defaultProps} />);
			expect(screen.getByText(/welcome\.subtitle/)).toBeInTheDocument();
		});

		it("renders Get Started button", () => {
			render(<WelcomeDialog {...defaultProps} />);
			expect(screen.getByRole("button", { name: /welcome\.getStarted/i })).toBeInTheDocument();
		});

		it("renders Learn how link", () => {
			render(<WelcomeDialog {...defaultProps} />);
			expect(
				screen.getByRole("button", { name: /welcome\.learnMore/i })
			).toBeInTheDocument();
		});

		it("does not render when closed", () => {
			render(<WelcomeDialog {...defaultProps} open={false} />);
			expect(screen.queryByText(/welcome\.title/)).not.toBeInTheDocument();
		});
	});

	describe("Role-based content", () => {
		it("shows admin content for admin users", () => {
			vi.mocked(useProfilePermissions).mockReturnValue({
				isOwnerOrAdmin: () => true,
			} as any);

			render(<WelcomeDialog {...defaultProps} />);

			expect(screen.getByText(/welcome\.admin\.step1/)).toBeInTheDocument();
			expect(screen.getByText(/welcome\.admin\.step2/)).toBeInTheDocument();
		});

		it("shows user content for regular users", () => {
			vi.mocked(useProfilePermissions).mockReturnValue({
				isOwnerOrAdmin: () => false,
			} as any);

			render(<WelcomeDialog {...defaultProps} />);

			expect(screen.getByText(/welcome\.user\.heading/)).toBeInTheDocument();
			expect(screen.getByText(/welcome\.user\.step1/)).toBeInTheDocument();
		});
	});

	describe("Interactions", () => {
		it("calls onOpenChange when Get Started is clicked", async () => {
			const user = userEvent.setup();
			const onOpenChange = vi.fn();
			render(<WelcomeDialog {...defaultProps} onOpenChange={onOpenChange} />);

			await user.click(screen.getByRole("button", { name: /welcome\.getStarted/i }));

			expect(onOpenChange).toHaveBeenCalledWith(false);
		});

		it("opens external link when Learn how is clicked", async () => {
			const user = userEvent.setup();
			const windowOpen = vi.spyOn(window, "open").mockImplementation(() => null);

			render(<WelcomeDialog {...defaultProps} />);

			await user.click(
				screen.getByRole("button", { name: /welcome\.learnMore/i })
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
