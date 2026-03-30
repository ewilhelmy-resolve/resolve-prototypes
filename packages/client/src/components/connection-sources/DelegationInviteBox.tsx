"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { ritaToast } from "@/components/custom/rita-toast";
import { StatusAlert } from "@/components/custom/status-alert";
import { ConfirmFormDialog } from "@/components/dialogs/ConfirmFormDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

// Map ITSM types to their related knowledge base connection (only for types that have one)
const RELATED_CONNECTION_LABELS: Partial<Record<ItsmSystemType, string>> = {
	servicenow_itsm: "Knowledge Base",
	jira_itsm: "Confluence",
	// freshservice_itsm - no related connections
};

export default function DelegationInviteBox({
	itsmSource,
}: DelegationInviteBoxProps) {
	const { t } = useTranslation("credentialDelegation");
	const createDelegation = useCreateDelegation();
	const [applyToRelated, setApplyToRelated] = useState(false);

	const systemName = t(`systems.${itsmSource}.title`);
	const relatedConnectionLabel = RELATED_CONNECTION_LABELS[itsmSource];
	const hasRelatedConnection = Boolean(relatedConnectionLabel);

	const handleConfirm = async (data: Record<string, any>) => {
		try {
			await createDelegation.mutateAsync({
				admin_email: data.email.trim(),
				itsm_system_type: itsmSource,
				apply_to_related: applyToRelated,
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
					{hasRelatedConnection && (
						<div className="flex items-center gap-2">
							<Checkbox
								id="apply-to-related"
								checked={applyToRelated}
								onCheckedChange={(checked) =>
									setApplyToRelated(checked === true)
								}
							/>
							<Label
								htmlFor="apply-to-related"
								className="text-sm font-normal cursor-pointer"
							>
								{t("invite.dialog.applyToRelated", {
									target: relatedConnectionLabel,
								})}
							</Label>
						</div>
					)}
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
