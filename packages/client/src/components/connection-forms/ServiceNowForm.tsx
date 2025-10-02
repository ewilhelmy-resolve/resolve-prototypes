import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STATUS } from "@/constants/connectionSources";
import { useConnectionSource } from "@/contexts/ConnectionSourceContext";
import ConnectionsForm from "./ConnectionsForm";
import FormField from "./FormField";
import FormSection from "./FormSection";
import ServiceNowConfiguration from "./ServiceNowConfiguration";

export interface ServiceNowFormData {
	instanceUrl: string;
	username: string;
	password: string;
}

export function ServiceNowForm() {
	const { source } = useConnectionSource();
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<ServiceNowFormData>();

	const onSubmit = (data: ServiceNowFormData) => {
		console.log("ServiceNow form submitted:", data);
		// TODO: Implement API call to save ServiceNow connection
	};

	// If connected, show configuration view
	if (source.status === STATUS.CONNECTED) {
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
