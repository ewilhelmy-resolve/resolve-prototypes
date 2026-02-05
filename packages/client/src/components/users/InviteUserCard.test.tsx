/**
 * InviteUserCard.test.tsx - Unit tests for InviteUserCard component
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProfilePermissions } from "@/hooks/api/useProfile";
import InviteUserCard from "./InviteUserCard";

// Mock useProfilePermissions
vi.mock("@/hooks/api/useProfile", () => ({
	useProfilePermissions: vi.fn(),
}));

// Mock InviteUsersButton to simplify testing
vi.mock("./InviteUsersButton", () => ({
	default: ({ className, children }: any) => (
		<button className={className} data-testid="invite-users-button">
			{children}
		</button>
	),
}));

// Helper to setup admin permissions
function setupAdminPermissions() {
	vi.mocked(useProfilePermissions).mockReturnValue({
		canManageInvitations: () => true,
		hasRole: vi.fn(),
		isOwner: vi.fn(),
		isAdmin: vi.fn(),
		isOwnerOrAdmin: vi.fn(),
		canManageMembers: vi.fn(),
		canManageOrganization: vi.fn(),
		canDeleteConversations: vi.fn(),
		canManageFiles: vi.fn(),
	});
}

// Test wrapper with providers
function TestWrapper({ children }: { children: React.ReactNode }) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

describe("InviteUserCard", () => {
	describe("Content and Layout", () => {
		beforeEach(() => {
			setupAdminPermissions();
		});

		it("should render the card container", () => {
			render(
				<TestWrapper>
					<InviteUserCard />
				</TestWrapper>,
			);

			// Card should have proper styling classes
			const card = screen.getByRole("heading", {
				name: /inviteCard.title/i,
			}).parentElement;
			expect(card).toHaveClass("space-y-3");
			expect(card).toHaveClass("p-4");
			expect(card).toHaveClass("border");
			expect(card).toHaveClass("border-border");
			expect(card).toHaveClass("rounded-lg");
			expect(card).toHaveClass("bg-blue-50/30");
		});

		it("should render the title", () => {
			render(
				<TestWrapper>
					<InviteUserCard />
				</TestWrapper>,
			);

			const title = screen.getByRole("heading", { name: /inviteCard.title/i });
			expect(title).toBeInTheDocument();
			expect(title).toHaveClass("text-base");
			expect(title).toHaveClass("font-semibold");
			expect(title).toHaveClass("text-foreground");
		});

		it("should render the description text", () => {
			render(
				<TestWrapper>
					<InviteUserCard />
				</TestWrapper>,
			);

			expect(screen.getByText("inviteCard.description")).toBeInTheDocument();
		});

		it("should have proper text styling for description", () => {
			render(
				<TestWrapper>
					<InviteUserCard />
				</TestWrapper>,
			);

			const description = screen.getByText("inviteCard.description");
			expect(description).toHaveClass("text-sm");
			expect(description).toHaveClass("text-muted-foreground");
		});

		it("should render InviteUsersButton", () => {
			render(
				<TestWrapper>
					<InviteUserCard />
				</TestWrapper>,
			);

			const button = screen.getByTestId("invite-users-button");
			expect(button).toBeInTheDocument();
		});

		it("should pass correct props to InviteUsersButton", () => {
			render(
				<TestWrapper>
					<InviteUserCard />
				</TestWrapper>,
			);

			const button = screen.getByTestId("invite-users-button");
			expect(button).toHaveClass("w-full");
			expect(button).toHaveClass("gap-2");
			expect(button).toHaveClass("h-9");
		});
	});

	describe("Container Layout", () => {
		beforeEach(() => {
			setupAdminPermissions();
		});

		it("should have proper spacing at the top", () => {
			render(
				<TestWrapper>
					<InviteUserCard />
				</TestWrapper>,
			);

			const container = screen
				.getByRole("heading", { name: /inviteCard.title/i })
				.closest("div")?.parentElement;
			expect(container).toHaveClass("mt-auto");
			expect(container).toHaveClass("pt-6");
		});
	});

	describe("Visual Design", () => {
		beforeEach(() => {
			setupAdminPermissions();
		});

		it("should use blue background color with opacity", () => {
			render(
				<TestWrapper>
					<InviteUserCard />
				</TestWrapper>,
			);

			const card = screen.getByRole("heading", {
				name: /inviteCard.title/i,
			}).parentElement;
			expect(card).toHaveClass("bg-blue-50/30");
		});

		it("should have rounded corners", () => {
			render(
				<TestWrapper>
					<InviteUserCard />
				</TestWrapper>,
			);

			const card = screen.getByRole("heading", {
				name: /inviteCard.title/i,
			}).parentElement;
			expect(card).toHaveClass("rounded-lg");
		});

		it("should have border", () => {
			render(
				<TestWrapper>
					<InviteUserCard />
				</TestWrapper>,
			);

			const card = screen.getByRole("heading", {
				name: /inviteCard.title/i,
			}).parentElement;
			expect(card).toHaveClass("border");
			expect(card).toHaveClass("border-border");
		});
	});

	describe("Component Integration", () => {
		beforeEach(() => {
			setupAdminPermissions();
		});

		it("should render all child elements in correct order", () => {
			render(
				<TestWrapper>
					<InviteUserCard />
				</TestWrapper>,
			);

			const card = screen.getByRole("heading", {
				name: /inviteCard.title/i,
			}).parentElement;

			// Get all child elements
			const children = Array.from(card?.children || []);

			// Should have 3 children: h3, p, and button
			expect(children).toHaveLength(3);

			// Verify order
			expect(children[0].tagName).toBe("H3");
			expect(children[1].tagName).toBe("P");
			expect(children[2].getAttribute("data-testid")).toBe(
				"invite-users-button",
			);
		});
	});

	describe("Accessibility", () => {
		beforeEach(() => {
			setupAdminPermissions();
		});

		it("should have semantic heading", () => {
			render(
				<TestWrapper>
					<InviteUserCard />
				</TestWrapper>,
			);

			const heading = screen.getByRole("heading", { name: /inviteCard.title/i });
			expect(heading.tagName).toBe("H3");
		});

		it("should have descriptive text for screen readers", () => {
			render(
				<TestWrapper>
					<InviteUserCard />
				</TestWrapper>,
			);

			// Text should be accessible
			expect(
				screen.getByText(
					"inviteCard.description",
				),
			).toBeInTheDocument();
		});

		it("should have proper contrast with background", () => {
			render(
				<TestWrapper>
					<InviteUserCard />
				</TestWrapper>,
			);

			// Title should use foreground color for proper contrast
			const title = screen.getByRole("heading", { name: /inviteCard.title/i });
			expect(title).toHaveClass("text-foreground");

			// Description should use muted foreground
			const description = screen.getByText(
				"inviteCard.description",
			);
			expect(description).toHaveClass("text-muted-foreground");
		});
	});

	describe("User Interactions", () => {
		beforeEach(() => {
			setupAdminPermissions();
		});

		it("should allow clicking the invite button", async () => {
			const user = userEvent.setup();

			render(
				<TestWrapper>
					<InviteUserCard />
				</TestWrapper>,
			);

			const button = screen.getByTestId("invite-users-button");
			await user.click(button);

			// Button should be clickable (no errors thrown)
			expect(button).toBeInTheDocument();
		});
	});

	describe("Component Structure", () => {
		beforeEach(() => {
			setupAdminPermissions();
		});

		it("should match the expected DOM structure", () => {
			const { container } = render(
				<TestWrapper>
					<InviteUserCard />
				</TestWrapper>,
			);

			// Outer container with mt-auto and pt-6
			const outerDiv = container.firstChild as HTMLElement;
			expect(outerDiv).toHaveClass("mt-auto");
			expect(outerDiv).toHaveClass("pt-6");

			// Inner card with styling
			const innerDiv = outerDiv.firstChild as HTMLElement;
			expect(innerDiv).toHaveClass("space-y-3");
			expect(innerDiv).toHaveClass("p-4");
		});
	});

	describe("Responsive Design", () => {
		beforeEach(() => {
			setupAdminPermissions();
		});

		it("should have full-width button", () => {
			render(
				<TestWrapper>
					<InviteUserCard />
				</TestWrapper>,
			);

			const button = screen.getByTestId("invite-users-button");
			expect(button).toHaveClass("w-full");
		});

		it("should have consistent spacing", () => {
			render(
				<TestWrapper>
					<InviteUserCard />
				</TestWrapper>,
			);

			const card = screen.getByRole("heading", {
				name: /inviteCard.title/i,
			}).parentElement;
			expect(card).toHaveClass("space-y-3"); // Vertical spacing between elements
			expect(card).toHaveClass("p-4"); // Padding around content
		});
	});

	describe("Permission-Based Rendering", () => {
		it("should return null when user cannot manage invitations", () => {
			// Mock permissions to deny invitation management
			vi.mocked(useProfilePermissions).mockReturnValue({
				canManageInvitations: () => false,
				hasRole: vi.fn(),
				isOwner: vi.fn(),
				isAdmin: vi.fn(),
				isOwnerOrAdmin: vi.fn(),
				canManageMembers: vi.fn(),
				canManageOrganization: vi.fn(),
				canDeleteConversations: vi.fn(),
				canManageFiles: vi.fn(),
			});

			const { container } = render(
				<TestWrapper>
					<InviteUserCard />
				</TestWrapper>,
			);

			// Component should render nothing (QueryClientProvider renders a div)
			expect(
				container.querySelector('[class*="mt-auto"]'),
			).not.toBeInTheDocument();
			expect(
				screen.queryByRole("heading", { name: /inviteCard.title/i }),
			).not.toBeInTheDocument();
		});

		it("should render content when user can manage invitations", () => {
			setupAdminPermissions();

			render(
				<TestWrapper>
					<InviteUserCard />
				</TestWrapper>,
			);

			// Component should render the card
			expect(
				screen.getByRole("heading", { name: /inviteCard.title/i }),
			).toBeInTheDocument();
		});
	});
});
