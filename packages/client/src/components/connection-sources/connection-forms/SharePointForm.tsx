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

			toast.success("Connection Configured", {
				description:
					"Your SharePoint connection has been configured successfully",
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
			<FormSection title="Authentication">
				{/* Tenant ID */}
				<FormField label="Tenant ID" errors={errors} name="tenantId">
					<Input
						id="tenant-id"
						type="text"
						placeholder="your-tenant-id"
						{...register("tenantId", { required: "Tenant ID is required" })}
					/>
				</FormField>

				{/* Client ID */}
				<FormField label="Client ID" errors={errors} name="clientId">
					<Input
						id="client-id"
						type="text"
						placeholder="your-client-id"
						{...register("clientId", { required: "Client ID is required" })}
					/>
				</FormField>
				{/* Client Secret */}
				<FormField label="Client Secret" errors={errors} name="clientSecret">
					<Input
						id="client-secret"
						type="password"
						placeholder="••••••••"
						{...register("clientSecret", {
							required: "Client Secret is required",
						})}
					/>
				</FormField>

				{/* Site URL */}
				<FormField label="Site URL" errors={errors} name="siteUrl">
					<Input
						id="site-url"
						type="url"
						placeholder="https://your-company.sharepoint.com"
						{...register("siteUrl", { required: "Site URL is required" })}
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
