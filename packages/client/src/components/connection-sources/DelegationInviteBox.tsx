"use client";

import { Mail } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
	useCreateDelegation,
} from "@/hooks/api/useCredentialDelegations";

interface DelegationInviteBoxProps {
	itsmSource: ItsmSystemType;
}

export default function DelegationInviteBox({
	itsmSource,
}: DelegationInviteBoxProps) {
	const { t } = useTranslation("credentialDelegation");
	const [isOpen, setIsOpen] = useState(false);
	const [email, setEmail] = useState("");
	const createDelegation = useCreateDelegation();

	const systemName = t(`systems.${itsmSource}.title`);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!email.trim()) {
			ritaToast.error({
				title: t("invite.toast.emailRequired.title"),
				description: t("invite.toast.emailRequired.description"),
			});
			return;
		}

		try {
			await createDelegation.mutateAsync({
				admin_email: email.trim(),
				itsm_system_type: itsmSource,
			});

			ritaToast.success({
				title: t("invite.toast.success.title"),
				description: t("invite.toast.success.description", { email }),
			});

			setEmail("");
			setIsOpen(false);
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: (error as { error?: string })?.error ||
						t("invite.toast.error.defaultDescription");

			ritaToast.error({
				title: t("invite.toast.error.title"),
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
					<h4 className="text-sm font-medium">{t("invite.title")}</h4>
					<p className="text-sm text-muted-foreground mt-1">
						{t("invite.description", { systemName })}
					</p>
				</div>
				<Dialog open={isOpen} onOpenChange={setIsOpen}>
					<DialogTrigger asChild>
						<Button variant="outline" size="sm" className="flex-shrink-0">
							{t("invite.button")}
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>{t("invite.dialog.title")}</DialogTitle>
							<DialogDescription>
								{t("invite.dialog.description", { systemName })}
							</DialogDescription>
						</DialogHeader>
						<form onSubmit={handleSubmit}>
							<div className="grid gap-4 py-4">
								<div className="grid gap-2">
									<Label htmlFor="admin-email">
										{t("invite.dialog.emailLabel")}
									</Label>
									<Input
										id="admin-email"
										type="email"
										placeholder={t("invite.dialog.emailPlaceholder")}
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										autoComplete="email"
										required
									/>
									<p className="text-sm text-muted-foreground mt-1">
										{t("invite.dialog.emailHint")}
									</p>
								</div>
							</div>
							<DialogFooter>
								<Button
									type="button"
									variant="ghost"
									onClick={() => setIsOpen(false)}
								>
									{t("invite.dialog.cancel")}
								</Button>
								<Button type="submit" disabled={createDelegation.isPending}>
									{createDelegation.isPending
										? t("invite.dialog.sending")
										: t("invite.dialog.send")}
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			</div>
		</div>
	);
}
