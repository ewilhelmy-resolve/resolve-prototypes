import { InfoIcon } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Email validation function
function validateEmails(emailString: string): boolean {
	if (!emailString.trim()) return false;

	const emails = emailString
		.split(",")
		.map((email) => email.trim())
		.filter((email) => email.length > 0);

	if (emails.length === 0) return false;

	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emails.every((email) => emailRegex.test(email));
}

interface InviteUsersDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export default function InviteUsersDialog({
	open,
	onOpenChange,
}: InviteUsersDialogProps) {
	const [emails, setEmails] = useState("");

	const isValid = validateEmails(emails);

	const handleInvite = () => {
		if (isValid) {
			console.log("Inviting users:", emails);
			// TODO: Implement invite logic here
			setEmails("");
			onOpenChange(false);
		}
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
					<Alert className="w-full bg-primary-foreground flex items-start gap-2 border-0">
						<InfoIcon className="size-4" />
						<AlertDescription className="flex-1">
							<p className=" text-accent-foreground">All new users will be assigned the <span className="font-semibold inline">User</span> role by default.</p>
							<p> To grant admin access, update their role later in Settings → Users.</p>
						</AlertDescription>
					</Alert>

					<div className="grid gap-2">
						<Label htmlFor="emails">Email addresses</Label>
						<Textarea
							id="emails"
							placeholder="Enter email addresses separated by commas (e.g., user1@example.com, user2@example.com)"
							value={emails}
							onChange={(e) => setEmails(e.target.value)}
							className="min-h-[100px]"
						/>
						<p className="text-sm text-muted-foreground">
							Separate multiple email addresses with commas
						</p>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleInvite} disabled={!isValid}>
						Invite Users
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
