"use client";

import { useTranslation } from "react-i18next";
import { z } from "zod";
import { ConfirmFormDialog } from "@/components/dialogs/ConfirmFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ritaToast } from "@/components/ui/rita-toast";
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
				description: t("invite.toast.success.description", { email: data.email }),
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

	return (
		<div className="w-full border border-blue-200 bg-blue-50 rounded-lg p-4">
			<div className="flex items-start gap-3">
				<div className="flex rounded-full bg-primary/10 items-center justify-center">
					<svg
						className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<circle cx="12" cy="12" r="10" strokeWidth="1.5" />
						<path strokeWidth="1.5" d="M12 16v-4m0-4h.01" />
					</svg>
				</div>
				<div className="flex-1 min-w-0">
					<h4 className="text-sm font-medium">{t("invite.title")}</h4>
					<p className="text-sm text-muted-foreground mt-1">
						{t("invite.description", { systemName })}
					</p>
				</div>
				<ConfirmFormDialog
					trigger={
						<Button variant="outline" size="sm" className="flex-shrink-0">
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
								<Label htmlFor="admin-email">
									{t("invite.dialog.emailLabel")}
								</Label>
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
			</div>
		</div>
	);
}
