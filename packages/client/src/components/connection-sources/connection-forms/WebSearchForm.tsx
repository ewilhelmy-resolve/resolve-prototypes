import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { STATUS } from "@/constants/connectionSources";
import { useConnectionSource } from "@/contexts/ConnectionSourceContext";
import { useUpdateDataSource } from "@/hooks/useDataSources";
import { toast } from "@/lib/toast";
import WebSearchConfiguration from "../connection-details/WebSearchConfiguration";
import ConnectionsForm from "../form-elements/ConnectionsForm";
import FormSection from "../form-elements/FormSection";

export interface WebSearchFormData {
	enableSearch: boolean;
}

interface WebSearchFormProps {
	onCancel?: () => void;
}

export function WebSearchForm({ onCancel }: WebSearchFormProps = {}) {
	const { source } = useConnectionSource();
	const updateMutation = useUpdateDataSource();

	const { handleSubmit } = useForm<WebSearchFormData>({
		defaultValues: {
			enableSearch: source.backendData?.enabled || false,
		},
	});

	const onSubmit = async (data: WebSearchFormData) => {
		try {
			await updateMutation.mutateAsync({
				id: source.id,
				data: {
					settings: {},
					enabled: data.enableSearch,
				},
			});

			toast.success("Configuration Saved", {
				description: "Web Search has been enabled successfully",
			});
		} catch (error) {
			toast.error("Save Failed", {
				description: error instanceof Error ? error.message : "Failed to save configuration",
			});
		}
	};

	// If connected, show configuration view
	if (source.status === STATUS.CONNECTED) {
		return <WebSearchConfiguration />;
	}

	return (
		<ConnectionsForm handleSubmit={handleSubmit(onSubmit)} id="connection-form">
			{/* Settings */}
			<FormSection title="Settings">
				<p className="text-sm text-muted-foreground">
					Enable web search to supplement answers when knowledge isn't found in your connected sources.
				</p>
			</FormSection>

			{/* Enable Button with optional Cancel */}
			<div className="flex justify-end gap-2">
				{onCancel && (
					<Button
						type="button"
						variant="outline"
						onClick={onCancel}
					>
						Cancel
					</Button>
				)}
				<Button
					size="lg"
					type="submit"
					disabled={updateMutation.isPending}
				>
					{updateMutation.isPending ? "Connecting..." : "Connect"}
				</Button>
			</div>
		</ConnectionsForm>
	);
}
