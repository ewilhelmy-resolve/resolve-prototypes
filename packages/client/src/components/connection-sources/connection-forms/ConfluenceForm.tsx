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

export function ConfluenceForm({ onCancel, onSuccess, onFailure }: ConfluenceFormProps = {}) {
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
				title: "Connection Configured",
				description:
					"Your Confluence connection has been configured successfully",
			});

			// Call onSuccess callback to exit edit mode
			onSuccess?.();
		} catch (error) {
			ritaToast.error({
				title: "Connection Failed",
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

				{/* URL */}
				<FormField label="URL" errors={errors} name="url" required>
					<Input
						id="url"
						type="url"
						placeholder="https://your-company.atlassian.net"
						{...register("url", {
							required: "URL is required",
							pattern: {
								value: /^https?:\/\/.+/,
								message: "Please enter a valid URL",
							},
						})}
					/>
				</FormField>

				{/* User email */}
				<FormField label="User email" errors={errors} name="email" required>
					<Input
						id="email"
						type="email"
						placeholder="you@company.com"
						{...register("email", {
							required: "Email is required",
							pattern: {
								value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
								message: "Please enter a valid email address",
							},
						})}
					/>
				</FormField>

				{/* API token */}
				<FormField label="API token" errors={errors} name="token" required>
					<Input
						id="token"
						type="password"
						placeholder="Enter API token"
						{...register("token", {
							required: "API token is required",
							minLength: {
								value: 1,
								message: "API token cannot be empty",
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
						<p className=" text-accent-foreground">Connection may take time</p>
						<p>You can leave this page while it is connecting</p>
					</StatusAlert>
				)}
			</FormSection>
		</ConnectionsForm>
	);
}
