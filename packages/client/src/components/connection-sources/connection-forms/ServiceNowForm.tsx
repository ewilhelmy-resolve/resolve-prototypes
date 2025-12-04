import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { StatusAlert } from "@/components/ui/status-alert";
import { STATUS } from "@/constants/connectionSources";
import { useConnectionSource } from "@/contexts/ConnectionSourceContext";
import {
	useUpdateDataSource,
	useVerifyDataSource,
} from "@/hooks/useDataSources";
import { ritaToast } from "@/components/ui/rita-toast";
import ServiceNowConfiguration from "../connection-details/ServiceNowConfiguration";
import ConnectionsForm from "../form-elements/ConnectionsForm";
import FormField from "../form-elements/FormField";
import FormSection from "../form-elements/FormSection";

export interface ServiceNowFormData {
	instanceUrl: string;
	email: string;
	apiKey: string;
}

interface ServiceNowFormProps {
	onCancel?: () => void;
	onSuccess?: () => void;
	onFailure?: () => void;
}

export function ServiceNowForm({ onCancel, onSuccess, onFailure }: ServiceNowFormProps = {}) {
	const { source } = useConnectionSource();
	const verifyMutation = useVerifyDataSource();
	const updateMutation = useUpdateDataSource();

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
			email: source.backendData?.settings?.email || "",
			apiKey: "",
		},
	});

	const handleConnect = async () => {
		// Trigger validation for all fields
		const isValid = await trigger();

		if (!isValid) {
			ritaToast.error({
				title: "Validation Error",
				description: "Please check the form fields and correct any errors",
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
						email: formData.email,
					},
					credentials: {
						apiKey: formData.apiKey,
					},
				},
			});

			// Step 2: Save configuration immediately after verification
			await updateMutation.mutateAsync({
				id: source.id,
				data: {
					settings: {
						instanceUrl: formData.instanceUrl,
						email: formData.email,
					},
					enabled: true,
				},
			});

			ritaToast.success({
				title: "Connection Configured",
				description:
					"Your ServiceNow connection has been configured successfully",
			});

			onSuccess?.();
		} catch (error) {
			ritaToast.error({
				title: "Connection Failed",
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

	// If connected, show configuration view
	if (source.status !== STATUS.NOT_CONNECTED) {
		return <ServiceNowConfiguration />;
	}

	return (
		<ConnectionsForm handleSubmit={handleSubmit(onSubmit)} id="connection-form">
			{/* Authentication */}
			<FormSection title="Authentication">
				{/* Show error alert when verification fails */}
				{verificationFailed && (
					<StatusAlert variant="error" className="mb-4">
						<p className="font-semibold">Verification Failed</p>
						<p>{verificationError}</p>
						<p className="text-sm mt-2">
							Please check your credentials and try again.
						</p>
					</StatusAlert>
				)}

				{/* Instance URL */}
				<FormField label="Instance URL" errors={errors} name="instanceUrl" required>
					<Input
						id="instance-url"
						type="url"
						placeholder="https://your-instance.service-now.com"
						{...register("instanceUrl", {
							required: "Instance URL is required",
							pattern: {
								value: /^https?:\/\/.+/,
								message: "Please enter a valid URL",
							},
						})}
					/>
				</FormField>

				{/* Email */}
				<FormField label="Email" errors={errors} name="email" required>
					<Input
						id="email"
						type="email"
						placeholder="admin@company.com"
						{...register("email", {
							required: "Email is required",
							pattern: {
								value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
								message: "Please enter a valid email address",
							},
						})}
					/>
				</FormField>

				{/* API Key */}
				<FormField label="API Key" errors={errors} name="apiKey" required>
					<Input
						id="api-key"
						type="password"
						placeholder="Enter API key"
						{...register("apiKey", {
							required: "API key is required",
							minLength: {
								value: 1,
								message: "API key cannot be empty",
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
								Connecting...
							</>
						) : (
							"Connect"
						)}
					</Button>

					{onCancel && (
						<Button type="button" variant="outline" onClick={onCancel}>
							Cancel
						</Button>
					)}
				</div>

				{verifyMutation.isPending && (
					<StatusAlert variant="info">
						<p className="text-accent-foreground">Connection may take time</p>
						<p>You can leave this page while it is connecting</p>
					</StatusAlert>
				)}
			</FormSection>
		</ConnectionsForm>
	);
}
