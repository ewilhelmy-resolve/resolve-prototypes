"use client";

import { Mail } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ritaToast } from "@/components/ui/rita-toast";
import {
    ItsmSystemType,
    useCreateDelegation
} from "@/hooks/api/useCredentialDelegations";

interface DelegationInviteBoxProps {
    itsmSource: ItsmSystemType;
}


export default function DelegationInviteBox({ itsmSource }: DelegationInviteBoxProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [email, setEmail] = useState("");
	const createDelegation = useCreateDelegation();

	const systemName =
        itsmSource === "servicenow"
			? "ServiceNow"
			: itsmSource === "jira"
				? "Jira"
				: "ITSM not supported";

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!email.trim()) {
			ritaToast.error({
				title: "Email Required",
				description: "Please enter the IT admin's email address",
			});
			return;
		}

		try {
			await createDelegation.mutateAsync({
				admin_email: email.trim(),
				itsm_system_type: itsmSource,
			});

			ritaToast.success({
				title: "Invite Sent",
				description: `An email has been sent to ${email} with a secure link to set up credentials.`,
			});

			setEmail("");
			setIsOpen(false);
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: (error as { error?: string })?.error || "Failed to send invite";

			ritaToast.error({
				title: "Failed to Send Invite",
				description: message,
			});
		}
	};

	return (
		<div className="w-full border border-border bg-blue-100 rounded-md p-4">
			<div className="flex items-start gap-3">
				<div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
					<Mail className="h-5 w-5 text-primary" />
				</div>
				<div className="flex-1 min-w-0">
					<h4 className="text-sm font-medium">Delegate Credential Setup</h4>
					<p className="text-sm text-muted-foreground mt-1">
						Send a secure link to your IT admin to set up {systemName}{" "}
						credentials without sharing them directly.
					</p>
				</div>
				<Dialog open={isOpen} onOpenChange={setIsOpen}>
					<DialogTrigger asChild>
						<Button variant="outline" size="sm" className="flex-shrink-0">
							Invite IT Admin
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Invite IT Admin to configure</DialogTitle>
							<DialogDescription>
								Enter the email of your {systemName}{" "}
								administrator. They'll get temporary access for 24 hour to complete setup.
							</DialogDescription>
						</DialogHeader>
						<form onSubmit={handleSubmit}>
							<div className="grid gap-4 py-4">
								<div className="grid gap-2">
									<Label htmlFor="admin-email">IT Admin Email</Label>
									<Input
										id="admin-email"
										type="email"
										placeholder="admin@company.com"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										autoComplete="email"
										required
									/>
                                    <p className="text-sm text-muted-foreground mt-1">The recipient will receive a secure link with temporary access (24 hours)</p>
								</div>
							</div>
							<DialogFooter>
								<Button
									type="button"
									variant="ghost"
									onClick={() => setIsOpen(false)}
								>
									Cancel
								</Button>
								<Button type="submit" disabled={createDelegation.isPending}>
									{createDelegation.isPending ? "Sending..." : "Send Invite"}
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			</div>
		</div>
	);
}
