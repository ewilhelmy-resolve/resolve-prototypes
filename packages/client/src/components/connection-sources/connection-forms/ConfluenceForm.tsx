import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STATUS } from "@/constants/connectionSources";
import { useConnectionSource } from "@/contexts/ConnectionSourceContext";
import ConfluenceConfiguration from "../connections-detail/ConfluenceConfiguration";
import ConnectionsForm from "../form-elements/ConnectionsForm";
import FormField from "../form-elements/FormField";
import FormSection from "../form-elements/FormSection";

export interface ConfluenceFormData {
	url: string;
	email: string;
	token: string;
	spaces?: string[];
}

export function ConfluenceForm() {
	const { source } = useConnectionSource();
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<ConfluenceFormData>();

	const onSubmit = (data: ConfluenceFormData) => {
		console.log("Confluence form submitted:", data);
		// TODO: Implement API call to save Confluence connection
	};

	// If connected, show configuration view
	if (source.status !== STATUS.NOT_CONNECTED) {
		return <ConfluenceConfiguration />;
	}

	return (
		<ConnectionsForm handleSubmit={handleSubmit(onSubmit)} id="connection-form">
			{/* Authentication */}
			<FormSection title="Authentication">
				{/* URL */}
				<FormField label="URL" errors={errors} name="url">
					<Input
						id="url"
						type="url"
						placeholder="https://your-company.atlassian.net/wiki"
						{...register("url", { required: "URL is required" })}
					/>
				</FormField>

				{/* User email */}
				<FormField label="User email" errors={errors} name="email">
					<Input
						id="email"
						type="email"
						placeholder="you@company.com"
						{...register("email", { required: "Email is required" })}
					/>
				</FormField>

				{/* API token */}
				<FormField label="API token" errors={errors} name="token">
					<Input
						id="token"
						type="password"
						placeholder="••••••••"
						{...register("token", { required: "API token is required" })}
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
