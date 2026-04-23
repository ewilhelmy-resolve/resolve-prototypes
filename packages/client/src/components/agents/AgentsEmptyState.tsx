import { Bot, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface AgentsEmptyStateProps {
	onCreateAgent: () => void;
}

export function AgentsEmptyState({ onCreateAgent }: AgentsEmptyStateProps) {
	const { t } = useTranslation("agents");

	return (
		<output
			aria-label={t("list.empty.heading")}
			className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-neutral-200 bg-white px-6 py-16 text-center"
		>
			<div className="flex size-14 items-center justify-center rounded-lg border border-neutral-100 bg-white shadow-sm">
				<Bot className="size-6 text-neutral-500" aria-hidden="true" />
			</div>

			<div className="flex flex-col gap-1">
				<h2 className="font-serif text-2xl text-card-foreground">
					{t("list.empty.heading")}
				</h2>
				<p className="text-sm text-muted-foreground">
					{t("list.empty.description")}
				</p>
			</div>

			<Button variant="secondary" className="gap-2" onClick={onCreateAgent}>
				<Plus className="size-4" aria-hidden="true" />
				{t("list.empty.createAgent")}
			</Button>
		</output>
	);
}
