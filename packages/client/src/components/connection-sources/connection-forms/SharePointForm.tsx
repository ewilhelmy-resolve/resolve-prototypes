import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STATUS } from "@/constants/connectionSources";
import { useConnectionSource } from "@/contexts/ConnectionSourceContext";
import SharePointConfiguration from "../connections-detail/SharePointConfiguration";
import ConnectionsForm from "../form-elements/ConnectionsForm";
import FormField from "../form-elements/FormField";
import FormSection from "../form-elements/FormSection";

export interface SharePointFormData {
	tenantId: string;
	clientId: string;
	clientSecret: string;
	siteUrl: string;
}

export function SharePointForm() {
	const { source } = useConnectionSource();
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<SharePointFormData>();

	const onSubmit = (data: SharePointFormData) => {
		console.log("SharePoint form submitted:", data);
		// TODO: Implement API call to save SharePoint connection
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
			</FormSection>

			{/* Connect Button */}
			<div className="flex justify-start">
				<Button size="lg" type="submit">
					Connect
				</Button>
			</div>
		</ConnectionsForm>
	);
}
