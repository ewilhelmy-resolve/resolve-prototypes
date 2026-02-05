"use client";

import { useTranslation } from "react-i18next";
import { z } from "zod";
import { ConfirmFormDialog } from "@/components/dialogs/ConfirmFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ritaToast } from "@/components/ui/rita-toast";
import { StatusAlert } from "@/components/ui/status-alert";
import {
	type ItsmSystemType,
	useCreateDelegation,
} from "@/hooks/api/useCredentialDelegations";

interface DelegationInviteBoxProps {
	itsmSource: ItsmSystemType;
}

const emailSchema = z.object({
	email: z.string().min(1, "Email is required").email("Invalid email format"),
});

export default function DelegationInviteBox({
	itsmSource,
}: DelegationInviteBoxProps) {
	const { t } = useTranslation("credentialDelegation");
	const createDelegation = useCreateDelegation();

	const systemName = t(`systems.${itsmSource}.title`);

	const handleConfirm = async (data: Record<string, any>) => {
		try {
			await createDelegation.mutateAsync({
				admin_email: data.email.trim(),
				itsm_system_type: itsmSource,
			});

			ritaToast.success({
				title: t("invite.toast.success.title"),
				description: t("invite.toast.success.description", {
					email: data.email,
				}),
			});
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

	const delegateAction = (
		<ConfirmFormDialog
			trigger={
				<Button variant="outline" size="sm">
					{t("invite.button")}
				</Button>
			}
			title={t("invite.dialog.title")}
			description={t("invite.dialog.description", { systemName })}
			validationSchema={emailSchema}
			defaultValues={{ email: "" }}
			actionLabel={t("invite.dialog.send")}
			onConfirm={handleConfirm}
		>
			{(form) => (
				<div className="grid gap-4 py-4">
					<div className="grid gap-2">
						<Label htmlFor="admin-email">{t("invite.dialog.emailLabel")}</Label>
						<Input
							id="admin-email"
							type="email"
							placeholder={t("invite.dialog.emailPlaceholder")}
							autoComplete="email"
							{...form.register("email")}
						/>
						{form.formState.errors.email && (
							<p className="text-sm text-destructive">
								{form.formState.errors.email.message as string}
							</p>
						)}
						<p className="text-sm text-muted-foreground mt-1">
							{t("invite.dialog.emailHint")}
						</p>
					</div>
				</div>
			)}
		</ConfirmFormDialog>
	);

	return (
		<StatusAlert
			variant="info"
			title={t("invite.title")}
			action={delegateAction}
		>
			<p className="text-sm">{t("invite.description", { systemName })}</p>
		</StatusAlert>
	);
}
