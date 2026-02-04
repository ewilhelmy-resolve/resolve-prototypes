import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export interface ServiceNowFormData {
	instanceUrl: string;
	username: string;
	password: string;
}

interface ServiceNowFormProps {
	onCancel?: () => void;
	onSuccess?: () => void;
	onFailure?: () => void;
}

export function ServiceNowForm({
	onCancel,
	onSuccess,
	onFailure,
}: ServiceNowFormProps = {}) {
	const { t } = useTranslation("connections");
	const { t: tToast } = useTranslation("toast");
	const { source } = useConnectionSource();
	const verifyMutation = useVerifyDataSource();
	const updateMutation = useUpdateDataSource();

	// State for syncing credentials to related connection (KB ↔ ITSM)
	const [applyToRelated, setApplyToRelated] = useState(false);

	// Determine if this is KB or ITSM form based on source type
	const isItsmForm = source.type === "servicenow_itsm";
	const relatedConnectionLabel = isItsmForm
		? t("servicenow.knowledgeBase")
		: t("servicenow.itsm");

	// Check for verification failure state
	const verificationError = source.backendData?.last_verification_error;
	const verificationFailed = !!verificationError;

	const {
		register,
		handleSubmit,
		formState: { errors },
		getValues,
		trigger,
	} = useForm<ServiceNowFormData>({
		mode: "onSubmit",
		defaultValues: {
			instanceUrl: source.backendData?.settings?.instanceUrl || "",
			username: source.backendData?.settings?.username || "",
			password: "",
		},
	});

	const handleConnect = async () => {
		// Trigger validation for all fields
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
			// Step 1: Verify credentials
			await verifyMutation.mutateAsync({
				id: source.id,
				payload: {
					settings: {
						instanceUrl: formData.instanceUrl,
					},
					credentials: {
						username: formData.username,
						password: formData.password,
					},
					apply_to_related: applyToRelated,
				},
			});

			// Step 2: Save configuration immediately after verification
			await updateMutation.mutateAsync({
				id: source.id,
				data: {
					settings: {
						instanceUrl: formData.instanceUrl,
						username: formData.username,
					},
					enabled: true,
				},
			});

			ritaToast.success({
				title: tToast("success.connectionConfigured"),
				description: tToast("descriptions.serviceNowConfigured"),
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
		<ConnectionsForm handleSubmit={handleSubmit(onSubmit)} id="connection-form">
			{/* Authentication */}
			<FormSection title={t("form.sections.authentication")}>
				{/* Show error alert when verification fails */}
				{verificationFailed && (
					<StatusAlert variant="error" className="mb-4">
						<p className="font-semibold">
							{t("form.alerts.verificationFailed")}
						</p>
						<p>{verificationError}</p>
						<p className="text-sm mt-2">{t("form.alerts.checkCredentials")}</p>
					</StatusAlert>
				)}

				{/* Instance URL */}
				<FormField
					label={t("form.labels.instanceUrl")}
					errors={errors}
					name="instanceUrl"
					required
				>
					<Input
						id="instance-url"
						type="url"
						placeholder={t("form.placeholders.serviceNowUrl")}
						{...register("instanceUrl", {
							required: t("form.validation.instanceUrlRequired"),
							pattern: {
								value: /^https?:\/\/[\w.-]+\.[a-zA-Z]{2,}(:\d+)?(\/.*)?$/,
								message: t("form.validation.invalidUrl"),
							},
						})}
					/>
				</FormField>

				{/* Username */}
				<FormField
					label={t("form.labels.username")}
					errors={errors}
					name="username"
					required
				>
					<Input
						id="username"
						type="text"
						placeholder={t("form.placeholders.username")}
						{...register("username", {
							required: t("form.validation.usernameRequired"),
						})}
					/>
				</FormField>

				{/* Password */}
				<FormField
					label={t("form.labels.password")}
					errors={errors}
					name="password"
					required
				>
					<Input
						id="password"
						type="password"
						placeholder={t("form.placeholders.password")}
						{...register("password", {
							required: t("form.validation.passwordRequired"),
						})}
					/>
				</FormField>

				{/* Apply to related connection checkbox */}
				<div className="flex items-center gap-2">
					<Checkbox
						id="apply-to-related"
						checked={applyToRelated}
						onCheckedChange={(checked) => setApplyToRelated(checked === true)}
					/>
					<Label
						htmlFor="apply-to-related"
						className="text-sm font-normal cursor-pointer"
					>
						{t("servicenow.applyToRelated", { target: relatedConnectionLabel })}
					</Label>
				</div>

				{/* Connect Button with optional Cancel */}
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
