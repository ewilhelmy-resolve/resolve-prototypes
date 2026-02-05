import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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

export default function InviteUsersDialog({
	open,
	onOpenChange,
}: InviteUsersDialogProps) {
	const { t } = useTranslation("dialogs");
	const { t: tToast } = useTranslation("toast");
	const { t: tCommon } = useTranslation("common");
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

	const getErrorMessage = (error: InvitationAPIError): string => {
		switch (error.error) {
			case InvitationErrorCode.INVALID_EMAIL:
				return t("invite.errors.invalidEmail");
			case InvitationErrorCode.DUPLICATE_PENDING:
				return t("invite.errors.duplicatePending");
			case InvitationErrorCode.USER_ALREADY_EXISTS:
				return t("invite.errors.userExists");
			case InvitationErrorCode.BATCH_SIZE_EXCEEDED:
				return t("invite.errors.batchExceeded");
			case InvitationErrorCode.TENANT_LIMIT_EXCEEDED:
				return t("invite.errors.tenantLimit");
			case InvitationErrorCode.UNAUTHORIZED:
			case InvitationErrorCode.FORBIDDEN:
				return t("invite.errors.unauthorized");
			case InvitationErrorCode.SERVER_ERROR:
				return t("invite.errors.serverError");
			default:
				return error.message || t("invite.errors.default");
		}
	};

	const handleInvite = () => {
		if (!validation.valid) {
			toast.error(tToast("error.invalidEmails"), {
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
						tToast("success.invitationsSent", { count }),
						{
							description: tToast("descriptions.invitationSentDesc"),
						},
					);
					// Close dialog and reset form
					setEmailInput("");
					onOpenChange(false);
				},
				onError: (err) => {
					toast.error(tToast("error.invitationsFailed"), {
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
					<DialogTitle>{t("invite.title")}</DialogTitle>
					<DialogDescription>
						{t("invite.description")}
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-4">
					<StatusAlert variant="info">
						<p className="text-accent-foreground">
							{t("invite.roleInfoPrefix")}{" "}
							<span className="font-semibold inline">{t("invite.userRole")}</span>{" "}
							{t("invite.roleInfoSuffix")}
						</p>
						<p>
							{t("invite.adminHint")}
						</p>
					</StatusAlert>

					<div className="grid gap-2">
						<Label htmlFor="emails">{t("invite.emailLabel")}</Label>
						<Textarea
							id="emails"
							placeholder={t("invite.emailPlaceholder")}
							value={emailInput}
							onChange={(e) => setEmailInput(e.target.value)}
							className="min-h-[100px]"
							disabled={isPending}
						/>
						<p className="text-sm text-muted-foreground">
							{t("invite.emailHint")}
						</p>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isPending}
					>
						{tCommon("actions.cancel")}
					</Button>
					<Button
						onClick={handleInvite}
						disabled={!validation.valid || isPending}
					>
						{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{isPending ? t("invite.sending") : t("invite.submit")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
