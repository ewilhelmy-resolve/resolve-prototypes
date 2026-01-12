/**
 * InviteUsersDialog.test.tsx - Unit tests for InviteUsersDialog component
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as useInvitationsModule from "@/hooks/api/useInvitations";
import {
	type InvitationAPIError,
	InvitationErrorCode,
} from "@/types/invitations";
import InviteUsersDialog from "./InviteUsersDialog";

// Mock toast
vi.mock("@/lib/toast", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

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

describe("InviteUsersDialog", () => {
	const mockOnOpenChange = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Dialog Visibility", () => {
		it("should render when open prop is true", () => {
			vi.spyOn(useInvitationsModule, "useSendInvitations").mockReturnValue({
				mutate: vi.fn(),
				isPending: false,
				reset: vi.fn(),
			} as any);

			render(
				<TestWrapper>
					<InviteUsersDialog open={true} onOpenChange={mockOnOpenChange} />
				</TestWrapper>,
			);

			expect(screen.getByRole("dialog")).toBeInTheDocument();
			expect(
				screen.getByRole("heading", { name: /invite\.title/i }),
			).toBeInTheDocument();
		});

		it("should not render when open prop is false", () => {
			vi.spyOn(useInvitationsModule, "useSendInvitations").mockReturnValue({
				mutate: vi.fn(),
				isPending: false,
				reset: vi.fn(),
			} as any);

			render(
				<TestWrapper>
					<InviteUsersDialog open={false} onOpenChange={mockOnOpenChange} />
				</TestWrapper>,
			);

			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
	});

	describe("Content and Layout", () => {
		it("should render dialog title and description", () => {
			vi.spyOn(useInvitationsModule, "useSendInvitations").mockReturnValue({
				mutate: vi.fn(),
				isPending: false,
				reset: vi.fn(),
			} as any);

			render(
				<TestWrapper>
					<InviteUsersDialog open={true} onOpenChange={mockOnOpenChange} />
				</TestWrapper>,
			);

			expect(
				screen.getByRole("heading", { name: /invite\.title/i }),
			).toBeInTheDocument();
			expect(screen.getByText("invite.description")).toBeInTheDocument();
		});

		it("should render info alert about user role", () => {
			vi.spyOn(useInvitationsModule, "useSendInvitations").mockReturnValue({
				mutate: vi.fn(),
				isPending: false,
				reset: vi.fn(),
			} as any);

			render(
				<TestWrapper>
					<InviteUsersDialog open={true} onOpenChange={mockOnOpenChange} />
				</TestWrapper>,
			);

			expect(screen.getByText(/invite\.roleInfoPrefix/i)).toBeInTheDocument();
			expect(screen.getByText(/invite\.adminHint/i)).toBeInTheDocument();
		});

		it("should render email input textarea", () => {
			vi.spyOn(useInvitationsModule, "useSendInvitations").mockReturnValue({
				mutate: vi.fn(),
				isPending: false,
				reset: vi.fn(),
			} as any);

			render(
				<TestWrapper>
					<InviteUsersDialog open={true} onOpenChange={mockOnOpenChange} />
				</TestWrapper>,
			);

			expect(screen.getByLabelText(/invite\.emailLabel/i)).toBeInTheDocument();
			expect(
				screen.getByPlaceholderText(/invite\.emailPlaceholder/i),
			).toBeInTheDocument();
		});

		it("should render helper text about max 50 emails", () => {
			vi.spyOn(useInvitationsModule, "useSendInvitations").mockReturnValue({
				mutate: vi.fn(),
				isPending: false,
				reset: vi.fn(),
			} as any);

			render(
				<TestWrapper>
					<InviteUsersDialog open={true} onOpenChange={mockOnOpenChange} />
				</TestWrapper>,
			);

			expect(screen.getByText("invite.emailHint")).toBeInTheDocument();
		});

		it("should render Cancel and Invite Users buttons", () => {
			vi.spyOn(useInvitationsModule, "useSendInvitations").mockReturnValue({
				mutate: vi.fn(),
				isPending: false,
				reset: vi.fn(),
			} as any);

			render(
				<TestWrapper>
					<InviteUsersDialog open={true} onOpenChange={mockOnOpenChange} />
				</TestWrapper>,
			);

			expect(
				screen.getByRole("button", { name: /actions\.cancel/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /invite\.submit/i }),
			).toBeInTheDocument();
		});
	});

	describe("Email Input Validation", () => {
		it("should disable Invite button when textarea is empty", () => {
			vi.spyOn(useInvitationsModule, "useSendInvitations").mockReturnValue({
				mutate: vi.fn(),
				isPending: false,
				reset: vi.fn(),
			} as any);

			render(
				<TestWrapper>
					<InviteUsersDialog open={true} onOpenChange={mockOnOpenChange} />
				</TestWrapper>,
			);

			const inviteButton = screen.getByRole("button", {
				name: /invite\.submit/i,
			});
			expect(inviteButton).toBeDisabled();
		});

		it("should enable Invite button when valid email is entered", async () => {
			const user = userEvent.setup();

			vi.spyOn(useInvitationsModule, "useSendInvitations").mockReturnValue({
				mutate: vi.fn(),
				isPending: false,
				reset: vi.fn(),
			} as any);

			render(
				<TestWrapper>
					<InviteUsersDialog open={true} onOpenChange={mockOnOpenChange} />
				</TestWrapper>,
			);

			const textarea = screen.getByLabelText(/invite\.emailLabel/i);
			await user.type(textarea, "user@example.com");

			await waitFor(() => {
				const inviteButton = screen.getByRole("button", {
					name: /invite\.submit/i,
				});
				expect(inviteButton).not.toBeDisabled();
			});
		});

		it("should accept multiple comma-separated emails", async () => {
			const user = userEvent.setup();

			vi.spyOn(useInvitationsModule, "useSendInvitations").mockReturnValue({
				mutate: vi.fn(),
				isPending: false,
				reset: vi.fn(),
			} as any);

			render(
				<TestWrapper>
					<InviteUsersDialog open={true} onOpenChange={mockOnOpenChange} />
				</TestWrapper>,
			);

			const textarea = screen.getByLabelText(/invite\.emailLabel/i);
			await user.type(textarea, "user1@example.com, user2@example.com");

			await waitFor(() => {
				const inviteButton = screen.getByRole("button", {
					name: /invite\.submit/i,
				});
				expect(inviteButton).not.toBeDisabled();
			});
		});

		it("should disable Invite button for invalid email format", async () => {
			const user = userEvent.setup();

			vi.spyOn(useInvitationsModule, "useSendInvitations").mockReturnValue({
				mutate: vi.fn(),
				isPending: false,
				reset: vi.fn(),
			} as any);

			render(
				<TestWrapper>
					<InviteUsersDialog open={true} onOpenChange={mockOnOpenChange} />
				</TestWrapper>,
			);

			const textarea = screen.getByLabelText(/invite\.emailLabel/i);
			await user.type(textarea, "invalid-email");

			await waitFor(() => {
				const inviteButton = screen.getByRole("button", {
					name: /invite\.submit/i,
				});
				expect(inviteButton).toBeDisabled();
			});
		});

		it("should disable Invite button when more than 50 emails are entered", async () => {
			const user = userEvent.setup();

			vi.spyOn(useInvitationsModule, "useSendInvitations").mockReturnValue({
				mutate: vi.fn(),
				isPending: false,
				reset: vi.fn(),
			} as any);

			render(
				<TestWrapper>
					<InviteUsersDialog open={true} onOpenChange={mockOnOpenChange} />
				</TestWrapper>,
			);

			// Generate 51 valid emails
			const emails = Array.from(
				{ length: 51 },
				(_, i) => `user${i}@example.com`,
			).join(", ");

			const textarea = screen.getByLabelText(/invite\.emailLabel/i);
			// Use paste instead of type for performance
			await user.click(textarea);
			await user.paste(emails);

			await waitFor(() => {
				const inviteButton = screen.getByRole("button", {
					name: /invite\.submit/i,
				});
				expect(inviteButton).toBeDisabled();
			});
		});
	});

	describe("Form Submission", () => {
		it("should call sendInvitations mutation with correct data", async () => {
			const user = userEvent.setup();
			const mockMutate = vi.fn();

			vi.spyOn(useInvitationsModule, "useSendInvitations").mockReturnValue({
				mutate: mockMutate,
				isPending: false,
				reset: vi.fn(),
			} as any);

			render(
				<TestWrapper>
					<InviteUsersDialog open={true} onOpenChange={mockOnOpenChange} />
				</TestWrapper>,
			);

			// Enter emails using paste for better performance
			const textarea = screen.getByLabelText(/invite\.emailLabel/i);
			await user.click(textarea);
			await user.paste(
				"user1@example.com, user2@example.com, user3@example.com",
			);

			// Wait for validation and button to be enabled
			await waitFor(
				() => {
					const inviteButton = screen.getByRole("button", {
						name: /invite\.submit/i,
					});
					expect(inviteButton).not.toBeDisabled();
				},
				{ timeout: 3000 },
			);

			const inviteButton = screen.getByRole("button", {
				name: /invite\.submit/i,
			});
			await user.click(inviteButton);

			await waitFor(() => {
				expect(mockMutate).toHaveBeenCalledWith(
					expect.objectContaining({
						emails: [
							"user1@example.com",
							"user2@example.com",
							"user3@example.com",
						],
						role: "user",
					}),
					expect.any(Object),
				);
			});
		});

		it("should show loading state during submission", () => {
			vi.spyOn(useInvitationsModule, "useSendInvitations").mockReturnValue({
				mutate: vi.fn(),
				isPending: true,
				reset: vi.fn(),
			} as any);

			render(
				<TestWrapper>
					<InviteUsersDialog open={true} onOpenChange={mockOnOpenChange} />
				</TestWrapper>,
			);

			expect(
				screen.getByRole("button", { name: /invite\.sending/i }),
			).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /invite\.sending/i })).toBeDisabled();
		});

		it("should disable textarea during submission", () => {
			vi.spyOn(useInvitationsModule, "useSendInvitations").mockReturnValue({
				mutate: vi.fn(),
				isPending: true,
				reset: vi.fn(),
			} as any);

			render(
				<TestWrapper>
					<InviteUsersDialog open={true} onOpenChange={mockOnOpenChange} />
				</TestWrapper>,
			);

			const textarea = screen.getByLabelText(/invite\.emailLabel/i);
			expect(textarea).toBeDisabled();
		});

		it("should disable cancel button during submission", () => {
			vi.spyOn(useInvitationsModule, "useSendInvitations").mockReturnValue({
				mutate: vi.fn(),
				isPending: true,
				reset: vi.fn(),
			} as any);

			render(
				<TestWrapper>
					<InviteUsersDialog open={true} onOpenChange={mockOnOpenChange} />
				</TestWrapper>,
			);

			const cancelButton = screen.getByRole("button", { name: /actions\.cancel/i });
			expect(cancelButton).toBeDisabled();
		});
	});

	describe("Dialog Close Behavior", () => {
		it("should call onOpenChange when Cancel button is clicked", async () => {
			const user = userEvent.setup();

			vi.spyOn(useInvitationsModule, "useSendInvitations").mockReturnValue({
				mutate: vi.fn(),
				isPending: false,
				reset: vi.fn(),
			} as any);

			render(
				<TestWrapper>
					<InviteUsersDialog open={true} onOpenChange={mockOnOpenChange} />
				</TestWrapper>,
			);

			const cancelButton = screen.getByRole("button", { name: /actions\.cancel/i });
			await user.click(cancelButton);

			expect(mockOnOpenChange).toHaveBeenCalledWith(false);
		});

		it("should reset form when dialog closes", async () => {
			const user = userEvent.setup();
			const mockReset = vi.fn();

			vi.spyOn(useInvitationsModule, "useSendInvitations").mockReturnValue({
				mutate: vi.fn(),
				isPending: false,
				reset: mockReset,
			} as any);

			const { rerender } = render(
				<TestWrapper>
					<InviteUsersDialog open={true} onOpenChange={mockOnOpenChange} />
				</TestWrapper>,
			);

			// Enter some text
			const textarea = screen.getByLabelText(/invite\.emailLabel/i);
			await user.type(textarea, "test@example.com");

			// Close dialog
			rerender(
				<TestWrapper>
					<InviteUsersDialog open={false} onOpenChange={mockOnOpenChange} />
				</TestWrapper>,
			);

			// Verify reset was called
			await waitFor(() => {
				expect(mockReset).toHaveBeenCalled();
			});
		});
	});

	describe("Error Handling", () => {
		it("should show appropriate error message for invalid email", async () => {
			const user = userEvent.setup();
			const { toast } = await import("@/lib/toast");

			vi.spyOn(useInvitationsModule, "useSendInvitations").mockReturnValue({
				mutate: vi.fn((_, { onError }) => {
					const error: InvitationAPIError = {
						error: InvitationErrorCode.INVALID_EMAIL,
						message: "Invalid email",
					};
					onError?.(error);
				}),
				isPending: false,
				reset: vi.fn(),
			} as any);

			render(
				<TestWrapper>
					<InviteUsersDialog open={true} onOpenChange={mockOnOpenChange} />
				</TestWrapper>,
			);

			// Enter email and submit
			const textarea = screen.getByLabelText(/invite\.emailLabel/i);
			await user.type(textarea, "user@example.com");

			const inviteButton = screen.getByRole("button", {
				name: /invite\.submit/i,
			});
			await user.click(inviteButton);

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith(
					"error.invitationsFailed",
					expect.objectContaining({
						description: "invite.errors.invalidEmail",
					}),
				);
			});
		});

		it("should show error for duplicate pending invitations", async () => {
			const user = userEvent.setup();
			const { toast } = await import("@/lib/toast");

			vi.spyOn(useInvitationsModule, "useSendInvitations").mockReturnValue({
				mutate: vi.fn((_, { onError }) => {
					const error: InvitationAPIError = {
						error: InvitationErrorCode.DUPLICATE_PENDING,
						message: "Duplicate pending",
					};
					onError?.(error);
				}),
				isPending: false,
				reset: vi.fn(),
			} as any);

			render(
				<TestWrapper>
					<InviteUsersDialog open={true} onOpenChange={mockOnOpenChange} />
				</TestWrapper>,
			);

			// Enter email and submit
			const textarea = screen.getByLabelText(/invite\.emailLabel/i);
			await user.type(textarea, "user@example.com");

			const inviteButton = screen.getByRole("button", {
				name: /invite\.submit/i,
			});
			await user.click(inviteButton);

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith(
					"error.invitationsFailed",
					expect.objectContaining({
						description: "invite.errors.duplicatePending",
					}),
				);
			});
		});

		it("should show error for user already exists", async () => {
			const user = userEvent.setup();
			const { toast } = await import("@/lib/toast");

			vi.spyOn(useInvitationsModule, "useSendInvitations").mockReturnValue({
				mutate: vi.fn((_, { onError }) => {
					const error: InvitationAPIError = {
						error: InvitationErrorCode.USER_ALREADY_EXISTS,
						message: "User exists",
					};
					onError?.(error);
				}),
				isPending: false,
				reset: vi.fn(),
			} as any);

			render(
				<TestWrapper>
					<InviteUsersDialog open={true} onOpenChange={mockOnOpenChange} />
				</TestWrapper>,
			);

			// Enter email and submit
			const textarea = screen.getByLabelText(/invite\.emailLabel/i);
			await user.type(textarea, "user@example.com");

			const inviteButton = screen.getByRole("button", {
				name: /invite\.submit/i,
			});
			await user.click(inviteButton);

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith(
					"error.invitationsFailed",
					expect.objectContaining({
						description: "invite.errors.userExists",
					}),
				);
			});
		});

		it("should show error for batch size exceeded", async () => {
			const user = userEvent.setup();
			const { toast } = await import("@/lib/toast");

			vi.spyOn(useInvitationsModule, "useSendInvitations").mockReturnValue({
				mutate: vi.fn((_, { onError }) => {
					const error: InvitationAPIError = {
						error: InvitationErrorCode.BATCH_SIZE_EXCEEDED,
						message: "Batch size exceeded",
					};
					onError?.(error);
				}),
				isPending: false,
				reset: vi.fn(),
			} as any);

			render(
				<TestWrapper>
					<InviteUsersDialog open={true} onOpenChange={mockOnOpenChange} />
				</TestWrapper>,
			);

			// Enter email and submit
			const textarea = screen.getByLabelText(/invite\.emailLabel/i);
			await user.type(textarea, "user@example.com");

			const inviteButton = screen.getByRole("button", {
				name: /invite\.submit/i,
			});
			await user.click(inviteButton);

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith(
					"error.invitationsFailed",
					expect.objectContaining({
						description: "invite.errors.batchExceeded",
					}),
				);
			});
		});

		it("should show error for tenant limit exceeded", async () => {
			const user = userEvent.setup();
			const { toast } = await import("@/lib/toast");

			vi.spyOn(useInvitationsModule, "useSendInvitations").mockReturnValue({
				mutate: vi.fn((_, { onError }) => {
					const error: InvitationAPIError = {
						error: InvitationErrorCode.TENANT_LIMIT_EXCEEDED,
						message: "Tenant limit exceeded",
					};
					onError?.(error);
				}),
				isPending: false,
				reset: vi.fn(),
			} as any);

			render(
				<TestWrapper>
					<InviteUsersDialog open={true} onOpenChange={mockOnOpenChange} />
				</TestWrapper>,
			);

			// Enter email and submit
			const textarea = screen.getByLabelText(/invite\.emailLabel/i);
			await user.type(textarea, "user@example.com");

			const inviteButton = screen.getByRole("button", {
				name: /invite\.submit/i,
			});
			await user.click(inviteButton);

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith(
					"error.invitationsFailed",
					expect.objectContaining({
						description: "invite.errors.tenantLimit",
					}),
				);
			});
		});
	});

	describe("Accessibility", () => {
		it("should have proper ARIA labels", () => {
			vi.spyOn(useInvitationsModule, "useSendInvitations").mockReturnValue({
				mutate: vi.fn(),
				isPending: false,
				reset: vi.fn(),
			} as any);

			render(
				<TestWrapper>
					<InviteUsersDialog open={true} onOpenChange={mockOnOpenChange} />
				</TestWrapper>,
			);

			expect(screen.getByRole("dialog")).toBeInTheDocument();
			expect(screen.getByLabelText(/invite\.emailLabel/i)).toBeInTheDocument();
		});

		it("should have proper heading hierarchy", () => {
			vi.spyOn(useInvitationsModule, "useSendInvitations").mockReturnValue({
				mutate: vi.fn(),
				isPending: false,
				reset: vi.fn(),
			} as any);

			render(
				<TestWrapper>
					<InviteUsersDialog open={true} onOpenChange={mockOnOpenChange} />
				</TestWrapper>,
			);

			// DialogTitle creates a heading
			expect(
				screen.getByRole("heading", { name: /invite\.title/i }),
			).toBeInTheDocument();
		});
	});
});
