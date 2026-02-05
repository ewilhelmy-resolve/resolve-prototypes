import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STATUS } from "@/constants/connectionSources";
import { useConnectionSource } from "@/contexts/ConnectionSourceContext";
import {
	useUpdateDataSource,
	useVerifyDataSource,
} from "@/hooks/useDataSources";
import { toast } from "@/lib/toast";
import SharePointConfiguration from "../connection-details/SharePointConfiguration";
import ConnectionsForm from "../form-elements/ConnectionsForm";
import FormField from "../form-elements/FormField";
import FormSection from "../form-elements/FormSection";

export interface SharePointFormData {
	tenantId: string;
	clientId: string;
	clientSecret: string;
	siteUrl: string;
}

interface SharePointFormProps {
	onCancel?: () => void;
}

export function SharePointForm({ onCancel }: SharePointFormProps = {}) {
	const { t } = useTranslation("connections");
	const { t: tToast } = useTranslation("toast");
	const { source } = useConnectionSource();
	const verifyMutation = useVerifyDataSource();
	const updateMutation = useUpdateDataSource();

	const {
		register,
		handleSubmit,
		formState: { errors },
		getValues,
	} = useForm<SharePointFormData>({
		defaultValues: {
			tenantId: source.backendData?.settings?.tenantId || "",
			clientId: source.backendData?.settings?.clientId || "",
			clientSecret: "",
			siteUrl: source.backendData?.settings?.siteUrl || "",
		},
	});

	const handleConnect = async () => {
		const formData = getValues();

		if (
			!formData.tenantId ||
			!formData.clientId ||
			!formData.clientSecret ||
			!formData.siteUrl
		) {
			toast.error(tToast("error.validationError"), {
				description: tToast("descriptions.fillAuthFields"),
			});
			return;
		}

		try {
			// Step 1: Verify credentials
			await verifyMutation.mutateAsync({
				id: source.id,
				payload: {
					settings: {
						tenantId: formData.tenantId,
						siteUrl: formData.siteUrl,
					},
					credentials: {
						clientId: formData.clientId,
						clientSecret: formData.clientSecret,
					},
				},
			});

			// Step 2: Save configuration immediately after verification
			await updateMutation.mutateAsync({
				id: source.id,
				data: {
					settings: {
						tenantId: formData.tenantId,
						clientId: formData.clientId,
						clientSecret: formData.clientSecret,
						siteUrl: formData.siteUrl,
					},
					enabled: true,
				},
			});

			toast.success(tToast("success.connectionConfigured"), {
				description: tToast("descriptions.sharePointConfigured"),
			});
		} catch (error) {
			toast.error(tToast("error.connectionFailed"), {
				description:
					error instanceof Error
						? error.message
						: "Failed to configure connection",
			});
		}
	};

	const onSubmit = async (/*data: SharePointFormData*/) => {
		await handleConnect();
	};

	// If connected, show configuration view
	if (source.status !== STATUS.NOT_CONNECTED) {
		return <SharePointConfiguration />;
	}

	return (
		<ConnectionsForm handleSubmit={handleSubmit(onSubmit)} id="connection-form">
			{/* Authentication */}
			<FormSection title={t("form.sections.authentication")}>
				{/* Tenant ID */}
				<FormField
					label={t("form.labels.tenantId")}
					errors={errors}
					name="tenantId"
				>
					<Input
						id="tenant-id"
						type="text"
						placeholder={t("form.placeholders.tenantId")}
						{...register("tenantId", {
							required: t("form.validation.tenantIdRequired"),
						})}
					/>
				</FormField>

				{/* Client ID */}
				<FormField
					label={t("form.labels.clientId")}
					errors={errors}
					name="clientId"
				>
					<Input
						id="client-id"
						type="text"
						placeholder={t("form.placeholders.clientId")}
						{...register("clientId", {
							required: t("form.validation.clientIdRequired"),
						})}
					/>
				</FormField>
				{/* Client Secret */}
				<FormField
					label={t("form.labels.clientSecret")}
					errors={errors}
					name="clientSecret"
				>
					<Input
						id="client-secret"
						type="password"
						placeholder={t("form.placeholders.secret")}
						{...register("clientSecret", {
							required: t("form.validation.clientSecretRequired"),
						})}
					/>
				</FormField>

				{/* Site URL */}
				<FormField
					label={t("form.labels.siteUrl")}
					errors={errors}
					name="siteUrl"
				>
					<Input
						id="site-url"
						type="url"
						placeholder={t("form.placeholders.sharePointUrl")}
						{...register("siteUrl", {
							required: t("form.validation.siteUrlRequired"),
							pattern: {
								value: /^https?:\/\/[\w.-]+\.[a-zA-Z]{2,}(:\d+)?(\/.*)?$/,
								message: t("form.validation.invalidUrl"),
							},
						})}
					/>
				</FormField>

				{/* Connect Button with optional Cancel */}
				<div className="flex justify-end gap-2">
					{onCancel && (
						<Button type="button" variant="outline" onClick={onCancel}>
							{t("form.buttons.cancel")}
						</Button>
					)}
					<Button
						type="button"
						onClick={handleConnect}
						disabled={verifyMutation.isPending || updateMutation.isPending}
					>
						{verifyMutation.isPending || updateMutation.isPending
							? t("form.buttons.connecting")
							: t("form.buttons.connect")}
					</Button>
				</div>
			</FormSection>
		</ConnectionsForm>
	);
}
