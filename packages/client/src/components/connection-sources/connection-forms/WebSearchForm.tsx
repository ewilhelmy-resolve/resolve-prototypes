import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { STATUS } from "@/constants/connectionSources";
import { useConnectionSource } from "@/contexts/ConnectionSourceContext";
import WebSearchConfiguration from "../connections-detail/WebSearchConfiguration";
import ConnectionsForm from "../form-elements/ConnectionsForm";
import FormSection from "../form-elements/FormSection";

export interface WebSearchFormData {
	enableSearch: boolean;
}

export function WebSearchForm() {
	const { source } = useConnectionSource();
	const { handleSubmit } = useForm<WebSearchFormData>();

	const onSubmit = (data: WebSearchFormData) => {
		console.log("Web Search form submitted:", data);
		// TODO: Implement API call to save Web Search connection
	};

	// If connected, show configuration view
	if (source.status === STATUS.CONNECTED) {
		return <WebSearchConfiguration />;
	}

	return (
		<ConnectionsForm handleSubmit={handleSubmit(onSubmit)} id="connection-form">
			{/* Settings */}
			<FormSection title="Settings">
				{/* Enable web search */}
				TODO
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
