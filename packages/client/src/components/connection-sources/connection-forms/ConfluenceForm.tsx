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

export interface ConfluenceFormData {
	url: string;
	email: string;
	token: string;
	spaces?: string[];
}

interface ConfluenceFormProps {
	onCancel?: () => void;
	onSuccess?: () => void;
	onFailure?: () => void;
}

export function ConfluenceForm({
	onCancel,
	onSuccess,
	onFailure,
}: ConfluenceFormProps = {}) {
	const { t } = useTranslation("connections");
	const { t: tToast } = useTranslation("toast");
	const { source } = useConnectionSource();
	const verifyMutation = useVerifyDataSource();
	const updateMutation = useUpdateDataSource();

	// Check for verification failure state (derived from error field, not status)
	const verificationError = source.backendData?.last_verification_error;
	const verificationFailed = !!verificationError;

	const {
		register,
		handleSubmit,
		formState: { errors },
		getValues,
		trigger,
	} = useForm<ConfluenceFormData>({
		mode: "onSubmit", // Changed from "onChange" to only validate on submit
		defaultValues: {
			url: source.backendData?.settings?.url || "",
			email: source.backendData?.settings?.email || "",
			token: "",
			spaces:
				source.backendData?.settings?.spaces
					?.split(",")
					.map((s: string) => s.trim()) || [],
		},
	});

	const handleConnect = async () => {
		// Trigger validation for all fields
		const isValid = await trigger();

		// If validation fails, show errors and stop
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
						url: formData.url,
						email: formData.email,
					},
					credentials: {
						apiToken: formData.token,
					},
				},
			});

			// Step 2: Save configuration immediately after verification
			await updateMutation.mutateAsync({
				id: source.id,
				data: {
					settings: {
						url: formData.url,
						email: formData.email,
					},
					enabled: true,
				},
			});

			ritaToast.success({
				title: tToast("success.connectionConfigured"),
				description: tToast("descriptions.confluenceConfigured"),
			});

			// Call onSuccess callback to exit edit mode
			onSuccess?.();
		} catch (error) {
			ritaToast.error({
				title: tToast("error.connectionFailed"),
				description:
					error instanceof Error
						? error.message
						: "Failed to configure connection",
			});

			// Call onFailure callback to exit edit mode
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

				{/* URL */}
				<FormField
					label={t("form.labels.url")}
					errors={errors}
					name="url"
					required
				>
					<Input
						id="url"
						type="url"
						placeholder={t("form.placeholders.confluenceUrl")}
						{...register("url", {
							required: t("form.validation.urlRequired"),
							pattern: {
								value: /^https?:\/\/[\w.-]+\.[a-zA-Z]{2,}(:\d+)?(\/.*)?$/,
								message: t("form.validation.invalidUrl"),
							},
						})}
					/>
				</FormField>

				{/* User email */}
				<FormField
					label={t("form.labels.userEmail")}
					errors={errors}
					name="email"
					required
				>
					<Input
						id="email"
						type="email"
						placeholder={t("form.placeholders.email")}
						{...register("email", {
							required: t("form.validation.emailRequired"),
							pattern: {
								value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
								message: t("form.validation.invalidEmail"),
							},
						})}
					/>
				</FormField>

				{/* API token */}
				<FormField
					label={t("form.labels.apiToken")}
					errors={errors}
					name="token"
					required
				>
					<Input
						id="token"
						type="password"
						placeholder={t("form.placeholders.apiToken")}
						{...register("token", {
							required: t("form.validation.apiTokenRequired"),
							minLength: {
								value: 1,
								message: t("form.validation.apiTokenEmpty"),
							},
						})}
					/>
				</FormField>

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
						<p className=" text-accent-foreground">
							{t("form.alerts.connectionMayTakeTime")}
						</p>
						<p>{t("form.alerts.canLeavePage")}</p>
					</StatusAlert>
				)}
			</FormSection>
		</ConnectionsForm>
	);
}
