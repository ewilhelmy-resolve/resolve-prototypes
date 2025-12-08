import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { StatusAlert } from "@/components/ui/status-alert";
import { useConnectionSource } from "@/contexts/ConnectionSourceContext";
import {
	useUpdateDataSource,
	useVerifyDataSource,
} from "@/hooks/useDataSources";
import { ritaToast } from "@/components/ui/rita-toast";
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
			username: source.backendData?.settings?.username || "",
			password: "",
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
					},
					credentials: {
						username: formData.username,
						password: formData.password,
					},
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

				{/* Username */}
				<FormField label="Username" errors={errors} name="username" required>
					<Input
						id="username"
						type="text"
						placeholder="service_account"
						{...register("username", {
							required: "Username is required",
						})}
					/>
				</FormField>

				{/* Password */}
				<FormField label="Password" errors={errors} name="password" required>
					<Input
						id="password"
						type="password"
						placeholder="Enter password"
						{...register("password", {
							required: "Password is required",
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
