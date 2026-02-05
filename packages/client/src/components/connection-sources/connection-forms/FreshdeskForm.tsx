"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusAlert } from "@/components/ui/status-alert";
import ConnectionsForm from "../form-elements/ConnectionsForm";
import FormField from "../form-elements/FormField";
import FormSection from "../form-elements/FormSection";

// TODO: Update form fields when backend Freshdesk integration is ready
export interface FreshdeskFormData {
	domain: string;
	apiKey: string;
}

interface FreshdeskFormProps {
	onCancel?: () => void;
	onSuccess?: () => void;
	onFailure?: () => void;
}

export function FreshdeskForm({ onCancel }: FreshdeskFormProps) {
	const { t } = useTranslation("connections");

	return (
		<ConnectionsForm handleSubmit={(e) => e.preventDefault()} id="freshdesk-form">
			<FormSection title={t("form.sections.authentication")}>
				<StatusAlert variant="info" className="mb-4">
					<p className="font-semibold">{t("form.alerts.comingSoon")}</p>
					<p>{t("form.alerts.freshdeskNotReady")}</p>
				</StatusAlert>

				{/* Domain URL - placeholder field */}
				<FormField label={t("form.labels.freshdeskDomain")} errors={{}} name="domain" required>
					<Input
						id="freshdesk-domain"
						type="url"
						placeholder={t("form.placeholders.freshdeskDomain")}
						disabled
					/>
				</FormField>

				{/* API Key - placeholder field */}
				<FormField label={t("form.labels.apiKey")} errors={{}} name="apiKey" required>
					<Input
						id="freshdesk-api-key"
						type="password"
						placeholder={t("form.placeholders.apiKey")}
						disabled
					/>
				</FormField>

				<div className="flex justify-start gap-2 w-full">
					<Button type="button" disabled>
						{t("form.buttons.connect")}
					</Button>

					{onCancel && (
						<Button type="button" variant="outline" onClick={onCancel}>
							{t("form.buttons.cancel")}
						</Button>
					)}
				</div>
			</FormSection>
		</ConnectionsForm>
	);
}
