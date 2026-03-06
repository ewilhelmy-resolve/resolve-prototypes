import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ritaToast } from "@/components/ui/rita-toast";
import { Spinner } from "@/components/ui/spinner";
import { StatusAlert } from "@/components/ui/status-alert";
import { useConnectionSource } from "@/contexts/ConnectionSourceContext";
import {
	useUpdateDataSource,
	useVerifyDataSource,
} from "@/hooks/useDataSources";
import ConnectionsForm from "../form-elements/ConnectionsForm";
import FormField from "../form-elements/FormField";
import FormSection from "../form-elements/FormSection";

export interface FreshdeskFormData {
	domain: string;
	apiKey: string;
}

interface FreshdeskFormProps {
	onCancel?: () => void;
	onSuccess?: () => void;
	onFailure?: () => void;
}

export function FreshdeskForm({
	onCancel,
	onSuccess,
	onFailure,
}: FreshdeskFormProps = {}) {
	const { t } = useTranslation("connections");
	const { t: tToast } = useTranslation("toast");
	const { source } = useConnectionSource();
	const verifyMutation = useVerifyDataSource();
	const updateMutation = useUpdateDataSource();

	const verificationError = source.backendData?.last_verification_error;
	const verificationFailed = !!verificationError;

	const {
		register,
		handleSubmit,
		formState: { errors },
		getValues,
		trigger,
	} = useForm<FreshdeskFormData>({
		mode: "onSubmit",
		defaultValues: {
			domain: source.backendData?.settings?.domain || "",
			apiKey: "",
		},
	});

	const handleConnect = async () => {
		const isValid = await trigger();
		if (!isValid) {
			ritaToast.error({
				title: tToast("error.validationError"),
				description: tToast("descriptions.checkFormFields"),
			});
			return;
		}

		const formData = getValues();
		try {
			await verifyMutation.mutateAsync({
				id: source.id,
				payload: {
					settings: {
						domain: formData.domain,
					},
					credentials: {
						apiKey: formData.apiKey,
					},
				},
			});

			await updateMutation.mutateAsync({
				id: source.id,
				data: {
					settings: {
						domain: formData.domain,
					},
					enabled: true,
				},
			});

			ritaToast.success({
				title: tToast("success.connectionConfigured"),
				description: tToast("descriptions.freshdeskConfigured"),
			});
			onSuccess?.();
		} catch (error) {
			ritaToast.error({
				title: tToast("error.connectionFailed"),
				description:
					error instanceof Error
						? error.message
						: "Failed to configure connection",
			});
			onFailure?.();
		}
	};

	const onSubmit = async () => {
		await handleConnect();
	};

	return (
		<ConnectionsForm handleSubmit={handleSubmit(onSubmit)} id="freshdesk-form">
			<FormSection title={t("form.sections.authentication")}>
				{verificationFailed && (
					<StatusAlert variant="error" className="mb-4">
						<p className="font-semibold">
							{t("form.alerts.verificationFailed")}
						</p>
						<p>{verificationError}</p>
						<p className="text-sm mt-2">{t("form.alerts.checkCredentials")}</p>
					</StatusAlert>
				)}

				<FormField
					label={t("form.labels.freshdeskDomain")}
					errors={errors}
					name="domain"
					required
				>
					<Input
						id="freshdesk-domain"
						type="url"
						placeholder={t("form.placeholders.freshdeskDomain")}
						{...register("domain", {
							required: t("form.validation.domainRequired"),
							pattern: {
								value: /^https?:\/\/[\w.-]+\.[a-zA-Z]{2,}(:\d+)?(\/.*)?$/,
								message: t("form.validation.invalidUrl"),
							},
						})}
					/>
				</FormField>

				<FormField
					label={t("form.labels.apiKey")}
					errors={errors}
					name="apiKey"
					required
				>
					<Input
						id="freshdesk-api-key"
						type="password"
						placeholder={t("form.placeholders.apiKey")}
						{...register("apiKey", {
							required: t("form.validation.apiKeyRequired"),
						})}
					/>
				</FormField>

				<div className="flex justify-start gap-2 w-full">
					<Button
						type="button"
						onClick={handleConnect}
						disabled={verifyMutation.isPending || updateMutation.isPending}
					>
						{verifyMutation.isPending || updateMutation.isPending ? (
							<>
								<Spinner className="mr-2" />
								{t("form.buttons.connecting")}
							</>
						) : (
							t("form.buttons.connect")
						)}
					</Button>

					{onCancel && (
						<Button type="button" variant="outline" onClick={onCancel}>
							{t("form.buttons.cancel")}
						</Button>
					)}
				</div>

				{verifyMutation.isPending && (
					<StatusAlert variant="info">
						<p className="text-accent-foreground">
							{t("form.alerts.connectionMayTakeTime")}
						</p>
						<p>{t("form.alerts.canLeavePage")}</p>
					</StatusAlert>
				)}
			</FormSection>
		</ConnectionsForm>
	);
}
