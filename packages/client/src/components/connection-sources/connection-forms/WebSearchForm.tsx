import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
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
	const { t } = useTranslation("connections");
	const { t: tToast } = useTranslation("toast");
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

			toast.success(tToast("success.configurationSaved"), {
				description: tToast("descriptions.webSearchEnabled"),
			});
		} catch (error) {
			toast.error(tToast("error.saveFailed"), {
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
			<FormSection title={t("form.sections.settings")}>
				<p className="text-sm text-muted-foreground">
					{t("form.descriptions.webSearchHelp")}
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
						{t("form.buttons.cancel")}
					</Button>
				)}
				<Button
					size="lg"
					type="submit"
					disabled={updateMutation.isPending}
				>
					{updateMutation.isPending ? t("form.buttons.connecting") : t("form.buttons.connect")}
				</Button>
			</div>
		</ConnectionsForm>
	);
}
