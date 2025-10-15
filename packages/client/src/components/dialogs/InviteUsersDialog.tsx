import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { StatusAlert } from "@/components/ui/status-alert";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSendInvitations } from "@/hooks/api/useInvitations";
import { toast } from "@/lib/toast";
import {
	type InvitationAPIError,
	InvitationErrorCode,
	UserRole,
} from "@/types/invitations";

// Email validation function with batch size check
function validateEmails(emailString: string): {
	valid: boolean;
	emails: string[];
	error?: string;
} {
	if (!emailString.trim()) {
		return {
			valid: false,
			emails: [],
			error: "Please enter at least one email address",
		};
	}

	const emails = emailString
		.split(",")
		.map((email) => email.trim())
		.filter((email) => email.length > 0);

	if (emails.length === 0) {
		return {
			valid: false,
			emails: [],
			error: "Please enter at least one email address",
		};
	}

	if (emails.length > 50) {
		return {
			valid: false,
			emails,
			error: "Maximum 50 email addresses allowed per batch",
		};
	}

	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	const invalidEmails = emails.filter((email) => !emailRegex.test(email));

	if (invalidEmails.length > 0) {
		return {
			valid: false,
			emails,
			error: `Invalid email format: ${invalidEmails.join(", ")}`,
		};
	}

	return { valid: true, emails };
}

interface InviteUsersDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

// Error code to user-friendly message mapping
function getErrorMessage(error: InvitationAPIError): string {
	switch (error.error) {
		case InvitationErrorCode.INVALID_EMAIL:
			return "One or more email addresses are invalid";
		case InvitationErrorCode.DUPLICATE_PENDING:
			return "Some users already have pending invitations";
		case InvitationErrorCode.USER_ALREADY_EXISTS:
			return "Some users already have accounts";
		case InvitationErrorCode.BATCH_SIZE_EXCEEDED:
			return "Maximum 50 email addresses allowed per batch";
		case InvitationErrorCode.TENANT_LIMIT_EXCEEDED:
			return "Your organization has reached the maximum number of users";
		case InvitationErrorCode.UNAUTHORIZED:
			return "You don't have permission to send invitations";
		case InvitationErrorCode.FORBIDDEN:
			return "You don't have permission to send invitations";
		case InvitationErrorCode.SERVER_ERROR:
			return "Server error occurred. Please try again later";
		default:
			return error.message || "Failed to send invitations";
	}
}

export default function InviteUsersDialog({
	open,
	onOpenChange,
}: InviteUsersDialogProps) {
	const [emailInput, setEmailInput] = useState("");

	const { mutate: sendInvitations, isPending, reset } = useSendInvitations();

	// Reset form state when dialog opens/closes
	useEffect(() => {
		if (!open) {
			// Reset on close
			setTimeout(() => {
				setEmailInput("");
				reset();
			}, 300); // Delay to avoid visual glitch during close animation
		}
	}, [open, reset]);

	const validation = validateEmails(emailInput);

	const handleInvite = () => {
		if (!validation.valid) {
			toast.error("Invalid email addresses", {
				description: validation.error,
			});
			return;
		}

		sendInvitations(
			{
				emails: validation.emails,
				role: UserRole.USER, // Default to USER role as per InfoAlert
			},
			{
				onSuccess: (data) => {
					const count = data.invitations.length;
					toast.success(
						`${count} invitation${count > 1 ? "s" : ""} sent successfully`,
						{
							description:
								"Users will receive an email with instructions to create their account.",
						},
					);
					// Close dialog and reset form
					setEmailInput("");
					onOpenChange(false);
				},
				onError: (err) => {
					toast.error("Failed to send invitations", {
						description: getErrorMessage(err),
					});
					console.error("Failed to send invitations:", err);
				},
			},
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>Invite Users</DialogTitle>
					<DialogDescription>
						Add email addresses to invite new users to your workspace.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-4">
					<StatusAlert variant="info">
						<p className="text-accent-foreground">
							All new users will be assigned the{" "}
							<span className="font-semibold inline">User</span> role by default.
						</p>
						<p>
							To grant admin access, update their role later in Settings → Users.
						</p>
					</StatusAlert>

					<div className="grid gap-2">
						<Label htmlFor="emails">Email addresses</Label>
						<Textarea
							id="emails"
							placeholder="Enter email addresses separated by commas (e.g., user1@example.com, user2@example.com)"
							value={emailInput}
							onChange={(e) => setEmailInput(e.target.value)}
							className="min-h-[100px]"
							disabled={isPending}
						/>
						<p className="text-sm text-muted-foreground">
							Separate multiple email addresses with commas (max 50)
						</p>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isPending}
					>
						Cancel
					</Button>
					<Button
						onClick={handleInvite}
						disabled={!validation.valid || isPending}
					>
						{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{isPending ? "Sending..." : "Invite Users"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
