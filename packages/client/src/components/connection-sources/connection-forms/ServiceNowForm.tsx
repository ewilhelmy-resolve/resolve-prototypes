import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STATUS } from "@/constants/connectionSources";
import { useConnectionSource } from "@/contexts/ConnectionSourceContext";
import {
	useUpdateDataSource,
	useVerifyDataSource,
} from "@/hooks/useDataSources";
import { toast } from "@/lib/toast";
import ServiceNowConfiguration from "../connection-details/ServiceNowConfiguration";
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
}

export function ServiceNowForm({ onCancel }: ServiceNowFormProps = {}) {
	const { source } = useConnectionSource();
	const verifyMutation = useVerifyDataSource();
	const updateMutation = useUpdateDataSource();

	const {
		register,
		handleSubmit,
		formState: { errors },
		getValues,
	} = useForm<ServiceNowFormData>({
		defaultValues: {
			instanceUrl: source.backendData?.settings?.instanceUrl || "",
			username: source.backendData?.settings?.username || "",
			password: "",
		},
	});

	const handleConnect = async () => {
		const formData = getValues();

		if (!formData.instanceUrl || !formData.username || !formData.password) {
			toast.error("Validation Error", {
				description: "Please fill in all authentication fields",
			});
			return;
		}

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
						password: formData.password,
					},
					enabled: true,
				},
			});

			toast.success("Connection Configured", {
				description:
					"Your ServiceNow connection has been configured successfully",
			});
		} catch (error) {
			toast.error("Connection Failed", {
				description:
					error instanceof Error
						? error.message
						: "Failed to configure connection",
			});
		}
	};

	const onSubmit = async (/*data: ServiceNowFormData*/) => {
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
				{/* Instance URL */}
				<FormField label="Instance URL" errors={errors} name="instanceUrl">
					<Input
						id="instance-url"
						type="url"
						placeholder="https://your-instance.service-now.com"
						{...register("instanceUrl", {
							required: "Instance URL is required",
						})}
					/>
				</FormField>

				{/* Username */}
				<FormField label="Username" errors={errors} name="username">
					<Input
						id="username"
						type="text"
						placeholder="your-username"
						{...register("username", { required: "Username is required" })}
					/>
				</FormField>

				{/* Password */}
				<FormField label="Password" errors={errors} name="password">
					<Input
						id="password"
						type="password"
						placeholder="••••••••"
						{...register("password", { required: "Password is required" })}
					/>
				</FormField>

				{/* Connect Button with optional Cancel */}
				<div className="flex justify-end gap-2">
					{onCancel && (
						<Button type="button" variant="outline" onClick={onCancel}>
							Cancel
						</Button>
					)}
					<Button
						type="button"
						onClick={handleConnect}
						disabled={verifyMutation.isPending || updateMutation.isPending}
					>
						{verifyMutation.isPending || updateMutation.isPending
							? "Connecting..."
							: "Connect"}
					</Button>
				</div>
			</FormSection>
		</ConnectionsForm>
	);
}
